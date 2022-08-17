import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from "src/user/user.service";
import { jwtPayload } from "./jwt.strategy";
import { Request } from "express";


type jwtTfa = {
    sub: string, 
    tfaEnabled: boolean,
    secret: string,
}

@Injectable()
export class tfaStatregy extends PassportStrategy(Strategy, 'tfa') {

    constructor(private readonly userService: UserService) {

        super({
        jwtFromRequest: ExtractJwt.fromExtractors([
            (request: Request) => {

                let data = request?.cookies['tfa-rft'];
                console.log(" tfa Token currently used ",data);
                if (!data)
                    return null;
                return data;
            }
        ]),
        ignoreExpiration: false,
        secretOrKey: process.env.RFH_SECRET,
        })

    }

   async validate(payload: jwtTfa) {
    

    console.log('strategy payload :', payload)
    const userId: string = payload.sub;

    const user = await this.userService.findById(userId);

    if (!user) throw new UnauthorizedException();

    if (user.tfaSecret !== payload.secret)
        throw new UnauthorizedException();
    // console.log('checking if tfa is enabled');
    if (user.tfaEnabled)
        return payload;


   }

}