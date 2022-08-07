import { Column, CreateDateColumn, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class friendsRequest {

    @PrimaryGeneratedColumn('uuid')
    uid: string;


    @ManyToOne(type => User, user => user.sentfriendRequests)
    sender: string;

    @ManyToOne(type => User, user => user.receivedfriendRequests)
    reciever: string;

    @CreateDateColumn()
    date: Date;

    @Column()
    status: boolean; // true friends, false not friends

    @Column()
    blocked: boolean;
}


