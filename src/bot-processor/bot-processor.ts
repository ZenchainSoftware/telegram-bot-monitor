import "reflect-metadata"
import { createConnection, Entity, Column, getManager } from "typeorm"
import * as Telegraf from "telegraf"
import { BotConfigurator } from "../bot-processor/bot-configurator"
import { BotMessage } from "../bot-processor/bot-message"
import { ChatMember } from "../model/ChatMember"
import { MemberHistory } from "../model/MemberHistory"


export class BotProcessor {

    private botApiProcessor
    private botConfigurator
    private botMessage
    private dbConnection
    private chatAdmins
    private chatId
    private lastConfigRule

    constructor() {
        this.botConfigurator = new BotConfigurator()      
        this.botMessage = new BotMessage()     
        this.chatId = this.botConfigurator.getConfiguration().chatId 
    }

    public start() {
        this.connectToDatabase()
     
        this.botApiProcessor = new Telegraf(this.botConfigurator.getConfiguration().botToken)

        this.chatAdmins = []            
        this.getAdmins(true)
            
        this.configurationMenu()
        this.listenMessages()            
        
        this.botApiProcessor.startPolling()
           
        var checkMemeberInterval = setInterval(() =>
            this.checkMembers(),    
            this.botConfigurator.getConfiguration().checkMemberInterval); 

        this.botApiProcessor.catch((err) => {
            console.log("Error occured: ", err)
        })
    }        

    private isAdminMessage(message) {
        let adminMessage = false

        this.chatAdmins.forEach(admin => {
            if (admin.id == message.from.id) {
                adminMessage = true
            }
        }) 
        
        return adminMessage
    }

