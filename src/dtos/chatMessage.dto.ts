import { ChatRoom } from "src/entities/chatRoom.entity";
import { User } from "src/entities/user.entity";


export class createChatMessageDto {

    messageId: string;
    text: string;
    roomId: string;
    ownerId: string;
    createdAt: Date;
}