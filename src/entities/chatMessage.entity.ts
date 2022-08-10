import { ChatRoom } from './chatRoom.entity';
import { User } from './user.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  messageId: string;

  @Column({ unique: true })
  text: string;

  @ManyToOne((type) => ChatRoom, (chatRoom) => chatRoom.cid)
  roomId: ChatRoom;

  @ManyToOne((type) => User, (user) => user.uid)
  ownerId: User;

  @Column()
  createdAt: Date;
}
