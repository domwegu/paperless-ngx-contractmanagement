import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract, ContractStatus } from '../contracts/contract.entity';
import * as ExcelJS from 'exceljs';
import type { Cell } from 'exceljs';

const STATUS_LABELS: Record<ContractStatus, string> = {
  active:    'Aktiv',
  expiring:  'Läuft ab',
  expired:   'Abgelaufen',
  cancelled: 'Gekündigt',
  draft:     'Entwurf',
};

const RENEWAL_LABELS: Record<string, string> = {
  auto_renew:  'Automatisch',
  fixed_term:  'Befristet',
  manual:      'Manuell',
};

const fmt = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString('de-DE') : '';

const fmtCurrency = (amount?: number | null, currency = 'EUR') =>
  amount != null ? `${Number(amount).toFixed(2)} ${currency}` : '';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Contract) private contractRepo: Repository<Contract>,
  ) {}

  private async loadContracts(tenantId: string): Promise<Contract[]> {
    return this.contractRepo.find({
      where: { tenantId },
      relations: ['invoices'],
      order: { title: 'ASC' },
    });
  }

  // ─── JSON für Power Query ─────────────────────

  async getContractsJson(tenantId: string) {
    const contracts = await this.loadContracts(tenantId);
    return contracts.map((c) => ({
      id:                   c.id,
      titel:                c.title,
      vertragsnummer:       c.contractNumber ?? '',
      partner:              c.partner ?? '',
      kategorie:            c.category ?? '',
      status:               STATUS_LABELS[c.status] ?? c.status,
      abschlussdatum:       fmt(c.signedDate),
      beginn:               fmt(c.startDate),
      ende:                 fmt(c.endDate),
      verlängerungsart:     RENEWAL_LABELS[c.renewalType] ?? c.renewalType,
      verlängerung_monate:  c.renewalPeriodMonths ?? '',
      kündigungsfrist_tage: c.noticePeriodDays ?? '',
      kündigung_bis:        fmt(c.cancellationDeadline),
      nächster_termin:      fmt(c.nextCancellationDate),
      betrag:               c.amount ?? '',
      währung:              c.currency ?? 'EUR',
      zahlungsintervall:    c.paymentIntervalMonths ?? '',
      beschreibung:         c.description ?? '',
      konditionen:          c.conditions ?? '',
      notizen:              c.notes ?? '',
      anzahl_rechnungen:    c.invoices?.length ?? 0,
      angelegt_am:          fmt(c.createdAt),
      geändert_am:          fmt(c.updatedAt),
    }));
  }

  // ─── Excel Export ─────────────────────────────

  async generateXlsx(tenantId: string): Promise<Buffer> {
    const contracts = await this.loadContracts(tenantId);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Vertragsverwaltung';
    wb.created = new Date();

    // ── Sheet 1: Vertragsübersicht ──────────────
    const ws = wb.addWorksheet('Verträge', { views: [{ state: 'frozen', ySplit: 1 }] });

    const COLS = [
      { header: 'Titel',              key: 'title',                 width: 35 },
      { header: 'Vertragsnummer',     key: 'contractNumber',        width: 18 },
      { header: 'Partner',            key: 'partner',               width: 28 },
      { header: 'Kategorie',          key: 'category',              width: 18 },
      { header: 'Status',             key: 'status',                width: 14 },
      { header: 'Abschluss',          key: 'signedDate',            width: 13 },
      { header: 'Beginn',             key: 'startDate',             width: 13 },
      { header: 'Ende',               key: 'endDate',               width: 13 },
      { header: 'Verlängerungsart',   key: 'renewalType',           width: 18 },
      { header: 'Verlängerung (Mon)', key: 'renewalPeriodMonths',   width: 18 },
      { header: 'Kündigung (Tage)',   key: 'noticePeriodDays',      width: 16 },
      { header: 'Kündigung bis',      key: 'cancellationDeadline',  width: 14 },
      { header: 'Betrag',             key: 'amount',                width: 14 },
      { header: 'Währung',            key: 'currency',              width: 10 },
      { header: 'Zahlungsintervall',  key: 'paymentIntervalMonths', width: 16 },
      { header: 'Rechnungen',         key: 'invoiceCount',          width: 12 },
      { header: 'Notizen',            key: 'notes',                 width: 30 },
    ];

    ws.columns = COLS;

    // Header-Styling
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell: Cell) => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF132d52' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FF4d84d1' } } };
    });
    headerRow.height = 24;

    // Status-Farben
    const STATUS_COLORS: Record<ContractStatus, string> = {
      active:    'FFdcfce7',
      expiring:  'FFffedd5',
      expired:   'FFfee2e2',
      cancelled: 'FFf3f4f6',
      draft:     'FFdbeafe',
    };

    // Datenzeilen
    contracts.forEach((c, i) => {
      const row = ws.addRow({
        title:                c.title,
        contractNumber:       c.contractNumber ?? '',
        partner:              c.partner ?? '',
        category:             c.category ?? '',
        status:               STATUS_LABELS[c.status] ?? c.status,
        signedDate:           c.signedDate ? new Date(c.signedDate) : '',
        startDate:            c.startDate  ? new Date(c.startDate)  : '',
        endDate:              c.endDate    ? new Date(c.endDate)     : '',
        renewalType:          RENEWAL_LABELS[c.renewalType] ?? c.renewalType,
        renewalPeriodMonths:  c.renewalPeriodMonths ?? '',
        noticePeriodDays:     c.noticePeriodDays ?? '',
        cancellationDeadline: c.cancellationDeadline ? new Date(c.cancellationDeadline) : '',
        amount:               c.amount ?? '',
        currency:             c.currency ?? 'EUR',
        paymentIntervalMonths: c.paymentIntervalMonths ?? '',
        invoiceCount:         c.invoices?.length ?? 0,
        notes:                c.notes ?? '',
      });

      // Zebra-Streifen
      const bgColor = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      row.eachCell((cell: Cell) => {
        cell.font      = { name: 'Arial', size: 10 };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle', wrapText: false };
        cell.border    = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      });

      // Datum-Format
      ['signedDate', 'startDate', 'endDate', 'cancellationDeadline'].forEach((k) => {
        const col = COLS.findIndex((c) => c.key === k) + 1;
        const cell = row.getCell(col);
        if (cell.value) cell.numFmt = 'DD.MM.YYYY';
      });

      // Betrag-Format
      const amountCell = row.getCell(COLS.findIndex((c) => c.key === 'amount') + 1);
      if (amountCell.value) amountCell.numFmt = '#,##0.00';

      // Status-Farbe
      const statusCell = row.getCell(COLS.findIndex((c) => c.key === 'status') + 1);
      const statusColor = STATUS_COLORS[c.status];
      if (statusColor) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
        statusCell.font = { ...statusCell.font, bold: true };
      }

      row.height = 18;
    });

    // AutoFilter
    ws.autoFilter = { from: 'A1', to: `Q${contracts.length + 1}` };

    // ── Sheet 2: Fälligkeiten ───────────────────
    const ws2 = wb.addWorksheet('Fälligkeiten', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws2.columns = [
      { header: 'Titel',          key: 'title',    width: 35 },
      { header: 'Partner',        key: 'partner',  width: 28 },
      { header: 'Kündigung bis',  key: 'deadline', width: 16 },
      { header: 'Vertragsende',   key: 'end',      width: 14 },
      { header: 'Frist (Tage)',   key: 'days',     width: 12 },
      { header: 'Status',         key: 'status',   width: 14 },
    ];

    const h2 = ws2.getRow(1);
    h2.eachCell((cell: Cell) => {
      cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF132d52' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    h2.height = 24;

    const today = new Date();
    const relevant = contracts
      .filter((c) => c.cancellationDeadline && c.status !== 'cancelled' && c.status !== 'expired')
      .sort((a, b) => new Date(a.cancellationDeadline!).getTime() - new Date(b.cancellationDeadline!).getTime());

    relevant.forEach((c, i) => {
      const deadline = new Date(c.cancellationDeadline!);
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
      const row = ws2.addRow({
        title:    c.title,
        partner:  c.partner ?? '',
        deadline,
        end:      c.endDate ? new Date(c.endDate) : '',
        days:     daysLeft,
        status:   STATUS_LABELS[c.status],
      });

      const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      row.eachCell((cell: Cell) => {
        cell.font  = { name: 'Arial', size: 10 };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      });

      row.getCell(3).numFmt = 'DD.MM.YYYY';
      row.getCell(4).numFmt = 'DD.MM.YYYY';

      // Ampel-Farbe bei Frist
      const daysCell = row.getCell(5);
      if (daysLeft < 0)  daysCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFEF4444' } };
      else if (daysLeft <= 30) daysCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFF97316' } };
      else if (daysLeft <= 90) daysCell.font = { name: 'Arial', size: 10, color: { argb: 'FFFBBF24' } };

      row.height = 18;
    });

    ws2.autoFilter = { from: 'A1', to: `F${relevant.length + 1}` };

    return wb.buffer as Promise<Buffer>;
  }

  // ─── PDF Export ───────────────────────────────

  async generatePdf(tenantId: string): Promise<Buffer> {
    const contracts = await this.loadContracts(tenantId);

    const rows = contracts.map((c) => {
      const deadline = c.cancellationDeadline ? new Date(c.cancellationDeadline) : null;
      const daysLeft = deadline
        ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)
        : null;
      const urgency = daysLeft != null
        ? daysLeft < 0 ? '#ef4444' : daysLeft <= 30 ? '#f97316' : daysLeft <= 90 ? '#f59e0b' : '#22c55e'
        : '#9ca3af';

      return `
        <tr>
          <td>${c.title}</td>
          <td>${c.partner ?? '—'}</td>
          <td>${c.category ?? '—'}</td>
          <td><span class="badge badge-${c.status}">${STATUS_LABELS[c.status]}</span></td>
          <td>${fmt(c.startDate)}</td>
          <td>${fmt(c.endDate)}</td>
          <td style="color:${urgency};font-weight:600">${fmt(c.cancellationDeadline)}</td>
          <td>${c.noticePeriodDays ? c.noticePeriodDays + ' Tage' : '—'}</td>
          <td style="text-align:right">${fmtCurrency(c.amount, c.currency)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; background: white; }
  .header { background: #132d52; color: white; padding: 16px 24px; margin-bottom: 16px; }
  .header h1 { font-size: 16pt; margin-bottom: 2px; }
  .header p  { font-size: 9pt; opacity: .7; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th { background: #132d52; color: white; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { padding: 2px 7px; border-radius: 99px; font-size: 7.5pt; font-weight: 600; }
  .badge-active    { background: #dcfce7; color: #15803d; }
  .badge-expiring  { background: #ffedd5; color: #c2410c; }
  .badge-expired   { background: #fee2e2; color: #b91c1c; }
  .badge-cancelled { background: #f3f4f6; color: #4b5563; }
  .badge-draft     { background: #dbeafe; color: #1d4ed8; }
  .footer { margin-top: 12px; font-size: 8pt; color: #9ca3af; text-align: right; }
  @page { size: A4 landscape; margin: 15mm; }
</style>
</head>
<body>
  <div class="header">
    <h1>Vertragsübersicht</h1>
    <p>Erstellt am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${contracts.length} Verträge</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Titel</th><th>Partner</th><th>Kategorie</th><th>Status</th>
        <th>Beginn</th><th>Ende</th><th>Kündigung bis</th><th>Frist</th><th>Betrag</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Vertragsverwaltung · Seite <span class="pageNumber"></span></div>
</body>
</html>`;

    // Puppeteer für PDF-Generierung
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', landscape: true, printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
    await browser.close();
    return Buffer.from(pdf);
  }
}
