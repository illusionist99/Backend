import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { use } from 'passport';
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

  async delete(uid: string) {
    const friendRequest = await this.friendRequestRepo.findOne({
      where: { uid },
    });

    if (!friendRequest) throw new NotFoundException();

    return await this.friendRequestRepo.remove(friendRequest, {});
  }

  async findOne(sender: string, receiver: string): Promise<friendsRequest> {
    return await this.friendRequestRepo.findOne({
      where: [
        {
          sender,
          receiver,
        },
        {
          sender: receiver,
          receiver: sender,
        },
      ],
    });
  }
  async addFriend(
    userId: string,
    sender: string,
    receiver: string,
  ): Promise<friendsRequest> {
    // const rcvUser : User = await this.userService.findById(receiver);
    // const sndUser : User = await this.userService.findById(sender);

    // if (!rcvUser || !sndUser ) throw new ForbiddenException();

    const friendRequest: friendsRequest = new friendsRequest();

    friendRequest.receiver = receiver;
    friendRequest.sender = sender;
    friendRequest.status = false;
    friendRequest.date = new Date();
    friendRequest.blocked = false;

    const createdRoom: createChatRoomDto = new createChatRoomDto();

    createdRoom.name = null;
    createdRoom.createdAt = new Date();
    createdRoom.owner = sender;
    createdRoom.admins = [sender, receiver];
    createdRoom.members = [sender === userId ? receiver : sender];
    createdRoom.type = 'private';

    await this.chatService.createRoom(createdRoom);
    this.friendRequestRepo.create(friendRequest);
    return await this.friendRequestRepo.save(friendRequest);
  }

  async getAllFriendRooms(uid: string): Promise<any[]> {
    return this.chatService.findAllRooms(uid);
  }

  async allFriends(userId: string): Promise<any[]> {
    const reqs = await this.friendRequestRepo.find({
      select: ['receiver', 'sender'],
      where: [
        { status: true, receiver: userId },
        { status: true, sender: userId },
      ],
      relations: ['receiver', 'sender'],
    });
    return await Promise.all(
      reqs.map((r) => {
        //console.log((r.sender as any).uid === userId ? r.receiver : r.sender);
        return (r.sender as any).uid === userId ? r.receiver : r.sender;
      }),
    );
  }
  async getFriendRequestsForUser(userId: string): Promise<any[]> {
    return this.friendRequestRepo.find({
      where: [{ status: false, receiver: userId }],
      relations: ['sender'],
    });
  }
  async UpdateFriendInvite(uid: string, status: boolean): Promise<any> {
    const friendship = await this.friendRequestRepo.findOne({ where: { uid } });

    if (!friendship) throw new ForbiddenException();

    return await this.friendRequestRepo.update(uid, { status });
  }

  async blockFriendRequest(
    userId: string,
    toBlockuid: string,
    blocked: boolean,
  ): Promise<any> {
    let friendship = await this.friendRequestRepo.findOne({
      where: [
        {
          sender: userId,
          receiver: toBlockuid,
        },
        {
          sender: toBlockuid,
          receiver: userId,
        },
      ],
    });

    if (!friendship) {
      friendship = this.friendRequestRepo.create({
        sender: userId,
        receiver: toBlockuid,
        status: false,
        blocked: true,
        blockedBy: userId,
      });
      await this.friendRequestRepo.save(friendship);
      console.log('friendship created ');
    } else console.log('friendship already exists ');
    if (friendship.receiver !== userId && friendship.sender !== userId)
      throw new ForbiddenException();
    return await this.friendRequestRepo.save({
      ...friendship,
      blocked,
      blockedBy: userId,
    });
  }

  async unblockFriendRequest(
    userId: string,
    uid: string,
    blocked: boolean,
  ): Promise<any> {
    const friendship = await this.friendRequestRepo.findOne({ where: { uid } });

    if (!friendship) throw new ForbiddenException();
    if (friendship.receiver !== userId && friendship.sender !== userId)
      throw new ForbiddenException();

    if (userId === friendship.blockedBy) {
      return await this.friendRequestRepo.delete(uid);
    }
    throw new UnauthorizedException();
  }
}
