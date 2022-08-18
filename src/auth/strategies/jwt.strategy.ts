import {  Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "src/user/user.service";


export type jwtPayload = {

    sub: string,
    username: string,
    tfaEnabled: boolean,
    tfaAuth: boolean
}

@Injectable()
export class JwtStartegy extends PassportStrategy(Strategy, 'jwt' ) {

    constructor(private readonly userService: UserService) {

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }


    async validate(payload : jwtPayload) {

        //console.log('validation user using jwt start  ', payload);
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