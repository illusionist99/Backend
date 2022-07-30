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



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      logging: true,
      subscribers: [],
      migrations: [],
      entities: [User, ChatMessage, ChatRoom],
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