    private processMessage(message, ctx) {
        this.botMessage.displayMessage(`Received message: ${JSON.stringify(message, null, 2)}`)

        let adminMessage = this.isAdminMessage(message)

        let messageToCheck = message.text ? message.text.replace(this.botConfigurator.getConfiguration().validChars, "") : ''
        
        if (!adminMessage) {
            let banMember = false
            let reason = ''
            let messageType = ''
            let messageToSend = ''
            let warningToSend = ''

            this.botMessage.displayMessage(`Check message: ${messageToCheck}`)

            if (this.botConfigurator.getConfiguration().rules.checkWalletKey.validate) {
                this.botConfigurator.getConfiguration().walletAddress.forEach(address => {
                    let pattern = new RegExp(address, "gi")
                    if (pattern.test(messageToCheck)) {
                        this.botMessage.displayMessage(`Wallet address detected: ${messageToCheck}`)

                        if (this.botConfigurator.getConfiguration().rules.checkWalletKey.banUser != -1) {
                            banMember = true    
                            messageType = "WalletKey"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkWalletKey.removeMessage) {
                            reason = 'Removed message for posting Wallet address'
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.walletKey
                        }
                    }
                })
            }

            if (this.botConfigurator.getConfiguration().rules.checkUrl.validate) {
                let messageEntitiesExist = message.entities ? true : false

                let pattern = new RegExp(this.botConfigurator.getConfiguration().urlRegex, "gi")
                console.log(pattern)
                let match = pattern.test(messageToCheck)

                if (messageEntitiesExist) {
                    message.entities.forEach(entity => {
                        if (entity.type == 'url') {
                            this.botMessage.displayMessage(`URL detected: ${messageToCheck}`)
                            if (this.botConfigurator.getConfiguration().rules.checkUrl.banUser != -1) {
                                banMember = true        
                                messageType = "Url"
                            }
                            if (this.botConfigurator.getConfiguration().rules.checkUrl.removeMessage) {
                                messageToSend = this.botConfigurator.getConfiguration().replyMessages.url                        
                            }
                        }
                    })    
                } else if (match){
                    this.botMessage.displayMessage(`URL detected: ${messageToCheck}`)
                    if (this.botConfigurator.getConfiguration().rules.checkUrl.banUser != -1) {
                        banMember = true        
                        messageType = "Url"
                    }
                    if (this.botConfigurator.getConfiguration().rules.checkUrl.removeMessage) {
                        messageToSend = this.botConfigurator.getConfiguration().replyMessages.url  
                    }                                  
                }
            }
            
            if (this.botConfigurator.getConfiguration().rules.checkBadWord.validate) {
                let regexRule = this.botConfigurator.getConfiguration().badWords
                let pattern = new RegExp(regexRule, "gi")
                let match = pattern.test(messageToCheck)

                if (match === true) {
                    this.botMessage.displayMessage(`${messageToCheck}  matches ${regexRule}`)

                    reason = 'Removed message for posting inappropriate content (bad language)'
                    if (this.botConfigurator.getConfiguration().rules.checkBadWord.banUser != -1) {
                        banMember = true        
                        messageType = "BadWord"
                    }        
                    if (this.botConfigurator.getConfiguration().rules.checkBadWord.removeMessage) {
                        messageToSend = this.botConfigurator.getConfiguration().replyMessages.inappropriateContent
                    }
                }
            }

            if (this.botConfigurator.getConfiguration().rules.checkVideo.validate || this.botConfigurator.getConfiguration().rules.checkAudio.validate || this.botConfigurator.getConfiguration().rules.checkImage.validate || this.botConfigurator.getConfiguration().rules.checkAnyFile.validate) {
                let documentExists = (message.document) ? true : false

                if (documentExists === true) {
                    let documentType = message.document.mime_type.substring(0, 5)

                    if (documentType == 'image') { 
                        if (this.botConfigurator.getConfiguration().rules.checkImage.banUser != -1) {
                            banMember = true        
                            messageType = "Image"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkImage.removeMessage) {
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.image
                            warningToSend = this.botConfigurator.getConfiguration().replyMessages.warning
                        }                            
                    }
                    if (documentType == 'audio') {
                        if (this.botConfigurator.getConfiguration().rules.checkAudio.banUser != -1) {
                            banMember = true        
                            messageType = "Audio"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkAudio.removeMessage) {
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.audio
                            warningToSend = this.botConfigurator.getConfiguration().replyMessages.warning
                        }                            
                    }
                    if (documentType == 'video') {
                        if (this.botConfigurator.getConfiguration().rules.checkVideo.banUser != -1) {
                            banMember = true        
                            messageType = "Video"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkVideo.removeMessage) {
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.video
                            warningToSend = this.botConfigurator.getConfiguration().replyMessages.warning
                        }                            
                    }
                }
            }    

            if (banMember || messageToSend !== '') {
                let banMemberData = {
                    chatId: message.chat.id,
                    chatMemberId: message.from.id,
                    chatMemberFirstName: message.from.first_name,
                    chatMemberLastName: message.from.last_name ? message.from.last_name : '',
                    isBot: message.from.is_bot,
                    status: 'banned',
                    chatMemberUserName: message.from.username ? message.from.username : '',            
                    reason: reason,
                    messageId: message.message_id
                }

                if (banMember) {
                    this.banOrWarnMember(banMemberData, messageType)                                        
                }
                if (messageToSend !== '') {
                    warningToSend = this.botConfigurator.getConfiguration().replyMessages.warning
                    this.removeMessage(banMemberData, messageToSend, warningToSend)                        
                }
            }
        } else {
            console.log(message.chat.id + ' != ' + this.chatId)
            if (message.chat.id != this.chatId && this.lastConfigRule != '') {
                let replyMessages = [
                    'inappropriateContentReplyMessage',
                    'walletKeyReplyMessage',
                    'urlReplyMessage',
                    'imageReplyMessage',
                    'audioReplyMessage',
                    'videoReplyMessage',
                    'warningReplyMessage'
                ]

                if (this.lastConfigRule == "badWordsSet") {
                    this.botConfigurator.processBadWords("set", message.text)

                    let ruleWords = this.botConfigurator.getConfiguration().badWords.toString().replace("(", "").replace(")", "").split("|").join(", ")
                    ctx.reply(`Banned Word/Phrase(s) are set to ${ruleWords}`)
                } else if (this.lastConfigRule == "badWordsUnset") {
                    this.botConfigurator.processBadWords("unset", message.text)

                    let ruleWords = this.botConfigurator.getConfiguration().badWords.toString().replace("(", "").replace(")", "").split("|").join(", ")
                    ctx.reply(`Banned Word/Phrase(s) are set to ${ruleWords}`)
                } else if (replyMessages.indexOf(this.lastConfigRule) != -1) {
                    this.botConfigurator.processReplyMessage(this.lastConfigRule, message.text)
                    
                    ctx.reply("New Reply Message is set")
                } else {
                    if (this.botConfigurator.processBanUserRule(this.lastConfigRule, message.text)) {
                        this.lastConfigRule = ''                    
                        ctx.reply(`Ban User Settings Warning is set to ${message.text}`)
                    } else {
                        ctx.reply("Invalid value for Ban User Settings Warning")                    
                    }
                }    
            }
        }
    }

    private processMultimediaMessage(message, messageType) {    
        
        let adminMessage = false
        
        this.chatAdmins.forEach(admin => {
            if (admin.id == message.from.id) {
                adminMessage = true
            }
        })
        
        if (!adminMessage) {
  			this.botMessage.displayMessage(`Multimedia message received: ${JSON.stringify(message, null, 2)}`)
        
            let banMember = false        
            let messageToSend = ''
            let reason = ''

            if (messageType == 'Audio') {
                if (this.botConfigurator.getConfiguration().rules.checkAudio.banUser != -1) {
                    banMember = true        
                }    
                if (this.botConfigurator.getConfiguration().rules.checkAudio.removeMessage) {
                    reason = 'Banned for posting inappropriate content (audio)'
                    messageToSend = this.botConfigurator.getConfiguration().replyMessages.audio          
                }  
            } else if (messageType == 'Video') {
                if (this.botConfigurator.getConfiguration().rules.checkVideo.banUser != -1) {
                    banMember = true        
                }    
                if (this.botConfigurator.getConfiguration().rules.checkVideo.removeMessage) {
                    reason = 'Banned for posting inappropriate content (video)'
                    messageToSend = this.botConfigurator.getConfiguration().replyMessages.video          
                }  
            } else if (messageType == 'Image') {
                if (this.botConfigurator.getConfiguration().rules.checkImage.banUser != -1) {
                    banMember = true        
                }    
                if (this.botConfigurator.getConfiguration().rules.checkImage.removeMessage) {
                    reason = 'Banned for posting inappropriate content (image)'
                    messageToSend = this.botConfigurator.getConfiguration().replyMessages.image          
                }  
            }    

            if (banMember || messageToSend) {
                let warningToSend = this.botConfigurator.getConfiguration().replyMessages.warning
                
                let banMemberData = {
                    chatId: message.chat.id,
                    chatMemberId: message.from.id,
                    chatMemberFirstName: message.from.first_name,
                    chatMemberLastName: message.from.last_name ? message.from.last_name : '',
                    isBot: message.from.is_bot,
                    status: 'banned',
                    chatMemberUserName: message.from.username ? message.from.username : '',            
                    reason: reason,
                    messageId: message.message_id
                }

                if (banMember) {
                    this.banOrWarnMember(banMemberData, messageType) 
                }

                if (messageToSend) {
                    this.removeMessage(banMemberData, messageToSend, warningToSend)     
                }                    
            }
        } else {
            this.botMessage.displayMessage(`Message from Admin to be skipped: ${message.text}`)
        }
    }
    
