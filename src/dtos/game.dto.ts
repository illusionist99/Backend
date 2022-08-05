import { ChatRoom } from "src/entities/chatRoom.entity";


export class  gamePlayersDto {

    id: string;
    player1: string;
    player2: string;
}

export class scoreDto {

    player1 : number;
    player2 : number;
}
export class CreateGameDto {

    id: string;
    mode: string;
    status: string;
    players: gamePlayersDto;
    scores: scoreDto;
    gameChatRoom: ChatRoom;
}