// Service Worker for offline support — robust against chrome-extension/-extension
// cache.put failures (web app manifest data fetch, browser extension, etc.)
// Versi cache WAJIB naik setiap kali strategi di bawah berubah: `activate`
// hanya menghapus cache yang namanya berbeda, jadi nama yang tetap berarti
// shell hasil strategi lama tetap dipakai oleh pengguna yang sudah pernah buka.
const CACHE_NAME = 'jasakite-v6'
// Dokumen HTML yang disimpan hanya sebagai cadangan OFFLINE. Disajikan lewat
// jaringan lebih dulu (lihat handler fetch) — bukan dari cache lebih dulu.
const STATIC_ASSETS = [
  '/',
  '/services',
  '/faq',
  '/login',
  '/register',
  // Fallback offline: disajikan bila navigasi gagal DAN rutenya belum pernah
  // di-cache — pengguna melihat halaman brand yang menjelaskan keadaan, bukan
  // dino browser yang tidak bisa dikustomisasi.
  '/offline.html',
]
const FORBIDDEN_SCHEMES = ['chrome-extension', '-extension', 'data:', 'blob:']

function isForbiddenScheme(url) {
  return FORBIDDEN_SCHEMES.some((s) => url.startsWith(s + ':') || url.startsWith(s + '/'))
}

// Wrap Cache.addAll to gracefully handle HTTP 4xx/404/5xx without failing install
function safeAddAll(cache, assets) {
  return Promise.allSettled(
    assets.map((asset) => {
      if (isForbiddenScheme(asset)) {
        console.warn(`[SW] skipping forbidden scheme: ${asset}`)
        return Promise.resolve()
      }
      return cache.add(asset)
    }),
  ).then((results) => {
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      console.warn(`[SW] install partial: ${failed}/${assets.length} assets failed to cache`)
    }
  })
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return safeAddAll(cache, STATIC_ASSETS)
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event.
//
// Navigasi HTML memakai NETWORK-FIRST, bukan cache-first. Cache-first untuk
// dokumen berarti tab pertama setiap sesi dilayani shell dari build lama; shell
// itu menunjuk berkas `/_next/...` versi lama yang sudah tidak dilayani server,
// sehingga satu halaman utuh gagal memuat seluruh CSS/JS-nya (badai error 404 di
// console) padahal servernya sehat. Dengan network-first, kondisi offline tetap
// tertangani lewat fallback cache di blok `.catch`.
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip API requests
  if (event.request.url.includes('/api/')) return

  // Skip Next.js internal requests — selalu dari jaringan. Nama berkasnya
  // berubah setiap build (dan setiap rekompilasi di mode dev), jadi entri
  // cache lama di sini hanya bisa menghasilkan 404.
  if (event.request.url.includes('/_next/')) return

  // Skip payload RSC/prefetch router — INILAH yang membuat "refresh non-stop"
  // dan konten halaman lain bocor ke katalog setelah deploy: URL seperti
  // /services?_rsc=... lolos dari pengecualian /_next/ dan ter-cache
  // CACHE-FIRST di cabang aset, sehingga setiap deploy meninggalkan pohon
  // halaman lama yang bertabrakan dengan chunk baru (ChunkLoadError →
  // hydration crash → reload berulang). Payload ini datanya dinamis dan
  // berumur satu build — tidak boleh pernah masuk cache SW.
  const reqUrl = new URL(event.request.url, self.location?.href || '')
  if (
    reqUrl.searchParams.has('_rsc') ||
    event.request.headers.get('RSC') === '1' ||
    event.request.headers.get('Next-Router-Prefetch') === '1'
  ) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy).catch(() => {
                // Dokumen yang tidak bisa disimpan bukan kegagalan fatal:
                // respons tetap diteruskan ke halaman.
              })
            })
          }
          return response
        })
        .catch(async () => {
          // Rute yang pernah dibuka → salinan cache (offline-valid).
          const cached = await caches.match(event.request)
          if (cached) return cached
          // Belum pernah dibuka → halaman offline fallback.
          const offline = await caches.match('/offline.html')
          if (offline) return offline
          // Fallback terakhir yang mustahil gagal (offline.html selalu
          // diprecache; kalau entri itu sendiri hilang, tetap jangan tampilkan
          // dino tanpa penjelasan).
          return new Response(
            '<!doctype html><html lang="id"><meta charset="utf-8"><title>Offline — JASAKITE</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100dvh;margin:0;background:#FBFAF8;color:#292524"><p>Kamu sedang offline.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          )
        })
    )
    return
  }

  // Aset lain (gambar, font, ikon): cache-first masih tepat — isinya jarang
  // berubah dan justru inilah yang membuat aplikasi tetap berguna offline.
  //
  // Rantai ini WAJIB diakhiri .catch: fetch aset bisa reject (offline, host
  // CDN mati) dan tanpa catch ia menjadi "Uncaught (in promise) TypeError:
  // Failed to fetch" di console untuk setiap gambar yang gagal — terlihat
  // seperti bug aplikasi padahal hanya jaringan. Response.error() meneruskan
  // kegagalan itu secara bersih ke halaman.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        // Only cache GET requests with safe origin; skip forbidden schemes to
        // avoid Chrome Extension / Data URI / Blob URI cache.put crashes.
        const url = new URL(event.request.url, self.location?.href || '')
        if (isForbiddenScheme(url.href) || url.protocol === 'data:' || url.protocol === 'blob:') {
          return response
        }

        caches.open(CACHE_NAME).then((cache) => {
          // cache.put mengembalikan Promise: try/catch sinkron tidak menangkap
          // reject-nya, jadi rantai .catch wajib ada di Promise-nya.
          cache.put(event.request, responseToCache).catch(() => {
            // Chrome / Chromium: Request scheme unsupported for Cache.put —
            // aset tetap sampai ke halaman, hanya tidak ter-cache.
          })
        })

        return response
      })
    }).catch(() => Response.error()),
  )
})

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
