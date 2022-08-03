import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class friendsRequest {

    @PrimaryGeneratedColumn('uuid')
    uid: string;

    @Column({ unique: true })
    @ManyToOne(type => User, user => user.uid)
    senderUid: string;

    @ManyToOne(type => User, user => user.uid)
    @Column({ unique : true })
    recieverUid: string;


    @Column()
    date: Date;

    @Column()
    status: boolean; // true friends, false not friends

    @Column()
    blocked: boolean;
}


