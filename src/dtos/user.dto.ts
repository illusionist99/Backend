import { ChatRoom } from "src/entities/chatRoom.entity";
import { friendsRequest } from "src/entities/friendRequest.entity";


export  class CreateUserDto {

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
    gameXp: number;
    friends: friendsRequest;
    wins: number;
    loses: number;
}