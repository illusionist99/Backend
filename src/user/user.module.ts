import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { MulterModule } from '@nestjs/platform-express';
import { friendList } from 'src/entities/friendList.entity';



@Module({
  imports: [TypeOrmModule.forFeature([User, friendList]), MulterModule.register()],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
