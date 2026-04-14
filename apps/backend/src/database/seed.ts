import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from '../modules/tenants/tenant.entity';
import { User, UserRole } from '../modules/users/user.entity';

/**
 * Seed: Legt einen ersten Super-Admin und einen Demo-Mandanten an.
 * Aufruf: npx ts-node src/database/seed.ts
 */
async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME     ?? 'vertragsverwaltung',
    username: process.env.DB_USER     ?? 'vv_user',
    password: process.env.DB_PASSWORD ?? 'changeme_db',
    entities: [Tenant, User],
    synchronize: true,
  });

  await ds.initialize();
  console.log('🌱 Seed gestartet...');

  // Demo-Mandant
  const tenantRepo = ds.getRepository(Tenant);
  let tenant = await tenantRepo.findOne({ where: { slug: 'demo' } });
  if (!tenant) {
    tenant = await tenantRepo.save(tenantRepo.create({
      name: 'Demo GmbH',
      slug: 'demo',
      paperlessBaseUrl: process.env.PAPERLESS_BASE_URL ?? 'http://localhost:8000',
      paperlessApiToken: process.env.PAPERLESS_API_TOKEN ?? '',
    }));
    console.log('✅ Demo-Mandant angelegt:', tenant.id);
  }

  // Super-Admin
  const userRepo = ds.getRepository(User);
  const exists = await userRepo.findOne({ where: { email: 'admin@vertragsverwaltung.local' } });
  if (!exists) {
    const passwordHash = await bcrypt.hash('Admin1234!', 12);
    await userRepo.save(userRepo.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@vertragsverwaltung.local',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      tenantId: tenant.id,
    }));
    console.log('✅ Super-Admin angelegt: admin@vertragsverwaltung.local / Admin1234!');
    console.log('⚠️  Passwort nach erstem Login bitte sofort ändern!');
  }

  await ds.destroy();
  console.log('🌱 Seed abgeschlossen');
}

seed().catch((e) => { console.error(e); process.exit(1); });
