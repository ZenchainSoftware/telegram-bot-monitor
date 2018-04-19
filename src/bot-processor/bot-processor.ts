import "reflect-metadata"
import { createConnection, Entity, Column, getManager } from "typeorm"
import * as Telegraf from "telegraf"
import { ChatMember } from "../model/ChatMember"
import { MemberHistory } from "../model/MemberHistory"
import { environment } from "../environments/environment"


export class BotProcessor {

    private botApiProcessor
    private dbConnection
    private chatAdmins

    public start() {
        this.connectToDatabase()
     
        this.botApiProcessor = new Telegraf(environment.botToken)
        
        this.botApiProcessor.on('new_chat_members', (ctx) => this.addMember(ctx.message))
        this.botApiProcessor.on('left_chat_member', (ctx) => this.removeMember(ctx.message))

        if (environment.rules.checkImage.validate) {
            this.botApiProcessor.on('photo', (ctx) => this.processMultimediaMessage(ctx.message, 'image'))
        }
        if (environment.rules.checkVideo.validate) {
            this.botApiProcessor.on('video', (ctx) => this.processMultimediaMessage(ctx.message, 'video'))
            this.botApiProcessor.on('video_note', (ctx) => this.processMultimediaMessage(ctx.message, 'video'))
        }        
        if (environment.rules.checkAudio.validate) {
            this.botApiProcessor.on('voice', (ctx) => this.processMultimediaMessage(ctx.message, 'voice'))
            this.botApiProcessor.on('audio', (ctx) => this.processMultimediaMessage(ctx.message, 'audio'))
        }

        if (environment.rules.checkWalletAddress.validate || environment.rules.checkRegex.validate || environment.rules.checkKeyword.validate || environment.rules.checkKeyword.validate) {
            this.botApiProcessor.on('message', (ctx) => this.processMessage(ctx.message))
        }
        
        this.botApiProcessor.startPolling()

		this.chatAdmins = []
		
		this.getAdmins(true)
		
        var checkMemeberInterval = setInterval(() =>
            this.checkMembers()    
        , environment.checkMemberInterval); 
    }        

