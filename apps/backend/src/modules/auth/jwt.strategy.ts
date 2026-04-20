import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private cfg: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id', 'u.email', 'u.firstName', 'u.lastName',
        'u.role', 'u.isActive', 'u.tenantId',
      ])
      .where('u.id = :id', { id: payload.sub })
      .andWhere('u.isActive = true')
      .getOne();

    if (!user) throw new UnauthorizedException('Benutzer nicht gefunden oder inaktiv');

    // tenantId aus JWT als Fallback falls QueryBuilder sie nicht liefert
    if (!user.tenantId && payload.tenantId) {
      user.tenantId = payload.tenantId;
    }

    return user;
  }
}
