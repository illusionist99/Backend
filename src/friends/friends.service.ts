import {
  Body,
  ForbiddenException,
  Injectable,
  Request,
  Response,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { use } from 'passport';
import { send } from 'process';
import { ChatService } from 'src/chat/chat.service';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import { friendsRequest } from '../entities/friendRequest.entity';

@Injectable()
export class FriendsService {
  constructor(
    private userService: UserService,

    @InjectRepository(friendsRequest)
    private friendRequestRepo: Repository<friendsRequest>,
    private chatService: ChatService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async addFriend(sender: string, receiver: string): Promise<friendsRequest> {
    
    // const rcvUser : User = await this.userService.findById(receiver);
    // const sndUser : User = await this.userService.findById(sender);
    
    // if (!rcvUser || !sndUser ) throw new ForbiddenException();
   
    const friendRequest: friendsRequest = new friendsRequest();

    friendRequest.reciever = receiver;
    friendRequest.sender = sender;
    friendRequest.status = false;
    friendRequest.date = new Date();
    friendRequest.blocked = false;

    const createdRoom: createChatRoomDto = new createChatRoomDto();

    createdRoom.name = null;
    createdRoom.createdAt = new Date();
    createdRoom.owner = sender;
    createdRoom.admins = [sender, receiver];
    createdRoom.type = 'private';


    await this.chatService.createRoom(createdRoom);
    this.friendRequestRepo.create(friendRequest);
    return await this.friendRequestRepo.save(friendRequest);
  }

  async getAllFriendRooms(uid: string): Promise<ChatRoom[]> {
    return this.chatService.findAllRooms(uid);
  }

  async allFriends(userId: string): Promise<friendsRequest[]> {
    return await this.friendRequestRepo.find({
      where: [
        { status: true, reciever: userId },
        { status: true, sender: userId },
      ],
      relations: ['reciever', 'sender'],
    });
  }

  async UpdateFriendInvite(uid: string, status: boolean): Promise<any> {
    const friendship = await this.friendRequestRepo.findOne({ where: { uid } });

    if (!friendship) throw new ForbiddenException();

    return await this.friendRequestRepo.update(uid, { status });
  }

  async blockFriendRequest(uid: string, blocked: boolean): Promise<any> {
    const friendship = await this.friendRequestRepo.findOne({ where: { uid } });

    if (!friendship) throw new ForbiddenException();

    return await this.friendRequestRepo.update(uid, { blocked });
  }
}
