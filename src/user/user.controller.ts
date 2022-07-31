import { Controller, Request, Get, Post, Body, Patch, Param, Delete, UseGuards, UnauthorizedException, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '../dtos/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { User } from 'src/entities/user.entity';
import { updateUserDto } from 'src/entities/update.user';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';


@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}


  @Get()
  currentUser(@Request() req) {

    return this.userService.findOne(req.user.uid);
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
