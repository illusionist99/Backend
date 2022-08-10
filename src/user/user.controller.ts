import {
  Controller,
  Request,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/entities/user.entity';

@Controller('user')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search/:query') // better way of retreiving data + protect username Route
  async searchUsers(@Param('query') searchParam: string): Promise<User[]> {
    console.log('Query string received : ', searchParam);
    if (!searchParam) throw new ForbiddenException();
    return this.userService.searchUsers(searchParam);
  }

  @Get(':username')
  async getUser(@Param('username') username: string): Promise<User> {
    return this.userService.findByUsername(username);
  }

  @Get()
  currentUser(@Request() req) {
    console.log(req.user.uid);
    return this.userService.findOne(req.user.userId);
  }

  @Post(':id/avatar') // update avatar
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(uid: string, @UploadedFile() file: Express.Multer.File) {
    // if (!newNickName) throw new ForbiddenException
    console.log('file is :', file);
    return this.userService.updateAvatar(uid, file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
