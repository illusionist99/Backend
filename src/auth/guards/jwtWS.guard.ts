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
        const refreshToken : string = client.handshake.headers.cookie.split('=')[1];

        // console.log(refreshToken);
        const payload =  await this.authService.verifyRT(refreshToken);

        const user: User = await this.authService.ValidatePayload(payload);

        if (user) {

            client.data.user = { ...user};
            return true;
        }
        return false;
    }


}