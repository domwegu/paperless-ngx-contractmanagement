import {
  IsString, IsNotEmpty, IsOptional, IsEnum,
  IsDateString, IsNumber, IsPositive, Min, Max
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContractRenewalType } from '../contract.entity';

export class CreateContractDto {
  @ApiProperty({ example: 'Mietvertrag Büro Hauptstraße 1' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'VTR-2024-001' })
  @IsOptional() @IsString()
  contractNumber?: string;

  @ApiPropertyOptional({ example: 'Muster Immobilien GmbH' })
  @IsOptional() @IsString()
  partner?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  partnerAddress?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  partnerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  partnerPhone?: string;

  @ApiPropertyOptional({ example: 'Miete' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional() @IsDateString()
  signedDate?: string;

  @ApiPropertyOptional({ enum: ContractRenewalType, default: ContractRenewalType.AUTO_RENEW })
  @IsOptional() @IsEnum(ContractRenewalType)
  renewalType?: ContractRenewalType;

  @ApiPropertyOptional({ example: 12, description: 'Verlängerung in Monaten' })
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  renewalPeriodMonths?: number;

  @ApiPropertyOptional({ example: 90, description: 'Kündigungsfrist in Tagen' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  noticePeriodDays?: number;

  @ApiPropertyOptional({ example: 1500.00 })
  @IsOptional() @Type(() => Number) @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 1, description: '1=monatlich, 12=jährlich' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(120)
  paymentIntervalMonths?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  conditions?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
