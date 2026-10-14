# JASAKITE — Codebase Map

## Project Overview

**JASAKITE** — Marketplace jasa lokal untuk pasar Indonesia. Menghubungkan pelanggan dengan penyedia jasa profesional (AC, kebersihan, listrik, pindahan, tukang).

**Stack:**
- Next.js 15.5.24 (App Router, Server Components)
- React 19 + TypeScript (strict)
- Prisma 5.20 + MongoDB Atlas (prod) / SQLite (dev)
- NextAuth v5 beta (Credentials provider, JWT)
- Tailwind CSS 3.4 + Radix UI
- GSAP 3.15 + React Three Fiber 9.7
- TanStack Query v5
- Vitest (149 tests) + Playwright (16 E2E)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 19 + TanStack Query + GSAP + Three.js (lazy)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/REST
┌──────────────────────────▼──────────────────────────────────────┐
│                     MIDDLEWARE (middleware.ts)                   │
│  • CSRF double-submit validation                                │
│  • Auth token check (JWT)                                       │
│  • Role-based routing (ADMIN/PROVIDER/CUSTOMER)                 │
│  • Public path whitelist                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS APP ROUTER (app/)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Server Pages   │  │  API Routes     │  │  Server Actions │  │
│  │  (SSR/RSC)      │  │  (20 handlers)  │  │  (auth)         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬───────┘  │
│           │                    │                     │          │
│  ┌────────▼────────────────────▼─────────────────────▼───────┐  │
│  │                    LIB LAYER (lib/)                        │  │
│  │  auth.ts • prisma.ts • rate-limit.ts • api-guard.ts      │  │
│  │  order-status.ts (FSM) • csrf.ts • location.ts           │  │
│  │  motion.ts • site-url.ts • utils.ts • ids.ts              │  │
│  └──────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    PRISMA ORM + DATABASE                        │
│  MongoDB Atlas (prod, ap-southeast-1) / SQLite (dev)           │
│  7 models: User, Category, Service, SavedService, Order,       │
│            Message, Review                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| Dev server | `npm run dev` | Next.js dev with HMR |
| Build | `npm run build` | Production build |
| Typecheck | `npm run typecheck` | `tsc --noEmit` |
| Unit tests | `npm test` | Vitest run |
| E2E tests | `npm run test:e2e` | Playwright against build |
| DB seed | `npm run db:seed` | Populate dev data |
| DB migrate | `npm run db:migrate` | Prisma migrate deploy |

---

## Module Boundaries

### `app/` — Pages & API Routes

```
app/
├── page.tsx                    Landing page (Hero, categories, services, stats, CTA)
├── layout.tsx                  Root layout (Navbar, Footer, ThemeProvider, Toaster)
├── globals.css                 Design tokens (HSL), focus-ring, animations
├── robots.ts                   SEO robots
├── sitemap.ts                  SEO sitemap
├── icon.tsx                    Favicon generator
├── opengraph-image.tsx         OG image
├── loading.tsx                 Root loading skeleton
├── error.tsx                   Root error boundary
├── not-found.tsx               404 page
├── template.tsx                Root template
│
├── (auth)/                     Route group (separate layout)
│   ├── layout.tsx              Auth layout (no Navbar/Footer)
│   ├── login/page.tsx          Login form
│   └── register/page.tsx       Registration form
│
├── services/                   Service catalog
│   ├── page.tsx                Server component (fetches data)
│   ├── page.client.tsx         Client component (filters, pagination)
│   ├── loading.tsx
│   └── error.tsx
│
├── service/[slug]/             Service detail
├── provider/[id]/              Provider profile
├── checkout/                   Order checkout flow
├── orders/[id]/                Order detail + timeline + messages
├── faq/                        FAQ center
│
├── dashboard/
│   ├── layout.tsx              Dashboard layout (Shell component)
│   ├── page.tsx                Redirects to role-specific dashboard
│   ├── customer/               Customer dashboard (orders, saved services)
│   ├── provider/               Provider dashboard (kanban, manage services)
│   │   └── buka-jasa/          Create new service form
│   └── admin/                  Admin dashboard (stats, moderation, users)
│       ├── moderasi/           Service moderation
│       └── users/              User management
│
└── api/                        20 API route handlers
    ├── auth/
    │   ├── [...nextauth]/      NextAuth handler
    │   ├── register/           User registration
    │   └── unimpersonate/      Exit impersonation
    ├── services/               GET (list), POST (create)
    │   └── [id]/              GET (detail), PATCH (update)
    ├── orders/                 GET (list), POST (create)
    │   └── [id]/              GET (detail), PATCH (status change)
    │       └── messages/       GET, POST (order messages)
    ├── reviews/                POST (create review)
    ├── saved/                  GET, POST, DELETE (wishlist)
    ├── notifications/          GET (polling)
    ├── search-suggestions/     GET (autocomplete)
    ├── categories/             GET (all categories)
    ├── provider/
    │   ├── orders/             GET (provider's incoming orders)
    │   └── services/           GET (provider's services)
    └── admin/
        ├── stats/              GET (platform KPIs)
        ├── users/              GET (user list)
        ├── export/             GET (CSV export)
        └── users/[id]/impersonate/  POST
```

