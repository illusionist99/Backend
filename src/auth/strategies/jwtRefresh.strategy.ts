import {  Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "src/user/user.service";
import { jwtPayload } from "./jwt.strategy";


@Injectable()
export class JwtStartRefresh extends PassportStrategy(Strategy, 'jwtRefresh' ) {

    constructor(private readonly userService: UserService) {

        super({

            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request) => {

                    let data = request?.cookies['jwt-rft'];
                    console.log(" refresh Token currently used ",data);
                    if (!data)
                        return null;
                    return data;
                }
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.RFH_SECRET,
        });
    }


    async validate(payload : jwtPayload) {

        console.log('validation user using jwt start refresher ', payload);
        const userId: string = payload.sub;

        const user = await this.userService.findById(userId);
        console.log(user);
        if (!user) throw new UnauthorizedException();
        return payload;
        // console.log('checking if tfa is enabled');
        // if (!user.tfaEnabled)
        //     return payload;

        // console.log('checking if tfa is auth ');
        // if (payload.tfaAuth)
        //     return payload;
    }
}