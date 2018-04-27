import {Entity, Column, PrimaryColumn} from "typeorm"

@Entity("chatMembers")

export class ChatMember {  
    @PrimaryColumn()
    chatMemberId: string;
    
   @Column()
   chatId: string;   

   @Column()
   chatMemberFirstName: string;

   @Column()
   chatMemberLastName: string;

   @Column()
   chatMemberUserName: string;

   @Column()
   isAdmin: boolean;

   @Column()
   isBot: boolean;

   @Column()
   status: string;

   @Column()
   joinDate: number;

   @Column()
   warning: number;   

   @Column()
   warningBadWord: number;   

   @Column()
   warningWalletKey: number;   

   @Column()
   warningImage: number;   

   @Column()
   warningAudio: number;   

   @Column()
   warningVideo: number;   

   @Column()
   warningAnyFile: number;   

   @Column()
   warningUrl: number;   

   
};