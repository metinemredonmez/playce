import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Env } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard, RolesGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { IdTokenVerifier, remoteJwks } from './id-token.verifier';
import { MailService } from './mail.service';
import { OtpService } from './otp.service';
import { TokenService } from './tokens.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256', issuer: 'playce' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'playce' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, MailService, IdTokenVerifier, remoteJwks, AuthGuard, RolesGuard],
  exports: [TokenService, AuthGuard, RolesGuard],
})
export class AuthModule {}