    private addMember(message) {
		this.botMessage.displayMessage(`New member: ${JSON.stringify(message, null, 2)}`)

        this.dbConnection.getRepository(MemberHistory).findOne({chatMemberId: message.new_chat_member.id, status: 'banned'}).then(memberDetails => {
            if (memberDetails && message.chat.type == 'group') {
                    let untilDate = Math.ceil(Date.now() / 1000 + 10)
                    this.botApiProcessor.telegram.kickChatMember(this.botConfigurator.getConfiguration().chatId, message.new_chat_member.id, untilDate).then(details => { 
                        this.botMessage.displayMessage(`Member trying to join is kicked from group as it was already banned. ${JSON.stringify(details, null, 2)}`) 
                    }).catch(function(e) {
                        console.log("Error occured: ", e);
                    })    
            } else {
                let newChatMember = new ChatMember();
                newChatMember.chatId = message.chat.id;
                newChatMember.chatMemberId = message.new_chat_member.id;
                newChatMember.chatMemberFirstName = message.new_chat_member.first_name;
                newChatMember.chatMemberLastName= (message.new_chat_member.last_name) ? message.new_chat_member.last_name : '';
                newChatMember.chatMemberUserName = (message.new_chat_member.username) ? message.new_chat_member.username : '',            
                newChatMember.isBot = message.new_chat_member.is_bot;
                newChatMember.isAdmin = (message.new_chat_member.is_admin) ? message.new_chat_member.is_admin : false,
                newChatMember.joinDate = message.new_chat_member.date;
                newChatMember.status = 'active';
                newChatMember.warning = 0;
                
                this.botMessage.displayMessage(`Add new member ${newChatMember.chatMemberId}, ${newChatMember.chatMemberFirstName} ${newChatMember.chatMemberLastName}`);
                
                this.dbConnection.getRepository(ChatMember).save(newChatMember);
        
                let memberData = {
                    chatId: message.chat.id,
                    chatMemberId: message.new_chat_member.id,
                    chatMemberFirstName: message.new_chat_member.first_name,
                    chatMemberLastName: (message.new_chat_member.last_name) ? message.new_chat_member.last_name : '',
                    isBot: message.new_chat_member.is_bot,
                    joinDate: message.new_chat_member.date,
                    status: 'active',
                    chatMemberUserName: (message.new_chat_member.username) ? message.new_chat_member.username : '',            
                    isAdmin: (message.new_chat_member.is_admin) ? message.new_chat_member.is_admin : false,
                    reason: 'Joined chat group'
                }
                
                this.addMemberHistory(memberData)                
            }
        }).catch(function(e) {
            console.log("Error occured", e);
        })    
        
    
    }
    
    private addMemberHistory(message) {
        let newMemberHistory = new MemberHistory();
        newMemberHistory.chatId = message.chatId;
        newMemberHistory.chatMemberId = message.chatMemberId;
        newMemberHistory.chatMemberFirstName = message.chatMemberFirstName;
        newMemberHistory.chatMemberLastName= message.chatMemberLastName;
        newMemberHistory.chatMemberUserName= message.chatMemberUserName;            
        newMemberHistory.isBot = message.isBot;
        newMemberHistory.joinDate = message.joinDate;
        newMemberHistory.status = message.status;        
        newMemberHistory.isAdmin = message.isAdmin;
        newMemberHistory.reason = message.reason;

        this.dbConnection.getRepository(MemberHistory).save(newMemberHistory);
        
    }

