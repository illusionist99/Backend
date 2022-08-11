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
  Req,
} from '@nestjs/common';
import { use } from 'passport';
import { AuthService } from './auth/auth.service';
import { fortyTwoGuard } from './auth/guards/fortytwo.guard';
import { JwtAuthGuard, jwtRefreshAuthGuard } from './auth/guards/jwt.guard';
import { LocalGuard } from './auth/guards/local.guard';
import { User } from './entities/user.entity';
import { UserService } from './user/user.service';

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService, private userService: UserService) {}

  @Get('auth/isLogged')
  @UseGuards(jwtRefreshAuthGuard)
  isLogged(@Request() req) {
    return req.user;
  }

  // generates QR CODE 

  @Get('auth/generate')
  @UseGuards(jwtRefreshAuthGuard)
  async test(@Request() req) {
    
    const userId : string =  req.user.userId;
    console.log("current user ", userId);
    if (!userId) throw new UnauthorizedException();
    const {secret, otpauthUrl} = await this.authService.setupMfa(userId);
    return {secret, url: await this.authService.generateQrCode(otpauthUrl)};
  }

  @Post('auth/enable-tfa')
  @UseGuards(jwtRefreshAuthGuard)
  async setupMfa(@Request() req, @Body() body) {
  
    const userId : string = req.user.userId;
    console.log(req.user, userId);
    // return this.authService.setupMfa(userId);

    const isValid = this.authService.ValidateTfa(body.code, req.user.tfaSecret);

    console.log("Token is Valide ", isValid);
    if (!isValid) throw new UnauthorizedException();

    await this.userService.EnableTfa(userId);

  }

  @Get('auth/42')
  @UseGuards(fortyTwoGuard)
  signUp(@Request() req) {
    return req.user;
  }


  @Post('2fa/authenticate')
  @UseGuards(jwtRefreshAuthGuard)
  async authenticate(@Request() request, @Body() body) {

    console.log(      body.twoFactorAuthenticationCode,
      request.user,)
    const isCodeValid = await this.authService.ValidateTfa(
      body.twoFactorAuthenticationCode,
      body.secret,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }
    console.log('code is valid ', isCodeValid);
    return this.authService.loginWith2fa(request.user);
  }

  // HJEXUVZRGFWU6FIT

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
      req.user.username,
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
