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
  ForbiddenException,
  Param,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { fortyTwoGuard } from './auth/guards/fortytwo.guard';
import { jwtRefreshAuthGuard } from './auth/guards/jwt.guard';
import { LocalGuard } from './auth/guards/local.guard';
import { tfaGuard } from './auth/guards/tfa.guard';
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
    const userId: string = req.user.sub;
    if (!userId) throw new UnauthorizedException();
    const { secret, otpauthUrl } = await this.authService.setupMfa(userId);
    return { secret, url: await this.authService.generateQrCode(otpauthUrl) };
  }

  @Post('auth/enable-tfa')
  @UseGuards(jwtRefreshAuthGuard)
  async setupMfa(
    @Request() req,
    @Response({ passthrough: true }) res,
    @Body() body,
  ) {
    const userId: string = req.user.sub;
    // return this.authService.setupMfa(userId);

    const isValid = await this.authService.ValidateTfa(body.code, body.secret);

    if (!isValid) throw new UnauthorizedException();

    await this.userService.EnableTfa(userId);

    const { access_token, refreshToken } = await this.authService.getTokens(
      req.user.sub,
      req.user.username,
      true,
      true,
    );

    if (refreshToken) {
      res.cookie('jwt-rft', refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
      });
      return { message: 'Tfa Enabled Correctly' };
    }
    throw new ForbiddenException();
  }

  @Get('auth/42')
  @UseGuards(fortyTwoGuard)
  signUp(@Request() req) {
    return req.user;
  }

  @Get('testtfa123')
  @UseGuards(tfaGuard)
  tfatest() {
    return 'working';
  }

  @Post('2fa/authenticate')
  @UseGuards(tfaGuard)
  async authenticate(
    @Request() request,
    @Body() body,
    @Response({ passthrough: true }) res,
  ) {
    const user: User = await this.userService.findById(request.user.sub);

    if (!user) throw new ForbiddenException();

    const isCodeValid = await this.authService.ValidateTfa(
      body.code,
      request.user.secret,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }
    res.cookie('tfa-rft', new Date(), { httpOnly: true, sameSite: 'strict' });

    const tokens = await this.authService.loginWith2fa(request.user.sub);
    if (!tokens) throw new ForbiddenException();
    res.cookie('jwt-rft', tokens['refreshToken'], {
      httpOnly: true,
      sameSite: 'strict',
    });
    return { access_token: tokens['access_token'] };
  }

  // redirect to 2fa/authenticate
  @Get('auth')
  async LoginfortyTwo(
    @Query() code,
    @Response({ passthrough: true }) res,
  ): Promise<any> {
    code = code['code'];
    const { newUser, tokens, isNew } = await this.authService.findOrCreate(
      code,
    );
    if (!tokens) throw new ForbiddenException();
    if (tokens['tfaEnabled'] === true) {
      const jwtTfa = await this.authService.tfaJwt(newUser, tokens);

      res.cookie('tfa-rft', jwtTfa['tfaAccess'], {
        httpOnly: true,
        sameSite: 'strict',
      });

      res.status(201);
      return;
    }

    res.cookie('jwt-rft', tokens['refreshToken'], {
      httpOnly: true,
      sameSite: 'strict',
    });
    return {
      access_token: tokens['access_token'],
      isNew,
      username: newUser?.username,
    };
  }

  @Post('auth/login')
  @UseGuards(LocalGuard)
  async login(@Request() req, @Response({ passthrough: true }) res) {
    const payload = await this.authService.getTokens(
      req.user.uid,
      req.user.username,
      req.user.tfaEnabled,
      false,
    );
    const user = await this.userService.findById(req.user.uid);
    if (payload['tfaEnabled'] === true) {
      const jwtTfa = await this.authService.tfaJwt(user, payload);

      res.cookie('tfa-rft', jwtTfa['tfaAccess'], {
        httpOnly: true,
        sameSite: 'strict',
      });

      res.status(201);
      return;
    }

    if (payload) {
      res.cookie('jwt-rft', payload['refreshToken'], {
        httpOnly: true,
        sameSite: 'strict',
      });
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
    res.cookie(
      'jwt-rft',
      { expires: Date.now() },
      { httpOnly: true, sameSite: 'strict' },
    );
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
