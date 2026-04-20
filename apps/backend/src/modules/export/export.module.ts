import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { Contract } from '../contracts/contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract])],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
