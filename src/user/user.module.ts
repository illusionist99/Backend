import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { MulterModule } from '@nestjs/platform-express';
import { friendsRequest } from 'src/entities/friendRequest.entity';
import { FriendsService } from 'src/friends/friends.service';
import { friendsModule } from 'src/friends/friends.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, friendsRequest]),
    MulterModule.register(),
    //  MulterModule.registerAsync({
    //   useFactory: () => ({
    //     dest: './upload',
    //   })
    // })
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