    private removeMember(message) {
		this.botMessage.displayMessage(`Remove chat member  
                     ${message.left_chat_member.id},  
                     ${message.left_chat_member.first_name} 
                     ${((message.left_chat_member.last_name) ? message.left_chat_member.last_name : '')}`)
		
        this.dbConnection.getRepository(ChatMember).removeById(message.left_chat_member.id)

        let memberData = {
            chatId: message.chat.id,
            chatMemberId: message.left_chat_member.id,
            chatMemberFirstName: message.left_chat_member.first_name,
            chatMemberLastName: (message.left_chat_member.last_name) ? message.left_chat_member.last_name : '',
            isBot: message.left_chat_member.is_bot,
            joinDate: message.left_chat_member.date,
            status: 'inactive',
            chatMemberUserName: (message.left_chat_member.username) ? message.left_chat_member.username : '',            
            isAdmin: (message.left_chat_member.is_admin) ? message.left_chat_member.is_admin : false,
            reason: 'Left chat group'
        }

        this.addMemberHistory(memberData)        
    }

    private userShouldBeBanned (member): boolean {
        let result = false

        if (this.botConfigurator.getConfiguration().rules.checkAdmin.validate) {
			let skipMember = false
            let adminNames = []
			
            this.chatAdmins.forEach(admin => {
				if (admin.id == member.id) {
					skipMember = true;
				}
					
                let adminFirstName = admin.firstName.toLowerCase().replace(/\W/g, '')
                let adminLastName = admin.lastName.toLowerCase().replace(/\W/g, '')
                let adminUserName = admin.userName.toLowerCase().replace(/\W/g, '')

                if (adminFirstName && adminLastName) adminNames.push(adminFirstName + adminLastName)
                if (adminFirstName && adminUserName) adminNames.push(adminFirstName + adminUserName)
                if (adminLastName && adminFirstName) adminNames.push(adminLastName + adminFirstName)
                if (adminLastName && adminUserName) adminNames.push(adminLastName + adminUserName)
                if (adminUserName && adminFirstName) adminNames.push(adminUserName + adminFirstName)
                if (adminUserName && adminLastName) adminNames.push(adminUserName + adminLastName)                        
			})	
		
			if (!skipMember) {
                let memberFirstName = member.first_name.toLowerCase().replace(/\W/g, '').replace(this.botConfigurator.getConfiguration().validChars, "")
                let memberLastName = (member.last_name) ? member.last_name.toLowerCase().replace(/\W/g, '').replace(this.botConfigurator.getConfiguration().validChars, "") : ''
                let memberUserName = (member.username) ? member.username.toLowerCase().replace(/\W/g, '').replace(this.botConfigurator.getConfiguration().validChars, "") : ''
                    
                let memberNames = []
                    
                if (memberFirstName && memberLastName) memberNames.push(memberFirstName + memberLastName)
                if (memberFirstName && memberUserName) memberNames.push(memberFirstName + memberUserName)
                if (memberLastName && memberFirstName) memberNames.push(memberLastName + memberFirstName)
                if (memberLastName && memberUserName) memberNames.push(memberLastName + memberUserName)
                if (memberUserName && memberFirstName) memberNames.push(memberUserName + memberFirstName)
                if (memberUserName && memberLastName) memberNames.push(memberUserName + memberLastName)                        
					
                let nameMatch = false
                memberNames.forEach(memberName => {
                    adminNames.forEach(adminName => {
                        if (memberName == adminName) {
                            nameMatch = true
                        }
                    })                        
                })
					
				if (nameMatch) {   
					this.botMessage.displayMessage("It is")
					result = true    
				}   
			}
        }
        return result                    
    }

    private checkMember(member) {
		
        let memberData = this.botApiProcessor.telegram.getChat(member.chatMemberId).then(details => { 
			this.botMessage.displayMessage(`Check member: ${member.chatMemberId}, ${member.chatMemberFirstName} ${member.chatMemberLastName + ' ' + member.chatMemberUserName}`);
			this.botMessage.displayMessage(JSON.stringify(details, null, 2))
			
            if (this.userShouldBeBanned(details) === true && this.botConfigurator.getConfiguration().rules.checkAdmin.banUser == 0) {
				this.botMessage.displayMessage(`Remove Member:  
                            ${member.chatMemberId}, 
                            ${details.first_name} 
                            ${((details.last_name) ? details.last_name : '')} 
                            ${((details.username) ? details.username : '')}`) 

                let banMemberData = {
                    chatId: member.chatId,
                    chatMemberId: member.chatMemberId,
                    chatMemberFirstName: details.first_name,
                    chatMemberLastName: details.last_name ? details.last_name : '',
                    isBot: member.isBot,
                    status: 'banned',
                    chatMemberUserName: details.username ? details.username : '',            
                    reason: 'Banned for impersonating Administrator'
                }

                this.banOrWarnMember(banMemberData, 'Admin')
            }
        } ).catch(function(e) {
        })           
    }

