import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, ParseUUIDPipe, HttpCode, HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsArray, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

class CreateCustomReminderDto {
  @ApiProperty({ example: 'Verlängerungsentscheidung treffen' })
  @IsString()
  title: string;

  @ApiProperty({ example: '2024-11-01' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  message?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsEmail({}, { each: true })
  notifyEmails?: string[];
}

class SnoozeDto {
  @ApiProperty({ example: '2024-10-15', description: 'Erinnerung bis zu diesem Datum verschieben' })
  @IsDateString()
  until: string;
}

@ApiTags('Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RemindersController {
  constructor(private remindersService: RemindersService) {}

  @Get('reminders/summary')
  @ApiOperation({ summary: 'Dashboard-Zusammenfassung: offene Fristen + Erinnerungen' })
  getSummary(@CurrentUser() user: User) {
    return this.remindersService.getUpcomingSummary(user.tenantId);
  }

  @Get('contracts/:contractId/reminders')
  @ApiOperation({ summary: 'Alle Erinnerungen für einen Vertrag' })
  findByContract(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUser() user: User,
  ) {
    return this.remindersService.findByContract(contractId, user.tenantId);
  }

  @Post('contracts/:contractId/reminders')
  @ApiOperation({ summary: 'Manuelle Erinnerung für einen Vertrag anlegen' })
  createCustom(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: CreateCustomReminderDto,
    @CurrentUser() user: User,
  ) {
    return this.remindersService.createCustomReminder(user.tenantId, contractId, dto);
  }

  @Patch('reminders/:id/snooze')
  @ApiOperation({ summary: 'Erinnerung verschieben (Snooze)' })
  snooze(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SnoozeDto,
    @CurrentUser() user: User,
  ) {
    return this.remindersService.snooze(id, user.tenantId, dto.until);
  }

  @Patch('reminders/:id/done')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Erinnerung als erledigt markieren' })
  markDone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.remindersService.markDone(id, user.tenantId);
  }

  @Post('reminders/run-now')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reminder-Job manuell auslösen (z.B. zum Testen)' })
  runNow(@CurrentUser() user: User) {
    return this.remindersService.runDailyJob();
  }
}
