import { Controller, Request, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { updateUserDto } from 'src/entities/update.user';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from 'src/entities/user.entity';


@Controller('user')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}


  @Get(':username')
  async getUser(@Param('username') username: string) : Promise<User> {
  
    return this.userService.findByUsername(username);
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