    private removeMessage(message, messageToSend, warningToSend) {
        this.botMessage.displayMessage(`Delete message ${message.messageId}`) 

        this.botApiProcessor.telegram.deleteMessage(this.botConfigurator.getConfiguration().chatId, message.messageId).then(details => { 
            this.botMessage.displayMessage(JSON.stringify(details, null, 2)) 

            let memberIdentifier = '@' + message.chatMemberFirstName + ' ' + message.chatMemberLastName + (message.chatMemberUserName ? ('(' + message.chatMemberUserName + ')') : '')
            
            if (messageToSend !== '') {                
                this.botMessage.displayMessage(`Send message ${memberIdentifier}, ${messageToSend}`) 

                this.botApiProcessor.telegram.sendMessage(this.botConfigurator.getConfiguration().chatId, memberIdentifier + ', ' + messageToSend).then(details => { 
                    this.botMessage.displayMessage(JSON.stringify(details, null, 2)) 
                }).catch(function(e) {
                    console.log("Error occured", e);
                })    
            }

            if (warningToSend !== '') {
                this.botMessage.displayMessage(`Send message ${memberIdentifier}, ${warningToSend}`) 
                this.botApiProcessor.telegram.sendMessage(this.botConfigurator.getConfiguration().chatId, memberIdentifier + ', ' + warningToSend).then(details => { 
                    this.botMessage.displayMessage(JSON.stringify(details, null, 2)) 
                }).catch(function(e) {
                    console.log("Error occured", e);
                })    
            }
            
        }).catch(function(e) {
            console.log("Error occured", e);
        })    
}

    private banOrWarnMember(member, messageType) {        
        this.dbConnection.getRepository(ChatMember).findOneById(member.chatMemberId).then(memberDetails => {

            if (memberDetails) {
                let banImmediately = -1
                let allowedValue = 0

                switch (messageType) {
                    case "Admin":
                        banImmediately = 0
                        allowedValue = 0
                        memberDetails.warning++
                        break
                    case "WalletKey":
                        banImmediately = memberDetails.warningWalletKey
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkWalletKey.banUser
                        memberDetails.warningWalletKey++
                        break
                    case "BadWord":
                        banImmediately = memberDetails.warningBadWord
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkBadWord.banUser
                        memberDetails.warningBadWord++
                        break
                    case "Audio":
                        banImmediately = memberDetails.warningAudio
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkAudio.banUser
                        memberDetails.warningAudio++
                        break
                    case "Video":
                        banImmediately = memberDetails.warningVideo
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkVideo.banUser
                        memberDetails.warningVideo++
                        break
                    case "Image":
                        banImmediately = memberDetails.warningImage
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkImage.banUser
                        memberDetails.warningImage++
                        break
                    case "AnyFile":
                        banImmediately = memberDetails.warningAnyFile
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkAnyFile.banUser
                        memberDetails.warningAnyFile++
                        break
                    case "Url":
                        banImmediately = memberDetails.warningUrl
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkUrl.banUser
                        memberDetails.warningUrl++
                        break
                }

                if (banImmediately == -1 || banImmediately < allowedValue) {
                    this.botMessage.displayMessage("Warn member for displaying inappropriate content") 
                    this.dbConnection.getRepository(ChatMember).save(memberDetails);
                } else {
                    this.botMessage.displayMessage("Kick member from group.") 
                    let untilDate = Math.ceil(Date.now() / 1000 + 10)
                    this.botApiProcessor.telegram.kickChatMember(this.botConfigurator.getConfiguration().chatId, member.chatMemberId, untilDate).then(details => { 
                        this.botMessage.displayMessage(`Member kicked from group. ${JSON.stringify(details, null, 2)}`) 
                                
                        this.dbConnection.getRepository(ChatMember).removeById(member.chatMemberId);
                        
                        let memberData = {
                            chatId: member.chatId,
                            chatMemberId: member.chatMemberId,
                            chatMemberFirstName: details.first_name,
                            chatMemberLastName: details.last_name ? details.last_name : '',
                            isBot: member.isBot,
                            joinDate: memberDetails.joinDate,
                            status: 'banned',
                            chatMemberUserName: details.username ? details.username : '',            
                            isAdmin: memberDetails.isAdmin,
                            reason: 'Banned for posting too many inappropriate messages'
                        }
                        
                        this.addMemberHistory(memberData)        
                    }).catch(function(e) {
                        console.log("Error occured", e);
                    })    
                }
            }    
        }).catch(function(e) {
            console.log("Error Occured", e);
        })    
}

    private checkMembers() {
        if (this.botConfigurator.getConfiguration().rules.checkAdmin.validate) {
            if (this.dbConnection) {
                this.botMessage.displayMessage("Check Members")
                this.getAdmins(true)	
                let membersData = this.dbConnection.getRepository('ChatMember')
                membersData.find().then(members => {
                    members.forEach(member => {
                        this.checkMember(member)
                    });   
                }).catch(function(e) {
                    console.log("Error occured", e);
                })    
            } else {
                this.botMessage.displayMessage("Database connection not established yet")   
            }
        }
    }

	private getAdmins(display) {
		this.botApiProcessor.telegram.getChatAdministrators(this.botConfigurator.getConfiguration().chatId).then(adminsData => { 
			this.chatAdmins = []
			adminsData.forEach(admin => {
				this.chatAdmins.push({
					'id': admin.user.id,		
					'firstName': admin.user.first_name,		
					'lastName': admin.user.last_name ? admin.user.last_name : '',		
					'userName': admin.user.username ? admin.user.username: ''	
				})
			})  
			if (display) {
				this.botMessage.displayMessage("Current Admins")		
				this.botMessage.displayMessage(JSON.stringify(this.chatAdmins, null, 2))		
			}
        }).catch(function(e) {
            console.log("Error occured", e);
        })    
    
    }

