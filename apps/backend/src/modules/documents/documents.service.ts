import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractDocument, DocumentType } from './contract-document.entity';
import { Contract } from '../contracts/contract.entity';
import { PaperlessService } from '../paperless/paperless.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(ContractDocument) private docRepo: Repository<ContractDocument>,
    @InjectRepository(Contract) private contractRepo: Repository<Contract>,
    private paperlessService: PaperlessService,
  ) {}

  async uploadContractDocument(
    tenantId: string,
    contractId: string,
    file: Express.Multer.File,
    type: DocumentType,
    title?: string,
    notes?: string,
  ): Promise<ContractDocument> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');

    const docTitle = title ?? file.originalname.replace(/\.[^/.]+$/, '');

    // Datensatz sofort anlegen — noch ohne Paperless-ID
    const doc = this.docRepo.create({
      contractId,
      type,
      title: docTitle,
      paperlessDocumentId: null,
      fileName: file.originalname,
      mimeType: file.mimetype,
      notes,
    });
    const saved = await this.docRepo.save(doc);

    // Paperless-Upload im Hintergrund — blockiert den Request nicht
    this.uploadToPaperlessAsync(saved, contract, file, docTitle, tenantId);

    return saved;
  }

  /**
   * Läuft im Hintergrund — pollt bis zu 5 Minuten auf die Paperless-ID
   * und aktualisiert den Datensatz sobald sie verfügbar ist.
   */
  private async uploadToPaperlessAsync(
    doc: ContractDocument,
    contract: Contract,
    file: Express.Multer.File,
    docTitle: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const tagNames = [
        `Vertrag: ${contract.title}`,
        doc.type === DocumentType.AMENDMENT ? 'Nachtrag' : 'Vertragsdokument',
      ];
      if (contract.partner) tagNames.push(contract.partner);

      const paperlessId = await this.paperlessService.uploadWithMetadata(
        tenantId,
        file.buffer,
        file.originalname,
        file.mimetype,
        {
          title: docTitle,
          correspondentName: contract.partner,
          documentTypeName: doc.type === DocumentType.AMENDMENT ? 'Nachtrag' : 'Vertrag',
          tagNames,
        },
      );

      // ID nachträglich setzen
      await this.docRepo.update(doc.id, { paperlessDocumentId: paperlessId });

      // Hauptdokument-Referenz am Vertrag setzen
      if (doc.type === DocumentType.CONTRACT && !contract.paperlessDocumentId) {
        await this.contractRepo.update(contract.id, { paperlessDocumentId: paperlessId });
      }

      this.logger.log(`✅ Dokument "${docTitle}" in Paperless abgelegt: ID ${paperlessId}`);
    } catch (err: any) {
      this.logger.error(`❌ Paperless-Upload fehlgeschlagen für "${docTitle}": ${err.message}`);
      // Datensatz bleibt erhalten, nur ohne Paperless-ID
      // User sieht das Dokument in der Liste, kann es aber nicht in Paperless öffnen
    }
  }

  async findByContract(contractId: string, tenantId: string): Promise<ContractDocument[]> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');
    return this.docRepo.find({
      where: { contractId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async getDocumentUrls(docId: string, tenantId: string) {
    const doc = await this.docRepo.findOne({
      where: { id: docId },
      relations: ['contract'],
    });
    if (!doc || doc.contract.tenantId !== tenantId) {
      throw new NotFoundException('Dokument nicht gefunden');
    }
    if (!doc.paperlessDocumentId) {
      return { download: null, preview: null, pending: true };
    }
    return this.paperlessService.getDocumentUrls(tenantId, doc.paperlessDocumentId);
  }

  async remove(docId: string, tenantId: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id: docId }, relations: ['contract'] });
    if (!doc || doc.contract.tenantId !== tenantId) {
      throw new NotFoundException('Dokument nicht gefunden');
    }
    if (doc.paperlessDocumentId) {
      try {
        await this.paperlessService.deleteDocument(tenantId, doc.paperlessDocumentId);
      } catch {
        this.logger.warn(`Dokument ${doc.paperlessDocumentId} konnte nicht aus Paperless gelöscht werden`);
      }
    }
    await this.docRepo.remove(doc);
  }
}
