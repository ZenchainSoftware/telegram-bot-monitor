CREATE TABLE IF NOT EXISTS `chatMembers` (
  `id` INTEGER NOT NULL,
  `chatId` varchar(100) DEFAULT NULL,
  `chatMemberId` int(11) DEFAULT NULL,
  `chatMemberFirstName` varchar(100) DEFAULT NULL,
  `chatMemberLastName` varchar(100) DEFAULT NULL,
  `chatMemberUserName` varchar(100) DEFAULT NULL,
  `isAdmin` tinyint(1) DEFAULT NULL,
  `isBot` tinyint(1) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `warning` tinyint(1) default 0,
  `warningBadWord` tinyint(1) default 0,
  `warningWalletKey` tinyint(1) default 0,
  `warningAudio` tinyint(1) default 0,
  `warningVideo` tinyint(1) default 0,
  `warningImage` tinyint(1) default 0,
  `warningAnyFile` tinyint(1) default 0,
  `warningUrl` tinyint(1) default 0,
  `joinDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
); 


CREATE TABLE IF NOT EXISTS `membersHistory` (
  `id` INTEGER NOT NULL,
  `chatId` varchar(100) DEFAULT NULL,
  `chatMemberId` int(11) DEFAULT NULL,
  `chatMemberFirstName` varchar(100) DEFAULT NULL,
  `chatMemberLastName` varchar(100) DEFAULT NULL,
  `chatMemberUserName` varchar(100) DEFAULT NULL,
  `isAdmin` tinyint(1) DEFAULT NULL,
  `isBot` tinyint(1) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `joinDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `banDate` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `reason` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
