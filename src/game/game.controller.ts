import {
  Controller,
  Request,
  Get,
  Post,
  Body,
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

  // @Post()
  // createLocal(@Body() localgame: JSON) {

  //   return this.gameService.createLocal(localgame["gamename"], localgame["password"]);
  // }

  @Post()
  createGame(@Body() dto: CreateGameDto) {
    return this.gameService.createGame(dto);
  }

  @Post(':id')
  updateGame(@Param('id') gameId: string, @Body() dto: UpdateGameDto) {
    if (!gameId.length) throw new BadRequestException();
    return this.gameService.updateGame(gameId, dto);
  }

  @Get()
  // @UseGuards(isAuthGuard)
  getAllGames() {
    return this.gameService.getAllGames();
  }

  @Get('/history/:id')
  // @UseGuards(isAuthGuard)
  getUserGameHistory(@Param('id') id: string) {
    if (!validate(id)) throw new BadRequestException();
    return this.gameService.getUserGameHistory(id);
  }

  @Get('/current/:id')
  // @UseGuards(isAuthGuard)
  getUserCurrentGame(@Param('id') id: string) {
    console.log();
    if (!validate(id)) throw new BadRequestException();
    return this.gameService.getUserCurrentGame(id);
  }
  @Get('leaderboard/')
  leaderboard(@Request() req) {
    return this.userService.leaderboard();
  }
  // // @UseGuards(isAuthGuard)
  // @Get(':id/')
  // async findOne(@Param('id') id: string) {
  //   return this.gameService.findOne(id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updategameDto: UpdategameDto) {
  //   return this.gameService.update(+id, updategameDto);
  // }

  //   @Delete(':id')
  //   // @UseGuards(isAuthGuard)
  //   remove(@Param('id') id: string) {
  //     return this.userService.remove(id);
  //   }
}