    private listenMessages() {
        this.botApiProcessor.on('new_chat_members', (ctx) => this.addMember(ctx.message))
        this.botApiProcessor.on('left_chat_member', (ctx) => this.removeMember(ctx.message))

        if (this.botConfigurator.getConfiguration().rules.checkImage.validate) {
            this.botApiProcessor.on('photo', (ctx) => this.processMultimediaMessage(ctx.message, 'Image'))
        }
        if (this.botConfigurator.getConfiguration().rules.checkVideo.validate) {
            this.botApiProcessor.on('video', (ctx) => this.processMultimediaMessage(ctx.message, 'Video'))
            this.botApiProcessor.on('video_note', (ctx) => this.processMultimediaMessage(ctx.message, 'video'))
        }        
        if (this.botConfigurator.getConfiguration().rules.checkAudio.validate) {
            this.botApiProcessor.on('voice', (ctx) => this.processMultimediaMessage(ctx.message, 'Audio'))
            this.botApiProcessor.on('audio', (ctx) => this.processMultimediaMessage(ctx.message, 'Audio'))
        }

        if (this.botConfigurator.getConfiguration().rules.checkWalletKey.validate || this.botConfigurator.getConfiguration().rules.checkBadWord.validate || this.botConfigurator.getConfiguration().rules.checkBadWord.validate || this.botConfigurator.getConfiguration().rules.checkBadWord.validate) {
            this.botApiProcessor.on('message', (ctx) => this.processMessage(ctx.message, ctx))
        }        
    }

    private configurationMenu() {
        let checkRules = [
            {'type': 'checkAdmin', 'title': 'Fake Admin Phishing'},
            {'type': 'checkWalletKey', 'title': 'Check Message for Wallet/Key'},
            {'type': 'checkBadWord', 'title': 'Check Message for Banned Words'},
            {'type': 'checkUrl', 'title': 'Check Message for URLs'},
            {'type': 'checkImage', 'title': 'Check Message for Image'},
            {'type': 'checkAudio', 'title': 'Check Message for Audio'},
            {'type': 'checkVideo', 'title': 'Check Message for Video'}
        ]

        let replyMessages = [
            {'type': 'inappropriateContentReplyMessage', 'title': 'Inappropriate Content'},
            {'type': 'walletKeyReplyMessage', 'title': 'Wallet Address / Private Key'},
            {'type': 'urlReplyMessage', 'title': 'Posting URL'},
            {'type': 'imageReplyMessage', 'title': 'Posting Image'},
            {'type': 'audioReplyMessage', 'title': 'Posting Audio'},
            {'type': 'videoReplyMessage', 'title': 'Posting Video'},
            {'type': 'warningReplyMessage', 'title': 'Warning the Member'}
        ]
 
        let checkAdminRuleValidate
        let checkAdminRuleBanUser

        let menus = []

        let configurationMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.inlineKeyboard([
                    [
                        m.callbackButton('Fake Admin Phishing', 'checkAdmin'),
                        m.callbackButton('Check for Wallet/Key', 'checkWalletKey')
                    ],
                    [
                        m.callbackButton('Check for Banned Words', 'checkBadWord'),
                        m.callbackButton('Check for URLs', 'checkUrl')
                    ],
                    [
                        m.callbackButton('Check for Images', 'checkImage'),
                        m.callbackButton('Check for Audio', 'checkAudio')
                    ],
                    [
                        m.callbackButton('Check for Video', 'checkVideo'),
                        m.callbackButton('Set Banned Words', 'badWords')
                    ],
                    [
                        m.callbackButton('Set Reply Messages', 'replyMessages')
                    ]
                ]).resize())

        this.botApiProcessor.hears(/menu/i, (ctx) => {    
            if (this.isAdminMessage(ctx.message) && ctx.message.chat.id != this.chatId) {  
                this.lastConfigRule = ''
                ctx.reply('Configuration Menu', configurationMenu)
            }
        });

        this.botApiProcessor.hears(/help/i, (ctx) => {    
            if (this.isAdminMessage(ctx.message) && ctx.message.chat.id != this.chatId) {  
                this.lastConfigRule = ''
                ctx.reply("https://zenchain.com/telegram-bot-guide/")
            }
        });

        this.botApiProcessor.action('mainMenu', (ctx) => {    
            ctx.reply('Configuration Menu', configurationMenu)
        })
        
