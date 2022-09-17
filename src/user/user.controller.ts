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
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/entities/user.entity';
import { diskStorage } from 'multer';

@Controller('user')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search') // better way of retreiving data + protect username Route
  async searchUsers(
    @Request() req,
    @Query('query') searchParam: string,
  ): Promise<User[]> {
    //console.log('Query string received : ', searchParam);
    //if (!searchParam) throw new ForbiddenException();
    return this.userService.searchUsers(req.user.sub, searchParam);
  }

  @Get(':username')
  async getUser(@Param('username') username: string, @Req() req): Promise<any> {
    const user: User = await this.userService.findByUsername(username);
    if (!user) throw new NotFoundException();

    //console.log(req.user)

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
        //   console.log('eroor----->', error);
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
    try{
      return this.userService.update(req.user.sub, {
        file: null,
        nickname: data.nickname,
      });
    }catch(e){
      throw new BadRequestException();
    }
  }

  @Patch('status')
  async updateStatus(
    @Req() req: any,
    @Body() data: { status: 'online' | 'offline' | 'playing' | 'spectating' },
  ) {
    return this.userService.setStatus(req.user.sub, data.status);
  }
  // @Post(':id/avatar') // update avatar
  // @UseInterceptors(FileInterceptor('file'))
  // async updateAvatar(uid: string, @UploadedFile() file: Express.Multer.File) {
  //   // if (!newNickName) throw new ForbiddenException
  //   console.log('file is :', file);
  //   return this.userService.updateAvatar(uid, file);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
