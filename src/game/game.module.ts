import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { gameEntity } from 'src/entities/game.entity';
import { User } from 'src/entities/user.entity';

@Module({
  controllers: [GameController],
  providers: [GameService],
  imports: [TypeOrmModule.forFeature([User, gameEntity])]
})
export class GameModule {}
