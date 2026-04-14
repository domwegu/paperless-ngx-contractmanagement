import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '../contract.entity';
import { Type } from 'class-transformer';

export class ContractFilterDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;               // Freitext: title, partner, contractNumber

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional() @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Verträge die vor diesem Datum ablaufen (YYYY-MM-DD)' })
  @IsOptional() @IsDateString()
  expiringBefore?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number)
  limit?: number = 20;
}
