import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { User } from 'src/entities/user.entity';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [process.env.CORS || 'http://localhost'],
    credentials: true,
  },
  namespace: 'friends',
})
export class FriendsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly authService: AuthService) {}
  private usernameToSocketId: Map<string, string> = new Map<string, string>();
  @WebSocketServer()
  public server: Server;

  afterInit(server: Server) {
    this.server = server;
    console.log('FRIENDS GATEWAY READY');
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    //('user Logged Out ', client.data);
    // update status
    // //('Disconnected : ', client.data);
    if (client.data?.user?.username)
      this.usernameToSocketId.delete(client.data.user.username);
  }

  async handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    const cookieName = 'jwt-rft';
    let cookies;
    try {
      cookies = client.handshake.headers.cookie
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
    const payload = await this.authService.verifyRT(refreshToken);
    const user: User = await this.authService.ValidatePayload(payload);
    if (user) {
      client.data.user = user;

      // this.usernameToSocketId.set(user.uid, client.id);
      this.usernameToSocketId.set(user.username, client.id);

      return true;
    }
    return client.conn.close();
  }

  // @UseGuards(JwtWebSocketGuard)
  // @SubscribeMessage('notifications')
  // async test(@ConnectedSocket() client: Socket, room: string): Promise<void> {
  //   if (!client.data.user) return;

  //   console.log('received event from  : ', client.id, client.data.user as any);
  //   // client.join(room);
  //   // client.emit('joinedRoom', room);
  // }

  async emitNotification(
    type: 'request' | 'accept',
    sender: string,
    receiver: string,
  ) {
    if (this.usernameToSocketId.has(receiver))
      this.server
        .to(this.usernameToSocketId.get(receiver))
        .emit('notification', { type, sender });
    else {
      console.log(receiver, 'is disconnected');
    }
  }

  async emitJoinedRoom(receiver: string, room: string) {
    if (this.usernameToSocketId.has(receiver))
      this.server
        .to(this.usernameToSocketId.get(receiver))
        .emit('joinedRoom', { room });
    else {
      console.log(receiver, 'is disconnected');
    }
  }
}
