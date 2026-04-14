import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Contract } from '../contracts/contract.entity';
import { Reminder, ReminderType } from '../reminders/reminder.entity';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private cfg: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   cfg.get('MAIL_HOST'),
      port:   cfg.get<number>('MAIL_PORT') ?? 587,
      secure: cfg.get<number>('MAIL_PORT') === 465,
      auth: {
        user: cfg.get('MAIL_USER'),
        pass: cfg.get('MAIL_PASS'),
      },
    });
  }

  async sendReminderEmail(
    to: string | string[],
    reminder: Reminder,
    contract: Contract,
  ): Promise<boolean> {
    const recipients = Array.isArray(to) ? to : [to];
    const subject    = this.buildSubject(reminder, contract);
    const html       = this.buildHtml(reminder, contract);

    try {
      await this.transporter.sendMail({
        from:    `"Vertragsverwaltung" <${this.cfg.get('MAIL_USER')}>`,
        to:      recipients.join(', '),
        subject,
        html,
      });
      this.logger.log(`📧 Erinnerung gesendet an ${recipients.join(', ')} — ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(`E-Mail Versand fehlgeschlagen: ${err.message}`);
      return false;
    }
  }

  // ─── Subject ───────────────────────────────────

  private buildSubject(reminder: Reminder, contract: Contract): string {
    const date = reminder.referenceDate
      ? format(new Date(reminder.referenceDate), 'd. MMMM yyyy', { locale: de })
      : '';

    switch (reminder.type) {
      case ReminderType.CANCELLATION_DEADLINE:
        return `⚠️ Kündigungsfrist läuft ab: ${contract.title} (${date})`;
      case ReminderType.CONTRACT_EXPIRY:
        return `📋 Vertrag läuft aus: ${contract.title} (${date})`;
      case ReminderType.INVOICE_DUE:
        return `💶 Rechnung fällig: ${contract.title} (${date})`;
      default:
        return reminder.title ?? `Erinnerung: ${contract.title}`;
    }
  }

  // ─── HTML-Body ─────────────────────────────────

  private buildHtml(reminder: Reminder, contract: Contract): string {
    const refDate = reminder.referenceDate
      ? format(new Date(reminder.referenceDate), 'd. MMMM yyyy', { locale: de })
      : '—';

    const typeLabel: Record<ReminderType, string> = {
      [ReminderType.CANCELLATION_DEADLINE]: 'Kündigungsfrist',
      [ReminderType.CONTRACT_EXPIRY]:       'Vertragsablauf',
      [ReminderType.INVOICE_DUE]:           'Rechnungsfälligkeit',
      [ReminderType.CUSTOM]:                'Erinnerung',
    };

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    body        { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container  { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,.1); overflow: hidden; }
    .header     { background: #1e40af; color: #fff; padding: 24px 32px; }
    .header h1  { margin: 0; font-size: 20px; }
    .header p   { margin: 4px 0 0; opacity: .8; font-size: 13px; }
    .body       { padding: 32px; }
    .badge      { display: inline-block; padding: 4px 12px; border-radius: 99px;
                  background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600;
                  margin-bottom: 20px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .info-table td:first-child { color: #6b7280; width: 40%; }
    .highlight  { background: #fff7ed; border-left: 4px solid #f97316;
                  padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
    .footer     { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Vertragsverwaltung</h1>
    <p>Automatische Erinnerung</p>
  </div>
  <div class="body">
    <div class="badge">${typeLabel[reminder.type]}</div>
    <h2 style="margin-top:0">${contract.title}</h2>

    <table class="info-table">
      <tr><td>Vertragspartner</td><td>${contract.partner ?? '—'}</td></tr>
      <tr><td>Kategorie</td>      <td>${contract.category ?? '—'}</td></tr>
      <tr><td>Vertragsbeginn</td> <td>${contract.startDate ? format(new Date(contract.startDate), 'd.M.yyyy', { locale: de }) : '—'}</td></tr>
      <tr><td>Vertragsende</td>   <td>${contract.endDate   ? format(new Date(contract.endDate),   'd.M.yyyy', { locale: de }) : '—'}</td></tr>
      <tr><td>Fristdatum</td>     <td><strong>${refDate}</strong></td></tr>
      ${contract.noticePeriodDays ? `<tr><td>Kündigungsfrist</td><td>${contract.noticePeriodDays} Tage</td></tr>` : ''}
      ${contract.amount ? `<tr><td>Vertragswert</td><td>${Number(contract.amount).toFixed(2)} ${contract.currency ?? 'EUR'}</td></tr>` : ''}
    </table>

    <div class="highlight">
      ${reminder.message ?? this.buildDefaultMessage(reminder, contract, refDate)}
    </div>

    ${reminder.daysBefore ? `<p style="font-size:13px;color:#6b7280">Diese Erinnerung wurde <strong>${reminder.daysBefore} Tage</strong> vor der Frist ausgelöst.</p>` : ''}
  </div>
  <div class="footer">
    Diese E-Mail wurde automatisch von der Vertragsverwaltung gesendet.
    Bitte nicht direkt auf diese E-Mail antworten.
  </div>
</div>
</body>
</html>`;
  }

  private buildDefaultMessage(reminder: Reminder, contract: Contract, refDate: string): string {
    switch (reminder.type) {
      case ReminderType.CANCELLATION_DEADLINE:
        return `Die Kündigungsfrist für den Vertrag <strong>${contract.title}</strong> läuft am <strong>${refDate}</strong> ab.
                Wenn Sie den Vertrag nicht verlängern möchten, müssen Sie bis zu diesem Datum kündigen.`;
      case ReminderType.CONTRACT_EXPIRY:
        return `Der Vertrag <strong>${contract.title}</strong> läuft am <strong>${refDate}</strong> aus.`;
      case ReminderType.INVOICE_DUE:
        return `Eine Rechnung zum Vertrag <strong>${contract.title}</strong> ist am <strong>${refDate}</strong> fällig.`;
      default:
        return reminder.message ?? `Erinnerung für Vertrag ${contract.title}.`;
    }
  }
}
