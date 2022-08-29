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
import { User } from 'src/entities/user.entity';
import { flatMap } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost', 'http://localhost:8000'],
    credentials: true,
  },
  namespace: 'friends',
})
export class FriendsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly authService: AuthService) {}

  afterInit(server: Server) {
    this.server = server;
    console.log('FRIENDS GATEWAY READY');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    //('user Logged Out ', client.data);
    // update status
    // //('Disconnected : ', client.data);
  }

  async handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    const cookieName = 'jwt-rft';
    try {
      var cookies = client.handshake.headers.cookie
        .split(';')
        .map((c) => c.trim())
        .filter((cookie) => {
          return cookie.substring(0, cookieName.length) === cookieName;
        });
      console.log('cookies ', cookies);
    } catch (error) {
      console.log('cookies arent found');
      return error;
    }
    const refreshToken: string = cookies[0].split('=')[1];
    console.log('ws cookie extractd token ', refreshToken);
    const payload = await this.authService.verifyRT(refreshToken);
    const user: User = await this.authService.ValidatePayload(payload);
    if (user) {
      console.log('authenticated user in wsguard', user);
      client.data.user = user;
      return true;
    }
    return client.conn.close();
  }

  @WebSocketServer()
  public server: Server;

  // @SubscribeMessage('msgToServer')
  // async create(@MessageBody() createChatDto: createChatMessageDto) : Promise<ChatMessage> {

  //   this.server.emit('msgToClient', createChatDto);
  //   return  this.chatService.create(createChatDto);
  // }
  // @UseGuards(JwtWebSocketGuard)
  @SubscribeMessage('notifications')
  async test(@ConnectedSocket() client: Socket, room: string): Promise<void> {
    if (!client.data.user) return;

    console.log('received event from  : ', client.id, client.data.user as any);
    // client.join(room);
    // client.emit('joinedRoom', room);
  }
}
