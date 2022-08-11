import { Entity, Exclusion, JoinTable, OneToOne } from 'typeorm';
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

  @Column({
    type: 'bytea',
    nullable: true,
  })
  picture: Uint8Array; // can be updated as array

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @OneToMany((type) => ChatRoom, (chatroom) => chatroom.owner, {
    cascade: true,
  })
  @JoinTable({})
  chatRooms: ChatRoom[];

  @Column({ })
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

  @OneToMany((type) => friendsRequest, (friend) => friend.reciever)
  @JoinTable()
  recF: friendsRequest[];

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0 })
  losses: number;

  // @OneToMany(type => gameEntity, matchHistory => matchHistory.players.player1)
  // matchHistory: gameEntity[];
}
