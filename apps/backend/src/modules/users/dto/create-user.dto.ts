import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  firstName: string;

  @ApiProperty() @IsString() @IsNotEmpty()
  lastName: string;

  @ApiProperty() @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.VIEWER })
  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  tenantId?: string;
}
