import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { friendsRequest } from "src/entities/friendRequest.entity";
import { User } from "src/entities/user.entity";
import { FriendsController } from "./friends.controller";
import { FriendsService } from "./friends.service";


@Module({

    imports: [TypeOrmModule.forFeature([friendsRequest, User])],
    controllers: [FriendsController],
    exports: [FriendsService]
})
export class  friendsModule {} 