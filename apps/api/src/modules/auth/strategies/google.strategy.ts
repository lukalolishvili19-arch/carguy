import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId') || 'missing',
      clientSecret: config.get<string>('google.clientSecret') || 'missing',
      callbackURL: config.get<string>('google.callbackUrl') || 'http://localhost:4000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const { id, displayName, emails, photos } = profile;
    const user = {
      providerId: id,
      email: emails?.[0]?.value ?? '',
      displayName: displayName ?? emails?.[0]?.value ?? 'Google User',
      avatarUrl: photos?.[0]?.value,
    };
    done(null, user);
  }
}