        checkRules.forEach(rule => {
            if (rule.type == 'checkAdmin') {
                menus[rule.type] = Telegraf.Extra
                                    .markdown()
                                    .markup((m) => m.inlineKeyboard([
                                        [   
                                            m.callbackButton('Enable/Disable', `${rule.type}RuleValidate`), 
                                            m.callbackButton('Ban User', `${rule.type}RuleBanUser`)
                                        ],
                                        [
                                            m.callbackButton('Back to Main Menu', 'mainMenu')
                                        ]
                                    ]).resize())                
            } else {
                menus[rule.type] = Telegraf.Extra
                                    .markdown()
                                    .markup((m) => m.inlineKeyboard([
                                        [
                                            m.callbackButton('Enable/Disable', `${rule.type}RuleValidate`),
                                            m.callbackButton('Ban User', `${rule.type}RuleBanUser`)
                                        ],
                                        [
                                            m.callbackButton('Remove Message', `${rule.type}RuleRemoveMessage`),
                                            m.callbackButton('Back to Main Menu', 'mainMenu')
                                        ]
                                    ]).resize())                
            }                        
            this.botApiProcessor.action(`${rule.type}`, (ctx) => {
                this.lastConfigRule = ''
                ctx.reply(rule.title, menus[rule.type])
            })

            this.botApiProcessor.action(`${rule.type}RuleValidate`, (ctx) => {
                let currentStatus = ''
                let newStatus = ''
    
                if (this.botConfigurator.getConfiguration().rules[rule.type].validate) {
                    currentStatus = 'Enabled'
                    newStatus = 'Disable'  
                } else {
                    currentStatus = 'Disabled'
                    newStatus = 'Enable'                  
                }
    
                let validateMenu = Telegraf.Extra
                    .markdown()
                    .markup((m) => m.inlineKeyboard([
                        [m.callbackButton(`${newStatus}`, `${rule.type}RuleValidate${newStatus}`)],
                        [m.callbackButton(`Back to ${rule.title} Menu`, `${rule.type}`)]
                    ]).resize());
            
                this.lastConfigRule = ''
                ctx.reply(`Setting is ${currentStatus}`, validateMenu)
            })
            
            this.botApiProcessor.action(`${rule.type}RuleValidateEnable`, (ctx) => {
                this.lastConfigRule = ''
                if (this.botConfigurator.processValidationRule(rule.type, 'on')) {
                    ctx.reply("Setting is set to Enabled")
                } else {
                    ctx.reply("Invalid value for Setting")                    
                }
            })
        
            this.botApiProcessor.action(`${rule.type}RuleValidateDisable`, (ctx) => {
                this.lastConfigRule = ''
                if (this.botConfigurator.processValidationRule(rule.type, 'off')) {
                    ctx.reply("Setting is set to Disabled")
                } else {
                    ctx.reply("Invalid value for Setting")                    
                }
            })

            
            this.botApiProcessor.action(`${rule.type}RuleRemoveMessage`, (ctx) => {
                let currentStatus = ''
                let newStatus = ''
    
                if (this.botConfigurator.getConfiguration().rules[rule.type].removeMessage) {
                    currentStatus = 'Enabled'
                    newStatus = 'Disable'  
                } else {
                    currentStatus = 'Disabled'
                    newStatus = 'Enable'                  
                }
    
                let removeMessageMenu = Telegraf.Extra
                    .markdown()
                    .markup((m) => m.inlineKeyboard([
                        [m.callbackButton(`${newStatus}`, `${rule.type}RuleRemoveMessage${newStatus}`)],
                        [m.callbackButton(`Back to ${rule.title} Menu`, `${rule.type}`)]
                    ]).resize());
            
                this.lastConfigRule = ''
                ctx.reply(`Remove Message Setting is ${currentStatus}`, removeMessageMenu)
            })
            
            this.botApiProcessor.action(`${rule.type}RuleRemoveMessageEnable`, (ctx) => {
                this.lastConfigRule = ''
                if (this.botConfigurator.processRemoveMessageRule(rule.type, 'on')) {
                    ctx.reply("Remove Message Setting is set to Enabled")
                } else {
                    ctx.reply("Invalid value for Remove Message Setting")                    
                }
            })
        
            this.botApiProcessor.action(`${rule.type}RuleRemoveMessageDisable`, (ctx) => {
                this.lastConfigRule = ''
                if (this.botConfigurator.processRemoveMessageRule(rule.type, 'off')) {
                    ctx.reply("Remove Message Setting is set to Disabled")
                } else {
                    ctx.reply("Invalid value for Remove Message Setting")                    
                }
            })


            this.botApiProcessor.action(`${rule.type}RuleBanUser`, (ctx) => {
                this.lastConfigRule = ''
                let banUserMenu
                let currentStatus = ''
                let warnings = this.botConfigurator.getConfiguration().rules[rule.type].banUser
    
                if (warnings == 0) {
                    currentStatus = 'Ban Immediately'

                    banUserMenu = Telegraf.Extra
                        .markdown()
                        .markup((m) => m.inlineKeyboard([
                            [m.callbackButton('Disable', `${rule.type}RuleBanUserDisable`)],
                            [m.callbackButton('Warn before banning', `${rule.type}RuleBanUserWarn`)],
                            [m.callbackButton(`Back to ${rule.title} Menu`, `${rule.type}`)]
                        ]).resize());

                } else if (warnings == -1) {
                    currentStatus = 'Disabled'

                    banUserMenu = Telegraf.Extra
                        .markdown()
                        .markup((m) => m.inlineKeyboard([
                            [m.callbackButton('Ban Immediately', `${rule.type}RuleBanUserImmediately`)],
                            [m.callbackButton('Warn before banning', `${rule.type}RuleBanUserWarn`)],
                            [m.callbackButton(`Back to ${rule.title} Menu`, `${rule.type}`)]
                        ]).resize());
                    
                } else {
                    currentStatus = `Ban after ${warnings} warnings`

                    banUserMenu = Telegraf.Extra
                        .markdown()
                        .markup((m) => m.inlineKeyboard([
                            [m.callbackButton('Disable', `${rule.type}RuleBanUserDisable`)],
                            [m.callbackButton('Ban Immediatelly', `${rule.type}RuleBanUserImmediately`)],
                            [m.callbackButton('Warn before banning', `${rule.type}RuleBanUserWarn`)],
                            [m.callbackButton(`Back to ${rule.title} Menu`, `${rule.type}`)]
                        ]).resize());
                
                }
                ctx.reply(`Ban User Setting is ${currentStatus}`, banUserMenu)
            })
            
            this.botApiProcessor.action(`${rule.type}RuleBanUserImmediately`, (ctx) => {
                if (this.botConfigurator.processBanUserRule(rule.type, '0')) {
                    ctx.reply("Ban User Setting is set to Ban Immediately")
                } else {
                    ctx.reply("Invalid value for Ban User Setting Warning")                    
                }
            })
        
            this.botApiProcessor.action(`${rule.type}RuleBanUserDisable`, (ctx) => {
                if (this.botConfigurator.processBanUserRule(rule.type, '-1')) {
                    ctx.reply("Ban User Setting is set to Disabled")
                } else {
                    ctx.reply("Invalid value for Ban User Setting Warning")                    
                }
            })            

            this.botApiProcessor.action(`${rule.type}RuleBanUserWarn`, (ctx) => {
                this.lastConfigRule = rule.type
                ctx.reply("Enter Number of Warnings")                
            })            
            
        })