### `components/` — UI Components

```
components/
├── providers.tsx               TanStack Query provider
├── theme-provider.tsx          Theme (dark/light) context
├── theme-toggle.tsx            Theme toggle button
│
├── ui/                         Shared primitives (shadcn-style)
│   ├── button.tsx              Button variants
│   ├── card.tsx                Card, CardTitle, CardDescription
│   ├── input.tsx               Form input
│   ├── label.tsx               Form label
│   ├── form.tsx                Form wrapper (react-hook-form)
│   ├── dialog.tsx              Modal dialog (Radix)
│   ├── badge.tsx               Status badge
│   ├── skeleton.tsx            Loading skeleton
│   ├── avatar.tsx              User avatar
│   ├── tabs.tsx                Tab navigation
│   ├── radio-card-group.tsx    Radio card group (roving tabindex)
│   └── empty-state.tsx         Empty state placeholder
│
├── layout/                     Layout components
│   ├── Navbar.tsx              Top navigation (async server component)
│   ├── mobile-menu.tsx         Mobile hamburger menu
│   ├── search-bar.tsx          Search with "/" shortcut
│   ├── notification-bell.tsx   Notification polling bell
│   ├── impersonation-bar.tsx   Admin impersonation warning bar
│   ├── page-shell.tsx          Page container wrapper
│   ├── error-panel.tsx         Error display panel
│   ├── faq-content.tsx         FAQ content sections
│   └── auth-form-skeleton.tsx  Auth loading skeleton
│
├── landing/                    Landing page sections
│   ├── hero.tsx                Hero section (GSAP + Three.js)
│   ├── hero-search.tsx         Search input in hero
│   ├── reveal.tsx              Scroll reveal animation
│   ├── counter.tsx             Animated counter
│   └── cara-kerja.tsx          "How it works" steps
│
├── services/                   Service catalog components
│   ├── service-tile.tsx        Service card
│   ├── catalog-filters.tsx     Filter sidebar
│   ├── rating-stars.tsx        Star rating display
│   └── save-button.tsx         Wishlist toggle
│
├── orders/                     Order components
│   ├── order-timeline.tsx      Status timeline
│   ├── order-status-badge.tsx  Status badge with color
│   ├── message-thread.tsx      Chat thread
│   ├── review-form.tsx         Review submission form
│   └── order-detail-skeleton.tsx
│
├── provider/                   Provider components
│   ├── order-kanban.tsx        Kanban board (drag & drop)
│   ├── buka-jasa-form.tsx      Create service form
│   └── provider-service-list.tsx
│
├── dashboard/                  Dashboard components
│   ├── dashboard-shell.tsx     Dashboard layout shell
│   ├── dashboard-skeleton.tsx  Loading skeleton
│   ├── stat-card.tsx           KPI stat card
│   ├── admin-charts.tsx        Admin charts (Recharts)
│   ├── CustomerDashboard.tsx   Customer dashboard view
│   └── saved-services.tsx      Saved services list
│
└── three/                      3D components
    └── hero-orb.tsx            WebGL hero orb (React Three Fiber, lazy)
```

