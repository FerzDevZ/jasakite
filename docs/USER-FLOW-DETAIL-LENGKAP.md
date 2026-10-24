# JASAKITE — User Flow Sedetail-detailnya
> 30 Agustus 2025 • 3 Role • 38 Provinsi • Next.js 15 + Prisma • 20 API Handler

---

## 1. Peta Rute (Semua Halaman)

**Publik (tanpa login, `middleware.ts:6` PUBLIC_PATHS):**
`/` → `/services` → `/service/[slug]` → `/provider/[id]` → `/faq` → `/login` `/register` → `/sitemap.xml` `/robots.txt` `/icon` `/opengraph-image`

**Perlu Login (redirect `/login?callbackUrl=` jika tanpa token):**
`/dashboard` (router role) → `/dashboard/customer` (CUSTOMER) → `/dashboard/provider` + `/dashboard/provider/buka-jasa` (PROVIDER/ADMIN) → `/dashboard/admin` + `/dashboard/admin/moderasi` + `/dashboard/admin/users` (ADMIN) → `/checkout?service=<slug>` (CUSTOMER) → `/orders/[id]` (hanya peserta)

Semua rute punya `loading.tsx` + `error.tsx` sendiri.

---

## 2. Aktor & Hak Akses

| Aktor | Role `User.role` | Masuk via | Hak |
|---|---|---|---|
| **Customer** | `CUSTOMER` default | `POST /api/auth/register` role=CUSTOMER (location opsional) → `Credentials` login | Lihat katalog, pesan jasa orang lain (bukan milik sendiri `service.providerId !== customerId` `app/api/orders/route.ts:48`), lihat pesanan miliknya `GET /api/orders`, batalkan `PENDING` saja, kirim `Message` jika peserta, beri `Review` jika `COMPLETED` + dalam 60 hari + belum pernah, simpan `SavedService` |
| **Provider** | `PROVIDER` (wajib `location` `app/api/auth/register:25`) | Sama | Semua hak Customer? Tidak — `middleware.ts:57` hanya boleh `/dashboard/provider`. Buat jasa `POST /api/services` (price>0, delivery 1-90, title≥3, desc≥10, imageUrl url/data:), ubah status jasa `PATCH /api/services/[id]` (owner/ADMIN), lihat pesanan masuk `GET /api/provider/orders` (where `service.providerId`), ubah status pesanan `PATCH /api/orders/[id]` hanya `PENDING→IN_PROGRESS→COMPLETED` atau `CANCELLED` (via `canTransition` `lib/order-status.ts:32`), lihat pesan order miliknya |
| **Admin** | `ADMIN` (hanya via seed `admin@jasakite.id`) | Sama | Semua hak Provider + `GET /api/admin/stats` (revenue, 14 hari, top5), `GET /api/admin/users`, `GET /api/admin/export` CSV 5/5m, `POST /api/admin/users/[id]/impersonate` (bukan self, bukan ADMIN lain) → set cookie `authjs.session-token` (http/https) + `POST /api/auth/unimpersonate` → `window.location=/dashboard` |

**Impersonasi detail:** `lib/auth.ts:62` simpan `impersonatorId` di JWT, `Navbar.tsx:100` tampil `ImpersonationBar` kuning selalu. Tombol kembali cek `res.ok` dulu baru redirect, cegah nyangkut di sesi orang lain.

---

## 3. Flow Utama — Customer Pesan Sampai Ulasan (Happy Path)

### 3.1 Landing `/` (Server `app/page.tsx:27` force-dynamic)
1. Server `Promise.all` 7 query: kategori (maks 12) + 6 jasa `ACTIVE orderBy createdAt desc` + providerCount + completedCount + ratingAvg + cityCount distinct + 5 heroProvider (punya jasa ACTIVE).
2. Render: `Hero` (badge `38 provinsi Aceh→Papua`, H1 `Jasa terbaik dari orang terpercaya`, search besar `list="hero-search-list"` + `⌘K`, pills kategori, pills nasional `Pangkal Pinang | Tanjung Pinang | Jayapura` → `?location=...`) → Kategori bento `grid 2→3→6` `auto-rows-fr h-full min-h-[148px]` (fix jitter) → Jasa ramai 6 `ServiceTile` → Cara kerja 4 → Statistik 4 `Counter` → CTA `Punya keahlian?` 2 tombol (`bg-background text-primary-strong` 5.0:1, bukan `primary-foreground`).
3. Klik kategori → `/services?category=1` atau search submit → `/services?search=antar`.

