import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
  WsException,
  ConnectedSocket,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { createChatMessageDto } from '../dtos/chatMessage.dto';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from 'src/entities/chatMessage.entity';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtWebSocketGuard } from 'src/auth/guards/jwtWS.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      'http://10.12.2.4',
      'http://10.12.2.4:3001',
      'http://10.12.2.4:3500',
    ],
    credentials: true,
  },
  namespace: '/',
})
@UseGuards(JwtWebSocketGuard)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,

    @InjectRepository(User) private readonly repoUser: Repository<User>,
    private readonly userService: UserService,
  ) {}

  @WebSocketServer()
  private server: Server;
  private userIdToSocketId: Map<string, string> = new Map<string, string>();
  private usernameToSocketId: Map<string, string> = new Map<string, string>();

  async emitNewMessage(receiver: string, room: string) {
    if (this.userIdToSocketId.has(receiver))
      this.server
        .to(this.userIdToSocketId.get(receiver))
        .emit('newMessage', { room });
    else {
      console.log(receiver, 'is disconnected');
    }
  }

  async emitNotification(
    type: 'joinedRoom',
    sender: string, // username
    receiver: string,
    room: { cid: string; name: string },
  ) {
    if (this.userIdToSocketId.has(receiver))
      this.server
        .to(this.userIdToSocketId.get(receiver))
        .emit('notification', { type, sender, room });
    else {
      console.log(receiver, 'is disconnected');
    }
  }

  emitConvsRefreshRequest(
    users: string[],
    room: string,
    type: 'add' | 'remove',
    removedUser?: string,
  ) {
    const online = users.filter((u) => this.userIdToSocketId.has(u));
    const sockets = online.map((u) => this.userIdToSocketId.get(u));

    this.server
      .to(sockets)
      .emit('convsRefreshRequest', { type, room, removedUser });
  }

  //new message event is similar to this, look at what's common later
  emitChatRefreshRequest(
    users: string[],
    room: string,
    type: 'add' | 'remove',
    removedUser?: string,
  ) {
    const online = users.filter((u) => this.userIdToSocketId.has(u));
    const sockets = online.map((u) => this.userIdToSocketId.get(u));

    this.server
      .to(sockets)
      .emit('chatRefreshRequest', { type, room, removedUser });
  }

  afterInit() {
    //
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    //('user Logged Out ', client.data);
    // update status
    // //('Disconnected : ', client.data);
    this.userIdToSocketId.delete(client.data?.user?.uid);
    this.usernameToSocketId.delete(client.data?.user?.uid);
  }

  handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    // this.userIdToSocketId.set(user.username, client.id);
  }
  @SubscribeMessage('listeningForEvents') // newMessage , chat refresh , convs refresh
  async listeningForEvents(@ConnectedSocket() client: Socket) {
    this.userIdToSocketId.set(client.data.user.uid, client.id);
    this.usernameToSocketId.set(client.data.user.uid, client.id);
  }

  @SubscribeMessage('createRoom')
  async createRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() roomName: string,
  ): Promise<ChatRoom> {
    // //('user created Room', client.data.user);
    const room: ChatRoom = new createChatRoomDto();
    const user: User = await this.repoUser.findOne({
      where: { uid: client.data.user.uid },
    });
    //(client.data.user.uid);
    // room.owner = client.data.user.uid;
    console.log('BBBbruh');
    room.members = [user];
    room.admins = [user];
    room.banned = [];
    room.name = roomName;
    room.owner = client.data.user.uid;
    room.type = 'public';
    this.server.emit('RoomCreated', roomName);
    return this.chatService.createRoom(room);
  }

  @SubscribeMessage('createPrivateRoom')
  async createPrivateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiver: string },
  ): Promise<any> {
    // //('user created Room', client.data.user);
    // client.data.user.uid,
    // ,

    const blockedByList = await this.userService.getUserBlockedByList(
      data.receiver,
    );
    if (blockedByList.find((u) => u.uid == client.data.user.uid))
      throw new WsException('You are blocked');

    const room = await this.chatService.findOrCreatePrivateRoom([
      client.data.user.uid,
      data.receiver,
    ]);
    this.server.to(client.id).emit('privateRoomCreated', room);
    return room;
  }

  @SubscribeMessage('msgToServer')
  async create(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: { room: string; message: string },
  ): Promise<ChatMessage> {
    console.log('client connected', client.data);
    //('user send msg to server ', client.data.user);
    const chatMessage: ChatMessage = new createChatMessageDto();
    //(client.data);
    chatMessage.ownerId = client.data.user.uid;

    let roomO = await this.chatService.findRoomByName(message['room']);
    if (
      !roomO &&
      message['room'] !== 'public' &&
      !message['room'].includes('GAME_')
    )
      roomO = await this.chatService.findRoomById(message['room']);

    if (
      !roomO &&
      message['room'] !== 'public' &&
      !message['room'].includes('GAME_')
    )
      throw new WsException('Error');
    else if (
      !roomO &&
      (message['room'] === 'public' || message['room'].includes('GAME_'))
    )
      roomO = await this.createRoom(client, message['room']);

    if (!message['message'].length) return;

    console.log(
      'sending message to rooom ',
      message['room'],
      ' message is ',
      message['message'],
      roomO,
    );

    chatMessage.roomId = roomO.cid;
    chatMessage.username = client.data.user.username;
    chatMessage.text = message['message'];

    const blockedByList = await this.userService.getUserBlockedByList(
      chatMessage.ownerId,
    );

    this.server
      .to(message['room'])
      .except([
        client.id,
        ...blockedByList.map((u) => {
          return this.userIdToSocketId.get(u.uid);
        }),
      ])
      .emit('msgToClient', {
        ownerId: client.data.user.uid,
        username: client.data.user.username,
        text: message['message'],
        room: message['room'],
      });

    // Notify
    if (message['room'] !== 'public' && !message['room'].includes('GAME_')) {
      const membersToNotify = roomO.members.filter((m: User) => {
        return (
          m.uid != client.data.user.uid && this.userIdToSocketId.has(m.uid)
        );
      });
      this.server
        .to(membersToNotify.map((m: User) => this.userIdToSocketId.get(m.uid)))
        .except([
          client.id,
          ...blockedByList.map((u) => {
            return this.userIdToSocketId.get(u.uid);
          }),
        ])
        .emit('newMessage', { room: message['room'] });
    }

    return this.chatService.create(chatMessage);
  }

  // @SubscribeMessage('msgToServer')
  // async create(@MessageBody() createChatDto: createChatMessageDto) : Promise<ChatMessage> {

  //   this.server.emit('msgToClient', createChatDto);
  //   return  this.chatService.create(createChatDto);
  // }

  @SubscribeMessage('joinRoomToServer')
  async joinRoom(client: Socket, room: string) {
    console.log('recieved room : ', room);

    if (room === 'public') await this.create(client, { room, message: '' });

    client.join(room);
    // client.emit('joinedRoom', room);
  }

  @SubscribeMessage('leaveRoomToServer')
  leaveRoom(client: Socket, room: string) {
    client.leave(room);
    // //(req.user, "  we know user  ");
    // const roomFound = this.chatService.findRoomByName(room);
    // if (roomFound) {
    // this.server.socketsJoin(room);
    // //(room);
    // this.server.emit('joinRoomToClient', room);
    // }
    return room;
    // return null;
  }

  @SubscribeMessage('messageToRoom')
  async messageToRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
  ) {
    //(body, body['message']);
    const chatMessage: ChatMessage = new createChatMessageDto();
    //('Message To room from ', client.data.user);
    const room = await this.chatService.findOne(client.data.user.uid, body[1]);
    if (!room) throw new WsException('room  not found');
    if (
      room.banned.find((u) => {
        return u.uid == client.data.user.uid;
      })
    )
      throw new WsException('banned from room');
    chatMessage.ownerId = client.data.user.uid;
    chatMessage.roomId = body[1];
    chatMessage.text = body[0];
    chatMessage.username = client.data.user.username;
    this.server.to(body[0]).emit('msgToClientifRoom', body[1]);
    return this.chatService.create(chatMessage);
  }

  @SubscribeMessage('findAllRooms')
  async findAllRooms(@ConnectedSocket() client: Socket) {
    return await this.chatService.findAllRooms(client.data.user.uid);
  }

  @SubscribeMessage('findAllChat')
  async findAll() {
    return this.chatService.findAll();
  }

  @SubscribeMessage('findOneChat')
  async findOne(@ConnectedSocket() client: Socket, @MessageBody() id: string) {
    return this.chatService.findOne(client.data.user.uid, id);
  }

  // @SubscribeMessage('updateChat')
  // update(@MessageBody() updateChatDto: UpdateChatDto) {
  //   return this.chatService.update(updateChatDto.id, updateChatDto);
  // }

  @SubscribeMessage('removeChat')
  async remove(@MessageBody() id: string) {
    return this.chatService.remove(id);
  }
}
