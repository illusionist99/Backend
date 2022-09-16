import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Mute } from 'src/entities/mute.entity';

@Injectable()
export class MuteService {
  constructor(
    @InjectRepository(Mute)
    private muteRepo: Repository<Mute>,
  ) {}

  async muteUser(userId: string, roomId: string, minutes: number) {
    const mute = await this.muteRepo.findOne({ where: { userId, roomId } });
    return this.muteRepo.save({
      ...(mute || {}),
      userId,
      roomId,
      mutedUntil: Date.now() + 60000 * minutes,
    });
  }

  async getUserMute(userId: string, roomId: string) {
    const mute = await this.muteRepo.findOne({ where: { userId, roomId } });
    if (!mute) return 0;
    else return mute.mutedUntil;
  }
}
