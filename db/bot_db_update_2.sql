alter table chatMembers add column `warningBadWord` tinyint(1) default 0;
alter table chatMembers add column `warningWalletKey` tinyint(1) default 0;
alter table chatMembers add column `warningAudio` tinyint(1) default 0;
alter table chatMembers add column `warningVideo` tinyint(1) default 0;
alter table chatMembers add column `warningImage` tinyint(1) default 0;
alter table chatMembers add column `warningAnyFile` tinyint(1) default 0;
alter table chatMembers add column `warningUrl` tinyint(1) default 0;

