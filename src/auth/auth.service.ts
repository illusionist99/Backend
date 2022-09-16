import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Request,
  Response,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/dtos/user.dto';
import axios, { AxiosPromise } from 'axios';
import { User } from 'src/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { toDataURL } from 'qrcode';

type jwtTokens = {
  access_token: string;
  refreshToken: string;
  tfaEnabled: boolean;
  tfaAuth: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private readonly configService: ConfigService,
  ) {}
  async loginWith2fa(userId: string): Promise<jwtTokens> {
    const user: User = await this.userService.findById(userId);

    if (!user) throw new ForbiddenException();
    const payload = {
      username: user.username,
      sub: user.uid,
      tfaEnabled: true,
      tfaAuth: true,
    };

    //console.log('new payload ', payload);
    return {
      access_token: await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXP_H,
      }),

      refreshToken: await this.jwtService.signAsync(payload, {
        secret: process.env.RFH_SECRET,
        expiresIn: process.env.RFH_EXP_D,
      }),
      tfaEnabled: payload['tfaEnabled'],
      tfaAuth: payload['tfaAuth'],
    };
  }

  async tfaJwt(user: User, payload: jwtTokens) {
    const verfiyRft: boolean = await this.verifyRT(payload.refreshToken);
    const verifyAcc: boolean = await this.verify(payload.access_token);

    if (!verfiyRft || !verifyAcc) throw new ForbiddenException();

    return {
      tfaAccess: await this.jwtService.signAsync(
        { sub: user.uid, tfaEnabled: user.tfaEnabled, secret: user.tfaSecret },
        {
          secret: process.env.RFH_SECRET,
          expiresIn: '60s',
        },
      ),
    };
  }

  async setupMfa(
    userId: string,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user: User = await this.userService.findById(userId);

    if (!user) throw new ForbiddenException();
    //await this.userService.EnableTfa(userId);
    return await this.userService.generateTFAsecret(user.email, user.uid);
  }

  async ValidateTfa(code: string, secret: string): Promise<boolean> {
    return await this.userService.ValidateTfa(code, secret);
  }

  async generateQrCode(otpauthUrl: string) {
    return toDataURL(otpauthUrl);
  }

  async refreshToken(
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<jwtTokens> {
    const refreshToken = req?.cookies['jwt-rft'];

    if (!refreshToken) throw new BadRequestException();

    const payload = await this.verifyRT(refreshToken);

    //console.log('Payload from cookie ', payload);
    const user = await this.userService.findByUsername(payload.username);

    if (!user) throw new ForbiddenException();

    //console.log(user.refreshToken);
    if (await bcrypt.compare(refreshToken, user.refreshToken)) {
      //console.log('Payload matchs rft in db  ', payload);
      const tokens = await this.getTokens(
        payload.sub,
        payload.username,
        payload.tfaEnabled,
        payload.tfaAuth,
      );

      // await this.updateRtHash(payload.sub, tokens.refreshToken);

      // delete tokens.refreshToken;
      return tokens;
    }
    throw new BadRequestException();
  }

  async verifyRT(refreshToken: string) {
    return await this.jwtService.verify(refreshToken, {
      secret: process.env.RFH_SECRET,
    });
  }

  async verify(authToken: string) {
    return await this.jwtService.verify(authToken, {
      secret: process.env.JWT_SECRET,
    });
  }

  async ValidateUser(username: string, password: string): Promise<any> {
    if (!username || !password) throw new ForbiddenException();
    const user = await this.userService.findByUsername(username);

    if (!user) throw new ForbiddenException();
    const isMatch = await bcrypt.compare(password, user.password);
    if (user && isMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async ValidatePayload(payload: any): Promise<User | null> {
    const user: User = await this.userService.findByUsername(
      payload['username'],
    );
    if (user && user.uid === payload['sub']) return user;
    return null;
  }

  async findOrCreate(code: string): Promise<any> {
    try {
      var authToken = await axios({
        url: 'https://api.intra.42.fr/oauth/token',
        method: 'POST',
        data: {
          grant_type: 'authorization_code',
          client_id: process.env.clientID,
          client_secret: process.env.clientSecret,
          code,
          redirect_uri: process.env.callbackURL,
        },
      });
    } catch (error) {
      //console.log(error);
      console.log(
        error,
        process.env.clientID,
        process.env.clientSecret,
        process.env.callbackURL,
      );
      return error;
    }

    //console.log('authToken: ', authToken);
    const token = authToken.data['access_token'];
    let userData;
    try {
      userData = await axios({
        url: 'https://api.intra.42.fr/v2/me',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });
    } catch (error) {
      return error;
    }
    //console.log(' user DAta : ', userData.data);

    const user = await this.userService.findByUsername(userData.data.login);

    //console.log('checking user', user);
    if (user) {
      const tokens = await this.getTokens(
        user.uid,
        user.username,
        user.tfaEnabled,
        false,
      );

      await this.updateRtHash(user.uid, tokens.refreshToken);

      return { user, tokens, isNew: false };
    }

    const newUser = new CreateUserDto();

    newUser.email = userData.data.email;
    newUser.nickname = userData.data.displayname;
    // newUser.avatar = userData.data.image_url;
    newUser.username = userData.data.login;
    newUser.avatar =
      'https://avatars.dicebear.com/api/identicon/' + newUser.username + '.svg';
    // const chatRoom = new ChatRoom;
    // newUser.chatRooms =  [chatRoom];
    newUser.password = 'defaultpassword';
    await this.userService.create(newUser);
    const tokens = await this.getTokens(
      newUser.uid,
      newUser.username,
      false,
      false,
    );
    await this.updateRtHash(newUser.uid, tokens.refreshToken);

    console.log('created New User and assigned RefreshToken', newUser);
    return { newUser, tokens, isNew: true };
  }

  async getTokens(
    uid: string,
    login: string,
    state: boolean,
    logged: boolean,
  ): Promise<jwtTokens> {
    const payload = {
      username: login,
      sub: uid,
      tfaEnabled: state,
      tfaAuth: logged,
    };

    return {
      access_token: await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXP_H,
      }),
      refreshToken: await this.jwtService.signAsync(payload, {
        secret: process.env.RFH_SECRET,
        expiresIn: process.env.RFH_EXP_D,
      }),
      tfaEnabled: payload['tfaEnabled'],
      tfaAuth: payload['tfaAuth'],
    };
  }

  async updateRtHash(uid: string, rt: string): Promise<any> {
    const rtHash: string = await bcrypt.hash(rt, 10);

    return this.userService.updateRt(uid, rtHash);
  }

  async signUpLocal(username: string, password: string) {
    return this.userService.createLocal(username, password);
  }
}
