import { ChatMessage } from "src/entities/chatMessage.entity";
import {  ChatRoom } from "src/entities/chatRoom.entity";
import { User } from "src/entities/user.entity";


export class BanDto {

    banned: User;
    bannedIn: ChatRoom;
    until: Date;
}

export class createChatRoomDto {

    cid: string;
    type: string;
    owner: string;
    messages: ChatMessage[];
    createdAt: Date;
    name: string;
    admins: string[];
    banned: string[];
}