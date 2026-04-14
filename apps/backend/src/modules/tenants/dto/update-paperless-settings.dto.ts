import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaperlessSettingsDto {
  @ApiProperty({ example: 'http://paperless.intern:8000' })
  @IsUrl({ require_tld: false })   // require_tld: false erlaubt interne Hostnamen
  @IsNotEmpty()
  paperlessBaseUrl: string;

  @ApiProperty({ example: 'abc123def456...' })
  @IsString()
  @IsNotEmpty()
  paperlessApiToken: string;
}