### 3.2 Katalog `/services` (`page.tsx` Server wrapper → `page.client.tsx` Client)
- **State:** `search` (500ms debounce `useDebouncedValue`) + `filters: CatalogFilters {category, location, minPrice, maxPrice, rating}` (400ms) + `sort` + `page` + `drawerOpen`.
- **URL sync:** `useEffect` `router.replace(/services?qs, {scroll:false})` — reset `page=1` tiap filter berubah.
- **Fetch:** `useQuery ["services", ...keepPreviousData]` `GET /api/services?search&category&location&minPrice&maxPrice&rating&sort&pagesort` 12/limit. `categories` dari `GET /api/categories`.
- **API `app/api/services/route.ts:16`:** `where.status=ACTIVE` + `AND tokens` (tiap kata `OR title contains / description contains / provider.name contains`) + `categoryId` + `price gte/lte` (validasi `min>max` → 400) + `ratingAvg gte` + `provider.city contains lower trim` (bukan `location` — cegah `Jl` cocok semua) + `orderBy SORT_MAP` + paginasi.
- **UX:** `isFetching && !isLoading` → `opacity-60` (bukan blink), `CatalogSkeleton` 6 `ServiceTileSkeleton`, `PageShell` H1 `Jelajahi Jasa` di atas grid (hindari `h2 Filter` sebelum `h1`), sort custom `listbox` (`Hero` juga) `aria-activedescendant` + `Home/End` + `Tab` close, filter panel `CatalogFilterPanel` sidebar `sticky top-24` vs drawer `85vh + grabber`, chip aktif `sticky top-16 backdrop-blur` dengan `X`, empty → `EmptyState` `Reset` + `Lihat Kepulauan Riau` jika `location` ada, pagination `page±2` window + ellipsis + `aria-current="page"`, mobile bar `fixed bottom-0 bg-background/80 backdrop-blur supports:60` + badge count.

### 3.3 Detail Jasa `/service/[slug]` (Server + Client)
- **Server `app/service/[slug]/page.tsx:13` generateMetadata:** `findUnique slug` select title/desc/price/rating/category → `canonical /service/slug`, `openGraph locale id_ID`, `keywords [title, category, jasa, ...]`, jika `!service` → `noindex nofollow` (soft 404 karena `Navbar` async streaming lock 200).
- **Server Page:** `findUnique include provider(id,name,avatar,city,createdAt) + category` → `notFound()` jika `!service || status!="ACTIVE"`. Hitung `providerStats: completedOrders (where COMPLETED providerId), avgRating (aggregate where totalReviews>0), city, memberSince`. `related` 3 `where ACTIVE categoryId id!=service orderBy ratingAvg desc`. `jsonLd` `Service` (Organization provider, areaServed Indonesia, Offer IDR, AggregateRating jika >0).
- **Client `service-detail-client.tsx`:** gallery `imageUrl + JSON.parse(images)` → `aspect-[4/3] sm:aspect-video` button `Maximize2` → lightbox `Dialog max-w-4xl` + `1 / N` + prev/next (main + lightbox) + thumbs `border-primary shadow-glow`, mobile title/rating/delivery/city `lg:hidden` + price `border-primary/20 bg-primary/5` + trust + provider card `ShieldCheck` `completedOrders`, `Tabs` (`description/reviews/about`) `value=activeTab` → `router.replace(?tab=...)` + `scrollIntoView scroll-mt-24`, `RatingDistribution` (5→1 bar `bg-rating` width `count/total%`), reviews `useQuery ["service-reviews"] GET /api/services/[id]/reviews` (50 desc) skeleton 3 / empty / list `RatingStars` + comment, about `dl grid 2/4` `completed/avg/memberSince/area` + `Link /provider/[id]`, kanan desktop `hidden lg:block sticky top-24` duplicate rating/title/meta + price `bg-primary/5` + `Pesan Sekarang Link /checkout?service=slug + SaveButton` + trust + provider hover, related `Jasa serupa` 3 `ServiceTile media sm`, mobile bar `fixed bottom-0 bg-background/80` `Harga + SaveButton + Pesan`.

