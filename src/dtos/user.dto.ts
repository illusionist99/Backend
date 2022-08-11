import { ChatRoom } from 'src/entities/chatRoom.entity';
import { friendsRequest } from 'src/entities/friendRequest.entity';

export class CreateUserDto {
  uid: string;
  nickname: string;
  avatar: string;
  picture: Uint8Array;
  username: string;
  password: string;
  email: string;
  chatRooms: ChatRoom[];
  refreshToken: string;
  status: string;
  xp: number;
  level: number;
  friends: friendsRequest[];
  wins: number;
  losses: number;
}

export class UpdateUserDto {
  nickname: string;
  avatar: string;
  picture: Uint8Array;
  username: string;
  password: string;
  email: string;
  chatRooms: ChatRoom[];
  refreshToken: string;
  status: string;
  xp: number;
  level: number;
  friends: friendsRequest[];
  wins: number;
  losses: number;
}
