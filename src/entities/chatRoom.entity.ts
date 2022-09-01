import { ChatMessage } from './chatMessage.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { createChatRoomDto, roomType } from 'src/dtos/chatRoom.dto';

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  cid: string;

  @Column()
  type: roomType;

  @Column()
  @ManyToOne(() => User, (user) => user.uid, {})
  owner: string;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.roomId, {
    cascade: true,
  })
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  // @Column({ array: true, default: [] })
  @ManyToMany(() => User)
  @JoinTable()
  members: User[];

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  password?: string;

  // @Column( { array: true, default: [] })
  @ManyToMany(() => User)
  @JoinTable()
  admins: User[];

  // @Column({ array: true, default: [] })
  @ManyToMany(() => User)
  @JoinTable()
  banned: User[];

  @Column({ default: 'default room description' })
  description: string;
}
