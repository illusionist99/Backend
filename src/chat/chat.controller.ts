import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('createRoom')
  async createRoom(@Body() createRoom: createChatRoomDto): Promise<void> {
    await this.chatService.createRoom(createRoom);
    return ;
  }

  @Get('messages/:roomname')
  async getAllMessages(@Param('roomname') roomName: string, @Request() req) {
    if (!roomName) throw new Error('specify room name');
    const userId: string = req.user.sub;

    return this.chatService.findAllMessages(userId, roomName);
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