### `lib/` — Shared Utilities

| File | Purpose | Key exports |
|------|---------|-------------|
| `auth.ts` | NextAuth config | `handlers`, `auth`, `signIn`, `signOut` |
| `prisma.ts` | Prisma singleton | `prisma` |
| `rate-limit.ts` | Token bucket rate limiter | `consume()`, `RATE_LIMITS`, `clientKey()` |
| `api-guard.ts` | Rate limit wrapper for route handlers | `enforceRateLimit()` |
| `order-status.ts` | Order FSM (4 states) | `canTransition()`, `nextStatuses()`, `statusLabel()` |
| `csrf.ts` | CSRF double-submit | `generateCsrfToken()`, `isCsrfValid()` |
| `csrf-fetch.ts` | CSRF-aware fetch wrapper | `csrfFetch()` |
| `location.ts` | Address → city extraction | `cityFromLocation()`, `countUniqueCities()` |
| `site-url.ts` | Canonical URL resolution | `SITE_URL`, `absoluteUrl()` |
| `motion.ts` | Animation tokens | `EASE`, `DURATION`, `GSAP_EASE`, `prefersReducedMotion()` |
| `utils.ts` | General helpers | `cn()` (clsx + tailwind-merge) |
| `ids.ts` | Dual ID handling (ObjectId/number) | `toPrismaId()`, `sameId()` |
| `category-icons.tsx` | Category → Lucide icon mapping | `getCategoryIcon()` |
| `provinces.ts` | Indonesian provinces list | Province data |

### `prisma/` — Database

```
prisma/
├── schema.prisma               Main schema (MongoDB provider) — satu-satunya schema
├── seed.js                     Seed data (30 users, 46 services, 133 orders)
├── backfill-city.js            Backfill city from location
├── migrations/                 SQLite migration history
├── postgresql/                 PostgreSQL migration guide
│   ├── MIGRASI_POSTGRESQL.md
│   ├── schema.sql
│   ├── schema_enums.sql
│   ├── migrate_data.js
│   ├── migrate_data.py
│   ├── verify.sql
│   └── rollback.sql
└── dev.db                      SQLite dev database
```

**7 Models:**
- `User` — role: CUSTOMER/PROVIDER/ADMIN, city (normalized), location (raw)
- `Category` — name, slug, icon
- `Service` — title, slug, price, ratingAvg, status: ACTIVE/DRAFT/ARCHIVED
- `SavedService` — user ↔ service bookmark
- `Order` — status: PENDING/IN_PROGRESS/COMPLETED/CANCELLED (FSM)
- `Message` — order messages (chat)
- `Review` — rating 1-5, comment, one per order

### `tests/` — Unit Tests (Vitest)

| File | Coverage |
|------|----------|
| `color-contrast.test.ts` | Token contrast ratios (WCAG AA) |
| `order-status.test.ts` | FSM transitions |
| `rate-limit.test.ts` | Token bucket behavior |
| `location.test.ts` | Address → city parsing |
| `rating.test.ts` | Rating aggregation |
| `csv-escape.test.ts` | CSV export escaping |
| `utils.test.ts` | Currency formatting, helpers |
| `csrf.test.ts` | CSRF token validation |
| `ids.test.ts` | Dual ID ObjectId/number |

### `e2e/` — E2E Tests (Playwright)

