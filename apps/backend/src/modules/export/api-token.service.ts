import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiToken } from './api-token.entity';
import { addYears } from 'date-fns';

@Injectable()
export class ApiTokenService {
  constructor(
    @InjectRepository(ApiToken) private tokenRepo: Repository<ApiToken>,
  ) {}

  async generate(tenantId: string, name: string, years = 5): Promise<{ token: string; entity: ApiToken }> {
    // Alte Token mit gleichem Namen deaktivieren
    await this.tokenRepo.update({ tenantId, name }, { isActive: false });

    const rawToken = randomBytes(32).toString('hex');  // 64-Zeichen hex
    const hashed   = createHash('sha256').update(rawToken).digest('hex');

    const entity = await this.tokenRepo.save(this.tokenRepo.create({
      name,
      token:     hashed,
      tenantId,
      expiresAt: addYears(new Date(), years),
      isActive:  true,
    }));

    // Rohtoken nur einmal zurückgeben — wird danach nicht mehr angezeigt
    return { token: `vv_${rawToken}`, entity };
  }

  async validate(rawToken: string): Promise<ApiToken | null> {
    if (!rawToken.startsWith('vv_')) return null;
    const hashed = createHash('sha256').update(rawToken.slice(3)).digest('hex');
    const entity = await this.tokenRepo.findOne({
      where: { token: hashed, isActive: true },
    });
    if (!entity) return null;
    if (entity.expiresAt < new Date()) return null;

    // lastUsedAt aktualisieren (fire-and-forget)
    this.tokenRepo.update(entity.id, { lastUsedAt: new Date() });
    return entity;
  }

  async findAll(tenantId: string): Promise<ApiToken[]> {
    return this.tokenRepo.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string, tenantId: string): Promise<void> {
    await this.tokenRepo.update({ id, tenantId }, { isActive: false });
  }
}
