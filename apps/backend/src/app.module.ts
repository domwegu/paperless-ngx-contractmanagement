import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule }          from './modules/auth/auth.module';
import { TenantsModule }       from './modules/tenants/tenants.module';
import { UsersModule }         from './modules/users/users.module';
import { ContractsModule }     from './modules/contracts/contracts.module';
import { DocumentsModule }     from './modules/documents/documents.module';
import { InvoicesModule }      from './modules/invoices/invoices.module';
import { RemindersModule }     from './modules/reminders/reminders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaperlessModule }     from './modules/paperless/paperless.module';

@Module({
  imports: [
    // Config (lädt .env)
    ConfigModule.forRoot({ isGlobal: true }),

    // Datenbank
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
        synchronize: cfg.get('APP_ENV') === 'development', // NIEMALS in prod
        logging:    cfg.get('APP_ENV') === 'development',
      }),
    }),

    // Cron-Jobs
    ScheduleModule.forRoot(),

    // Rate Limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    // Feature-Module
    AuthModule,
    TenantsModule,
    UsersModule,
    ContractsModule,
    DocumentsModule,
    InvoicesModule,
    RemindersModule,
    NotificationsModule,
    PaperlessModule,
  ],
})
export class AppModule {}
