import { Controller, Request, Get, Post, Body, Patch, Param, Delete, UseGuards, UnauthorizedException, ForbiddenException, UseInterceptors, UploadedFile, Res, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '../dtos/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { User } from 'src/entities/user.entity';
import { updateUserDto } from 'src/entities/update.user';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { friendList } from 'src/entities/friendList.entity';


@Controller('user')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}


  @Get('friends')
  async getFriends(@Request() req) : Promise<friendList[]> {
  
    return this.userService.getFriends(req);
  }

  @Post('addf')
  async sendFriendInvite(@Request() req, @Body() payload: any) : Promise<friendList> {

    return this.userService.sendFriendInvite(req, payload);
  }

  @Post('fstatus')
  async updateFriendStatus(@Request() req, @Body() payload: any) {

    return this.userService.UpdateFriendInvite(req.user.uid, payload['status']);
  }

  @Get()
  currentUser(@Request() req) {

    console.log(req.user.uid);
    return this.userService.findOne(req.user.userId);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(uid: string, @UploadedFile() file: Express.Multer.File)  {
  
    return this.userService.updateAvatar(uid, file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: updateUserDto) {

    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {

    return this.userService.remove(id);
  }
}
