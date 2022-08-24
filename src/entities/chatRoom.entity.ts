import { ChatMessage } from './chatMessage.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { createChatRoomDto, roomType } from 'src/dtos/chatRoom.dto';

@Entity()
export class ChatRoom {
  @PrimaryGeneratedColumn('uuid')
  cid?: string;

  @Column()
  type: roomType;

  @Column()
  @ManyToOne(() => User, (user) => user.uid, {
    cascade: true,
  })
  @JoinTable()
  owner: string;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.roomId, {
    cascade: true,
  })
  @JoinTable({})
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt?: Date;

  @OneToMany(() => User, (user) => user.uid, {
    cascade: true,
  })
  @JoinTable()
  members?: string[];

  @Column({ unique: true, nullable: true })
  name: string;

  @Column({ nullable: true })
  password?: string;

  @OneToMany(() => User, (user) => user.uid, {
    cascade: true,
  })
  @JoinTable()
  admins?: string[];

  @OneToMany(() => User, (user) => user.uid , { 
    cascade: true,
  })
  @JoinTable()
  banned?: string[];

  @Column({ default: 'default room description' })
  description?: string;
}
