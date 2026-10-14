/**
 * migrate_data.js
 * ============================================================================
 * Migrasi data dari SQLite (prisma/dev.db) ke PostgreSQL menggunakan Prisma.
 * Skrip ini memanfaatkan PrismaClient untuk kedua database.
 *
 * Prasyarat:
 *   - PostgreSQL schema sudah dibuat (jalankan schema.sql atau prisma migrate)
 *   - DATABASE_URL menunjuk ke PostgreSQL
 *   - Prisma client sudah di-generate untuk PostgreSQL
 *
 * Penggunaan:
 *   export DATABASE_URL="postgresql://user:pass@localhost:5432/jasakite"
 *   node prisma/postgresql/migrate_data.js
 * ============================================================================
 */
const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');
const path = require('path');

// Prisma untuk PostgreSQL (target)
const pg = new PrismaClient();

// better-sqlite3 untuk membaca SQLite (sumber)
const sqlitePath = path.join(__dirname, '..', '..', 'dev.db');
const sqlite = new Database(sqlitePath, { readonly: true });

async function fetchRows(table) {
  const stmt = sqlite.prepare(`SELECT * FROM "${table}"`);
  return stmt.all();
}

async function truncateAll() {
  console.log('  Membersihkan data lama...');
  // Urutan reversed untuk FK safety
  const tables = ['Review', 'Message', 'Order', 'SavedService', 'Service', 'Category', 'User'];
  for (const t of tables) {
    await pg.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
  }
  console.log('  ✓ Dibersihkan');
}

async function migrate() {
  console.log('='.repeat(70));
  console.log('  MIGRASI SQLITE → POSTGRESQL (via Prisma)');
  console.log('='.repeat(70));
  console.log(`  Sumber SQLite  : ${sqlitePath}`);
  console.log('='.repeat(70));

  let total = 0;

  // 1. Category (no deps)
  console.log('\n--- Category ---');
  const categories = await fetchRows('Category');
  for (const c of categories) {
    await pg.category.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, name: c.name, slug: c.slug, icon: c.icon, description: c.description },
    });
  }
  console.log(`  ✓ ${categories.length} baris`);
  total += categories.length;

  // 2. User (no deps)
  console.log('--- User ---');
  const users = await fetchRows('User');
  for (const u of users) {
    await pg.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id, name: u.name, email: u.email, passwordHash: u.passwordHash,
        phone: u.phone, role: u.role, bio: u.bio, avatarUrl: u.avatarUrl,
        location: u.location, city: u.city,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }
  console.log(`  ✓ ${users.length} baris`);
  total += users.length;

  // 3. Service (depends on User, Category)
  console.log('--- Service ---');
  const services = await fetchRows('Service');
  for (const s of services) {
    await pg.service.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id, providerId: s.providerId, categoryId: s.categoryId,
        title: s.title, slug: s.slug, description: s.description,
        price: s.price, deliveryTimeDays: s.deliveryTimeDays,
        ratingAvg: s.ratingAvg, totalReviews: s.totalReviews,
        status: s.status, createdAt: new Date(s.createdAt),
      },
    });
  }
  console.log(`  ✓ ${services.length} baris`);
  total += services.length;

  // 4. SavedService (depends on User, Service)
  console.log('--- SavedService ---');
  const saved = await fetchRows('SavedService');
  for (const sv of saved) {
    await pg.savedService.upsert({
      where: { id: sv.id },
      update: {},
      create: {
        id: sv.id, userId: sv.userId, serviceId: sv.serviceId,
        createdAt: new Date(sv.createdAt),
      },
    });
  }
  console.log(`  ✓ ${saved.length} baris`);
  total += saved.length;

  // 5. Order (depends on User, Service)
  console.log('--- Order ---');
  const orders = await fetchRows('Order');
  for (const o of orders) {
    await pg.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id, customerId: o.customerId, serviceId: o.serviceId,
        totalPrice: o.totalPrice, status: o.status,
        paymentMethod: o.paymentMethod, orderNotes: o.orderNotes,
        deadline: o.deadline ? new Date(o.deadline) : null,
        createdAt: new Date(o.createdAt),
        completedAt: o.completedAt ? new Date(o.completedAt) : null,
      },
    });
  }
  console.log(`  ✓ ${orders.length} baris`);
  total += orders.length;

  // 6. Message (depends on Order, User)
  console.log('--- Message ---');
  const messages = await fetchRows('Message');
  for (const m of messages) {
    await pg.message.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id, orderId: m.orderId, senderId: m.senderId,
        content: m.content, createdAt: new Date(m.createdAt),
      },
    });
  }
  console.log(`  ✓ ${messages.length} baris`);
  total += messages.length;

  // 7. Review (depends on Order, User)
  console.log('--- Review ---');
  const reviews = await fetchRows('Review');
  for (const r of reviews) {
    await pg.review.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, orderId: r.orderId, reviewerId: r.reviewerId,
        rating: r.rating, comment: r.comment,
        createdAt: new Date(r.createdAt),
      },
    });
  }
  console.log(`  ✓ ${reviews.length} baris`);
  total += reviews.length;

  // Sync sequences
  console.log('\n--- Sinkronisasi sequences ---');
  for (const t of ['Category', 'User', 'Service', 'SavedService', 'Order', 'Message', 'Review']) {
    await pg.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM "${t}"`
    );
  }
  console.log('  ✓ Sequences di-sync');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  TOTAL BARIS DIPINDAHKAN: ${total}`);
  console.log(`${'='.repeat(70)}`);

  sqlite.close();
  await pg.$disconnect();
}

migrate()
  .then(() => console.log('\n✅ Migrasi berhasil!'))
  .catch((err) => {
    console.error('\n❌ Migrasi gagal:', err);
    process.exit(1);
  });
