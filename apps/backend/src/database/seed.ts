import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

try { require('dotenv').config(); } catch {}

import { Tenant } from '../modules/tenants/tenant.entity';
import { User, UserRole } from '../modules/users/user.entity';
import { Contract } from '../modules/contracts/contract.entity';
import { ContractDocument } from '../modules/documents/contract-document.entity';
import { Invoice } from '../modules/invoices/invoice.entity';
import { Reminder } from '../modules/reminders/reminder.entity';
import { ApiToken } from '../modules/export/api-token.entity';

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'postgres',
    port:     Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME     ?? 'vertragsverwaltung',
    username: process.env.DB_USER     ?? 'vv_user',
    password: process.env.DB_PASSWORD ?? 'changeme_db',
    entities: [Tenant, User, Contract, ContractDocument, Invoice, Reminder, ApiToken],
    synchronize: true,   // legt Tabellen an
    logging: false,
  });

  await ds.initialize();
  console.log('🌱 Datenbankverbindung hergestellt...');

  const tenantRepo = ds.getRepository(Tenant);
  let tenant = await tenantRepo.findOne({ where: { slug: 'default' } });
  if (!tenant) {
    tenant = await tenantRepo.save(tenantRepo.create({
      name: 'Standard-Mandant',
      slug: 'default',
      paperlessBaseUrl:  process.env.PAPERLESS_BASE_URL  ?? '',
      paperlessApiToken: process.env.PAPERLESS_API_TOKEN ?? '',
    }));
    console.log('✅ Mandant angelegt:', tenant.id);
  } else {
    console.log('ℹ️  Mandant bereits vorhanden');
  }

  const userRepo = ds.getRepository(User);
  const exists = await userRepo.findOne({ where: { email: 'admin@vertragsverwaltung.local' } });
  if (!exists) {
    const passwordHash = await bcrypt.hash('Admin1234!', 12);
    await userRepo.save(userRepo.create({
      firstName: 'Super',
      lastName:  'Admin',
      email:     'admin@vertragsverwaltung.local',
      passwordHash,
      role:      UserRole.SUPER_ADMIN,
      tenantId:  tenant.id,
    }));
    console.log('✅ Admin angelegt: admin@vertragsverwaltung.local / Admin1234!');
    console.log('⚠️  Passwort nach erstem Login bitte ändern!');
  } else {
    // Sicherstellen dass tenant_id gesetzt ist
    if (!exists.tenantId) {
      await userRepo.update(exists.id, { tenantId: tenant.id });
      console.log('✅ tenant_id für bestehenden Admin gesetzt');
    } else {
      console.log('ℹ️  Admin bereits vorhanden');
    }
  }

  await ds.destroy();
  console.log('✅ Seed abgeschlossen');
}

seed().catch((e) => {
  console.error('❌ Seed fehlgeschlagen:', e.message);
  process.exit(1);
});
