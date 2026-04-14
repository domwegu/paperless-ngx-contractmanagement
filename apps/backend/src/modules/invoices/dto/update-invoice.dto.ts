import { IsString, IsOptional, IsDateString, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../invoice.entity';

export class UpdateInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  amount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus }) @IsOptional() @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}
