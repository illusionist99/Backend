import { User } from "src/entities/user.entity";


export class friendRequestDto {

    uid: string;
    senderUid: User;
    recieverUid: User;
    date: Date;
    status: boolean;
    blocked: boolean;
}