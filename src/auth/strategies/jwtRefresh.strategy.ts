import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/user/user.service';
import { jwtPayload } from './jwt.strategy';

@Injectable()
export class JwtStartRefresh extends PassportStrategy(Strategy, 'jwtRefresh') {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const data = request?.cookies['jwt-rft'];
          if (!data) return null;
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.RFH_SECRET,
    });
  }

  async validate(payload: jwtPayload) {
    const userId: string = payload.sub;

    const user = await this.userService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return payload;
    // if (!user.tfaEnabled)
    //     return payload;

    // if (payload.tfaAuth)
    //     return payload;
  }
}
