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
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { UserService } from './user.service';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/entities/user.entity';
import { diskStorage } from 'multer';
const validate = require('uuid-validate');
@Controller('user')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search') // better way of retreiving data + protect username Route
  async searchUsers(
    @Request() req,
    @Query('query') searchParam: string,
  ): Promise<User[]> {
    //if (!searchParam) throw new ForbiddenException();
    return this.userService.searchUsers(req.user.sub, searchParam);
  }

  @Get(':username')
  async getUser(@Param('username') username: string, @Req() req): Promise<any> {
    if (!username.length) throw new BadRequestException();
    const user: User = await this.userService.findByUsername(username);
    if (!user) throw new NotFoundException();


    const me = req.user.sub;
    if (user.uid == req.user.sub)
      return { ...user, rule: { rule: 'me', request: null } };
    let rule: string;
    // if (me === user.uid) rule = 'me';
    // else {
    // return {
    //   user,
    const r = await this.userService.findOneFriendRequest(me, user.uid);
    // };
    if (r) {
      if (r.blocked) {
        if (r.blockedBy != me) {
          throw new NotFoundException();
        }
        rule = 'blocked';
      } else if (r.status) {
        rule = 'friends';
      } else if (user.uid === r.sender) {
        rule = 'sender';
      } else {
        rule = 'receiver';
      }
    } else {
      rule = 'none';
    }

    return { ...user, rule: { rule, request: r } };
  }

  @Get()
  currentUser(@Request() req) {
    const userId: string = req.user.sub;
    return this.userService.findOne(userId);
  }

  @Get('id/:id')
  async findOne(@Param('id') id: string) {
    if (!validate(id)) throw new BadRequestException();
    return this.userService.findOne(id);
  }

  @Patch('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: 'public/avatars',
      }),
    }),
  )
  async updateAvatar(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        // exceptionFactory(error) {
        //   throw error;
        // },
        validators: [
          new MaxFileSizeValidator({ maxSize: 2097152 }),
          new FileTypeValidator({
            fileType: /(gif|jpe?g|tiff?|png|webp|bmp)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.userService.update(req.user.sub, {
      file,
      nickname: null,
    });
  }
  @Patch('nickname')
  async updateNickname(@Req() req: any, @Body() data: { nickname: string }) {
    if (!data?.nickname.length) throw new BadRequestException();
    try {
      return await this.userService.update(req.user.sub, {
        file: null,
        nickname: data.nickname,
      });
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      } else if (e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException();
    }
  }

  @Patch('status')
  async updateStatus(
    @Req() req: any,
    @Body() data: { status: 'online' | 'offline' | 'playing' | 'spectating' },
  ) {
    if (!['online', 'offline', 'playing', 'spectating'].includes(data?.status))
      throw new BadRequestException();
    return this.userService.setStatus(req.user.sub, data.status);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!validate(id)) throw new BadRequestException();
    return this.userService.remove(id);
  }
}
