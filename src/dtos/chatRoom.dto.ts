import { ChatMessage } from "src/entities/chatMessage.entity";
import { Ban, ChatRoom } from "src/entities/chatRoom.entity";
import { User } from "src/entities/user.entity";


export class BanDto {

    banned: User;
    bannedIn: ChatRoom;
    until: Date;
}

export class createChatRoomDto {

    cid: string;
    type: string;
    owner: User[];
    messages: ChatMessage[];
    createdAt: Date;
    name: string;
    admins: User[];
    banned: Ban[];
}