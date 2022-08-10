import { ChatMessage } from "src/entities/chatMessage.entity";
import {  ChatRoom } from "src/entities/chatRoom.entity";
import { User } from "src/entities/user.entity";


export class BanDto {

    banned: User;
    bannedIn: ChatRoom;
    until: Date;
}

export type roomType  = "private" | "public" | "protected";



export class createChatRoomDto {

    cid: string;
    type: roomType;
    owner: string;
    messages: ChatMessage[];
    createdAt: Date;
    name: string;
    password: string;
    admins: string[];
    banned: string[];
}