import "reflect-metadata"
import { createConnection, Entity, Column, getManager } from "typeorm"
import * as Telegraf from "telegraf"
import { BotConfigurator } from "../bot-processor/bot-configurator"
import { ChatMember } from "../model/ChatMember"
import { MemberHistory } from "../model/MemberHistory"


export class BotProcessor {

    private botApiProcessor
    private botConfigurator
    private dbConnection
    private chatAdmins
    private chatId

    constructor() {
        this.botConfigurator = new BotConfigurator()      
        this.chatId = this.botConfigurator.getConfiguration().chatId 
    }

    public start() {
        this.connectToDatabase()
     
        this.botApiProcessor = new Telegraf(this.botConfigurator.getConfiguration().botToken)
        
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

        if (this.botConfigurator.getConfiguration().rules.checkWalletAddress.validate || this.botConfigurator.getConfiguration().rules.checkBadWord.validate || this.botConfigurator.getConfiguration().rules.checkBadWord.validate || this.botConfigurator.getConfiguration().rules.checkBadWord.validate) {
            this.botApiProcessor.on('message', (ctx) => this.processMessage(ctx.message))
        }
        
        this.botApiProcessor.startPolling()

		this.chatAdmins = []
		
		this.getAdmins(true)
		
        var checkMemeberInterval = setInterval(() =>
            this.checkMembers()    
        , this.botConfigurator.getConfiguration().checkMemberInterval); 
    }        

