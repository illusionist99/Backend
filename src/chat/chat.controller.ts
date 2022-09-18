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
  BadRequestException,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { ChatService } from './chat.service';
const validate = require('uuid-validate');
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
    if (!validate(data['cid']) || !validate(data['uid']))
      throw new BadRequestException();

    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const newAdmin: string = data.uid;

    console.log('---->', data);

    if (!userId || !chatRoom || !newAdmin) throw new UnauthorizedException();

    return this.chatService.setAdmin(userId, chatRoom, newAdmin);
  }
  // add memeber
  @Post('addmemeber')
  async addmemebers(
    @Body() data: { cid: string; members: string[] },
    @Request() req,
  ): Promise<void> {
    if (!validate(data['cid']) || data.members.find((m) => !validate(m)))
      throw new BadRequestException();
    const userId = req.user.sub as string;
    const chatRoom = data.cid;
    const newMembers = data.members;

    console.log('add memeber ---->', data);

    if (!userId) throw new UnauthorizedException();
    else if (!chatRoom || !newMembers) throw new BadRequestException();

    return this.chatService.setMembers(userId, chatRoom, newMembers);
  }

  @Post('deleteadmin')
  async removeAdmin(
    @Body() data: { cid: string; uid: string },
    @Request() req,
  ): Promise<void> {
    if (!validate(data['cid']) || !validate(data['uid']))
      throw new BadRequestException();
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
    if (!validate(data['cid']) || !validate(data['uid']))
      throw new BadRequestException();
    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const deleteMember: string = data.uid;

    console.log('-----> ids', userId, chatRoom, deleteMember);

    if (!userId || !chatRoom || !deleteMember)
      throw new UnauthorizedException();

    return this.chatService.removeMember(userId, chatRoom, deleteMember);
  }

  // ban user from chat room
  @Post('ban')
  async setbanned(
    @Body() data: { cid: string; uid: string },
    @Request() req,
  ): Promise<void> {
    if (!validate(data['cid']) || !validate(data['uid']))
      throw new BadRequestException();
    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const banned: string = data.uid;

    if (!userId || !chatRoom || !banned) throw new BadRequestException();

    return this.chatService.ban(userId, chatRoom, banned);
  }
  // mute user
  @Post('mute')
  async muteUser(
    @Body() data: { cid: string; uid: string; minutes: number },
    @Request() req,
  ): Promise<void> {
    if (!validate(data['cid']) || !validate(data['uid']))
      throw new BadRequestException();
    const userId: string = req.user.sub;
    const chatRoom: string = data.cid;
    const muted: string = data.uid;
    const mutePeriod: number = data.minutes;

    if (!userId || !chatRoom || !muted) throw new BadRequestException();

    return this.chatService.mute(userId, muted, chatRoom, mutePeriod);
  }
  // add members to chat room, join rooms

  @Post('join')
  async joinAsMember(
    @Request() req,
    @Body() data: { roomId: string; password: string },
  ) {
    if (!validate(data['roomId'])) throw new BadRequestException();
    const userId: string = req.user.sub;
    const chatRoom: string = data.roomId;
    const hash: string = data.password;

    if (!userId || !chatRoom) throw new UnauthorizedException();

    return this.chatService.joinRoomAsMember(userId, chatRoom, hash);
  }
  @Post('leave')
  async leaveRoom(@Request() req, @Body() data: { cid: string }) {
    const uid: string = req.user.sub;
    const cid: string = data.cid;
    if (!validate(data['cid'])) throw new BadRequestException();
    if (!uid || !cid) throw new UnauthorizedException();

    return this.chatService.leaveRoom(uid, cid);
  }

  // remove room

  @Delete(':id')
  async deleteRoom(@Request() req, @Param('id') id: string) {
    const userId: string = req.user.sub;
    const chatRoom: string = id;
    if (!validate(id)) throw new BadRequestException();
    if (!userId || !chatRoom) throw new UnauthorizedException();
    return this.chatService.deleteRoom(userId, chatRoom);
  }

  @Post('updateroompass')
  async updatePassword(
    @Request() req,
    @Body()
    data: { cid: string; oldPass: string; newPass: string },
  ) {
    if (!validate(data['cid'])) throw new BadRequestException();
    const userId = req.user.sub;
    return this.chatService.updateRoomPass(userId, {
      cid: data.cid,
      oldPass: data.oldPass,
      newPass: data.newPass,
    });
  }

  @Post('deleteroompass')
  async deletePassword(
    @Request() req,
    @Body() data: { cid: string; oldPass: string },
  ) {
    if (!validate(data['cid'])) throw new BadRequestException();
    const userId = req.user.sub;
    return this.chatService.deleteRoomPass(userId, data.cid, data.oldPass);
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
    if (!roomName) throw new BadRequestException('specify room name');
    const userId: string = req.user.sub;

    return this.chatService.findAllMessages(userId, roomName);
  }

  @Get('rooms')
  async getAllRooms(@Request() req) {
    return this.chatService.findAllRooms(req.user.sub);
  }

  @Get(':cid')
  async getRoomBycid(@Req() req, @Param('cid') cid: string) {
    if (!validate(cid)) throw new BadRequestException();
    console.log(' looking for room id : ', cid);
    return this.chatService.findOne(req.user.sub, cid);
  }
}
