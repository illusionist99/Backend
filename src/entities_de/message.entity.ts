import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity('message')
export class Message {

    @PrimaryGeneratedColumn('uuid')
    messageId: string;

    @Column( { unique: true })
    text: string;

    //  ROOM ID 

    // OWNER ID 

    @CreateDateColumn()
    createdAt: Date;
}