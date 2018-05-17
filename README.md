## Zenchain Telegram Anti-Phishing Admin Bot

Zenchain Telegram Anti-Phishing Admin Bot allows automatic monitoring of [Telegram](https://telegram.org) group members and banning members impersonating group administrators. Telegram Bot Monitor retrieves a list of group administrators automatically from the group and checks against a list of group members. If the Bot identifies a member as the one impersonating administrator, it will automatically ban the member. In addition, the Bot also has features which can be toggled to remove, warn and ban usage of images, links, crypto wallet addresses/keys, and inappropriate language.
Follow instructions below to deploy the Bot Monitor to Telegram group.

### Creating Group Bot

To create a Bot that will be assigned to group for active monitoring, use Telegram's BotFather as described below:

1.	After logging to your Telegram account, call BotFather on the following link:

	https://telegram.me/botfather

2.	Click the button „Open in Web“

3.	Type command /start

4.	Type command /newbot to create new Bot

5.	Enter the name of your new Bot, e.g. MyGroupBot

6.	Enter the username for your new Bot (it must end with the word bot), e.g. MyGroupBotTestbot

7.	You will receive a Bot token used to access the Telegram Bot API

8.	To allow the Bot to receive messages from your group, Privacy mode of the Bot needs to be disabled. To disable it, execute following commands/actions:

	a.	type /mybots

	b.	click on the Bot MyGroupBotTestbot

	c.	click on Bot Settings

	d.	click on Group Privacy

	e.	click Turn off

	Note: Privacy mode needs to be disabled before adding Bot to the group.
	
9.	Click on the link of your Bot displayed in the message from the BotFather above (t.me/MyGroupBotTestbot) and click the button Start


### Assign the Bot to Telegram Group

To allow the Bot to monitor group members Bot needs to be assigned to your group as administrator. To assign Bot to your group, please follow the instructions below:

1.	While in the group, click on the group name in the header

2.	Click the button Add member and enter the name of your Bot. Select the Bot from the list and click Next.


### Download and install service

To run the service, you first need to download the source code, install dependencies and configure the service. You need to have node.js and npm installed on your computer or server. 

1.	Download or clone the code

2.	Run in root folder

	```
	npm install
	```

Service can work with SQLite and MySQL databases. SQLite database file is provided and enabled by default. No additional software is required to use SQLite database. Should you like to use mysql database instead, you need to install MySQL server and proceed with step 3. Otherwise, proceed with step 4. 
	
3.	Create database user, database and import database schema from file bot_db_mysql.sql located in folder db. Grant all permissions on created database to created database user. 

4.	Copy configuration file environment.ts.dist as environment.ts located in src/environments folder and set following parameters:

	a.	If selected database is SQLite, skip this step. If it is MySQL,uUpdate database connection details by entering database host, port, name, username and password and set useDatabase to mysql

	b.	Enter Bot token obtained in step #7 or Creating Group Bot

	c.	Enter Chat Id of the group you want to monitor. To retrieve Chat Id, do the following:

		i.	send one message to your group as the owner of the group

		ii.	call the url below in the browser:

				https://api.telegram.org/bot<botToken>/getUpdates 

		Note: Replace <botToken> with your Bot token obtained in step #7 or Creating Group Bot

		iii.	You will find Chat Id within parameter chat.id
		
5.	Start the service by running the command in the root folder:

	```
	node node_modules/ts-node/dist/bin.js src/bot.ts
	```

