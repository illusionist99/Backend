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
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtWebSocketGuard } from 'src/auth/guards/jwtWS.guard';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost', 'http://localhost:8000'],
    credentials: true,
  },
  namespace: 'friends',
})
@UseGuards(JwtWebSocketGuard)
export class FriendsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor() {}

  afterInit(server: Server) {
    this.server = server;
    console.log('FRIENDS GATEWAY READY');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    //('user Logged Out ', client.data);
    // update status
    // //('Disconnected : ', client.data);
  }

  handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    //('Logged in user ', client.data);
    // //('Connected ', client.id)
    console.log('FRIENDS GATEWAY CONNECTION', client.id);
  }

  @WebSocketServer()
  public server: Server;

  // @SubscribeMessage('msgToServer')
  // async create(@MessageBody() createChatDto: createChatMessageDto) : Promise<ChatMessage> {

  //   this.server.emit('msgToClient', createChatDto);
  //   return  this.chatService.create(createChatDto);
  // }

  @SubscribeMessage('TEST')
  joinRoom(client: Socket, room: string) {
    console.log('recieved room : ', room);
    client.join(room);
    // client.emit('joinedRoom', room);
  }
}
