import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ChatMessage } from './entities/chatMessage.entity';
import { Ban, ChatRoom } from './entities/chatRoom.entity';
import { User } from './entities/user.entity';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { fortyTwoStrat } from './auth/strategies/fortytwo.strategy';
import { JwtStartRefresh } from './auth/strategies/jwtRefresh.strategy';
import { friendsRequest } from './entities/friendRequest.entity';


console.log(process.env)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASS,
      database: process.env.POSTGRES_DB,
      logging: true,
      subscribers: [],
      migrations: [],
      entities: [User, ChatMessage, ChatRoom, friendsRequest, Ban],
      synchronize: true, // to remove when finished 
    }),
    UserModule,
    ChatModule,
    AuthModule
    ],
  controllers: [fortyTwoStrat, AppController],
  providers: [JwtStartRefresh],
})
export class AppModule {}
