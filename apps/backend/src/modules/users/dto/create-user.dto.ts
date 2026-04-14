import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'Max' })
  @IsString() @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Mustermann' })
  @IsString() @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'max@muster.de' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
