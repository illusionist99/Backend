import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  ForbiddenException,
  Get,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { friendsRequest } from 'src/entities/friendRequest.entity';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { ChatRoom } from 'src/entities/chatRoom.entity';

@Controller('friends')
@UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}



  @Post('add')
  async addFriend(@Request() req, @Body() payload): Promise<friendsRequest> {
    const sender: string = payload['sender'];
    const receiver: string = payload['receiver'];
    const userId : string = req.user.sub;
  
    const friendRequest: friendsRequest = await this.friendsService.findOne(
      sender,
      receiver,
    );
    if (friendRequest) throw new ForbiddenException();
    if (
      (!sender || !receiver) &&
      (sender !== req.user.sub || receiver === sender)
    )
      throw new ForbiddenException();
    return this.friendsService.addFriend(userId, sender, receiver);
  }

  @Post('accept')
  async acceptFriendRequest(@Request() req, @Body() payload): Promise<friendsRequest> {
    const uid: string = payload['uid'];
    const userId: string = req.user.sub;
  
    if (!uid) throw new ForbiddenException();
    return this.friendsService.UpdateFriendInvite(userId, uid, true);
  }

  @Post('decline')
  async delete(@Body() body) {
    const uid = body['uid'];
    await this.friendsService.delete(uid);
  }

  @Get('rooms')
  async getAllFriendRooms(@Request() req): Promise<ChatRoom[]> {
    const uid: string = req.user.sub;

    console.log('Getting all Rooms ')
    if (!uid) throw new ForbiddenException();
    return this.friendsService.getAllFriendRooms(uid);
  }
  @Get('requests')
  async getFriendRequestsForUser(@Request() req): Promise<friendsRequest[]> {
    const uid: string = req.user.sub;
    if (!uid) throw new ForbiddenException();
    return this.friendsService.getFriendRequestsForUser(uid);
  }
  @Post('block')
  async blockFriendRequest(
    @Request() req,
    @Body() payload,
  ): Promise<friendsRequest> {
    const uid: string = payload['uid'];
    const userId: string = req.user.sub;

    if (!uid || !userId) throw new ForbiddenException();
    return this.friendsService.blockFriendRequest(userId, uid, true);
  }

  @Post('unblock')
  async unblockFriendRequest(
    @Request() req,
    @Body() payload,
  ): Promise<friendsRequest> {
    const userId: string = req.user.sub;
    const uid: string = payload['uid'];

    if (!uid) throw new ForbiddenException();
    return this.friendsService.unblockFriendRequest(userId, uid, false);
  }

  @Get('all')
  async allFriends(@Request() req): Promise<friendsRequest[]> {
    const userId = req.user.sub;
    if (!userId) throw new ForbiddenException();

    return this.friendsService.allFriends(userId);
  }
}
