import { ChatMessage } from './chatMessage.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
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
  cid: string;

  @Column()
  type: roomType;

  @Column()
  @ManyToOne(() => User, (user) => user.uid, {
  })
  owner: string;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.roomId, {
    // cascade: true,
  })
  messages: ChatMessage[];

  @CreateDateColumn()
  createdAt?: Date;

  @Column('text',{ array: true, default: []})
  @OneToMany(() => User, (user) => user.chatRooms, {

  })
  members: string[];

  @Column({ unique: true, nullable: true })
  name: string;

  @Column({ nullable: true })
  password?: string;

  @Column('text',{ array: true, default: [] })
  @OneToMany(() => User, (user) => user.chatRooms, {

  })
  admins: string[];


  @Column('text',{ array: true, default: [] })
  @OneToMany(() => User, (user) => user.uid , { 

  })
  banned: string[];

  @Column({ default: 'default room description' })
  description?: string;
}
