import {
  Controller,
  Post,
  UseGuards,
  Request,
  Response,
  Body,
  Get,
  Query,
  UnauthorizedException,
  Redirect,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { fortyTwoGuard } from './auth/guards/fortytwo.guard';
import { JwtAuthGuard, jwtRefreshAuthGuard } from './auth/guards/jwt.guard';
import { LocalGuard } from './auth/guards/local.guard';
import { User } from './entities/user.entity';

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Get('auth/isLogged')
  @UseGuards(JwtAuthGuard, jwtRefreshAuthGuard)
  isLogged(@Request() req) {
    return req.user;
  }

  @Get('auth/42')
  @UseGuards(fortyTwoGuard)
  signUp(@Request() req) {
    return req.user;
  }

  @Get('auth')
  async LoginfortyTwo(
    @Query() code,
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<any> {
    code = code['code'];
    console.log('code being used ', code);
    const payload = await this.authService.findOrCreate(code);
    console.log(payload);
    if (payload) {
      res.cookie('jwt-rft', payload['refreshToken'], { httpOnly: true });
      return { access_token: payload['access_token'] };
    }
    res.send(401);
    return new ForbiddenException();
  }

  @Post('auth/login')
  @UseGuards(LocalGuard)
  async login(@Request() req, @Response({ passthrough: true }) res) {
    const payload = await this.authService.getTokens(
      req.user.uid,
      req.user.login,
    );

    if (payload) {
      res.cookie('jwt-rft', payload['refreshToken'], { httpOnly: true });
      await this.authService.updateRtHash(req.user.uid, payload.refreshToken);
      return payload;
    }
    return new ForbiddenException();
  }

  @Post('auth/refresh')
  @UseGuards(jwtRefreshAuthGuard)
  async refreshToken(@Request() req, @Response({ passthrough: true }) res) {
    return await this.authService.refreshToken(req, res);
  }

  @Get('auth/logout')
  @UseGuards(jwtRefreshAuthGuard)
  logout(@Response({ passthrough: true }) res) {
    res.cookie('jwt-rft', { expires: Date.now() }, { httpOnly: true });
  }

  @Post('auth/signup')
  signUpLocal(@Body() payload: JSON): Promise<User> {
    const username: string = payload['username'];
    const password: string = payload['password'];

    if (username && password)
      return this.authService.signUpLocal(username, password);
    throw new UnauthorizedException();
  }
}
