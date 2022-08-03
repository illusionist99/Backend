import { ChatMessage } from "src/entities/chatMessage.entity";
import { User } from "src/entities/user.entity";


export class createChatRoomDto {

    cid: string;
    type: string;
    owner: User[];
    name: string;
    messages: ChatMessage[];
    createdAt: Date;
}