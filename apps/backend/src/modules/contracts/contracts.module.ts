import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { Contract } from './contract.entity';
import { DocumentsModule } from '../documents/documents.module';
import { PaperlessModule } from '../paperless/paperless.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract]),
    DocumentsModule,
    PaperlessModule,
  ],
  providers: [ContractsService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
