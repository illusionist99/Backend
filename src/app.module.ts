import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { ChatMessage } from './entities/chatMessage.entity';
import { ChatRoom } from './entities/chatRoom.entity';
import { User } from './entities/user.entity';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { fortyTwoStrat } from './auth/strategies/fortytwo.strategy';
import { JwtStartRefresh } from './auth/strategies/jwtRefresh.strategy';
import { friendsRequest } from './entities/friendRequest.entity';
import { friendsModule } from './friends/friends.module';
import { GameModule } from './game/game.module';
import { Game } from './entities/game.entity';
import { tfaStatregy } from './auth/strategies/tfa.strategy';

//console.log(process.env);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      // type: 'postgres',
      // host: process.env.POSTGRES_HOST,
      // port: parseInt(process.env.POSTGRES_PORT),
      // username: process.env.POSTGRES_USER,
      // password: process.env.POSTGRES_PASS,
      // database: process.env.POSTGRES_DB,
      type: "sqlite",
      database : "db.sqlite",
      logging: true,
      subscribers: [],
      migrations: [],
      entities: [User, ChatMessage, ChatRoom, friendsRequest, Game],
      synchronize: true, // to remove when finished
    }),
    UserModule,
    ChatModule,
    AuthModule,
    friendsModule,
    GameModule,
  ],
  controllers: [fortyTwoStrat, AppController],
  providers: [JwtStartRefresh, tfaStatregy],
})
export class AppModule {}
