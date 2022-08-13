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
  constructor(
    private readonly authService: AuthService,
    private userService: UserService,
  ) {}

  @Get('auth/isLogged')
  @UseGuards(jwtRefreshAuthGuard)
  isLogged(@Request() req) {
    return req.user;
  }

  // generates QR CODE
  // BMHSYTL4OBTAKPZR
  @Get('auth/generate')
  @UseGuards(jwtRefreshAuthGuard)
  async test(@Request() req) {

    console.log('generate user payloadßß  : ' , req.user);
    const userId: string = req.user.sub;
    console.log('current user ', userId);
    if (!userId) throw new UnauthorizedException();
    const { secret, otpauthUrl } = await this.authService.setupMfa(userId);
    return { secret, url: await this.authService.generateQrCode(otpauthUrl) };
  }

  @Post('auth/enable-tfa')
  @UseGuards(jwtRefreshAuthGuard)
  async setupMfa(@Request() req, @Response({ passthrough : true }) res, @Body() body) {

    const userId: string = req.user.sub;
    // return this.authService.setupMfa(userId);

    const isValid =  await this.authService.ValidateTfa(body.code, body.secret);

    console.log('Token is Valide ', isValid);
    if (!isValid) throw new UnauthorizedException();

    await this.userService.EnableTfa(userId);
    
    const { access_token, refreshToken}  =  await this.authService.getTokens(
      req.user.sub,
      req.user.username,
      true,
      true
    );


    if (refreshToken) {
      res.cookie('jwt-rft', refreshToken, { httpOnly: true });
      return { message: "Tfa Enabled Correctly"};
    }
    throw new ForbiddenException();
  }

  @Get('auth/42')
  @UseGuards(fortyTwoGuard)
  signUp(@Request() req) {
    return req.user;
  }

  @Post('2fa/authenticate')
  @UseGuards(jwtRefreshAuthGuard)
  async authenticate(@Request() request, @Body() body) {
    console.log(body.code, request.user);

    const user: User = await this.userService.findById(request.user.sub);
    const isCodeValid = await this.authService.ValidateTfa(
      body.code,
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
    console.log('code being u');
    const payload = await this.authService.findOrCreate(code);
    console.log(payload);
    if (payload) {
      res.cookie('jwt-rft', payload['refreshToken'], { httpOnly: true });
      return { access_token: payload['access_token'] };
    }
    throw new ForbiddenException();
  }

  @Post('auth/login')
  @UseGuards(LocalGuard)
  async login(@Request() req, @Response({ passthrough: true }) res) {
  
    console.log('trying to log user ', req.user);
    const payload = await this.authService.getTokens(
      req.user.uid,
      req.user.username,
      req.user.tfaEnabled,
      false 
    );
    console.log(payload);
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
  logout(@Request() req, @Response({ passthrough: true }) res) {

    console.log('request dyal logout ', req.user);
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
