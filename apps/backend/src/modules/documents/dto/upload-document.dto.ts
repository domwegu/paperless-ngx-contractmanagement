import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '../contract-document.entity';

export class UploadDocumentDto {
  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.CONTRACT })
  @IsOptional() @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ example: 'Hauptvertrag 2024' })
  @IsOptional() @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}