        this.botApiProcessor.action('badWords', (ctx) => {
            let currentWords = this.botConfigurator.getConfiguration().badWords
            currentWords = currentWords.replace("(", "").replace(")", "").split("|").join(", ")

            let badWordsMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.inlineKeyboard([
                    [m.callbackButton('Add Word/Phrase', 'badWordsSetWord')],
                    [m.callbackButton('Remove Word/Phrase', 'badWordsUnsetWord')],
                    [m.callbackButton('Back to Main Menu', 'mainMenu')]
                ]).resize());
        
            this.lastConfigRule = ''
            ctx.reply(`Current Banned Word/Phrase(s) are ${currentWords}`, badWordsMenu)
        })
        
        this.botApiProcessor.action('badWordsSetWord', (ctx) => {
            this.lastConfigRule = 'badWordsSet'
            ctx.reply("Enter Word/Phrase(s) to add delimited with comma")                
        })

        this.botApiProcessor.action('badWordsUnsetWord', (ctx) => {
            this.lastConfigRule = 'badWordsUnset'
            ctx.reply("Enter Word/Phrase(s) to remove delimited with comma")                
        })


        this.botApiProcessor.action('replyMessages', (ctx) => {
            let currentWords = this.botConfigurator.getConfiguration().badWords
            currentWords = currentWords.replace("(", "").replace(")", "").split("|").join(", ")

            let replyMessagesMenu = Telegraf.Extra
                .markdown()
                .markup((m) => m.inlineKeyboard([
                    [m.callbackButton('Inappropriate Content Message', 'inappropriateContentReplyMessage')],
                    [m.callbackButton('Wallet Address / Private Key Message', 'walletKeyReplyMessage')],
                    [m.callbackButton('Posting Image Message', 'imageReplyMessage')],
                    [m.callbackButton('Posting Video Message', 'videoReplyMessage')],
                    [m.callbackButton('Posting Audio Message', 'audioReplyMessage')],
                    [m.callbackButton('Posting URL Message', 'urlReplyMessage')],
                    [m.callbackButton('Warning to Member', 'warningReplyMessage')]
                ]).resize());
        
            this.lastConfigRule = ''
            ctx.reply("Reply Messages", replyMessagesMenu)
        })
 
        replyMessages.forEach(replyMessage => {
            this.botApiProcessor.action(`${replyMessage.type}`, (ctx) => {
                this.lastConfigRule = replyMessage.type
        		ctx.reply(`Current Reply Message is: ${this.botConfigurator.getConfiguration().replyMessages[replyMessage.type.replace('ReplyMessage', '')]}. \n\nEnter new Reply Message`)
            })    
        })
    }

    private connectToDatabase() {
        createConnection({
            type: 'mysql',
            host: this.botConfigurator.getConfiguration().database.hostname,
            username: this.botConfigurator.getConfiguration().database.username,
            password: this.botConfigurator.getConfiguration().database.password,
            database: this.botConfigurator.getConfiguration().database.database,
            port: this.botConfigurator.getConfiguration().database.port,
            insecureAuth : true,
            entities: [ChatMember, MemberHistory]
        }).then( connection => {
            this.dbConnection = connection 
		    this.botMessage.displayMessage("Successfully connected to database")
        }).catch(function(e) {
            console.log("Unable to connect to database, ", e);
            console.log("Exiting..");
			process.exit()
        })           
    }

}
