import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { ContractDocument } from '../documents/contract-document.entity';
import { Invoice } from '../invoices/invoice.entity';

export enum ContractStatus {
  ACTIVE    = 'active',
  EXPIRING  = 'expiring',   // Kündigung läuft bald ab
  EXPIRED   = 'expired',
  CANCELLED = 'cancelled',
  DRAFT     = 'draft',
}

export enum ContractRenewalType {
  MANUAL        = 'manual',         // kein Auto-Renewal
  AUTO_RENEW    = 'auto_renew',     // verlängert sich automatisch
  FIXED_TERM    = 'fixed_term',     // feste Laufzeit, kein Renewal
}

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Mandant ───────────────────────────────
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  // ─── Basisdaten ────────────────────────────
  @Column()
  title: string;                         // z.B. "Mietvertrag Büro Hauptstraße"

  @Column({ nullable: true })
  contractNumber: string;                // interne oder externe Vertragsnummer

  @Column({ nullable: true })
  partner: string;                       // Vertragspartner (Name)

  @Column({ nullable: true })
  partnerAddress: string;

  @Column({ nullable: true })
  partnerEmail: string;

  @Column({ nullable: true })
  partnerPhone: string;

  @Column({ nullable: true })
  category: string;                      // z.B. "Miete", "Software", "Versicherung"

  @Column({ type: 'text', nullable: true })
  description: string;

  // ─── Laufzeit ──────────────────────────────
  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({ type: 'date', nullable: true })
  signedDate: Date;                      // Abschlussdatum

  @Column({
    type: 'enum',
    enum: ContractRenewalType,
    default: ContractRenewalType.AUTO_RENEW,
  })
  renewalType: ContractRenewalType;

  @Column({ nullable: true })
  renewalPeriodMonths: number;           // Verlängerungszeitraum in Monaten

  // ─── Kündigung ─────────────────────────────
  @Column({ nullable: true })
  noticePeriodDays: number;             // Kündigungsfrist in Tagen

  @Column({ type: 'date', nullable: true })
  nextCancellationDate: Date;           // nächstmöglicher Kündigungstermin (berechnet)

  @Column({ type: 'date', nullable: true })
  cancellationDeadline: Date;           // Frist: bis wann kündigen (berechnet)

  @Column({ type: 'date', nullable: true })
  cancelledAt: Date;                    // tatsächliches Kündigungsdatum (falls gekündigt)

  // ─── Konditionen ───────────────────────────
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number;                        // Vertragswert / mtl. Rate

  @Column({ nullable: true })
  currency: string;                      // EUR, USD, ...

  @Column({ nullable: true })
  paymentIntervalMonths: number;         // 1 = monatlich, 12 = jährlich

  @Column({ type: 'text', nullable: true })
  conditions: string;                    // Freitext Konditionen

  // ─── Status ────────────────────────────────
  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  // ─── Paperless-Referenz ────────────────────
  @Column({ nullable: true })
  paperlessDocumentId: number;           // ID des Hauptdokuments in Paperless

  @Column({ nullable: true })
  paperlessTagId: number;                // Tag-ID in Paperless für diesen Vertrag

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ─── Relationen ────────────────────────────
  @OneToMany(() => ContractDocument, (d) => d.contract, { cascade: true })
  documents: ContractDocument[];

  @OneToMany(() => Invoice, (i) => i.contract, { cascade: true })
  invoices: Invoice[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
