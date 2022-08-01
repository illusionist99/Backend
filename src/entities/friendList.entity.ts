import { Column, PrimaryGeneratedColumn } from "typeorm";


export class friendList {

    @PrimaryGeneratedColumn()
    uid: string;

    @Column({ unique: true })
    senderUid: string;

    @Column({ unique : true })
    recieverUid: string;

    @Column()
    status: boolean; // true friends, false not friends

    @Column()
    blocked: boolean;
}