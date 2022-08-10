import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatMessage } from 'src/entities/chatMessage.entity';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { createChatMessageDto } from '../dtos/chatMessage.dto';
// import { UpdateChatDto } from '../dtos/';
import * as bcrypt from 'bcrypt'

@Injectable()
export class ChatService {
  
  constructor(

    @InjectRepository(ChatMessage)
    private chatMessageRepo : Repository<ChatMessage>,
    @InjectRepository(ChatRoom)
    private chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(User)
    private userRepo: Repository<User>)   {

  }


  async create(createChatDto: createChatMessageDto) : Promise<ChatMessage> {
   
    this.chatMessageRepo.create(createChatDto);
    console.log(createChatDto);
    return await this.chatMessageRepo.save(createChatDto);

  }

  async createRoom(createChatRoom : createChatRoomDto) : Promise<createChatRoomDto> {


    if (createChatRoom.type === "protected" && !createChatRoom.password) throw new ForbiddenException();
    else if ( createChatRoom.type === "protected" && createChatRoom.password)
      createChatRoom.password = await bcrypt.hash(createChatRoom.password, 10);
    this.chatRoomRepo.create(createChatRoom);
    return  await this.chatRoomRepo.save(createChatRoom);
  }
 
  async joinRoom() {

  }

  async typing() {
    
  }

  async findAll() : Promise<ChatMessage[]> {
  
    return await this.chatMessageRepo.find({relations: ['ownerId']});
    // return `This action returns all chat`;
  
  }

  async findAllRooms(uid: string) {
    // console.log( await this.chatRoomRepo.find());
    // return await this.chatRoomRepo.find();
    
    console.log('looking for ', uid)
    const user = await this.userRepo.findOne({ where: {uid}, relations: ['chatRooms']});
    console.log(user);
    return user.chatRooms ;
  }


  async findRoomByName(name: string) : Promise<any> {
  
    return await this.chatRoomRepo.findOne({where: {name: name}});
  }
  async findOne(id: string) : Promise<ChatRoom[]> {

    const chat =  await this.chatRoomRepo.find({ where: {cid: id}, relations: ['messages'] });

    console.log(chat);

    return chat;
    // return `This action returns a #${id} chat`;
  }

  // update(id: number, updateChatDto: UpdateChatDto) {
  //   return `This action updates a #${id} chat`;
  // }

  async remove(id: string) : Promise<ChatMessage> {
  
    const chatMessage : ChatMessage  =  await this.chatMessageRepo.findOne({ where: {messageId: id}});
    return this.chatMessageRepo.remove(chatMessage);
  }
}
