import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "src/user/user.service";
import { jwtPayload } from "./jwt.strategy";


@Injectable()
export class JwtStartRefresh extends PassportStrategy(Strategy, 'jwtRefresh' ) {

    constructor(private readonly userService: UserService) {
    

        console.log('Jsut Called JWTRefresh ');
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

        console.log('validation user using jwt start');
        const userId: string = payload.username;

        const user = await this.userService.findById(userId);

        if (!user) throw new UnauthorizedException();


        if (!user.tfaEnabled)
            return user;

        if (payload.tfaAuth)
            return user;

        // return { userId: payload.sub, username: payload.username, tfaEnabled: payload.tfaEnabled, tfaAuth: payload.tfaAuth };
    }
}