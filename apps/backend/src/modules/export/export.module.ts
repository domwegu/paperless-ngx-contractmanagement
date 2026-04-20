import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ApiTokenService } from './api-token.service';
import { ApiToken } from './api-token.entity';
import { Contract } from '../contracts/contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ApiToken])],
  providers: [ExportService, ApiTokenService],
  controllers: [ExportController],
})
export class ExportModule {}
