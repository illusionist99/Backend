import { User } from "src/entities/user.entity";


export class friendRequestDto {

    uid: string;
    sender: string;
    reciever: string;
    date: Date;
    status: boolean;
    blocked: boolean;
}