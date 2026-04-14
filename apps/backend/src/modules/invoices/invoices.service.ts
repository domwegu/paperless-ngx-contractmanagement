import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { Contract } from '../contracts/contract.entity';
import { PaperlessService } from '../paperless/paperless.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Contract) private contractRepo: Repository<Contract>,
    private paperlessService: PaperlessService,
  ) {}

  async create(
    tenantId: string,
    contractId: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');

    const invoice = this.invoiceRepo.create({ ...dto, contractId });
    return this.invoiceRepo.save(invoice);
  }

  async uploadAndAssign(
    tenantId: string,
    contractId: string,
    file: Express.Multer.File,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');

    // Rechnung nach Paperless hochladen
    const paperlessId = await this.paperlessService.uploadWithMetadata(
      tenantId,
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        title: `Rechnung ${dto.invoiceNumber ?? dto.invoiceDate} – ${contract.partner ?? contract.title}`,
        correspondentName: contract.partner,
        documentTypeName: 'Rechnung',
        tagNames: [`Vertrag: ${contract.title}`, 'Rechnung'],
      },
    );

    const invoice = this.invoiceRepo.create({
      ...dto,
      contractId,
      paperlessDocumentId: paperlessId,
    });
    return this.invoiceRepo.save(invoice);
  }

  async findByContract(contractId: string, tenantId: string): Promise<Invoice[]> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');
    return this.invoiceRepo.find({
      where: { contractId },
      order: { invoiceDate: 'DESC' },
    });
  }

  async updateStatus(id: string, tenantId: string, status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: ['contract'],
    });
    if (!invoice || invoice.contract.tenantId !== tenantId) {
      throw new NotFoundException('Rechnung nicht gefunden');
    }
    invoice.status = status;
    return this.invoiceRepo.save(invoice);
  }

  async getOverdueInvoices(tenantId: string): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.invoiceRepo
      .createQueryBuilder('i')
      .innerJoin('i.contract', 'c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('i.status = :status', { status: InvoiceStatus.OPEN })
      .andWhere('i.dueDate < :today', { today })
      .orderBy('i.dueDate', 'ASC')
      .getMany();
  }
}
