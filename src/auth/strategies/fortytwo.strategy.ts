import { Controller } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-42";
import { CreateUserDto } from "src/dtos/user.dto";
import { User } from "src/entities/user.entity";
import * as bcrypt from 'bcrypt';
import { UserService } from "src/user/user.service";

@Controller()
export class fortyTwoStrat extends PassportStrategy(Strategy) {

    constructor(private readonly userService: UserService) {

        super({
            clientID: process.env.clientID,
            clientSecret: process.env.clientSecret,
            callbackURL: process.env.callbackURL,
        })
    }

    async validate(access_token: string, refreshToken: string, profile: any, cb: any) {


        if (!profile)
            return null;
        let userFound: User;
        if ( userFound = await this.userService.findByUsername(profile['username']))
            return cb(null, userFound);
        const user = new CreateUserDto;

        user.nickname = profile['displayName'];
        user.avatar = profile['photos']['value'];
        user.email = profile['emails'][0]['value'];
        user.username = profile['username'];
        const saltOrRounds = 10;
        const hash = await bcrypt.hash("defaultpass", saltOrRounds);
        user.password = hash;
        return cb(null, await this.userService.create(user));
    }


}
