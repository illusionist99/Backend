import { Column, Entity, JoinTable, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class friendsRequest {

    @PrimaryGeneratedColumn('uuid')
    uid: string;


    @ManyToOne(type => User, user => user.uid)
    @JoinTable()
    senderUid: string;

    @ManyToOne(type => User, user => user.uid)
    @JoinTable()
    recieverUid: string;


    @Column()
    date: Date;

    @Column()
    status: boolean; // true friends, false not friends

    @Column()
    blocked: boolean;
}


