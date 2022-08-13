import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
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
    
        console.log('Jsut Called JWT ');
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
        });
    }


    async validate(payload : jwtPayload) {

        console.log('validation user using jwt start  ', payload);
        const userId: string = payload.sub;

        const user = await this.userService.findById(userId);

        if (!user) throw new UnauthorizedException();


        if (!user.tfaEnabled)
            return payload;

        if (payload.tfaAuth)
            return payload;
        // return { userId: payload.sub, username: payload.username, tfaEnabled: payload.tfaEnabled, tfaAuth: payload.tfaAuth };
    }
}