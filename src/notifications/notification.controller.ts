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
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';
import { NotificationService } from './notification.service';

@Controller('notification')
@UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Get()
  async getUserNotifs(@Req() req) {
    return this.notifService.getUserNotifications(req.user.sub);
  }

  @Delete()
  async clearUserNotifs(@Req() req) {
    return this.notifService.deleteUserNotifications(req.user.sub);
  }

  @Patch()
  async setUserNotifsAsSeen(@Body() body: { notifIds: Array<string> }) {
    if (!body.notifIds) return;
    return await Promise.all(
      body.notifIds?.map((e) => this.notifService.setNotificationAsSeen(e)),
    );
  }
}
