import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrat } from './strategies/local.strategy';
import { JwtStartRefresh } from './strategies/jwtRefresh.strategy';
import { fortyTwoStrat } from './strategies/fortytwo.strategy';
import { JwtAuthGuard } from './guards/jwt.guard';
import { JwtStartegy } from './strategies/jwt.strategy';


@Module({
  imports:[
    PassportModule,
    JwtModule.register({}),
    UserModule
  ],
  controllers:[fortyTwoStrat],
  providers: [AuthService, LocalStrat, JwtStartRefresh, JwtStartegy],
  exports: [AuthService]
})
export class AuthModule {}
