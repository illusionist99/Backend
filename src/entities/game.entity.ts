import { type } from "os";
import { Column, Entity, JoinTable, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { ChatRoom } from "./chatRoom.entity";
import { User } from "./user.entity";


@Entity()
export class gamePlayers {

    @PrimaryGeneratedColumn()
    id: string;

    @OneToOne(type => User, user => user.uid)
    player1: string;


    @OneToOne(type => User, user => user.uid)
    player2: string;

}

@Entity()
export class score {

    @PrimaryGeneratedColumn()
    id : number;
    
    @Column()
    player1 : number;

    @Column()
    player2 : number;
}

@Entity()
export class gameEntity {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    mode: number;

    @Column()
    status: string; // Playing or Ended

    @OneToOne(type => gamePlayers, players => players.id)
    @JoinTable()
    players: gamePlayers;

    @OneToOne(type => ChatRoom, chat => chat.cid) 
    @JoinTable()
    chatRoom : ChatRoom; // Public for spectators

    @OneToOne(type => score, gamescore => gamescore.id)
    @JoinTable()
    scores: score;


}