import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addDays } from 'date-fns';
import { Reminder, ReminderType, ReminderStatus } from './reminder.entity';
import { Contract, ContractStatus } from '../contracts/contract.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { ContractsService } from '../contracts/contracts.service';

// Wie viele Tage vor einer Frist soll erinnert werden?
const REMINDER_THRESHOLDS_DAYS = [90, 30, 14, 7];

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(Reminder)  private reminderRepo: Repository<Reminder>,
    @InjectRepository(Contract)  private contractRepo:  Repository<Contract>,
    @InjectRepository(User)      private userRepo:      Repository<User>,
    private notificationsService: NotificationsService,
    private contractsService:     ContractsService,
  ) {}

  // ─── Cron: täglich 07:00 ──────────────────────

  @Cron('0 7 * * *', { name: 'daily-reminders', timeZone: 'Europe/Berlin' })
  async runDailyJob(): Promise<void> {
    this.logger.log('⏰ Täglicher Reminder-Job gestartet');
    await this.contractsService.refreshStatuses();
    await this.generateReminders();
    await this.sendPendingReminders();
    this.logger.log('✅ Reminder-Job abgeschlossen');
  }

  // ─── Reminder generieren ──────────────────────
  // Legt für jeden Vertrag + Schwellenwert einen Reminder an (falls noch nicht vorhanden)

  async generateReminders(): Promise<void> {
    const today = new Date();
    const activeContracts = await this.contractRepo.find({
      where: [
        { status: ContractStatus.ACTIVE },
        { status: ContractStatus.EXPIRING },
      ],
    });

    for (const contract of activeContracts) {
      await this.ensureRemindersForContract(contract, today);
    }
  }

  private async ensureRemindersForContract(contract: Contract, today: Date): Promise<void> {
    // 1. Kündigungsfrist-Erinnerungen
    if (contract.cancellationDeadline) {
      for (const days of REMINDER_THRESHOLDS_DAYS) {
        const reminderDate = addDays(new Date(contract.cancellationDeadline), -days);
        if (reminderDate <= today) continue; // liegt in der Vergangenheit

        await this.findOrCreateReminder({
          contractId:    contract.id,
          tenantId:      contract.tenantId,
          type:          ReminderType.CANCELLATION_DEADLINE,
          dueDate:       reminderDate,
          referenceDate: contract.cancellationDeadline,
          daysBefore:    days,
          title: `Kündigungsfrist in ${days} Tagen: ${contract.title}`,
        });
      }
    }

    // 2. Vertragsablauf-Erinnerungen
    if (contract.endDate) {
      for (const days of REMINDER_THRESHOLDS_DAYS) {
        const reminderDate = addDays(new Date(contract.endDate), -days);
        if (reminderDate <= today) continue;

        await this.findOrCreateReminder({
          contractId:    contract.id,
          tenantId:      contract.tenantId,
          type:          ReminderType.CONTRACT_EXPIRY,
          dueDate:       reminderDate,
          referenceDate: contract.endDate,
          daysBefore:    days,
          title: `Vertragsende in ${days} Tagen: ${contract.title}`,
        });
      }
    }
  }

  private async findOrCreateReminder(data: Partial<Reminder>): Promise<void> {
    const existing = await this.reminderRepo.findOne({
      where: {
        contractId: data.contractId,
        type:       data.type,
        daysBefore: data.daysBefore,
        status:     ReminderStatus.PENDING,
      },
    });
    if (!existing) {
      await this.reminderRepo.save(this.reminderRepo.create(data));
    }
  }

  // ─── Pending Reminders versenden ─────────────

  async sendPendingReminders(): Promise<number> {
    const today = new Date();
    const pending = await this.reminderRepo.find({
      where: {
        status:  ReminderStatus.PENDING,
        dueDate: LessThanOrEqual(today),
      },
      relations: ['contract'],
    });

    let sent = 0;
    for (const reminder of pending) {
      const emails = await this.getRecipientEmails(reminder);
      if (!emails.length) {
        this.logger.warn(`Kein Empfänger für Reminder ${reminder.id} (Tenant ${reminder.tenantId})`);
        continue;
      }

      const ok = await this.notificationsService.sendReminderEmail(
        emails,
        reminder,
        reminder.contract,
      );

      if (ok) {
        reminder.status = ReminderStatus.SENT;
        reminder.sentAt = new Date();
        await this.reminderRepo.save(reminder);
        sent++;
      }
    }

    this.logger.log(`📧 ${sent}/${pending.length} Erinnerungen versendet`);
    return sent;
  }

  // ─── Empfänger ermitteln ──────────────────────

  private async getRecipientEmails(reminder: Reminder): Promise<string[]> {
    const emails = new Set<string>();

    // Mandanten-Admins + alle User des Mandanten erhalten Erinnerungen
    const users = await this.userRepo.find({ where: { tenantId: reminder.tenantId, isActive: true } });
    users.forEach((u) => emails.add(u.email));

    // Zusätzliche Empfänger direkt am Reminder
    reminder.notifyEmails?.forEach((e) => emails.add(e));

    return [...emails];
  }

  // ─── REST: manuelle Reminder-Verwaltung ──────

  async findByContract(contractId: string, tenantId: string): Promise<Reminder[]> {
    return this.reminderRepo.find({
      where: { contractId, tenantId },
      order: { dueDate: 'ASC' },
    });
  }

  async createCustomReminder(
    tenantId: string,
    contractId: string,
    data: { title: string; dueDate: string; message?: string; notifyEmails?: string[] },
  ): Promise<Reminder> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');

    return this.reminderRepo.save(this.reminderRepo.create({
      contractId,
      tenantId,
      type:         ReminderType.CUSTOM,
      dueDate:      new Date(data.dueDate),
      title:        data.title,
      message:      data.message,
      notifyEmails: data.notifyEmails,
    }));
  }

  async snooze(id: string, tenantId: string, until: string): Promise<Reminder> {
    const reminder = await this.reminderRepo.findOne({ where: { id, tenantId } });
    if (!reminder) throw new NotFoundException('Erinnerung nicht gefunden');
    reminder.status      = ReminderStatus.SNOOZED;
    reminder.snoozedUntil = new Date(until);
    // Wecken: dueDate auf snoozedUntil setzen + Status zurück auf PENDING
    reminder.dueDate     = new Date(until);
    reminder.status      = ReminderStatus.PENDING;
    return this.reminderRepo.save(reminder);
  }

  async markDone(id: string, tenantId: string): Promise<Reminder> {
    const reminder = await this.reminderRepo.findOne({ where: { id, tenantId } });
    if (!reminder) throw new NotFoundException('Erinnerung nicht gefunden');
    reminder.status = ReminderStatus.DONE;
    return this.reminderRepo.save(reminder);
  }

  async getUpcomingSummary(tenantId: string): Promise<{
    next30days: number;
    next90days: number;
    overdue: number;
    reminders: Reminder[];
  }> {
    const today  = new Date();
    const in30   = addDays(today, 30);
    const in90   = addDays(today, 90);

    const all = await this.reminderRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.contract', 'c')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.status = :status', { status: ReminderStatus.PENDING })
      .orderBy('r.dueDate', 'ASC')
      .getMany();

    return {
      overdue:    all.filter((r) => new Date(r.dueDate) < today).length,
      next30days: all.filter((r) => new Date(r.dueDate) <= in30).length,
      next90days: all.filter((r) => new Date(r.dueDate) <= in90).length,
      reminders:  all.slice(0, 20),
    };
  }
}
