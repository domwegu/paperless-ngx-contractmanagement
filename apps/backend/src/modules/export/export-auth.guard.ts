import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ApiTokenService } from './api-token.service';
import { User } from '../users/user.entity';

@Injectable()
export class ExportAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private cfg: ConfigService,
    private apiTokenService: ApiTokenService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: any; exportTenantId?: string }>();
    const auth = req.headers.authorization ?? '';

    if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Kein Token');

    const token = auth.slice(7);

    // ─── API-Token ────────────────────────────
    if (token.startsWith('vv_')) {
      const entity = await this.apiTokenService.validate(token);
      if (!entity) throw new UnauthorizedException('Ungültiger oder abgelaufener API-Token');
      req.exportTenantId = entity.tenantId;
      return true;
    }

    // ─── JWT ──────────────────────────────────
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.cfg.get<string>('JWT_SECRET'),
      });
      const user = await this.userRepo
        .createQueryBuilder('u')
        .select(['u.id', 'u.email', 'u.role', 'u.tenantId', 'u.isActive'])
        .where('u.id = :id AND u.isActive = true', { id: payload.sub })
        .getOne();
      if (!user) throw new UnauthorizedException();
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Ungültiger Token');
    }
  }
}
