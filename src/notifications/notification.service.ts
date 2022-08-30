import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from 'src/entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notifsRepo: Repository<Notification>,
  ) {}

  async createNotification(userId: string, json: string) {
    const notif = this.notifsRepo.create({ userId, json, seen: false });
    return await this.notifsRepo.save(notif);
  }

  async setNotificationAsSeen(id: string) {
    return await this.notifsRepo.update(id, { seen: true });
  }

  async deleteUserNotifications(userId: string) {
    return await this.notifsRepo.delete({ userId });
  }

  async getUserNotifications(userId: string) {
    return await this.notifsRepo.find({ where: { userId } });
  }
}
