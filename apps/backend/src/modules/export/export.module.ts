import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ExportAuthGuard } from './export-auth.guard';
import { ApiTokenService } from './api-token.service';
import { ApiToken } from './api-token.entity';
import { Contract } from '../contracts/contract.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ApiToken, User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN') ?? '8h' },
      }),
    }),
  ],
  providers: [ExportService, ApiTokenService, ExportAuthGuard],
  controllers: [ExportController],
})
export class ExportModule {}
