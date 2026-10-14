# MEMORY — weblomba (JASAKITE)

## 0. Meta
- **Project**: JASAKITE (`weblomba`) - Marketplace Jasa Lokal 38 Provinsi
- **Stack**: Next.js 15.5.24 + React 19 + Prisma 5.22 + MongoDB Atlas (prod) / SQLite (dev) + Tailwind 3.4 + NextAuth v5
- **Production URL**: `https://weblomba-rouge.vercel.app` (Vercel sin1)
- **Repository**: `https://github.com/FerzDevZ/web-lomba.git` (main)

## 1. Core Architecture & Rules
- **Database**: MongoDB ObjectId via `lib/ids.ts` (`toPrismaId`, `isObjectId`, `sameId`). All IDs in API & DB must use string ObjectId.
- **Authentication**: NextAuth v5 Credentials JWT (30d), `AUTH_SECRET` & `AUTH_TRUST_HOST=true`.
- **Key Flows**: Catalog (`/services`) -> Detail (`/service/[slug]`) -> Checkout (`/checkout`) -> Orders (`/orders/[id]`, FSM status) -> Review.
- **Design Tokens**: Plus Jakarta Sans + Instrument Serif, 4pt spacing scale, strict WCAG AA contrast.
- **Security & Headers**: CSRF double-submit token on mutations, rate-limited auth endpoints, strict input Zod schemas, image allowlist.

## 2. Key Directories
- `app/`: Next.js 15 App Router pages & API routes.
- `components/`: UI primitives (Radix + Tailwind), service tiles, catalog filters, Kanban order board.
- `lib/`: Auth config, Prisma client, location helpers (38 provinces), FSM order state machine, token bucket limiter.
- `prisma/`: `schema.prisma` (Mongo Atlas), migrations, and seeds.

## 3. Active TODO & Next
- [x] Hallmark UI P0/P1 optimizations & anti-slop review.
- [x] MongoDB Atlas migration & Next 15.5.24 CVE patch.
- [x] Responsive 320px mobile & E2E Playwright test suite (149 passing tests).
- [x] PPT ULTIMATE FINAL 34 slide — Swiss Safety Orange #FF6B35, 13.33×7.5in 16:9.
- [x] PDF 34 pages — LibreOffice export, 959.75×540 pts.
- [ ] Upload ke Google Drive 25–30 Agustus.

## 4. PPT & Docs — EMOSTFET 11 Competition
- **PPTX**: `ppt/JASAKITE-ULTIMATE-FINAL-EMOSTFET11.pptx` — 34 slide, 291KB, 13.33×7.5in.
- **PDF**: `ppt/JASAKITE-ULTIMATE-FINAL-EMOSTFET11.pdf` — 34 page, 1.2MB, 16:9.
- **Backup**: `docs/JASAKITE-ULTIMATE-FINAL-EMOSTFET11.{pptx,pdf}`.
- **Template**: `ppt/Merah Oranye dan Hitam Modern Laporan Presentasi (1).pdf` — source basic 1440×810.
- **Guidebook**: `ppt/GUIDE BOOK LOMBA DESIGN WEB (1).docx` — EMOSTFET 11 kriteria.
- **Rubrik mapping**: Pemahaman 20% + UX 30% + UI 25% + Kreativitas 15% + Presentasi 10%.
- **Slide breakdown**: 01 Cover → 02 Agenda → 03 Output → 04 Masalah → 05 Benchmark → 06 Persona → 07 Peta → 08 Flow → 09–12 UX → 13–14 UI → 15 Arsitektur → 16 Data → 17 Keamanan → 18 Tech → 19 Pengujian → 20 Deploy → 21 Dampak → 22 Moat → 23 Inovasi → 24–28 Roadmap/Closing/Lampiran → 29–34 Tim/Timeline/Persyaratan/Security/Risiko/Bukti Live.

## 5. Competition Timeline
- **Pendaftaran**: 14–28 Juli 2026 (Rp 50k).
- **Technical Meeting**: 31 Juli 2026.
- **Pengumpulan Drive**: 25–30 Agustus 2026 ← **we are here**.
- **Seleksi**: 1–2 September 2026.
- **Pengumuman Grand Final**: 3 September 2026.
- **Presentasi Grand Final**: 7 September 2026.
- **Pengumuman Juara**: 8 September 2026.
- **Pembagian Hadiah**: 11 September 2026.

## 6. Tim JASAKITE (max 3)
- **Ferdinand D.S** — Ketua, Fullstack (SMK N 2 PKP).
- **Andreyansyah** — UI/UX (SMK N 1 PKP).
- **Alif Akbar A.** — Backend & QA (SMAS At-Tauhid).
