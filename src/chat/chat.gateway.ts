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
import { UseGuards } from '@nestjs/common';
import { JwtWebSocketGuard } from 'src/auth/guards/jwtWS.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost', 'http://localhost:8000'],
    credentials: true,
  },
  namespace: '/',
})
@UseGuards(JwtWebSocketGuard)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly chatService: ChatService,
    @InjectRepository(User) private readonly repoUser: Repository<User>,
  ) {}

  @WebSocketServer()
  private server: Server;

  afterInit(server: Server) {}

  handleDisconnect(@ConnectedSocket() client: Socket) {
    //('user Logged Out ', client.data);
    // update status
    // //('Disconnected : ', client.data);
  }

  handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    //('Logged in user ', client.data);
    // //('Connected ', client.id);
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
    if (!roomO && message['room'] !== 'public') throw new WsException('Error');
    else if (!roomO && message['room'] === 'public')
      roomO = await this.createRoom(client, message['room']);
    console.log(
      'sending message to rooom ',
      message['room'],
      ' message is ',
      message['message'],
      roomO,
    );
    chatMessage.roomId = roomO;
    chatMessage.username = client.data.user.username;
    chatMessage.text = message['message'];
    this.server.to(message['room']).except(client.id).emit('msgToClient', {
      userId: client.data.user.uid,
      username: client.data.user.username,
      text: message['message'],
      room: message['room'],
    });
    return this.chatService.create(chatMessage);
  }

  // @SubscribeMessage('msgToServer')
  // async create(@MessageBody() createChatDto: createChatMessageDto) : Promise<ChatMessage> {

  //   this.server.emit('msgToClient', createChatDto);
  //   return  this.chatService.create(createChatDto);
  // }

  @SubscribeMessage('joinRoomToServer')
  joinRoom(client: Socket, room: string) {
    console.log('recieved room : ', room);
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
  messageToRoom(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    //(body, body['message']);
    const chatMessage: ChatMessage = new createChatMessageDto();
    //('Message To room from ', client.data.user);
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
  async findOne(@MessageBody() id: string) {
    return this.chatService.findOne(id);
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
