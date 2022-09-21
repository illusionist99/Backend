import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { use } from 'passport';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatService } from 'src/chat/chat.service';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { User } from 'src/entities/user.entity';
import { NotificationService } from 'src/notifications/notification.service';
import { UserService } from 'src/user/user.service';
import { Repository } from 'typeorm';
import { friendsRequest } from '../entities/friendRequest.entity';
import { FriendsGateway } from './friends.gateway';

@Injectable()
export class FriendsService {
  constructor(
    private userService: UserService,
    @Inject('FRIENDS_GATEWAY') private readonly friendsGateway: FriendsGateway,

    @InjectRepository(friendsRequest)
    private friendRequestRepo: Repository<friendsRequest>,
    private chatService: ChatService,
    private notificationService: NotificationService,
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(ChatRoom)
    private chatRepo: Repository<ChatRoom>,
    @Inject('CHAT_GATEWAY') private readonly chatGateway: ChatGateway,
  ) {
    // this.friendsGateway.server.emit('notification', { hello: 'world' });
  }

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
    // if (!rcvUser || !sndUser ) throw new ForbiddenException();

    const friendRequest: friendsRequest = new friendsRequest();

    friendRequest.receiver = receiver;
    friendRequest.sender = sender;
    friendRequest.status = false;
    friendRequest.date = new Date();
    friendRequest.blocked = false;

    const [rcv, snd] = await Promise.all([
      this.userRepo.find({ where: { uid: receiver } }),
      this.userRepo.find({ where: { uid: sender } }),
    ]);
    // notification
    this.friendsGateway.emitNotification(
      'request',
      snd[0].username,
      rcv[0].username,
    );
    this.notificationService.createNotification(
      receiver,
      JSON.stringify({ type: 'request', sender: snd[0].username }),
    );

    return await this.friendRequestRepo.save(
      this.friendRequestRepo.create(friendRequest),
    );
  }

  async getAllFriendRooms(uid: string): Promise<any[]> {
    return this.chatService.getMessagingRooms(uid);
  }

  async allFriends(userId: string): Promise<any[]> {
    const reqs = await this.friendRequestRepo.find({
      select: ['receiver', 'sender'],
      where: [
        { status: true, receiver: userId, blocked: false },
        { status: true, sender: userId, blocked: false },
      ],
      relations: ['receiver', 'sender'],
    });
    return await Promise.all(
      reqs.map((r) => {
        return (r.sender as any).uid === userId ? r.receiver : r.sender;
      }),
    );
  }
  async getFriendRequestsForUser(userId: string): Promise<any[]> {
    return this.friendRequestRepo.find({
      where: [{ status: false, receiver: userId, blocked: false }],
      relations: ['sender'],
    });
  }

  async UpdateFriendInvite(
    userId: string,
    uid: string,
    status: boolean,
  ): Promise<any> {
    const friendship = await this.friendRequestRepo.findOne({
      where: { uid },
      relations: ['sender', 'receiver'],
    });

    if (!friendship) throw new ForbiddenException();
    this.friendsGateway.emitNotification(
      'accept',
      (friendship.receiver as unknown as User).username,
      (friendship.sender as unknown as User).username,
    );
    this.notificationService.createNotification(
      (friendship.sender as any).uid,
      JSON.stringify({
        type: 'accept',
        sender: (friendship.receiver as any).username,
      }),
    );
    // const rcvUser: User = await this.userService.findById(receiver);
    // const sndUser: User = await this.userService.findById(sender);
    // const createdRoom: createChatRoomDto = new createChatRoomDto();

    // createdRoom.name = null;
    // createdRoom.admins = [
    //   friendship.receiver as unknown as User,
    //   friendship.sender as unknown as User,
    // ];
    // createdRoom.members = [
    //   friendship.receiver as unknown as User,
    //   friendship.sender as unknown as User,
    // ];
    // createdRoom.owner = (friendship.receiver as unknown as User).uid;

    // createdRoom.type = 'private';

    // await this.chatService.createRoom(createdRoom);
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
      relations: ['sender', 'receiver'],
    });

    if (!friendship) {
      friendship = await this.friendRequestRepo.save({
        sender: userId,
        receiver: toBlockuid,
        status: false,
        blocked: true,
        blockedBy: userId,
      });
      friendship = await this.friendRequestRepo.findOne({
        where: { uid: friendship.uid },
        relations: ['sender', 'receiver'],
      });
    }
    if (
      (friendship.receiver as unknown as User).uid !== userId &&
      (friendship.sender as unknown as User).uid !== userId
    )
      throw new ForbiddenException();

    await this.friendRequestRepo.save({
      ...friendship,
      blocked,
      blockedBy: userId,
      sender: (friendship.sender as unknown as User).uid,
      receiver: (friendship.receiver as unknown as User).uid,
    });
    const r = await this.chatRepo.findOne({
      where: {
        type: 'private',
        members: [
          friendship.sender as unknown as User,
          friendship.receiver as unknown as User,
        ],
      },
    });
    this.chatGateway.emitConvsRefreshRequest(
      [
        (friendship.sender as unknown as User).uid,
        (friendship.receiver as unknown as User).uid,
      ],
      r.cid,
      'remove',
      '*',
    );
    this.chatGateway.emitChatRefreshRequest(
      [
        (friendship.sender as unknown as User).uid,
        (friendship.receiver as unknown as User).uid,
      ],
      r.cid,
      'remove',
      '*',
    );
  }

  async unblockFriendRequest(
    userId: string,
    uid: string,
    blocked: boolean,
  ): Promise<any> {
    const friendship = await this.friendRequestRepo.findOne({
      where: [
        { receiver: uid, sender: userId, blocked: true },
        { receiver: userId, sender: uid, blocked: true },
      ],
    });

    if (!friendship) throw new ForbiddenException();

    if (userId === friendship.blockedBy) {
      return await this.friendRequestRepo.delete(friendship.uid);
    }
    throw new UnauthorizedException();
  }
}
