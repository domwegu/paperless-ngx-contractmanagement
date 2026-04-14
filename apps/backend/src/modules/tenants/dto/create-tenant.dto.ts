import { IsString, IsNotEmpty, IsOptional, IsUrl, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Muster GmbH' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'muster-gmbh', description: 'Eindeutiger URL-Kurzname (lowercase, keine Leerzeichen)' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten' })
  slug: string;

  @ApiPropertyOptional({ example: 'http://paperless.intern:8000' })
  @IsOptional()
  @IsUrl()
  paperlessBaseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paperlessApiToken?: string;
}
