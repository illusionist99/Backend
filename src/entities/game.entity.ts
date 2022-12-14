import { type } from 'os';
import { Entity, JoinColumn, JoinTable, ManyToMany, OneToOne } from 'typeorm';
import { PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ChatRoom } from './chatRoom.entity';
import { User } from './user.entity';

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  gameId: string;

  @Column({ nullable: true })
  @OneToOne((type) => ChatRoom, (chatRoom) => chatRoom.cid)
  @JoinColumn()
  chatroom: string;

  @Column({ nullable: false })
  mode: 'classic' | 'doublepaddle' | 'goalkeeper';

  @Column({ nullable: false })
  // @OneToMany(() => User, (user) => user.uid, { cascade: true })
  // @JoinTable()
  playerOne: string;

  @Column({ nullable: false })
  // @OneToMany(() => User, (user) => user.uid, { cascade: true })
  // @JoinTable()
  playerTwo: string;

  @Column({ nullable: false })
  scoreOne: number;

  @Column({ nullable: false })
  scoreTwo: number;

  @Column({ nullable: false, default: 0 })
  status: 0 | 1;

  @Column({ nullable: true })
  winner: string;
}
