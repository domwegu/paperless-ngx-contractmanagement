import { PartialType } from '@nestjs/swagger';
import { CreateContractDto } from './create-contract.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '../contract.entity';

export class UpdateContractDto extends PartialType(CreateContractDto) {
  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional() @IsEnum(ContractStatus)
  status?: ContractStatus;
}
