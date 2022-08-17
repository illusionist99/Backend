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
  NotFoundException,
  Req,
  Inject,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/entities/user.entity';

@Controller('user')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search') // better way of retreiving data + protect username Route
  async searchUsers(
    @Request() req,
    @Query('query') searchParam: string,
  ): Promise<User[]> {
    console.log('Query string received : ', searchParam);
    //if (!searchParam) throw new ForbiddenException();
    return this.userService.searchUsers(req.user.userId, searchParam);
  }

  @Get(':username')
  async getUser(@Param('username') username: string, @Req() req): Promise<any> {
    const user: User = await this.userService.findByUsername(username);
    if (!user) throw new NotFoundException();
    const me = req.user.userId;
    let rule;
    if (me === user.uid) rule = 'me';
    else {
      const r = await this.userService.findOneFriendRequest(me, user.uid);
      if (r) {
        if (r.status) {
          rule = 'friends';
        } else if (user.uid === r.sender) {
          rule = 'sender';
        } else {
          rule = 'receiver';
        }
      } else {
        rule = 'none';
      }
    }
    return { ...user, rule };
  }

  @Get()
  currentUser(@Request() req) {
    console.log(req.user.uid);
    return this.userService.findOne(req.user.userId);
  }

  @Get('id/:id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post(':id/avatar') // update avatar
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(uid: string, @UploadedFile() file: Express.Multer.File) {
    // if (!newNickName) throw new ForbiddenException
    console.log('file is :', file);
    return this.userService.updateAvatar(uid, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
