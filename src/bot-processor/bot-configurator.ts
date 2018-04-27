import { environment } from "../environments/environment"
import * as fs from 'fs';

export class BotConfigurator {
    private configuration;
    
    constructor() {
        this.configuration = environment;
        this.configuration.validChars = /[^\x20-\x7E]+/g        
    } 

    public getConfiguration() {
        return this.configuration
    }

    public processConfigurationMessage(message) {
        let messageParts = message.split(" ");

        let messageRule = messageParts.filter(item => item.toLowerCase() !== messageParts[0].toLowerCase());

        messageRule = messageRule.join(" ")

        console.log(messageRule)
        switch (messageParts[0].toLowerCase()) {
            case "!checkmemberinterval":
                this.processMemberInterval(messageRule)
                break
            case "!checkadminrule":
                this.processAdminRule(messageRule)
                break
            case "!checkwalletkeyrule":
                this.processRule(messageRule, "checkWalletAddress")
                break
            case "!checkbadlanguagerule":
                this.processRule(messageRule, "checkBadWord")
                break
            case "!checkimagerule":
                this.processRule(messageRule, "checkImage")
                break
            case "!checkaudiorule":
                this.processRule(messageRule, "checkAudio")
                break
            case "!checkvideorule":
                this.processRule(messageRule, "checkVideo")
                break
            case "!checkotherfilerule":
                this.processRule(messageRule, "checkAnyFile")
                break
            case "!checkurlrule":
                this.processRule(messageRule, "checkUrl")
                break
            case "!badwords":
                this.processBadWordsMessage(messageRule)
                break
            case "!replymessage":
                this.processReplyMessage(messageRule)
                break
        }
    }

