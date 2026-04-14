import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractDocument, DocumentType } from './contract-document.entity';
import { Contract } from '../contracts/contract.entity';
import { PaperlessService } from '../paperless/paperless.service';

@Injectable()
export class DocumentsService {
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
    // Vertrag laden (mandantensicher)
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');

    const docTitle = title ?? file.originalname;

    // Upload nach Paperless mit automatischen Tags
    const tagNames = [`Vertrag: ${contract.title}`, type === DocumentType.AMENDMENT ? 'Nachtrag' : 'Vertragsdokument'];
    if (contract.partner) tagNames.push(contract.partner);

    const paperlessId = await this.paperlessService.uploadWithMetadata(
      tenantId,
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        title: docTitle,
        correspondentName: contract.partner,
        documentTypeName: type === DocumentType.AMENDMENT ? 'Nachtrag' : 'Vertrag',
        tagNames,
      },
    );

    // Eintrag in eigener DB
    const doc = this.docRepo.create({
      contractId,
      type,
      title: docTitle,
      paperlessDocumentId: paperlessId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      notes,
    });

    // Erstes Dokument (Hauptvertrag) als Referenz am Vertrag speichern
    if (type === DocumentType.CONTRACT && !contract.paperlessDocumentId) {
      contract.paperlessDocumentId = paperlessId;
      await this.contractRepo.save(contract);
    }

    return this.docRepo.save(doc);
  }

  async findByContract(contractId: string, tenantId: string): Promise<ContractDocument[]> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId, tenantId } });
    if (!contract) throw new NotFoundException('Vertrag nicht gefunden');
    return this.docRepo.find({ where: { contractId }, order: { uploadedAt: 'DESC' } });
  }

  async getDocumentUrls(docId: string, tenantId: string) {
    const doc = await this.docRepo.findOne({
      where: { id: docId },
      relations: ['contract'],
    });
    if (!doc || doc.contract.tenantId !== tenantId) {
      throw new NotFoundException('Dokument nicht gefunden');
    }
    return this.paperlessService.getDocumentUrls(tenantId, doc.paperlessDocumentId);
  }

  async remove(docId: string, tenantId: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id: docId }, relations: ['contract'] });
    if (!doc || doc.contract.tenantId !== tenantId) throw new NotFoundException('Dokument nicht gefunden');
    // Aus Paperless löschen
    await this.paperlessService.deleteDocument(tenantId, doc.paperlessDocumentId);
    await this.docRepo.remove(doc);
  }
}
