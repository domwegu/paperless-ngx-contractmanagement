import {
  Injectable, NotFoundException, ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { addDays, addMonths, isBefore, parseISO } from 'date-fns';
import { Contract, ContractStatus, ContractRenewalType } from './contract.entity';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractFilterDto } from './dto/contract-filter.dto';
import { PaperlessService } from '../paperless/paperless.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private contractRepo: Repository<Contract>,
    private paperlessService: PaperlessService,
  ) {}

  // ─── Erstellen ────────────────────────────────

  async create(tenantId: string, dto: CreateContractDto): Promise<Contract> {
    const contract = this.contractRepo.create({ ...dto, tenantId });
    this.recalculateDeadlines(contract);

    // Paperless-Tag für diesen Vertrag anlegen
    try {
      const tag = await this.paperlessService.findOrCreateTag(
        tenantId,
        `Vertrag: ${dto.title}`,
      );
      contract.paperlessTagId = tag.id;
    } catch {
      // Paperless optional — Vertrag trotzdem speichern
    }

    return this.contractRepo.save(contract);
  }

  // ─── Liste mit Filter + Pagination ───────────

  async findAll(tenantId: string, filter: ContractFilterDto) {
    const qb: SelectQueryBuilder<Contract> = this.contractRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.documents', 'doc')
      .where('c.tenantId = :tenantId', { tenantId })
      .orderBy('c.updatedAt', 'DESC');

    if (filter.search) {
      qb.andWhere(
        '(c.title ILIKE :s OR c.partner ILIKE :s OR c.contractNumber ILIKE :s)',
        { s: `%${filter.search}%` },
      );
    }
    if (filter.status) {
      qb.andWhere('c.status = :status', { status: filter.status });
    }
    if (filter.category) {
      qb.andWhere('c.category ILIKE :cat', { cat: `%${filter.category}%` });
    }
    if (filter.expiringBefore) {
      qb.andWhere('c.cancellationDeadline <= :exp', { exp: filter.expiringBefore });
    }

    const page  = filter.page  ?? 1;
    const limit = filter.limit ?? 20;
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ─── Einzelner Vertrag ────────────────────────

  async findOne(id: string, tenantId: string): Promise<Contract> {
    const contract = await this.contractRepo.findOne({
      where: { id, tenantId },
      relations: ['documents', 'invoices'],
    });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');
    return contract;
  }

  // ─── Aktualisieren ────────────────────────────

  async update(id: string, tenantId: string, dto: UpdateContractDto): Promise<Contract> {
    const contract = await this.findOne(id, tenantId);
    Object.assign(contract, dto);
    this.recalculateDeadlines(contract);
    return this.contractRepo.save(contract);
  }

  // ─── Löschen (Soft) ───────────────────────────

  async remove(id: string, tenantId: string): Promise<void> {
    const contract = await this.findOne(id, tenantId);
    contract.status = ContractStatus.CANCELLED;
    await this.contractRepo.save(contract);
  }

  // ─── Fälligkeiten Dashboard ───────────────────

  async getUpcomingDeadlines(tenantId: string, withinDays = 90) {
    const until = addDays(new Date(), withinDays).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    return this.contractRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.ACTIVE, ContractStatus.EXPIRING],
      })
      .andWhere('c.cancellationDeadline >= :today', { today })
      .andWhere('c.cancellationDeadline <= :until', { until })
      .orderBy('c.cancellationDeadline', 'ASC')
      .getMany();
  }

  // ─── Status-Update (täglich per Cron) ─────────

  async refreshStatuses(tenantId?: string): Promise<number> {
    const qb = this.contractRepo.createQueryBuilder('c')
      .where('c.status IN (:...s)', {
        s: [ContractStatus.ACTIVE, ContractStatus.EXPIRING, ContractStatus.DRAFT],
      });
    if (tenantId) qb.andWhere('c.tenantId = :tenantId', { tenantId });

    const contracts = await qb.getMany();
    const today = new Date();
    let updated = 0;

    for (const c of contracts) {
      const newStatus = this.computeStatus(c, today);
      if (newStatus !== c.status) {
        c.status = newStatus;
        await this.contractRepo.save(c);
        updated++;
      }
    }
    return updated;
  }

  // ─── Privat: Fristen berechnen ────────────────

  recalculateDeadlines(contract: Contract): void {
    if (!contract.endDate || !contract.noticePeriodDays) return;

    const end = new Date(contract.endDate);

    if (contract.renewalType === ContractRenewalType.AUTO_RENEW && contract.renewalPeriodMonths) {
      // Bei Auto-Renewal: nächster Kündigungstermin = Vertragsende der aktuellen Periode
      contract.nextCancellationDate = end;
      // Kündigungsfrist: deadline = Vertragsende minus Kündigungsfrist
      contract.cancellationDeadline = addDays(end, -contract.noticePeriodDays);
    } else if (contract.renewalType === ContractRenewalType.FIXED_TERM) {
      contract.nextCancellationDate = end;
      contract.cancellationDeadline = addDays(end, -contract.noticePeriodDays);
    }
    // MANUAL: keine automatische Berechnung
  }

  private computeStatus(contract: Contract, today: Date): ContractStatus {
    if (!contract.endDate) return contract.status;
    const end = new Date(contract.endDate);
    if (isBefore(end, today)) return ContractStatus.EXPIRED;

    if (contract.cancellationDeadline) {
      const deadline = new Date(contract.cancellationDeadline);
      const warningThreshold = addDays(today, 30);
      if (isBefore(deadline, warningThreshold)) return ContractStatus.EXPIRING;
    }
    return ContractStatus.ACTIVE;
  }
}
