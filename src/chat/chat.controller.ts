import { Controller, Get, UseGuards, Request, Param, Post } from "@nestjs/common";
import { get } from "http";
import { JwtAuthGuard, jwtRefreshAuthGuard } from "src/auth/guards/jwt.guard";
import { ChatService } from "./chat.service";


@Controller('chat')
@UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
export class ChatController {

    constructor( private chatService: ChatService) {
    

    }



    @Get('rooms')
    async getAllRooms(@Request() req) {
    
        return this.chatService.findAllRooms(req.user.userId);
    }

    @Get(':uid')
    async getRoomByUid(@Param('uid') uid: string) {

        return this.chatService.findOne(uid);
    }


} 