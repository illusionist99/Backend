import { Body, ForbiddenException, Injectable, Request, Response } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { send } from "process";
import { UserService } from "src/user/user.service";
import { Repository } from "typeorm";
import { friendsRequest } from "../entities/friendRequest.entity"



@Injectable()
export class FriendsService {

    constructor(
        private userService: UserService,

        @InjectRepository(friendsRequest)
        private friendRequestRepo: Repository<friendsRequest>
    ) {}

    async addFriend(sender: string, receiver: string ): Promise<friendsRequest> {
    
        const friendRequest : friendsRequest = new friendsRequest;

        friendRequest.recieverUid = receiver;
        friendRequest.senderUid = sender;
        friendRequest.status = false;
        friendRequest.date = new Date();
        friendRequest.blocked = false;

        this.friendRequestRepo.create(friendRequest);
        return await this.friendRequestRepo.save(friendRequest);
    }



    async allFriends(userId : string) : Promise<friendsRequest[]> {
    
    return await this.friendRequestRepo.find({
        where: [
            {
                status: true,
                blocked: false,
                recieverUid: userId,
            },
            {
                status: true,
                blocked: false,
                senderUid: userId,
            }
        ]
        })
    }


    async UpdateFriendInvite(uid: string, status: boolean) : Promise<any> {
    
      const friendship = await this.friendRequestRepo.findOne({where: {uid}});

      if (!friendship) throw new ForbiddenException();

      return await this.friendRequestRepo.update(uid, {status});
    }

    async blockFriendRequest(uid: string, blocked: boolean) : Promise<any> {
    
        const friendship = await this.friendRequestRepo.findOne({where: {uid}});
  
        if (!friendship) throw new ForbiddenException();
  
        return await this.friendRequestRepo.update(uid, {blocked});
      }


    
}