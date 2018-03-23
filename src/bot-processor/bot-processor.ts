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

        this.botApiProcessor.startPolling()

		this.chatAdmins = []
		
		this.getAdmins(true)
		
        var checkMemeberInterval = setInterval(() =>
            this.checkMembers()    
        , environment.checkMemberInterval); 
    }        

    private addMember(message) {
		if (environment.displayMessages) {
			console.log(message)
		}
		
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

        if (environment.rules.checkAdmin) {
            this.chatAdmins.forEach(admin => {
				if (admin.id != member.id) {
					let adminFirstName = admin.firstName.toLowerCase().replace(/\W/g, '')
					let adminLastName = admin.lastName.toLowerCase().replace(/\W/g, '')
					let adminUserName = admin.userName.toLowerCase().replace(/\W/g, '')

					let memberFirstName = member.first_name.toLowerCase().replace(/\W/g, '')
					let memberLastName = (member.last_name) ? member.last_name.toLowerCase().replace(/\W/g, '') : ''
					let memberUserName = (member.username) ? member.username.toLowerCase().replace(/\W/g, '') : ''

					if (environment.displayMessages) {
						console.log('Chat ' + environment.chatId + ' - ' + 'Is ' + (memberFirstName + memberLastName + memberUserName) + ' equal to ' + (adminFirstName + adminLastName + adminUserName))
					}
					
					if ((adminFirstName + adminLastName + adminUserName) == (memberFirstName + memberLastName + memberUserName)) {   
						if (environment.displayMessages) {
							console.log('Chat ' + environment.chatId + ' - ' + 'It is')
						}
						result = true    
					}   
				}
            });   
        }
        return result                    
    }

    private checkMember(member) {
        if (environment.displayMessages) {
			console.log('Chat ' + environment.chatId + ' - ' + 'Check member: ' + member.chatMemberId);
		}
		
        let memberData = this.botApiProcessor.telegram.getChat(member.chatMemberId).then(details => { 
			if (environment.displayMessages) {
				console.log(details)
			}
			
            if (this.userShouldBeBanned(details) === true) {
                if (environment.displayMessages) {
					console.log('Chat ' + environment.chatId + ' - ' + 'Remove Member: ' + 
                            member.chatMemberId + ', ' + 
                            details.first_name + ' ' + 
                            ((details.last_name) ? details.last_name : '') + ' ' + 
                            ((details.username) ? details.username : '')) 
                }
				
                this.botApiProcessor.telegram.kickChatMember(environment.chatId, member.chatMemberId).then(details => { 
					if (environment.displayMessages) {
						console.log(details) 
					}

					this.dbConnection.getRepository(ChatMember).removeById(member.chatMemberId);
					
					let memberData = {
						chatId: member.chatId,
						chatMemberId: member.chatMemberId,
						chatMemberFirstName: details.first_name,
						chatMemberLastName: details.last_name ? details.last_name : '',
						isBot: member.isBot,
						joinDate: member.joinDate,
						status: 'banned',
						chatMemberUserName: details.username ? details.username : '',            
						isAdmin: member.isAdmin,
						reason: 'Banned for impersonating Administrator'
					}
					
					this.addMemberHistory(memberData)        
				})					
            }
        } )           
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
					console.log(this.chatAdmins)		
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
        })        
    }
}





