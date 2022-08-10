import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class friendsRequest {
  @PrimaryGeneratedColumn('uuid')
  uid: string;

  @Column()
  @ManyToOne(() => User, (user) => user.sntF)
  sender: string;

  @Column()
  @ManyToOne(() => User, (user) => user.recF)
  reciever: string;

  @CreateDateColumn()
  date: Date;

  @Column()
  status: boolean; // true friends, false not friends

  @Column()
  blocked: boolean;
}
