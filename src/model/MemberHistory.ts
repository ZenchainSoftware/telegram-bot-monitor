import {Entity, Column, PrimaryGeneratedColumn} from "typeorm"

@Entity("membersHistory")

export class MemberHistory {  
   @PrimaryGeneratedColumn()
   id: number;
   
   @Column()
   chatId: string;
   
   @Column()
   chatMemberId: string;

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
   banDate: number;

   @Column()
   reason: string;
   
};