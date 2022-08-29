import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { ChatModule } from 'src/chat/chat.module';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { friendsRequest } from 'src/entities/friendRequest.entity';
import { User } from 'src/entities/user.entity';
import { UserModule } from 'src/user/user.module';
import { FriendsController } from './friends.controller';
import { FriendsGateway } from './friends.gateway';
import { FriendsService } from './friends.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([friendsRequest, User, ChatRoom]),
    ChatModule,
    UserModule,
    AuthModule,
  ],
  controllers: [FriendsController],
  providers: [
    {
      provide: 'FRIENDS_GATEWAY',
      useClass: FriendsGateway,
    },
    FriendsService,
  ],
  exports: [FriendsService],
})
export class friendsModule {}
