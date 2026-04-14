import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { Reminder } from './reminder.entity';
import { Contract } from '../contracts/contract.entity';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder, Contract, User]),
    NotificationsModule,
    ContractsModule,
  ],
  providers:   [RemindersService],
  controllers: [RemindersController],
  exports:     [RemindersService],
})
export class RemindersModule {}