### 3.4 Checkout `/checkout?service=<slug>` (Client `Suspense`)
- **Load:** `useSearchParams slug` → `useQuery ["checkout-service",slug] GET /api/services?slug=slug → data.services[0]`. Jika `!slug` atau `!service` → `ServiceNotFound` `EmptyState SearchX` → `Jelajahi`.
- **Form state:** `address` (required 3 rows, placeholder `Jl. Depati Amir..., Pangkal Pinang, Kepulauan Bangka Belitung`), `addressTouched`, `deadline` (`type=date min=tomorrow` + `CalendarDays`), `notes 500` (counter red 480+), `paymentMethod transfer/ewallet/cod` (`RadioCardGroup` + `PAYMENT_DETAILS animate-rise-in` + demo note), `submitting/error/success`.
- **Validasi submit:** `address.trim` → toast + `setError` jika kosong; `cityFromLocation(address)` → jika null (hanya `Jl. Melati No.12` tanpa kota) → toast `Sertakan kota & provinsi`. `isOwnService` ( `service.provider.id === session.user.id` ) → `EmptyState Tidak bisa memesan jasa sendiri` (juga `disabled` button) cegah `400 Tidak dapat memesan jasa sendiri`.
- **Submit:** `POST /api/orders {serviceId, orderNotes, address, deadline: "YYYY-MM-DDT09:00:00", paymentMethod}` → jika `401` → `Silakan masuk` else `error`, `201` → `setSuccess(id)` + `toast success` + `scrollTo top`.
- **Success:** `CheckoutSuccess` `useCountUp` `requestAnimationFrame` 900ms `cubic 1-(1-t)^3` + `canvas-confetti` 90 `["#F97316",...]` (skip `reduce`), `wa.me?text=Pesanan #ID` share.
- **UI:** `PageShell py-10 pb-28 lg:pb-10`, stepper 2 langkah `Detail Jasa (muted) → Alamat & Bayar (primary aria-current=step)` + thin progress `h-1.5 w-1/2 bg-primary`, `Link Kembali`, `grid lg:1fr+380px`, left `Card Detail` service row `Image 14 + title/provider + price + Clock`, right `Card sticky top-24 Ringkasan` `Harga / GRATIS Badge success / Total` + `TRUST_POINTS` + error `bg-destructive/10` + `Button hidden lg:flex` vs mobile `fixed bottom-0 z-40 bg-background/80` bar total + submit `shadow-glow`.

### 3.5 Detail Pesanan `/orders/[id]` (Client `Suspense`)
- **Load:** `useParams id` → `useQuery ["order",id] GET /api/orders/[id]` (auth + `enforceRateLimit read` + `isCustomer||isProvider` else 403). `useSession` untuk role, `useEffect` confetti jika `COMPLETED`.
- **Header:** `Pesanan #id + OrderStatusBadge` + `createdAt id-ID long`, `error alert`.
- **Timeline:** `OrderTimeline status` + `COMPLETED` banner `border-success/30 bg-success-soft` + `🎉→CheckCircle2` + `Share2 clipboard`.
- **Cards:** `Detail Jasa Link /service/slug` `Badge category` + provider vs pemesan conditional + `price` + `Informasi` rows `CreditCard Metode`, `CalendarDays tanggal`, `MapPin alamat`, `deadline`, `FileText catatan` + **Estimasi `createdAt + deliveryTimeDays` (`Clock` + `(3 hari kerja)`)**.
- **Aksi:**
  - `isCustomer && PENDING` → `Card border-destructive` `Batalkan` → `Dialog AlertTriangle` confirm `Ya Batalkan` → `PATCH status CANCELLED` (guard `customer only CANCELLED`).
  - `isProvider && PENDING` → `Terima & Mulai Kerjakan (Package)` → `IN_PROGRESS`.
  - `isProvider && IN_PROGRESS` → `Tandai Selesai (CheckCircle2)` → `COMPLETED` (sets `completedAt now`).
  - `updateStatus(next)` guard `isOrderStatus && canTransition(current,next)` else toast + 409 `transitionError`.
  - `queryClient.invalidate ["order", "customer-orders", "provider-orders"]`.
