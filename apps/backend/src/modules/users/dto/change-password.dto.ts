import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({ description: 'Aktuelles Passwort (nur bei eigenem Passwort ändern)' })
  @IsOptional() @IsString()
  currentPassword?: string;

  @ApiProperty({ minLength: 8 })
  @IsString() @MinLength(8)
  newPassword: string;
}
