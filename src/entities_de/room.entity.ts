// import { ChatMessage } from "./chatMessage.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";


@Entity('room')
export class Room {

    @PrimaryGeneratedColumn('uuid')
    cid: string;

    @Column()
    type: string;
    

    @CreateDateColumn()
    createdAt: Date;

    @Column({})
    name: string;


    // OWNER ??
    @ManyToOne(() => User, user => user.rooms)
    ownerID: string;

    // ADMINS
    

    // BANNED 

}


