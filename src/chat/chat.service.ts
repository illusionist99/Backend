import { InjectRepository } from '@nestjs/typeorm';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatMessage } from 'src/entities/chatMessage.entity';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { createChatMessageDto } from '../dtos/chatMessage.dto';
import * as bcrypt from 'bcrypt';

type Message = {
  text: string;
  date: Date;
  username: string;
  userId: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatRoom)
    private chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}


  async joinRoomAsMember(userId: string, cid: string, password: string) {
  
    const user: User = await this.userRepo.findOne({where: {uid: userId}});

    if (!user) throw new ForbiddenException();

    const chatRoom : ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members'],
    });
    if (!chatRoom || (!(chatRoom.type === 'protected') && !(chatRoom.type === 'public'))) throw new ForbiddenException();
    if (chatRoom.type === 'protected') {
      const isMatch : boolean =  bcrypt.compare(password, chatRoom.password);
      if (!isMatch) return Error('Wrong Password !!');
    }
    await this.chatRoomRepo.update(cid, {
      members: [...chatRoom.members, user],
    });
  }

  async deleteRoom(uid: string, cid: string) {
  
    const chatRoom : ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
    });

    if (!chatRoom || chatRoom.owner !== uid) throw new ForbiddenException();

    await this.chatRoomRepo.delete(cid);

  }
  
  async setAdmin(uid: string, cid: string, newadmin:  string) : Promise<any> {

    const chatRoom : ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins'],
    });

    if (!chatRoom) throw new UnauthorizedException();
    if (chatRoom.admins.find((admin) => { return admin.uid === newadmin})) return new Error(' User is Already an Admin');
    if (chatRoom.owner === uid || chatRoom.admins.map((admin) => { return admin.uid === uid})) {

      await this.chatRoomRepo.update(cid, {
        admins: [...chatRoom.admins, await this.userRepo.findOne({where: {uid: newadmin}})],
      });
    }
    
  }
  
  async ban(uid: string, cid: string, banned:  string) : Promise<any> {

    const chatRoom : ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'banned', 'members'],
    });

    if (!chatRoom) throw new UnauthorizedException();
    if (chatRoom.admins.find((admin) => { return admin.uid === banned}) && uid != chatRoom.owner) return new Error(' Can\'t Ban An Admin Only By Owner');
    if (chatRoom.owner === uid || (chatRoom.admins.map((admin) => { return admin.uid === uid}) && chatRoom.members.map((member) => {member.uid === banned}))) {


      await this.chatRoomRepo.update(cid, {
        members: chatRoom.members.filter((member) => { return member.uid === banned}),
        banned: [...chatRoom.banned, await this.userRepo.findOne({where: {uid: banned}})],
        admins: chatRoom.admins.filter((admin) => { return admin.uid === banned}),
      });
    }
    
  }
  
  async create(createChatDto: createChatMessageDto): Promise<ChatMessage> {
    this.chatMessageRepo.create(createChatDto);
    //console.log(createChatDto);
    return await this.chatMessageRepo.save(createChatDto);
  }




  async createRoom(
    createChatRoom: createChatRoomDto,
  ): Promise<createChatRoomDto> {
    if (createChatRoom.type === 'protected' && !createChatRoom.password)
      throw new ForbiddenException();
    else if (createChatRoom.type === 'protected' && createChatRoom.password)
      createChatRoom.password = await bcrypt.hash(createChatRoom.password, 10);

    // createChatRoom.members.push(createChatRoom['owner']);

    console.log('creation ', createChatRoom); 
    // this.chatRoomRepo.create(createChatRoom);

    return await this.chatRoomRepo.save(createChatRoom);
  }

  async joinRoom() {}

  async typing() {}

  async findAll(): Promise<ChatMessage[]> {
    return await this.chatMessageRepo.find({ relations: ['ownerId'] });
    // return `This action returns all chat`;
  }

  async findAllRooms(uid: string) {
    // let chatRooms : any = await this.userRepo.findOne({
    //   where: {
    //     uid: uid,
    //   },
    //   relations: ['chatRooms'],
    // })

    // "user.uid IN (:...members)")

    // console.log('000000', chatRooms);
    // chatRooms = chatRooms.chatRooms;
    const chatRooms: ChatRoom[] = await this.chatRoomRepo.find({
      // where: {
      //   // members: [await this.userRepo.findOne({ where: {uid} })],
      // },
      relations: ['members'],
    });
    console.log('chat rooms  0', chatRooms);
    const result = [];
    chatRooms.map((chatroom) => {
      for (const id of chatroom.members) {
        console.log('retrieved user :', id);
        // id = JSON.parse(id as unknown as string);
        console.log('retrieved user after:', id);

        if (id.uid === uid) result.push(chatroom);
      }
    });
    console.log('chat rooms ', result);
    // // id: string;
    // // name: string;
    // // status: 'online' | 'offline' | 'playing' | 'spectating'; // members status

    return result.map((chatRoom) => {
      return {
        id: chatRoom.cid,
        name: chatRoom.name,
        // owner: chatRoom.owner,
        admins: chatRoom.admins,
        members: chatRoom.members,
        type: chatRoom.type,
      };
    });
  }

  async findAllMessages(uid: string, roomName: string) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: [
        {
          name: roomName,
        },
        {},
      ],
      relations: ['messages'],
    });
    // text: string;
    // date: string;
    // username: string;
    // userId: string;
    const Messages: Message[] = chatRoom?.messages.map((message) => {
      return {
        text: message.text,
        date: message.createdAt,
        username: message.username,
        userId: message.ownerId,
      };
    });

    return Messages;
  }

  async findRoomByName(name: string): Promise<any> {
    return await this.chatRoomRepo.findOne({ where: { name: name } });
  }
  async findOne(id: string): Promise<ChatRoom[]> {
    const chat = await this.chatRoomRepo.find({
      where: { cid: id },
      relations: ['messages'],
    });

    //console.log(chat);

    return chat;
    // return `This action returns a #${id} chat`;
  }

  // update(id: number, updateChatDto: UpdateChatDto) {
  //   return `This action updates a #${id} chat`;
  // }

  async remove(id: string): Promise<ChatMessage> {
    const chatMessage: ChatMessage = await this.chatMessageRepo.findOne({
      where: { messageId: id },
    });
    return this.chatMessageRepo.remove(chatMessage);
  }
}