    private processMessage(message) {
        console.log('Chat ' + this.chatId+ ' - Received message: ' + JSON.stringify(message, null, 2))

        let adminMessage = false

        this.chatAdmins.forEach(admin => {
            if (admin.id == message.from.id) {
                adminMessage = true
            }
        })

        let messageToCheck = message.text ? message.text.replace(this.botConfigurator.getConfiguration().validChars, "") : ''
        
        if (!adminMessage) {

            let banMember = false
            let reason = ''
            let messageType = ''
            let messageToSend = ''
            let warningToSend = ''

            if (this.botConfigurator.getConfiguration().displayMessages) {
                console.log('Chat ' + this.chatId+ ' - ' + 'Check message: ' + messageToCheck)
            }

            if (this.botConfigurator.getConfiguration().rules.checkWalletAddress.validate) {
                this.botConfigurator.getConfiguration().walletAddress.forEach(address => {
                    let pattern = new RegExp(address, "gi")
                    if (pattern.test(messageToCheck)) {
                        if (this.botConfigurator.getConfiguration().displayMessages) {
                            console.log('Chat ' + this.chatId+ ' - ' + 'Wallet address detected: ' + messageToCheck)
                        }                        

                        if (this.botConfigurator.getConfiguration().rules.checkWalletAddress.banUser != -1) {
                            banMember = true    
                            messageType = "WalletKey"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkWalletAddress.removeMessage) {
                            reason = 'Removed message for posting Wallet address'
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.walletKey
                        }
                    }
                })
            }

            if (this.botConfigurator.getConfiguration().rules.checkUrl.validate) {
                console.log('Chat ' + this.chatId+ ' - ' + 'Check URL')
                let messageEntitiesExist = message.entities ? true : false

                let pattern = new RegExp(this.botConfigurator.getConfiguration().urlRegex, "gi")
                console.log(pattern)
                let match = pattern.test(messageToCheck)

                if (messageEntitiesExist) {
                    message.entities.forEach(entity => {
                        if (entity.type == 'url') {
                            if (this.botConfigurator.getConfiguration().displayMessages) {
                                console.log('Chat ' + this.chatId+ ' - ' + 'URL detected: ' + messageToCheck)
                            }                        
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
                    if (this.botConfigurator.getConfiguration().displayMessages) {
                        console.log('Chat ' + this.chatId+ ' - ' + 'URL detected: ' + messageToCheck)
                    }                        
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
                console.log('Chat ' + this.chatId+ ' - ' + 'Check ' + messageToCheck + ' for ' + regexRule)
                let pattern = new RegExp(regexRule, "gi")
                let match = pattern.test(messageToCheck)

                if (match === true) {
                    if (this.botConfigurator.getConfiguration().displayMessages) {
                        console.log('Chat ' + this.chatId+ ' - ' + messageToCheck + ' matches ' + regexRule)
                    }                            

                    reason = 'Removed message for posting inappropriate content (bad language)'
                    if (this.botConfigurator.getConfiguration().rules.checkBadWord.banUser != -1) {
                        banMember = true        
                        messageType = "BadWord"
                    }        
                    if (this.botConfigurator.getConfiguration().rules.checkBadWord.removeMessage) {
                        messageToSend = this.botConfigurator.getConfiguration().replyMessages.badLanguage
                        warningToSend = this.botConfigurator.getConfiguration().replyMessages.userWarning
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
                            warningToSend = this.botConfigurator.getConfiguration().replyMessages.userWarning
                        }                            
                    }
                    if (documentType == 'audio') {
                        if (this.botConfigurator.getConfiguration().rules.checkAudio.banUser != -1) {
                            banMember = true        
                            messageType = "Audio"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkAudio.removeMessage) {
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.audio
                            warningToSend = this.botConfigurator.getConfiguration().replyMessages.userWarning
                        }                            
                    }
                    if (documentType == 'video') {
                        if (this.botConfigurator.getConfiguration().rules.checkVideo.banUser != -1) {
                            banMember = true        
                            messageType = "Video"
                        }
                        if (this.botConfigurator.getConfiguration().rules.checkVideo.removeMessage) {
                            messageToSend = this.botConfigurator.getConfiguration().replyMessages.video
                            warningToSend = this.botConfigurator.getConfiguration().replyMessages.userWarning
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
                    this.removeMessage(banMemberData, messageToSend, warningToSend)                        
                }
            }
        } else {
            let configMessage = false
            this.botConfigurator.getConfiguration().configurationMessages.forEach(config => {
                if (message.text.toLowerCase().startsWith(config.toLowerCase())) {
                    configMessage = true
                }
            })

            if (configMessage) {
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Process Configuration Message: ' + JSON.stringify(message, null, 2))
                }            
                this.botConfigurator.processConfigurationMessage(messageToCheck);
            } else {
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Message from Admin to be skipped: ' + JSON.stringify(message, null, 2))
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
            if (this.botConfigurator.getConfiguration().displayMessages) {
  			    console.log('Chat ' + this.chatId+ ' - ' + 'Multimedia message received: ' + JSON.stringify(message, null, 2))
            }
        
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
                let warningToSend = this.botConfigurator.getConfiguration().replyMessages.userWarning
                
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
            if (this.botConfigurator.getConfiguration().displayMessages) {
                console.log('Chat ' + this.chatId+ ' - ' + 'Message from Admin to be skipped: ' + message.text)
            }                        
        }
    }
    
    private addMember(message) {
		if (this.botConfigurator.getConfiguration().displayMessages) {
			console.log('Chat ' + this.chatId+ ' - ' + 'New member: ' + JSON.stringify(message, null, 2))
		}

        this.dbConnection.getRepository(MemberHistory).findOne({chatMemberId: message.new_chat_member.id, status: 'banned'}).then(memberDetails => {
            if (memberDetails && message.chat.type == 'group') {
                    let untilDate = Math.ceil(Date.now() / 1000 + 10)
                    this.botApiProcessor.telegram.kickChatMember(this.botConfigurator.getConfiguration().chatId, message.new_chat_member.id, untilDate).then(details => { 
                        if (this.botConfigurator.getConfiguration().displayMessages) {
                            console.log('Chat ' + this.chatId+ ' - ' + 'Member trying to join is kicked from group as it was already banned. ' + JSON.stringify(details, null, 2)) 
                        }
                    }).catch(function(e) {
                        console.log('Chat ' + this.chatId+ ' - ' + e);
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
                
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Add new member ' + newChatMember.chatMemberId + ', ' + newChatMember.chatMemberFirstName + ' ' + newChatMember.chatMemberLastName);
                }
                
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
            console.log('Chat ' + this.chatId+ ' - ' + e);
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
        if (this.botConfigurator.getConfiguration().displayMessages) {
			console.log('Chat ' + this.chatId+ ' - ' + 'Remove chat member ' + 
                     message.left_chat_member.id + ', ' + 
                     message.left_chat_member.first_name + ' ' + 
                     ((message.left_chat_member.last_name) ? message.left_chat_member.last_name : ''))
		}
		
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
					if (this.botConfigurator.getConfiguration().displayMessages) {
						console.log('Chat ' + this.chatId+ ' - ' + 'It is')
					}
					result = true    
				}   
			}
        }
        return result                    
    }

    private checkMember(member) {
		
        let memberData = this.botApiProcessor.telegram.getChat(member.chatMemberId).then(details => { 
			if (this.botConfigurator.getConfiguration().displayMessages) {
				console.log('Chat ' + this.chatId+ ' - ' + 'Check member: ' + member.chatMemberId + ' ' + member.chatMemberFirstName + ' ' + member.chatMemberLastName + ' ' + member.chatMemberUserName);
				console.log('Chat ' + this.chatId+ ' - ' + JSON.stringify(details, null, 2))
			}
			
            if (this.userShouldBeBanned(details) === true && this.botConfigurator.getConfiguration().rules.checkAdmin.banUser) {
                if (this.botConfigurator.getConfiguration().displayMessages) {
					console.log('Chat ' + this.chatId+ ' - ' + 'Remove Member: ' + 
                            member.chatMemberId + ', ' + 
                            details.first_name + ' ' + 
                            ((details.last_name) ? details.last_name : '') + ' ' + 
                            ((details.username) ? details.username : '')) 
                }

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
            console.log('Member ' + member.chatMemberFirstName + ' ' + member.chatMemberLastName + ' does not exist');
        })           
    }

    private removeMessage(message, messageToSend, warningToSend) {
        if (this.botConfigurator.getConfiguration().displayMessages) {
            console.log('Chat ' + this.chatId+ ' - ' + 'Delete message ' + message.messageId) 
        }

        this.botApiProcessor.telegram.deleteMessage(this.botConfigurator.getConfiguration().chatId, message.messageId).then(details => { 
            if (this.botConfigurator.getConfiguration().displayMessages) {
                console.log('Chat ' + this.chatId+ ' - ' + JSON.stringify(details, null, 2)) 
            }

            let memberIdentifier = '@' + message.chatMemberFirstName + ' ' + message.chatMemberLastName + (message.chatMemberUserName ? ('(' + message.chatMemberUserName + ')') : '')
            
            if (messageToSend !== '') {                
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Send message ' + memberIdentifier + ', ' + messageToSend) 
                }
                this.botApiProcessor.telegram.sendMessage(this.botConfigurator.getConfiguration().chatId, memberIdentifier + ', ' + messageToSend).then(details => { 
                    if (this.botConfigurator.getConfiguration().displayMessages) {
                        console.log('Chat ' + this.chatId+ ' - ' + JSON.stringify(details, null, 2)) 
                    }
                }).catch(function(e) {
                    console.log('Chat ' + this.chatId+ ' - ' + e);
                })    
                }

            if (warningToSend !== '') {
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Send message ' + memberIdentifier + ', ' + warningToSend) 
                }
                this.botApiProcessor.telegram.sendMessage(this.botConfigurator.getConfiguration().chatId, memberIdentifier + ', ' + warningToSend).then(details => { 
                    if (this.botConfigurator.getConfiguration().displayMessages) {
                        console.log('Chat ' + this.chatId+ ' - ' + JSON.stringify(details, null, 2)) 
                    }
                }).catch(function(e) {
                    console.log('Chat ' + this.chatId+ ' - ' + e);
                })    
            }
            
        }).catch(function(e) {
            console.log('Chat ' + this.chatId+ ' - ' + e);
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
                        allowedValue = this.botConfigurator.getConfiguration().rules.checkWalletAddress.banUser
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
                    if (this.botConfigurator.getConfiguration().displayMessages) {
                        console.log('Chat ' + this.chatId+ ' - ' + 'Warn member for displaying inappropriate content') 
                    }
                    this.dbConnection.getRepository(ChatMember).save(memberDetails);
                } else {
                    if (this.botConfigurator.getConfiguration().displayMessages) {
                        console.log('Chat ' + this.chatId+ ' - ' + 'Kick member from group. ') 
                    }
                    let untilDate = Math.ceil(Date.now() / 1000 + 10)
                    this.botApiProcessor.telegram.kickChatMember(this.botConfigurator.getConfiguration().chatId, member.chatMemberId, untilDate).then(details => { 
                        if (this.botConfigurator.getConfiguration().displayMessages) {
                            console.log('Chat ' + this.chatId+ ' - ' + 'Member kicked from group. ' + JSON.stringify(details, null, 2)) 
                        }
                                
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
                        console.log('Chat ' + this.chatId+ ' - ' + e);
                    })    
                        }
            }    
        }).catch(function(e) {
            console.log('Chat ' + this.chatId+ ' - ' + e);
        })    
}

    private checkMembers() {
        if (this.botConfigurator.getConfiguration().rules.checkAdmin.validate) {
            if (this.dbConnection) {
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Check Members')
                }
                this.getAdmins(true)	
                let membersData = this.dbConnection.getRepository('ChatMember')
                membersData.find().then(members => {
                    members.forEach(member => {
                        this.checkMember(member)
                    });   
                }).catch(function(e) {
                    console.log('Chat ' + this.chatId+ ' - ' + e);
                })    
            } else {
                if (this.botConfigurator.getConfiguration().displayMessages) {
                    console.log('Chat ' + this.chatId+ ' - ' + 'Database connection not established yet')   
                }
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
				if (this.botConfigurator.getConfiguration().displayMessages) {
					console.log('Chat ' + this.chatId+ ' - ' + 'Current Admins')		
					console.log('Chat ' + this.chatId+ ' - ' + JSON.stringify(this.chatAdmins, null, 2))		
				}
			}
        }).catch(function(e) {
            console.log('Chat ' + this.chatId+ ' - ' + e);
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
            if (this.botConfigurator.getConfiguration().displayMessages) {
			   console.log('Chat ' + this.chatId+ ' - ' + 'Successfully connected to database')
		    }
        }).catch(function(e) {
            console.log('Unable to connect to database, ' + e);
            console.log('Exiting..');
			process.exit()
        })           
    }
}





