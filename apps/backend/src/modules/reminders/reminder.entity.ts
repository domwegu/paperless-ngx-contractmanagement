import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { Contract } from '../contracts/contract.entity';

export enum ReminderType {
  CANCELLATION_DEADLINE = 'cancellation_deadline',  // Kündigungsfrist läuft ab
  CONTRACT_EXPIRY       = 'contract_expiry',         // Vertrag läuft aus
  INVOICE_DUE           = 'invoice_due',             // Rechnung fällig
  CUSTOM                = 'custom',                  // manuell gesetzt
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT    = 'sent',
  SNOOZED = 'snoozed',
  DONE    = 'done',
}

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'contract_id' })
  contractId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'enum', enum: ReminderType })
  type: ReminderType;

  @Column({ type: 'enum', enum: ReminderStatus, default: ReminderStatus.PENDING })
  status: ReminderStatus;

  @Column({ type: 'date' })
  dueDate: Date;              // wann soll erinnert werden

  @Column({ type: 'date', nullable: true })
  referenceDate: Date;        // worauf sich die Erinnerung bezieht (z.B. Kündigungsfrist)

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'int', nullable: true })
  daysBefore: number;         // wie viele Tage vor Frist

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  snoozedUntil: Date;

  @Column({ type: 'simple-array', nullable: true })
  notifyEmails: string[];     // zusätzliche Empfänger

  @CreateDateColumn()
  createdAt: Date;
}
