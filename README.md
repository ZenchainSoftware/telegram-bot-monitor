## Telgram Monitor Bot

Telegram BOT Monitor allows automatic monitoring of [Telegram](https://telegram.org) group members and banning members impersonating group administrators. Telegram BOT Monitor retrieves list of group administrators automatically from the group and checks against list of group members. If BOT identifies a member as the one impersonating administrator, it will automatically ban the member.
Follow instructions bellow to deploy BOT Monitor to Telegram group.

### Creating Group BOT

To create a BOT that will be assigned to group for active monitoring, use Telegram's BotFather as described below:

1.	After logging to your Telegram account, call BotFather on following link:

	https://telegram.me/botfather

2.	Click the button „Open in Web“

3.	Type command /start

4.	Type command /newbot to create new BOT

5.	Enter the name of your new BOT, e.g. MyGroupBOT

6.	Enter the username for your new BOT (it must end with the word bot), e.g. MyGroupBOTTestbot

7.	You will receive a BOT token used to access the Telegarm BOT API

8.	To allow the BOT to receive messages from your group, Privacy mode of the BOT needs to be disabled. To disbale it, execute following commands / actions:

	a.	type /mybots

	b.	click on the BOT MyGroupBOTTestbot

	c.	click on BOT Settings

	d.	click on Group Privacy

	e.	click Turn off

	Note: Privacy mode needs to be disabled before adding BOT the the group.
	
9.	Click on the link of your BOT displayed in the message from the BotFather above (t.me/MyGroupBOTTestbot) and click the button Start


### Assign the BOT to Telegram Group

To allow the BOT to monitor group memebers BOT needs to be assigned to your group as administrator. To assign BOT to your group, please follow the instructions below:

1.	While in the group, click on the group name in the header

2.	Click the button Add member and enter name of your BOT. Select the BOT from the list and click Next.


### Download and install service

To run the service, you first need to download the source code, install dependencies and configure the service. You need to have node.js, npm and mysql database installed on your computer or server.

1.	Download or clone the code

2.	Run in root folder

	```
	npm install
	```

3.	Create database and import database schema from file bot_db.sql located in folder db.

4.	Open configuration file environment.ts located in src/environments folder and set following parameters:

	a.	Update database connection details by entering database host, port, name, username and password

	b.	Enter BOT token obtained in step #7 or Creating Group BOT

	c.	Enter Chat Id of the group you ant to monitor. To retrieve Chat Id, do the following:

		i.	send one message to your group as owner of the group

		ii.	call the url below in the browser:

				https://api.telegram.org/bot<botToken>/getUpdates 

		Note: Replace <botToken> with your BOT token obtained in step #7 or Creating Group BOT

		iii.	You will find Chat Id within parameter chat.id as shown on image below:

5.	Start the service by running command in the root folder:

	```
	node node_modules\ts-node\dist\bin.js src/bot.ts
	```