| File | Coverage |
|------|----------|
| `order-lifecycle.spec.ts` | Full order flow (create → progress → complete → review) |
| `public-pages.spec.ts` | Hero renders, heading structure, protected routes |
| `auth-routing.spec.ts` | Auth redirects, role enforcement |
| `checkout-validation.spec.ts` | Checkout form validation |
| `kanban-drag.spec.ts` | Provider kanban drag & drop |
| `messages.spec.ts` | Order message thread |
| `moderation.spec.ts` | Admin service moderation |
| `search-autocomplete.spec.ts` | Search suggestions |
| `breadcrumb.spec.ts` | Breadcrumb navigation |
| `wishlist.spec.ts` | Saved services |

---

## Data Flow: Order Lifecycle

```
Customer browses /services
    │
    ▼
GET /api/services?category=&minPrice=&maxPrice=&rating=&location=&sort=
    │ (rate limited: 120/min)
    ▼
Customer clicks service → /service/[slug]
    │
    ▼
Customer clicks "Pesan" → /checkout?service=<slug>
    │
    ▼
POST /api/orders { serviceId, address, deadline, paymentMethod }
    │ (rate limited: 10/10min)
    │ → validates: service ACTIVE, not own service
    │ → creates Order (status: PENDING)
    ▼
Provider sees order in Kanban (/dashboard/provider)
    │
    ▼
PATCH /api/orders/[id] { status: "IN_PROGRESS" }
    │ (rate limited: 30/5min)
    │ → FSM validates transition PENDING → IN_PROGRESS
    ▼
Provider completes work
    │
    ▼
PATCH /api/orders/[id] { status: "COMPLETED" }
    │ → FSM validates IN_PROGRESS → COMPLETED
    │ → sets completedAt
    │ → recomputes service ratingAvg
    ▼
Customer writes review
    │
    ▼
POST /api/reviews { orderId, rating, comment }
    │ (rate limited: 10/hour)
    │ → validates: order COMPLETED, one review per order
    │ → updates service ratingAvg, totalReviews
    ▼
Done ✓
```

---

## Security Layers

1. **Middleware** — Public path whitelist, role enforcement, CSRF check
2. **Auth** — NextAuth v5 JWT, bcrypt password hashing, login rate limiting
3. **API Guard** — Token bucket rate limiting per endpoint type
4. **CSRF** — Double-submit cookie pattern (cookie + header match)
5. **Data-level** — Route handlers verify ownership (customer owns order, provider owns service)
6. **Headers** — X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy

---

## Design System

**Tokens:** HSL CSS custom properties in `globals.css` (light + dark themes)
**Typography:** Plus Jakarta Sans (sans) + Instrument Serif (serif), fluid `clamp()` scale
**Colors:** Orange primary with `-strong` variants for WCAG AA compliance
**Motion:** GSAP + CSS transitions, centralized in `lib/motion.ts`, respects `prefers-reduced-motion`
**Components:** shadcn-style primitives in `components/ui/`

---

## Key Conventions

1. **Server Components by default** — Client components marked with `"use client"`
2. **Async Navbar** — Server component that reads session directly
3. **Dynamic imports** — Three.js hero orb lazy-loaded after page interactive
4. **Dual ID system** — `toPrismaId()` handles both MongoDB ObjectId and SQLite integer
5. **City normalization** — `User.city` is lowercase, derived from `User.location` at write time
6. **FSM for orders** — `lib/order-status.ts` is single source of truth
7. **Rate limits** — In-memory token bucket, per-instance (needs Redis for production scaling)

---

## Known Limitations

1. **404 status soft-404** — Navbar is async server component, Next.js streams before `notFound()` runs
2. **Rate limit per instance** — In-memory state not shared across serverless instances
3. **Simulated payments** — No payment gateway integration
4. **Polling notifications** — 60s for notifications, 15s for messages (not WebSocket)
5. **City filter uses `contains`** — Matches partial strings ("jakarta" matches "jakarta selatan")
6. **E2E mutates data** — Each run adds orders and reviews
