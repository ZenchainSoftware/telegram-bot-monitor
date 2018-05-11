-- MySQL dump 10.16  Distrib 10.1.10-MariaDB, for Win32 (AMD64)
--
-- Host: localhost    Database: bot_db
-- ------------------------------------------------------
-- Server version	10.1.10-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chatMembers`
--

DROP TABLE IF EXISTS `chatMembers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chatMembers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  `joinDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `membersHistory`
--

DROP TABLE IF EXISTS `membersHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `membersHistory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chatId` varchar(100) DEFAULT NULL,
  `chatMemberId` int(11) DEFAULT NULL,
  `chatMemberFirstName` varchar(100) DEFAULT NULL,
  `chatMemberLastName` varchar(100) DEFAULT NULL,
  `chatMemberUserName` varchar(100) DEFAULT NULL,
  `isAdmin` tinyint(1) DEFAULT NULL,
  `isBot` tinyint(1) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `joinDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `banDate` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `reason` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