    private processMemberInterval(messageRules) {
        if (this.configuration.displayMessages) {
            console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check Member Interval Configuration Message, Rules: ' + messageRules)
        }            
        
        let interval = parseInt(messageRules)

        if (interval != NaN && interval >= 1000 && interval <= 3600000) {
            this.configuration.checkMemberInterval = messageRules
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check Member Interval updated to: ' + interval)
            }            
        } else {
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid Check Member Interval value: ' + messageRules)
            }                            
        }
        this.writeConfiguration(this.configuration)        
    }

    private processAdminRule(messageRules) {
        if (this.configuration.displayMessages) {
            console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check Admin Rule Configuration Message, Rules: ' + messageRules)
        }            

        let messageParts = messageRules.toString().split(";")

        let validateRule = messageParts[0]
        let banUser = messageParts[1]

        let validateRuleValid = true

        if (validateRule != 'on' && validateRule != 'off') {
            validateRuleValid = false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid CheckAdmin Rule validateRule value: ' + messageParts[0])
            }                            
        }
        
        let banUserValid = true
        
        if (banUser != 'on' && banUser != 'off') {
            banUserValid = false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid CheckAdmin Rule banUser value: ' + messageParts[1])
            }                            
        }

        if (validateRuleValid && banUserValid) {
            this.configuration.rules.checkAdmin.validate = validateRule == 'on' ? true :  false
            this.configuration.rules.checkAdmin.banUser = banUser == 'on' ? true : false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process CheckAdmin Rule updated to: ' + messageRules)
            }                        
            this.writeConfiguration(this.configuration)
        }
    }

    private processRule(messageRules, ruleType) {
        if (this.configuration.displayMessages) {
            console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check ' + ruleType + ' Rule Configuration Message, Rules: ' + messageRules)
        }            

        let messageParts = messageRules.toString().split(";")

        let validateRule = messageParts[0]
        let removeMessage = messageParts[1]
        let banUser = parseInt(messageParts[2])
        
        let validateRuleValid = true

        if (validateRule != 'on' && validateRule != 'off') {
            validateRuleValid = false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid Check ' + ruleType + ' Rule validateRule value: ' + messageParts[0])
            }                            
        }
                
        let removeMessageValid = true
        
        if (removeMessage != 'on' && removeMessage != 'off') {
            removeMessageValid = false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid Check ' + ruleType + ' Rule removeMessage value: ' + messageParts[1])
            }                            
        }

        let banUserValid = true
            
        if (banUser == NaN || banUser < -1 || banUser > 100) {
            banUserValid = false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid Check ' + ruleType + ' Rule banUser value: ' + messageParts[2])
            }            
        }

        if (validateRuleValid && removeMessageValid && banUserValid) {
            this.configuration.rules[ruleType].validate = validateRule == 'on' ? true :  false
            this.configuration.rules[ruleType].removeMessage = removeMessage == 'on' ? true :  false
            this.configuration.rules[ruleType].banUser = banUser
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check ' + ruleType + ' Rule updated to: ' + messageRules)
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check ' + ruleType + ' Rule updated to: ' + this.configuration.rules[ruleType].validate)
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check ' + ruleType + ' Rule updated to: ' + this.configuration.rules[ruleType].removeMessage)
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Check ' + ruleType + ' Rule updated to: ' + this.configuration.rules[ruleType].banUser)
            }                        
            this.writeConfiguration(this.configuration)
        }
    }

    private processBadWordsMessage(messageRules) {
        if (this.configuration.displayMessages) {
            console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Reply Message Configuration Message, Rules: ' + messageRules)
        }            

        let messageParts = messageRules.toString().split(";")

        let ruleAction = messageParts[0].toLowerCase()
        let badWords = messageParts[1].toLowerCase()
        
        let ruleActionValid = true

        if (ruleAction != 'set' && ruleAction != 'unset') {
            ruleActionValid = false
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Invalid Bad Words ruleAction value: ' + messageParts[0])
            }                            
        }

                
        if (ruleActionValid) {
            let ruleWords = this.configuration.badWords.toString().replace("(", "").replace(")", "").split("|") 
            let words = badWords.split(",")
            let newWords = ruleWords

            if (ruleAction == 'set') {
                words.forEach(word => {
                    if (ruleWords.indexOf(word) == -1 && newWords.indexOf(word) == -1) {
                        newWords.push(word)  
                    }
                });                    
            } else if (ruleAction == 'unset') {
                words.forEach(word => {
                    if (ruleWords.indexOf(word) != -1) {
                        newWords.push(word)  
                    }
                });                                    
            }

            let newRuleWords = "(" + newWords.join("|") + ")"

            this.configuration.badWords = newRuleWords

            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Bad Words updated to: ' + messageRules)
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'New bad words: ' + this.configuration.badWords)
            }    
            
            this.writeConfiguration(this.configuration)
        }
    }
    
    
    private processReplyMessage(messageRules) {
        if (this.configuration.displayMessages) {
            console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Reply Message Configuration Message, Rules: ' + messageRules)
        }            

        let messageParts = messageRules.toString().split(";")

        let messageType = messageParts[0].toLowerCase()
        let messageContent = messageParts[1]
        
        let messageTypeValid = false
        let messageTypeToConfig = ''

        this.configuration.replyMessageTypes.forEach(replyMessageType => {
            if (messageType == replyMessageType.toLowerCase()) {
                messageTypeValid = true
                messageTypeToConfig = replyMessageType                            
            }            
        });
                
        if (messageTypeValid) {
            this.configuration.replyMessages[messageTypeToConfig] = messageContent
            if (this.configuration.displayMessages) {
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Reply Message ' + messageType + ' Rule updated to: ' + messageRules)
                console.log('Chat ' + this.configuration.chatId + ' - ' + 'Process Reply Message ' + messageType + ' Rule updated to: ' + messageContent)
            }                        
            this.writeConfiguration(this.configuration)
        }
    }

    private writeConfiguration(configuration){
        let newConfiguration = 'export const environment = ' + JSON.stringify(configuration, null, 2)
        fs.writeFile('src/environments/environment.ts', newConfiguration,  function(err) {
            if (err) {
                return console.error('Chat ' + configuration.chatId + ' - ' + err);
            }
            console.log('Chat ' + configuration.chatId + ' - Configuration saved');
        });
    }

}