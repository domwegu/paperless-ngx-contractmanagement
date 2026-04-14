import { IsString, IsOptional, IsDateString, IsNumber, IsEnum, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../invoice.entity';

export class CreateInvoiceDto {
  @ApiPropertyOptional({ example: 'RE-2024-0042' })
  @IsOptional() @IsString()
  invoiceNumber?: string;

  @ApiProperty({ example: '2024-03-01' })
  @IsDateString()
  invoiceDate: string;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional() @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 1500.00 })
  @Type(() => Number) @IsNumber() @Min(0)
  amount: number;

  @ApiPropertyOptional({ default: 'EUR' })
  @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional() @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
