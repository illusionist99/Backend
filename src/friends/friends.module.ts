import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatModule } from "src/chat/chat.module";
import { ChatRoom } from "src/entities/chatRoom.entity";
import { friendsRequest } from "src/entities/friendRequest.entity";
import { User } from "src/entities/user.entity";
import { UserModule } from "src/user/user.module";
import { UserService } from "src/user/user.service";
import { FriendsController } from "./friends.controller";
import { FriendsService } from "./friends.service";


@Module({

    imports: [TypeOrmModule.forFeature([friendsRequest, User, ChatRoom]), ChatModule, UserModule],
    controllers: [FriendsController],
    providers: [FriendsService],
    exports: [FriendsService]
})
export class  friendsModule {}