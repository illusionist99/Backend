import { Entity, JoinColumn, JoinTable, ManyToMany, OneToOne } from 'typeorm';
import { PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
  gameId: string;

  @Column({ nullable: false })
  mode: 'classic' | 'doublepaddle' | 'goalkeeper';

  @Column({ nullable: false })
  @OneToOne(() => User, (user) => user.uid, { cascade: true })
  @JoinColumn()
  playerOne: string;

  @Column({ nullable: false })
  @OneToOne(() => User, (user) => user.uid, { cascade: true })
  @JoinColumn()
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
// - 42 ID
// - Username
// - Nickname
// - Avatar (profile img link)
// - Wins
// - Losses
// - XP
// - Level
// - Status : online | offline | playing | spectating
// - Friendlist : User[]
// - FriendRequests : User[]
// - Blocklist : User[]
