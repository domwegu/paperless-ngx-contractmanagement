import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// .env laden falls vorhanden (lokal nützlich)
try { require('dotenv').config(); } catch {}

import { Tenant } from '../modules/tenants/tenant.entity';
import { User, UserRole } from '../modules/users/user.entity';

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'postgres',   // Docker-Service-Name als Fallback
    port:     Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME     ?? 'vertragsverwaltung',
    username: process.env.DB_USER     ?? 'vv_user',
    password: process.env.DB_PASSWORD ?? 'changeme_db',
    entities: [Tenant, User],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();
  console.log('🌱 Datenbankverbindung hergestellt, Seed wird ausgeführt...');

  const tenantRepo = ds.getRepository(Tenant);
  let tenant = await tenantRepo.findOne({ where: { slug: 'demo' } });
  if (!tenant) {
    tenant = await tenantRepo.save(tenantRepo.create({
      name: 'Demo GmbH',
      slug: 'demo',
      paperlessBaseUrl:  process.env.PAPERLESS_BASE_URL  ?? '',
      paperlessApiToken: process.env.PAPERLESS_API_TOKEN ?? '',
    }));
    console.log('✅ Demo-Mandant angelegt:', tenant.id);
  } else {
    console.log('ℹ️  Demo-Mandant bereits vorhanden');
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
    console.log('✅ Super-Admin angelegt:');
    console.log('   E-Mail:   admin@vertragsverwaltung.local');
    console.log('   Passwort: Admin1234!');
    console.log('⚠️  Bitte Passwort nach erstem Login ändern!');
  } else {
    console.log('ℹ️  Super-Admin bereits vorhanden');
  }

  await ds.destroy();
  console.log('✅ Seed abgeschlossen');
}

seed().catch((e) => {
  console.error('❌ Seed fehlgeschlagen:', e.message);
  process.exit(1);
});
