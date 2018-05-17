export const environment = {
  "database": {
    "mysql": {
      "type": "mysql",
      "hostname": "localhost",
      "port": 3306,
      "database": "zenchain_bot",
      "username": "zenchain_bot_user",
      "password": "strong_password",
      "insecureAuth": true,
      "entities": [
        null,
        null
      ]
    },
    "sqlite": {
      "type": "sqlite",
      "database": "zenchain_bot_sqlite.db",
      "insecureAuth": true,
      "entities": [
        null,
        null
      ]
    },
    "useDatabase": "sqlite"
  },
  "botToken": "555584786:AAGCQHeBuid5YvkX8LBcS2ySJ7KqhEHdiIc",
  "chatId": "-294145247",
  "checkMemberInterval": "5000",
  "rules": {
    "checkAdmin": {
      "validate": true,
      "banUser": "0"
    },
    "checkBadWord": {
      "validate": true,
      "removeMessage": true,
      "banUser": "4"
    },
    "checkWalletKey": {
      "validate": true,
      "removeMessage": true,
      "banUser": "5"
    },
    "checkAudio": {
      "validate": true,
      "removeMessage": false,
      "banUser": "-1"
    },
    "checkVideo": {
      "validate": false,
      "removeMessage": false,
      "banUser": "-1"
    },
    "checkImage": {
      "validate": false,
      "removeMessage": false,
      "banUser": "-1"
    },
    "checkUrl": {
      "validate": true,
      "removeMessage": true,
      "banUser": "-1"
    },
    "checkAnyFile": {
      "validate": false,
      "removeMessage": false,
      "banUser": "-1"
    }
  },
  "badWords": "(free eth|send me some eth|private key)",
  "urlRegex": "(http|https):",
  "walletAddress": [
    "(\\b0x[a-f0-9]{40,}\\b)",
    "(\\b[0-9a-z]{34,}\\b)"
  ],
  "userWarnings": 2,
  "replyMessages": {
    "inappropriateContent": "The message has been deleted because it contained inappropriate message",
    "walletKey": "The message has been deleted because it contained Wallet address or private key",
    "image": "The message has been deleted because it contained image",
    "video": "The message has been deleted because it contained video",
    "audio": "The message has been deleted because it contained audio",
    "url": "The message has been deleted because it contained external link (url)",
    "warning": "Do not post messages with inappropriate content, Wallet address, audio, video or image. You will be banned if you post such message again"
  },
  "displayMessages": true,
  "validChars": {}
}