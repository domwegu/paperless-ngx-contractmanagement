import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './tenant.entity';
import { PaperlessModule } from '../paperless/paperless.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    forwardRef(() => PaperlessModule),   // circular dependency: Tenants ↔ Paperless
  ],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