- **Chat:** `MessageThread orderId otherName` (optimistic bubble `id -Date.now()` + `Loader2` pending → `Check`).
- **Review:** `isCustomer COMPLETED !alreadyReviewed` → `ReviewForm defaultOpen` (radiogroup 5 `Star` `role=radio` + `ArrowRight/Left` roving, `hoverRating` + label `Sangat puas`) + `Komentar 500` → `POST /api/reviews` (guard `orderId, rating 1-5, comment≤500`, check `customerId`, `COMPLETED`, `±60d REVIEW_WINDOW_DAYS`, `reviews.length==0`) → `computeRatingAggregate` transaksi → `service.update`. `alreadyReviewed` → `ReviewSubmitted` `CheckCircle2`.

---

## 4. Flow Katalog Interaksi Lain

- **Sort:** Custom `listbox` `sortRef` `mousedown` outside close + `Escape` + `ArrowDown/Up` roving `querySelectorAll [role=option]` + `Home/End`, `tabIndex` roving.
- **Harga `Rp`:** `CatalogFilterPanel` now `pl-7` + `span Rp` left + chip `<100rb|100-300rb|300rb+` 1-tap, validasi `min>max` → `throw "Harga minimum tidak boleh lebih besar"` → `isError` alert.
- **Lokasi:** `Input list=lokasi-list` `datalist` 40 `LOCATION_SUGGESTIONS` (38 provinsi + kota besar) + chips `Bangka` etc (1 tap). API `location.trim().toLowerCase() contains`.
- **Pagination:** `pageNumbers start max(1,page-2) end min(total,start+4)` + ellipsis + `Button disabled` prev/next.
- **Mobile:** `CatalogFilterDrawer` `fixed inset-0 z-50` backdrop `foregroud/40` + `Dialog role=dialog aria-modal` `bottom-0 max-h-[85vh] rounded-t-3xl` header `Filter X` + footer `Lihat N Jasa` `shadow-glow`, focus trap `Tab` cycle + `Escape` + `overflow hidden` + `previousFocus`.

---

## 5. Flow Pesan (`MessageThread`)

- **Load:** `useQuery ["messages",orderId] GET /api/orders/[id]/messages` (check participant `customerId||providerId` else 403, `take 200 asc`) `refetchInterval 8000` `refetchIntervalInBackground:false` + `scrollTo bottom smooth` on `messages.length`.
- **Kirim:** `draft trim` → `setOptimistic {id:-Date.now(), content, createdAt now, sender myId}` → `setDraft ""` → `useMutation POST /api/orders/[id]/messages {content 1-500 trim}` `RATE_LIMIT message 40/m` → `onSuccess null + invalidate` → `onError revert draft + toast`.
- **UX:** Bubble `max-w-[82%] rounded-2xl` `mine bg-primary text-primary-foreground` else `bg-muted`, `time id-ID HH:mm` + `Loader2 pending / Check terkirim`, `textarea rows2 maxLength500` `Enter` kirim (`Shift+Enter` baru), `remaining <100` show, quick chips `Halo kapan bisa mulai?`, `aria-label Percakapan dengan otherName` + `aria-live polite`.

---

## 6. Flow Dashboard

**Shell `app/dashboard/layout.tsx` Server `force-dynamic` `auth()||redirect /login` → `DashboardShell role` (avoids double).**

**Root `/dashboard/page.tsx` Server router:** `ADMIN→/admin`, `PROVIDER→/provider`, else `CUSTOMER`.

