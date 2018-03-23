export const environment = {
  database: {
    hostname: 'localhost',
    port: 3306,
    database: 'database name',
    username: 'database user',
    password: 'database password'
  },
  botToken: 'bot token',
  chatId: 'chat id',
  checkMemberInterval: '15000', // miliseconds
  rules : {
    checkAdmin: true,
    checkKeyword: false,
  },
  keywords: [
  ],
  displayMessages: true
};
