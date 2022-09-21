import {
  Controller,
  Request,
  Get,
  Post,
  Body,
  Delete,
  Param,
  ValidationPipe,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
const validate = require('uuid-validate');
import { CreateGameDto, UpdateGameDto } from 'src/dtos/game.dto';
import { UserService } from 'src/user/user.service';
import { GameService } from './game.service';
import { JwtAuthGuard, jwtRefreshAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('game')
// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly userService: UserService,
  ) {}


  @Delete()
  clearCurrentGames() {
    return this.gameService.clearCurrentGames();
  }

// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
  @Post()
  createGame(@Body() dto: CreateGameDto) {
    return this.gameService.createGame(dto);
  }

// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
  @Post(':id')
  updateGame(@Param('id') gameId: string, @Body() dto: UpdateGameDto) {
    if (!gameId.length) throw new BadRequestException();
    return this.gameService.updateGame(gameId, dto);
  }

// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
  @Get()
  // @UseGuards(isAuthGuard)
  getAllGames() {
    return this.gameService.getAllGames();
  }

// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
  @Get('/history/:id')
  // @UseGuards(isAuthGuard)
  getUserGameHistory(@Param('id') id: string) {
    if (!validate(id)) throw new BadRequestException();
    return this.gameService.getUserGameHistory(id);
  }

// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
  @Get('/current/:id')
  // @UseGuards(isAuthGuard)
  getUserCurrentGame(@Param('id') id: string) {
    if (!validate(id)) throw new BadRequestException();
    return this.gameService.getUserCurrentGame(id);
  }
// @UseGuards(jwtRefreshAuthGuard, JwtAuthGuard)
  @Get('leaderboard/')
  leaderboard(@Request() req) {
    return this.userService.leaderboard();
  }

}
