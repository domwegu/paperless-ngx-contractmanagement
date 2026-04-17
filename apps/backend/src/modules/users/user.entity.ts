import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum UserRole {
  SUPER_ADMIN     = 'super_admin',      // plattformweit
  ADMIN           = 'admin',            // Mandanten-Admin
  CONTRACT_EDITOR = 'contract_editor',  // Verträge + Dokumente
  INVOICE_EDITOR  = 'invoice_editor',   // nur Rechnungen
  VIEWER          = 'viewer',           // nur lesen
}

// Hilfsfunktionen für Guards
export const canEditContracts = (role: UserRole) =>
  [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRACT_EDITOR].includes(role);

export const canEditInvoices = (role: UserRole) =>
  [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CONTRACT_EDITOR, UserRole.INVOICE_EDITOR].includes(role);

export const canManageUsers = (role: UserRole) =>
  [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(role);

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
