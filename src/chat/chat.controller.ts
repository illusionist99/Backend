import { Controller, Get, UseGuards, Request, Param, Post, Body } from "@nestjs/common";
import { JwtAuthGuard, jwtRefreshAuthGuard } from "src/auth/guards/jwt.guard";
import { createChatRoomDto } from "src/dtos/chatRoom.dto";
import { ChatRoom } from "src/entities/chatRoom.entity";
import { ChatService } from "./chat.service";


@Controller('chat')
@UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
export class ChatController {

    constructor( private chatService: ChatService) {
    

    }


    @Post('createRoom')
    async createRoom(@Body() createRoom : createChatRoomDto) : Promise<ChatRoom> {

        return this.chatService.createRoom(createRoom);
    }


    @Get('messages')
    async getAllMessages(@Request() req) {

        const userId : string = req.user.sub;
        
        return this.chatService.findAllMessages(userId);
    }



    @Get('rooms')
    async getAllRooms(@Request() req) {
    
        return this.chatService.findAllRooms(req.user.sub);
    }

    @Get(':uid')
    async getRoomByUid(@Param('uid') uid: string) {

        return this.chatService.findOne(uid);
    }


} 