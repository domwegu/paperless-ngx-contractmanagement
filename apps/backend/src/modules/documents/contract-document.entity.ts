import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { Contract } from '../contracts/contract.entity';

export enum DocumentType {
  CONTRACT    = 'contract',     // Hauptvertrag
  AMENDMENT   = 'amendment',    // Nachtrag / Änderungsvertrag
  ANNEX       = 'annex',        // Anlage
  TERMINATION = 'termination',  // Kündigungsschreiben
  OTHER       = 'other',
}

@Entity('contract_documents')
export class ContractDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contract, (c) => c.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'contract_id' })
  contractId: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.CONTRACT,
  })
  type: DocumentType;

  @Column()
  title: string;

  @Column()
  paperlessDocumentId: number;      // Referenz in Paperless

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  uploadedAt: Date;
}
