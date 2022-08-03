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
}
