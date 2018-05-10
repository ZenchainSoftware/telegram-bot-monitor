import { environment } from "../environments/environment"
import { BotMessage } from "../bot-processor/bot-message"
import * as fs from 'fs';

export class BotConfigurator {
    private configuration;
    private botMessage
    
    constructor() {
        this.configuration = environment;
        this.configuration.validChars = /[^\x20-\x7E]+/g        
        this.botMessage = new BotMessage()     
    } 

    public getConfiguration() {
        return this.configuration
    }


    private processMemberInterval(messageRules) {
        this.botMessage.displayMessage(`Process Check Member Interval Configuration Message, Rules: ${messageRules}`)
        
        let interval = parseInt(messageRules)

        if (interval != NaN && interval >= 1000 && interval <= 3600000) {
            this.configuration.checkMemberInterval = messageRules
                
            this.botMessage.displayMessage(`Process Check Member Interval updated to: ${interval}`)
        } else {
            this.botMessage.displayMessage(`Invalid Check Member Interval value: ${messageRules}`)
        }
        this.writeConfiguration(this.configuration)        
    }

    public processValidationRule(ruleType, ruleValue) {
        this.botMessage.displayMessage(`Process ${ruleType} Validation Rule`)

        if (ruleValue == 'on' || ruleValue == 'off') {
            this.configuration.rules[ruleType].validate = ruleValue == 'on' ? true :  false

            this.botMessage.displayMessage(`Process ${ruleType} Validate Rule updated to ${ruleValue}`)

            this.writeConfiguration(this.configuration)

            return true
        } else {
            this.botMessage.displayMessage(`Invalid ${ruleType} Validation Rule value ${ruleValue}`)
            return false
        }
    }

    public processRemoveMessageRule(ruleType, ruleValue) {
        this.botMessage.displayMessage(`Process ${ruleType} Remove Message Rule`)

        if (ruleValue == 'on' || ruleValue == 'off') {
            this.configuration.rules[ruleType].removeMessage = ruleValue == 'on' ? true :  false
                
            this.botMessage.displayMessage(`Process ${ruleType} Remove Message Rule updated to: ${ruleValue}`)
            
            this.writeConfiguration(this.configuration)

            return true
        } else {
            this.botMessage.displayMessage(`Invalid ${ruleType} Remove Message Rule value: ${ruleValue}`)

            return false
        }
    }
    
    public processBanUserRule(ruleType, ruleValue) {
        this.botMessage.displayMessage(`Process ${ruleType} Ban User Rule`)

        if (ruleValue >= -1) {
            this.configuration.rules[ruleType].banUser = ruleValue

            this.botMessage.displayMessage(`Process ${ruleType} Ban User Rule updated to: ${ruleValue}`)

            this.writeConfiguration(this.configuration)

            return true
        } else {
            this.botMessage.displayMessage(`Invalid ${ruleType} Ban User Rule value: ${ruleValue}`)

            return false
        }
    }
    

    private processBadWords(ruleAction, messageRules) {
        this.botMessage.displayMessage(`Process Banned Words Configuration Message, Rules: ${ruleAction} ${messageRules}`)

        let ruleWords = this.configuration.badWords.toString().replace("(", "").replace(")", "").split("|") 

        let words = messageRules.split(",")

        let newWords = []

        if (ruleAction == 'set') {
            newWords = ruleWords

            words.forEach(word => {
                if (ruleWords.indexOf(word) == -1 && newWords.indexOf(word) == -1) {
                    newWords.push(word)  
                }
            });                    
        } else if (ruleAction == 'unset') {
            newWords = []

            ruleWords.forEach(word => {
                if (words.indexOf(word) == -1) {
                    newWords.push(word)  
                }
            });                                    
        }

        let newRuleWords = "(" + newWords.join("|") + ")"

        newRuleWords = newRuleWords.replace("(|", "(")

        this.configuration.badWords = newRuleWords

        this.botMessage.displayMessage(`New banned words: ${this.configuration.badWords}`)
            
        this.writeConfiguration(this.configuration)
    }
    
    
    private processReplyMessage(messageType, messageContent) {
        this.botMessage.displayMessage(`Process Reply Message Configuration Message, Rules: ${messageType}, ${messageContent}`)
        
        this.configuration.replyMessages[messageType.replace("ReplyMessage", "")] = messageContent

        this.botMessage.displayMessage(`Process Reply Message ${messageType} Rule updated to: ${messageContent}`)

        this.writeConfiguration(this.configuration)
    }

    private writeConfiguration(configuration){
        let newConfiguration = 'export const environment = ' + JSON.stringify(configuration, null, 2)
        fs.writeFile('src/environments/environment.ts', newConfiguration,  function(err) {
            if (err) {
                console.error("Error occured", err)
            }
        });
    }

}