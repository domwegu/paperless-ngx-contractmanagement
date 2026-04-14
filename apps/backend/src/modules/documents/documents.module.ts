import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { ContractDocument } from './contract-document.entity';
import { Contract } from '../contracts/contract.entity';
import { PaperlessModule } from '../paperless/paperless.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContractDocument, Contract]),
    PaperlessModule,
  ],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