    private processMessage(message) {
        console.log('Chat ' + environment.chatId + ' - Received message: ' + JSON.stringify(message, null, 2))

        let adminMessage = false

        this.chatAdmins.forEach(admin => {
            if (admin.id == message.from.id) {
                adminMessage = true
            }
        })

        if (!adminMessage) {

            let banMember = false
            let banImmediately = false
            let reason = ''
            let messageToSend = ''
            let warningToSend = ''
            let messageToCheck = message.text ? message.text.replace(environment.validChars, "") : ''

            if (environment.displayMessages) {
                console.log('Chat ' + environment.chatId + ' - ' + 'Check message: ' + messageToCheck)
            }

            if (environment.rules.checkWalletAddress.validate) {
                environment.walletAddress.forEach(address => {
                    if (address.test(messageToCheck)) {
                        if (environment.displayMessages) {
                            console.log('Chat ' + environment.chatId + ' - ' + 'Wallet address detected: ' + messageToCheck)
                        }                        

                        if (environment.rules.checkWalletAddress.banUser) {
                            banMember = true    
                            banImmediately = true
                        }
                        if (environment.rules.checkWalletAddress.removeMessage) {
                            reason = 'Banned for posting Wallet address'
                            messageToSend = environment.replyMessages.ethAddress
                        }
                    }
                })
            }

            if (environment.rules.checkUrl.validate) {
                console.log('Chat ' + environment.chatId + ' - ' + 'Check URL')
                let messageEntitiesExist = message.entities ? true : false

                let pattern = new RegExp(environment.urlRegex)
                let match = pattern.test(messageToCheck)

                if (messageEntitiesExist) {
                    message.entities.forEach(entity => {
                        if (entity.type == 'url') {
                            if (environment.displayMessages) {
                                console.log('Chat ' + environment.chatId + ' - ' + 'URL detected: ' + messageToCheck)
                            }                        
                            if (environment.rules.checkWalletAddress.banUser) {
                                banMember = true        
                                banImmediately = false
                            }
                            if (environment.rules.checkWalletAddress.removeMessage) {
                                messageToSend = environment.replyMessages.url                        
                            }
                        }
                    })    
                } else if (match){
                    if (environment.displayMessages) {
                        console.log('Chat ' + environment.chatId + ' - ' + 'URL detected: ' + messageToCheck)
                    }                        
                    if (environment.rules.checkUrl.banUser) {
                        banMember = true        
                        banImmediately = false
                    }
                    if (environment.rules.checkUrl.removeMessage) {
                        messageToSend = environment.replyMessages.url  
                    }                                  
                }
            }
            
            if (environment.rules.checkRegex.validate) {
                environment.badWords.forEach(regexRule => {
                    console.log('Chat ' + environment.chatId + ' - ' + 'Check ' + messageToCheck + ' for ' + regexRule)
                    let pattern = new RegExp(regexRule)
                    let match = pattern.test(messageToCheck)

                    if (match === true) {
                        if (environment.displayMessages) {
                            console.log('Chat ' + environment.chatId + ' - ' + messageToCheck + ' matches ' + regexRule)
                        }                            

                        reason = 'Banned for posting inappropriate content (bad language)'
                        if (environment.rules.checkRegex.banUser) {
                            banMember = true        
                            banImmediately = false
                        }        
                        if (environment.rules.checkRegex.removeMessage) {
                            messageToSend = environment.replyMessages.inappropriateContent
                            warningToSend = environment.replyMessages.warning
                        }
                    }
                })    
            }

            if (environment.rules.checkVideo.validate || environment.rules.checkAudio.validate || environment.rules.checkImage.validate || environment.rules.checkAnyFile.validate) {
                let documentExists = (message.document) ? true : false

                if (documentExists === true) {
                    let documentType = message.document.mime_type.substring(0, 5)

                    if (documentType == 'image') { 
                        if (environment.rules.checkImage.banUser) {
                            banMember = true        
                            banImmediately = false
                        }
                        if (environment.rules.checkImage.removeMessage) {
                            messageToSend = environment.replyMessages.image
                            warningToSend = environment.replyMessages.warning
                        }                            
                    }
                    if (documentType == 'audio' && environment.rules.checkAudio.banUser) {
                        if (environment.rules.checkAudio.banUser) {
                            banMember = true        
                            banImmediately = false
                        }
                        if (environment.rules.checkAudio.removeMessage) {
                            messageToSend = environment.replyMessages.audio
                            warningToSend = environment.replyMessages.warning
                        }                            
                    }
                    if (documentType == 'video' && environment.rules.checkVideo.banUser) {
                        if (environment.rules.checkVideo.banUser) {
                            banMember = true        
                            banImmediately = false
                        }
                        if (environment.rules.checkVideo.removeMessage) {
                            messageToSend = environment.replyMessages.video
                            warningToSend = environment.replyMessages.warning
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
                    this.banOrWarnMember(banMemberData, banImmediately)                                        
                }
                if (messageToSend !== '') {
                    this.removeMessage(banMemberData, messageToSend, warningToSend)                        
                }
            }
        } else {
            if (environment.displayMessages) {
                console.log('Chat ' + environment.chatId + ' - ' + 'Message from Admin to be skipped: ' + JSON.stringify(message, null, 2))
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
            if (environment.displayMessages) {
  			    console.log('Chat ' + environment.chatId + ' - ' + 'Multimedia message received: ' + JSON.stringify(message, null, 2))
            }
        

            let banMember = false        
            let banImmediately = false
            let messageToSend = ''
            let reason = ''

            if (messageType == 'audio') {
                if (environment.rules.checkAudio.banUser) {
                    banMember = true        
                    banImmediately = false
                }    
                if (environment.rules.checkAudio.removeMessage) {
                    reason = 'Banned for posting inappropriate content (audio)'
                    messageToSend = environment.replyMessages.audio          
                }  
            } else if (messageType == 'video') {
                if (environment.rules.checkVideo.banUser) {
                    banMember = true        
                    banImmediately = false
                }    
                if (environment.rules.checkVideo.removeMessage) {
                    reason = 'Banned for posting inappropriate content (video)'
                    messageToSend = environment.replyMessages.video          
                }  
            } else if (messageType == 'image') {
                if (environment.rules.checkImage.banUser) {
                    banMember = true        
                    banImmediately = false
                }    
                if (environment.rules.checkImage.removeMessage) {
                    reason = 'Banned for posting inappropriate content (image)'
                    messageToSend = environment.replyMessages.image          
                }  
            }    

            if (banMember || messageToSend) {
                let warningToSend = environment.replyMessages.warning
                
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
                    this.banOrWarnMember(banMemberData, banImmediately) 
                }

                if (messageToSend) {
                    this.removeMessage(banMemberData, messageToSend, warningToSend)     
                }                    
            }
        } else {
            if (environment.displayMessages) {
                console.log('Chat ' + environment.chatId + ' - ' + 'Message from Admin to be skipped: ' + message.text)
            }                        
        }
    }
    
    private addMember(message) {
		if (environment.displayMessages) {
			console.log('Chat ' + environment.chatId + ' - ' + 'New member: ' + JSON.stringify(message, null, 2))
		}

        this.dbConnection.getRepository(MemberHistory).findOne({chatMemberId: message.new_chat_member.id, status: 'banned'}).then(memberDetails => {
            if (memberDetails && message.chat.type == 'group') {
                    let untilDate = Math.ceil(Date.now() / 1000 + 10)
                    this.botApiProcessor.telegram.kickChatMember(environment.chatId, message.new_chat_member.id, untilDate).then(details => { 
                        if (environment.displayMessages) {
                            console.log('Chat ' + environment.chatId + ' - ' + 'Member trying to join is kicked from group as it was already banned. ' + JSON.stringify(details, null, 2)) 
                        }
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
                
                if (environment.displayMessages) {
                    console.log('Chat ' + environment.chatId + ' - ' + 'Add new member ' + newChatMember.chatMemberId + ', ' + newChatMember.chatMemberFirstName + ' ' + newChatMember.chatMemberLastName);
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
        if (environment.displayMessages) {
			console.log('Chat ' + environment.chatId + ' - ' + 'Remove chat member ' + 
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

        if (environment.rules.checkAdmin.validate) {
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
                let memberFirstName = member.first_name.toLowerCase().replace(/\W/g, '').replace(environment.validChars, "")
                let memberLastName = (member.last_name) ? member.last_name.toLowerCase().replace(/\W/g, '').replace(environment.validChars, "") : ''
                let memberUserName = (member.username) ? member.username.toLowerCase().replace(/\W/g, '').replace(environment.validChars, "") : ''
                    
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
                        if (environment.displayMessages) {
                           	console.log('Chat ' + environment.chatId + ' - ' + 'Is ' + memberName + ' equal to ' + adminName)
                        }
                        if (memberName == adminName) {
                            nameMatch = true
                        }
                    })                        
                })
					
				if (nameMatch) {   
					if (environment.displayMessages) {
						console.log('Chat ' + environment.chatId + ' - ' + 'It is')
					}
					result = true    
				}   
			}
        }
        return result                    
    }

    private checkMember(member) {
		
        let memberData = this.botApiProcessor.telegram.getChat(member.chatMemberId).then(details => { 
			if (environment.displayMessages) {
				console.log('Chat ' + environment.chatId + ' - ' + 'Check member: ' + member.chatMemberId + ' ' + member.chatMemberFirstName + ' ' + member.chatMemberLastName + ' ' + member.chatMemberUserName);
				console.log('Chat ' + environment.chatId + ' - ' + JSON.stringify(details, null, 2))
			}
			
            if (this.userShouldBeBanned(details) === true && environment.rules.checkAdmin.banUser) {
                if (environment.displayMessages) {
					console.log('Chat ' + environment.chatId + ' - ' + 'Remove Member: ' + 
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

                this.banOrWarnMember(banMemberData, true)
            }
        } ).catch(function(e) {
            console.log('Chat ' + environment.chatId + ' - ' + 'Member ' + member.chatMemberFirstName + ' ' + member.chatMemberLastName + ' does not exist');
        })           
    }

    private removeMessage(message, messageToSend, warningToSend) {
        if (environment.displayMessages) {
            console.log('Chat ' + environment.chatId + ' - ' + 'Delete message ' + message.messageId) 
        }

        this.botApiProcessor.telegram.deleteMessage(environment.chatId, message.messageId).then(details => { 
            if (environment.displayMessages) {
                console.log('Chat ' + environment.chatId + ' - ' + JSON.stringify(details, null, 2)) 
            }

            let memberIdentifier = '@' + message.chatMemberFirstName + ' ' + message.chatMemberLastName + (message.chatMemberUserName ? ('(' + message.chatMemberUserName + ')') : '')
            
            if (messageToSend !== '') {                
                if (environment.displayMessages) {
                    console.log('Chat ' + environment.chatId + ' - ' + 'Send message ' + memberIdentifier + ', ' + messageToSend) 
                }
                this.botApiProcessor.telegram.sendMessage(environment.chatId, memberIdentifier + ', ' + messageToSend).then(details => { 
                    if (environment.displayMessages) {
                        console.log('Chat ' + environment.chatId + ' - ' + JSON.stringify(details, null, 2)) 
                    }
                })                
            }

            if (warningToSend !== '') {
                if (environment.displayMessages) {
                    console.log('Chat ' + environment.chatId + ' - ' + 'Send message ' + memberIdentifier + ', ' + warningToSend) 
                }
                this.botApiProcessor.telegram.sendMessage(environment.chatId, memberIdentifier + ', ' + warningToSend).then(details => { 
                    if (environment.displayMessages) {
                        console.log('Chat ' + environment.chatId + ' - ' + JSON.stringify(details, null, 2)) 
                    }
                })                
            }
            
        })
    }

    private banOrWarnMember(member, banImmediately) {
        this.dbConnection.getRepository(ChatMember).findOneById(member.chatMemberId).then(memberDetails => {

            if (memberDetails) {

                if (banImmediately === false && memberDetails.warning < environment.userWarnings) {
                    if (environment.displayMessages) {
                        console.log('Chat ' + environment.chatId + ' - ' + 'Warn member for displaying inappropriate content') 
                    }
                    memberDetails.warning++
                    this.dbConnection.getRepository(ChatMember).save(memberDetails);
                } else {
                    if (environment.displayMessages) {
                        console.log('Chat ' + environment.chatId + ' - ' + 'Kick member from group. ') 
                    }
                    let untilDate = Math.ceil(Date.now() / 1000 + 10)
                    this.botApiProcessor.telegram.kickChatMember(environment.chatId, member.chatMemberId, untilDate).then(details => { 
                        if (environment.displayMessages) {
                            console.log('Chat ' + environment.chatId + ' - ' + 'Member kicked from group. ' + JSON.stringify(details, null, 2)) 
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
                            reason: 'Banned for impersonating Administrator'
                        }
                        
                        this.addMemberHistory(memberData)        
                    })					
                }
            }    
        })
    }

    private checkMembers() {
        if (this.dbConnection) {
            if (environment.displayMessages) {
				console.log('Chat ' + environment.chatId + ' - ' + 'Check Members')
			}
			this.getAdmins(true)	
            let membersData = this.dbConnection.getRepository('ChatMember')
            membersData.find().then(members => {
                members.forEach(member => {
                    this.checkMember(member)
                });   
            })                      
        } else {
            if (environment.displayMessages) {
				console.log('Chat ' + environment.chatId + ' - ' + 'Database connection not established yet')   
			}
        }
    }

	private getAdmins(display) {
		this.botApiProcessor.telegram.getChatAdministrators(environment.chatId).then(adminsData => { 
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
				if (environment.displayMessages) {
					console.log('Chat ' + environment.chatId + ' - ' + 'Current Admins')		
					console.log('Chat ' + environment.chatId + ' - ' + JSON.stringify(this.chatAdmins, null, 2))		
				}
			}
		})		
		
	}
    private connectToDatabase() {
        createConnection({
            type: 'mysql',
            host: environment.database.hostname,
            username: environment.database.username,
            password: environment.database.password,
            database: environment.database.database,
            port: environment.database.port,
            entities: [ChatMember, MemberHistory]
        }).then( connection => {
            this.dbConnection = connection 
            if (environment.displayMessages) {
			   console.log('Chat ' + environment.chatId + ' - ' + 'Successfully connected to database')
		    }
        }).catch(function(e) {
            console.log('Chat ' + environment.chatId + ' - ' + 'Unable to connect to database');
            console.log('Chat ' + environment.chatId + ' - ' + 'Exiting..');
			process.exit()
        })           
    }
}