**Customer `dashboard/customer/page.tsx` Client `useSession` + `DashboardSkeleton 4/2` → `PageHeader Pesanan Saya` + `CustomerDashboard` (`useQuery ["customer-orders"] GET /api/orders`  `filter all/active/completed` Tabs `value=filter` + `StatCard 4` + `EmptyState` vs list `OrderStatusBadge` + `formatIDR`) + `SavedServices` (`GET /api/saved` → `saved.map(s.service)` + `SaveButton` per card).

**Provider `dashboard/provider/page.tsx` Server `Promise.all 7`:** `service take6`, `service aggregate _count/_sum price`, `order groupBy status`, `recent 6`, `todayOrders gte WIB midnight `new Date(`${wibDate}T00:00:00+07:00`)`` (fix server local vs WIB), `revenue sum COMPLETED`, `rating avg ACTIVE`. UI `PageHeader + Tambah Layanan` + `StatCard 4 (Store/Wallet/Inbox/Clock)` + `OrderKanban` + `ServiceTile 3` + `EmptyState Store Buka Jasa` + `Order Terbaru list OrderStatusBadge` + `rating/revenue` cards.

**Buka Jasa `dashboard/provider/buka-jasa/page.tsx` Client `useSession` guard `PROVIDER|ADMIN` → `BukaJasaForm onCreated` + success `CheckCircle2 border-success/30 bg-success-soft` + `ProviderServiceList enabled` (toggle `PATCH /api/services/[id] {status ACTIVE/DRAFT/ARCHIVED}` owner/ADMIN).**

**`BukaJasaForm`:** `useQuery categories` + `form {title,categoryId,price,deliveryTimeDays,description,imageUrl}` + `compressImage` `canvas 1280 jpeg 0.82` (drag&drop + `Upload` + `data:image` preview `h-24` + `X` hapus, or URL `https://` ) → `useMutation POST /api/services` (slug `kebab + Date.now()`, `serviceWrite 20/10m`) → `invalidate my-services` + `toast`.

**Admin `dashboard/admin/page.tsx` Client `useSession ADMIN` + `useQuery ["admin-stats"] GET /api/admin/stats` (parallel 6 counts + `since 13*DAY_MS` + `ordersByDay 14` via `toLocaleDateString id-ID month short` + `completed` category/provider maps + `statusBreakdown`). `OrdersAreaChart` + `CategoryRevenueChart` `dynamic ssr:false Skeleton h-full` + 5 KPIs `Counter` + `draftServices.length>0` card `ShieldCheck` + `recentOrders table overflow-x-auto Link` + `Top5` rank.

**Admin Moderasi `moderasi/page.tsx`:** `useQuery admin-stats` + `useMutation PATCH /api/services/:id {ACTIVE}` `busyId` + `toast`.

**Admin Users `users/page.tsx`:** `useQuery AdminUser[] GET /api/admin/users` (`_count services/orders`) + `search` filter + `POST /api/admin/users/:id/impersonate` → `window.location=/dashboard` + `ImpersonationBar`.

---

## 7. Flow Auth

- **Register `app/(auth)/register/page.tsx` Client:** `form {name,email,phone,location,role CUSTOMER|PROVIDER}` `RadioCardGroup columns2` + `location required if PROVIDER` + `POST /api/auth/register` `register 5/h` `cityFromLocation(location)` lowercased → `201` else `409 Email sudah terdaftar` / `400 Kota wajib` → `router.push /login?registered=1` (loading kept true prevent double submit).
- **Login `login/page.tsx` Client `Suspense`:** `signIn("credentials", {redirect:false})` → `router.push callbackUrl` + `router.refresh()` (Middleware whitelist `PUBLIC_PATHS` + role guard `/dashboard/provider` only PROVIDER/ADMIN, `/admin` only ADMIN, `login/register` redirect if already logged). `middleware.ts:36` `getToken` via `AUTH_SECRET`, `matcher` exclude `_next/static` etc.
- **Logout:** `signOut({callbackUrl:"/"})` server action in `Navbar` + `DashboardShell UserCard`.

---

## 8. Flow Search & Notifikasi

