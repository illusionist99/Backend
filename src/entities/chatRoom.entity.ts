import { ChatMessage } from "./chatMessage.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";



@Entity()
export class ChatRoom {

    @PrimaryGeneratedColumn('uuid')
    cid: string;

    @Column()
    type: string;
    
    @ManyToOne(() => User, user => user.uid)
    owner: string;
    
    @OneToMany(() => ChatMessage, chatMessage => chatMessage.roomId, {cascade: true})
    @JoinTable({
    })
    messages: ChatMessage[];

    @CreateDateColumn()
    createdAt: Date;

    @Column({})
    name: string;


    @OneToMany(() => User, user => user.uid)
    @JoinTable()
    admins: string[];

    @OneToMany(() => User, user => user.uid)
    @JoinTable()
    banned: string[];

}


