import { join } from 'path';
import { Entity, JoinTable, ManyToMany } from 'typeorm';
import { PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChatRoom } from './chatRoom.entity';
import { friendsRequest } from './friendRequest.entity';
// import { gameEntity } from "./game.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  uid: string;

  @Column({ unique: true, nullable: true })
  nickname: string; //nickname // can be updated

  @Column({ nullable: true })
  avatar: string; // 42 profile image link

  // @Column({
  //   type: 'bytea',
  //   nullable: true,
  // })
  // picture: Uint8Array; // can be updated as array

  @Column({ unique: true })
  username: string;

  @Column({})
  password: string;

  @Column({ unique: true, nullable: true })
  email: string;

  // @Column()
  @OneToMany((type) => ChatRoom, chatroom => chatroom.cid, {
    cascade: true
  })
  @JoinTable({
    name: 'userasmember'
  })
  chatRooms: ChatRoom[];

  @Column({})
  refreshToken: string;

  @Column({ default: 'offline' })
  status: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @OneToMany((type) => friendsRequest, (friend) => friend.sender)
  @JoinTable()
  sntF: friendsRequest[];

  @OneToMany((type) => friendsRequest, (friend) => friend.receiver)
  @JoinTable()
  recF: friendsRequest[];

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  @Column({ nullable: true })
  tfaSecret: string; // tfa string

  @Column({ default: false })
  tfaEnabled: boolean;

  // @OneToMany(type => gameEntity, matchHistory => matchHistory.players.player1)
  // matchHistory: gameEntity[];
}