- **SearchBar `components/layout/search-bar.tsx`:** Desktop `form action=/services hidden md:block max-w-xl` + `kbd /` shortcut `/` focus if not typing, mobile `button md:hidden` → `fixed inset-0 z-[60]` `bg-black/50` `role=dialog slide-in` + `mobileInputRef` autofocus + `Tab` trap + `Escape` + `overflow hidden` + `previousFocus`.
- **NotificationBell `notification-bell.tsx`:** `useCallback load` `fetch /api/notifications cache:no-store` → `{count, items[{orderId,message,time}]}` `setInterval 30s` (skip if `document.hidden` + `visibilitychange` reload) + `Button Bell h-9 w-9` badge `9+` + `fixed inset-0 z-40` backdrop + `absolute right-0 w-80 rounded-2xl shadow-card-lg` `Link /orders/:id`.
- **API `app/api/notifications/route.ts:7`:** `auth` + `adminRead 60/m` + `user.role PROVIDER/ADMIN → PENDING/IN_PROGRESS where service.providerId take10 desc` vs `CUSTOMER → IN_PROGRESS/COMPLETED where customerId`, `time = max1 round((now-createdAt)/3600000) jam lalu` (now `updatedAt desc`).

---

## 9. Flow Simpan Jasa

- **SaveButton `save-button.tsx`:** `useSession` `status authenticated` → `fetch /api/saved?id=serviceId cache:no-store` → `saved, checked`, `handleToggle` if `!authenticated` → `router.push /login?callbackUrl=pathname`, else optimistic `prev/wasChecked` + `loading` + `POST /api/saved {serviceId}` → `saved:true 201 / false 200` + `toast` else revert.

---

## 10. Error & Edge Cases

- **Harga `min>max`:** API 400 `Harga minimum tidak boleh lebih besar`, client `throw` → alert `Harga minimum melebihi maksimum`.
- **Lokasi `location=Jl`:** `city contains lower` → 0 (bukan seluruh katalog), `total=0` → `EmptyState`.
- **Self-order:** API 400 `Tidak dapat memesan jasa sendiri`, checkout `isOwnService` → `EmptyState Tidak bisa memesan jasa sendiri` (disabled submit).
- **Transisi ilegal:** API 409 `transitionError`, kanban `canTransition` guard + invalid `border-destructive/40` + `Tidak diizinkan` badge.
- **Review:** 403 bukan pemesan, 400 belum `COMPLETED` atau `>60d` atau sudah pernah, 201 recompute transaksi.
- **RateLimit 429:** `X-RateLimit-*` + `Retry-After` (register 5/jam, orderCreate 10/10m, message 40/m, search 60/m, read 120/m, adminExport 5/5m).
- **Checkout tanpa slug:** `ServiceNotFound`.
- **Deadlie past:** API `refine d.getTime()>now` → 400 `Jadwal harus di masa depan`, client `min=tomorrow`.
- **Katalog slug `status!=ACTIVE`:** API still `where status ACTIVE` → 404, server `notFound()` + `noindex`.
- **Impersonate:** 403 jika `!ADMIN`, 404 jika target `ADMIN`, 10/jam.

---

## 11. State & Cache

- **Server:** `force-dynamic` + `auth()` + `prisma` direct (detail, provider stats, sitemap `findMany`).
- **Client:** `TanStack Query` `fetch /api/*` `keepPreviousData` (catalog), `placeholderData`, `invalidate` after `PATCH/POST` (`provider-orders`, `customer-orders`, `messages`, `my-services`, `admin-stats`, `service-reviews`). `optimistic` hanya `SaveButton` + `MessageThread` + `Kanban`.
- **URL:** `searchParams` sync (`services`, `checkout?service=slug`, `service ?tab=`) + `router.replace scroll:false` + `Suspense`.

---

> **Satu kalimat:** Pelanggan banding harga di `Bangka Belitung` via `contains` → `Pesan Sekarang Link` (bukan `window.href`) → `checkout` validasi `address 5 char + city` + `deadline future` → `orders/[id]` FSM guard + chat 8s + ulasan 60d transaksi → Provider drag kanban `distance 6` + `Top 5` admin — semua polling `30s` skip hidden + `skip-link` + `cityCount` 21 vs `14+` bug lama.

