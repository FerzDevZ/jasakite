---
name: ferz-24-database-prisma-drizzle-pro
description: "Production database schema design, indexing, relationships, and zero-downtime migrations for Prisma, Drizzle ORM, SQLite, and PostgreSQL."
version: 1.0.0
author: "FerzDevZ Enterprise"
---

# 🗄️ Ferz 24: Database Prisma & Drizzle Pro

## Autonomous Database Engineering
1. **Schema Design & Normalization**:
   - Define strict models with relations (`@relation`, `@unique`, `@index`).
   - Add timestamps (`createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`).
2. **Zero-Downtime Migrations**:
   - Run `npx prisma db push` or `npx prisma migrate dev` in development.
   - Run `npx prisma generate` immediately after updating schemas.
3. **Query Optimization**:
   - Avoid N+1 query traps by using `include` or `select` appropriately.
   - Add database indexes on frequently queried search/filter fields.
