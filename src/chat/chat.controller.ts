import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Post,
  Body,
  UnauthorizedException,
  Delete,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // Search For Room By name

  @Get('find')
  async searchByname(@Query('name') name: string): Promise<ChatRoom[]> {
    console.log(' seach for room with ', name);
    return this.chatService.searchByname(name);
  }

  // set as Admin in chatRoom
  @Post('admin')
  async setAdmins(
    @Body() data: { cid: string; uid: string },
    @Request() req,
  ): Promise<void> {
    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const newAdmin: string = data.uid;

    console.log('---->', data);

    if (!userId || !chatRoom || !newAdmin) throw new UnauthorizedException();

    return this.chatService.setAdmin(userId, chatRoom, newAdmin);
  }

  @Post('deleteadmin')
  async removeAdmin(
    @Body() data: { cid: string; uid: string },
    @Request() req,
  ): Promise<void> {
    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const deleteAdmin: string = data.uid;

    if (!userId || !chatRoom || !deleteAdmin) throw new UnauthorizedException();

    return this.chatService.removeAdmin(userId, chatRoom, deleteAdmin);
  }
  @Post('removemember')
  async removeMember(
    @Body() data: { cid: string; uid: string },
    @Request() req,
  ): Promise<void> {
    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const deleteMember: string = data.uid;

    if (!userId || !chatRoom || !deleteMember)
      throw new UnauthorizedException();

    return this.chatService.removeMember(userId, chatRoom, deleteMember);
  }

  // ban user from chat room
  @Post('ban')
  async setbanned(
    @Body() data: { roomId: string; banned: string },
    @Request() req,
  ): Promise<void> {
    const userId: string = req.user.sub;
    const chatRoom: string = data.roomId;
    const banned: string = data.banned;

    if (!userId || !chatRoom || !banned) throw new UnauthorizedException();

    return this.chatService.ban(userId, chatRoom, banned);
  }
  // add members to chat room, join rooms

  @Post('join')
  async joinAsMember(
    @Request() req,
    @Body() data: { roomId: string; password: string },
  ) {
    const userId: string = req.user.sub;
    const chatRoom: string = data.roomId;
    const hash: string = data.password;

    if (!userId || !chatRoom) throw new UnauthorizedException();

    return this.chatService.joinRoomAsMember(userId, chatRoom, hash);
  }

  // remove room

  @Delete(':id')
  async deleteRoom(@Request() req, @Param('id') id: string) {
    const userId: string = req.user.sub;
    const chatRoom: string = id;

    if (!userId || !chatRoom) throw new UnauthorizedException();
    return this.chatService.deleteRoom(userId, chatRoom);
  }

  @Post('createRoom')
  async createRoom(
    @Request() req,
    @Body() createRoom: createChatRoomDto,
  ): Promise<void> {
    console.log(' user is ', req.user);
    await this.chatService.createRoom(createRoom);
    return;
  }

  @Get('/messages/:roomname')
  async getAllMessages(@Param('roomname') roomName: string, @Request() req) {
    console.log(' looking for room name ', roomName);
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
    console.log(' looking for room id : ', uid);
    return this.chatService.findOne(uid);
  }
}
