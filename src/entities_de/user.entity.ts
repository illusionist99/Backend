import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { FriendRequest } from "./friend.entity";
import { Room } from "./room.entity";

@Entity('user')
export class User {

    @PrimaryGeneratedColumn('uuid')
    uid: string;

    @Column({ unique: true, nullable: true})
    nickname: string; //nickname // can be updated 

    @Column({nullable: true})
    avatar: string; // 42 profile image link 

    @Column({
        type: 'bytea',
        nullable: true
    })
    picture: Uint8Array; // can be updated as array 

    @Column({ unique: true })
    username: string;

    @Column()
    password: string;

    @Column({ unique: true, nullable: true })
    email: string;


    // ROOMS AVAILABLE 
    @OneToMany(() => Room, room => room.ownerID)
    @JoinColumn()
    rooms: Room[]

    @Column()
    refreshToken: string;

    @Column({default: 'offline'})
    status: string;

    @Column({default: 0})
    gameXp: number;

    // FRIEND LIST
    @OneToMany(() => FriendRequest, friendRequest => friendRequest.sender)
    @JoinColumn()
    sentF: FriendRequest[];

    @OneToMany(() => FriendRequest, friendRequest => friendRequest.receiver)
    @JoinColumn()
    receF: FriendRequest[];

    @Column({default: 0})
    wins: number;

    @Column({ default: 0})
    loses: number;

    // @OneToMany(type => gameEntity, matchHistory => matchHistory.players.player1)
    // matchHistory: gameEntity[];

}