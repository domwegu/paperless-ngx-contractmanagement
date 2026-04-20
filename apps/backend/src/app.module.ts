import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { AuthModule }          from './modules/auth/auth.module';
import { TenantsModule }       from './modules/tenants/tenants.module';
import { UsersModule }         from './modules/users/users.module';
import { ContractsModule }     from './modules/contracts/contracts.module';
import { DocumentsModule }     from './modules/documents/documents.module';
import { InvoicesModule }      from './modules/invoices/invoices.module';
import { RemindersModule }     from './modules/reminders/reminders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaperlessModule }     from './modules/paperless/paperless.module';
import { ExportModule }        from './modules/export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get('DB_HOST'),
        port:     cfg.get<number>('DB_PORT'),
        database: cfg.get('DB_NAME'),
        username: cfg.get('DB_USER'),
        password: cfg.get('DB_PASSWORD'),
        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
        synchronize: cfg.get('APP_ENV') === 'development',
        logging:    cfg.get('APP_ENV') === 'development',
      }),
    }),

    // Multer: Uploads im Arbeitsspeicher (werden direkt nach Paperless weitergeleitet)
    MulterModule.register({ storage: memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }),

    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    AuthModule,
    TenantsModule,
    UsersModule,
    ContractsModule,
    DocumentsModule,
    InvoicesModule,
    RemindersModule,
    NotificationsModule,
    PaperlessModule,
    ExportModule,
  ],
})
export class AppModule {}
