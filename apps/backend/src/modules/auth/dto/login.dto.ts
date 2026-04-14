import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'max@muster.de' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  password: string;
}
