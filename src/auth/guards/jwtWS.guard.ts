import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Socket } from "dgram";
import { Observable } from "rxjs";
import { User } from "src/entities/user.entity";
import { AuthService } from "../auth.service";



@Injectable()
export class JwtWebSocketGuard implements CanActivate {

    constructor(private readonly authService: AuthService) {

    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
    
        const client = context.switchToWs().getClient();
        const cookieName: string = 'jwt-rft';
        let cookies = client.handshake.headers.cookie.split(';').map(c => c.trim()).filter( cookie => {return cookie.substring(0,cookieName.length) === cookieName});

        const refreshToken : string = cookies[0].split('=')[1];

        console.log('ws cookie extractd token ', refreshToken);
        const payload =  await this.authService.verifyRT(refreshToken);

        const user: User = await this.authService.ValidatePayload(payload);

        if (user) {

            client.data.user = { ...user};
            return true;
        }
        return false;
    }


}