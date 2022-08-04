import { ChatMessage } from "./chatMessage.entity";
import { Column, Entity, JoinColumn, JoinTable, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";



@Entity()
export class ChatRoom {

    @PrimaryGeneratedColumn('uuid')
    cid: string;

    @Column()
    type: string;
    
    @ManyToOne(type => User, user => user.uid)
    owner: User[];
    
    @OneToMany(type => ChatMessage, chatMessage => chatMessage.roomId, {cascade: true})
    @JoinTable({
    })
    messages: ChatMessage[];

    @Column()
    createdAt: Date;

    @Column({})
    name: string;


    @OneToMany(type => User, user => user.uid)
    @JoinTable()
    admins: User[];

    @OneToMany(type => Ban, ban => ban.id)
    @JoinTable()
    banned: Ban[];

}





@Entity()
export class Ban {

    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(type => User, user => user.uid)
    @JoinTable()
    banned: User;

    @ManyToOne(type => ChatRoom, chatroom => chatroom.banned)
    bannedIn: ChatRoom;

    @Column()
    until: Date;

}