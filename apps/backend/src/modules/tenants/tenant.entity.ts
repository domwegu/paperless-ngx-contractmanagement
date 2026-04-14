import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;                      // URL-sicherer Kurzname

  @Column({ nullable: true })
  paperlessBaseUrl: string;          // pro Mandant eigene Paperless-Instanz möglich

  @Column({ nullable: true, select: false })
  paperlessApiToken: string;         // nicht im Default-Select

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];
}
