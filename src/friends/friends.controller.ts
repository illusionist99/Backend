import { Controller, Post, UseGuards, Request, Body, ForbiddenException, Get, Req } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { UserService } from "../user/user.service";
import { friendsRequest } from "src/entities/friendRequest.entity";
import { jwtRefreshAuthGuard } from "src/auth/guards/jwt.guard";


@Controller('friends')
@UseGuards(jwtRefreshAuthGuard)
export class FriendsController {

    constructor(private friendsService: FriendsService) {
    

    }


    @Post('add')
    async addFriend(@Request() req, @Body() payload) : Promise<friendsRequest> {

        const sender : string = payload['sender'];
        const receiver: string = payload['receiver'];

        if ((!sender || !receiver ) && sender !==  req.user.userId ) throw new ForbiddenException();
        return this.friendsService.addFriend(sender, receiver);        
    }

    @Post('accept')
    async acceptFriendRequest(@Body() payload) : Promise<friendsRequest> {
    
        const uid : string = payload['uid'];
        const status: boolean = payload['status'];

        if (!uid || !status) throw new ForbiddenException();
        return this.friendsService.UpdateFriendInvite(uid, status);
    }

    @Get('all') 
    async allFriends(@Request() req) : Promise<friendsRequest[]> {
   
        let userId = req.user.userId;
        if (!userId) throw new ForbiddenException();

        return this.friendsService.allFriends(userId);
    }
}