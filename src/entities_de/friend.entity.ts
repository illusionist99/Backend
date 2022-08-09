import { Column, CreateDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";



type Status = "pending" | "accepted" | "declined";


@Entity('friend')
export class FriendRequest {

    @PrimaryGeneratedColumn('uuid')
    uid: string;


    // SENDER
    @ManyToOne(() => User, user => user.sentF)
    sender: string;
    // RECEIVER
    @ManyToOne(() => User, user => user.receF)
    receiver: string;

    @CreateDateColumn()
    date: Date;

    @Column()
    status: Status; // true friends, false not friends

    @Column()
    blocked: boolean;
}