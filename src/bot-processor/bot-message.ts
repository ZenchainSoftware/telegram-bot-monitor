import { environment } from "../environments/environment"

export class BotMessage {
    public displayMessage(message) {
        if (environment.displayMessages) {
            console.log(`Chat ${environment.chatId} - ${message}`)
         }
    }
}