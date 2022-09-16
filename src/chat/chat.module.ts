import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { ChatMessage } from 'src/entities/chatMessage.entity';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ChatController } from './chat.controller';
import { JwtWebSocketGuard } from 'src/auth/guards/jwtWS.guard';
import { UserModule } from 'src/user/user.module';
import { NotificationModule } from 'src/notifications/notification.module';
import { Mute } from 'src/entities/mute.entity';
import { MuteService } from './mute/mute.service';

@Module({
  providers: [ChatGateway, ChatService, MuteService],
  imports: [
    TypeOrmModule.forFeature([User, ChatRoom, ChatMessage, Mute]),
    AuthModule,
    UserModule,
    NotificationModule,
  ],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
