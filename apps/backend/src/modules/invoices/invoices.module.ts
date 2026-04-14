import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './invoice.entity';
import { Contract } from '../contracts/contract.entity';
import { PaperlessModule } from '../paperless/paperless.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Contract]),
    PaperlessModule,
  ],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
