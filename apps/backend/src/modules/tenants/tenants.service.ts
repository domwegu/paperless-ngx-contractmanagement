import {
  Injectable, NotFoundException, ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const exists = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException(`Slug '${dto.slug}' bereits vergeben`);
    const tenant = this.tenantRepo.create(dto);
    return this.tenantRepo.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Mandant nicht gefunden');
    return tenant;
  }

  async findOneWithToken(id: string): Promise<Tenant> {
    // Explizit paperlessApiToken laden (select: false)
    const tenant = await this.tenantRepo
      .createQueryBuilder('t')
      .addSelect('t.paperlessApiToken')
      .where('t.id = :id', { id })
      .getOne();
    if (!tenant) throw new NotFoundException('Mandant nicht gefunden');
    return tenant;
  }

  async update(id: string, dto: Partial<CreateTenantDto>): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    tenant.isActive = false;
    await this.tenantRepo.save(tenant);
  }
}
