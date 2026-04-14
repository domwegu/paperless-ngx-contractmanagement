import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn
} from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',   // plattformweit
  TENANT_ADMIN = 'tenant_admin', // Mandanten-Admin
  USER = 'user',                 // normaler Nutzer
}

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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ nullable: true })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
