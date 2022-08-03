import { Entity, Exclusion, JoinTable } from "typeorm";
import { PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ChatRoom } from './chatRoom.entity';
import { friendsRequest } from "./friendRequest.entity";

@Entity()
export class User {

    @PrimaryGeneratedColumn('uuid')
    uid: string;

    @Column({ unique: true, nullable: true})
    displayedName: string;

    @Column({nullable: true})
    avatar: string;

    @Column({
        type: 'bytea',
        nullable: true
    })
    picture: Uint8Array;

    @Column({ unique: true })
    login: string;

    @Column()
    password: string;

    @Column({ unique: true, nullable: true })
    email: string;

    @OneToMany(type => ChatRoom, chatroom => chatroom.owner, {cascade: true})
    @JoinTable({})
    chatRooms: ChatRoom[];

    @Column()
    refreshToken: string;



    @OneToMany(type => friendsRequest, friend => friend.senderUid)
    @JoinTable()
    friends: friendsRequest;


}