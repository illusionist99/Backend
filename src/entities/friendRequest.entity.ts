import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class friendsRequest {
  @PrimaryGeneratedColumn('uuid')
  uid: string;

  @Column()
  @ManyToOne(() => User, (user) => user.sntF, {
    cascade: true,
  })
  sender: string;

  @Column()
  @ManyToOne(() => User, (user) => user.recF, {
    cascade: true,
  })
  receiver: string;

  @CreateDateColumn()
  date: Date;

  @Column()
  status: boolean; // true friends, false not friends

  @Column()
  blocked: boolean;

  @Column({ nullable: true })
  blockedBy: string;
}
