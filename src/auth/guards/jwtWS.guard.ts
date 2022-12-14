import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { User } from 'src/entities/user.entity';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtWebSocketGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const f = async () => {
      const client = context.switchToWs().getClient();
      const cookieName = 'jwt-rft';
      try {
        var cookies = client.handshake.headers.cookie
          .split(';')
          .map((c) => c.trim())
          .filter((cookie) => {
            return cookie.substring(0, cookieName.length) === cookieName;
          });
      } catch (error) {
        return error;
      }

      const refreshToken: string = cookies[0].split('=')[1];

      const payload = await this.authService.verifyRT(refreshToken);

      const user: User = await this.authService.ValidatePayload(payload);
      if (user) {
        client.data.user = user;
        return true;
      }
      return false;
    };
    return f().then(async (r) => {
      return r;
    });
  }
}
