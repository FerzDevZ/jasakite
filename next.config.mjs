import path from 'path';

/**
 * Folder keluaran build bisa dipindah lewat env.
 *
 * `next dev` dan `next start` menulis ke folder yang SAMA secara default. Saat
 * keduanya hidup bersamaan (dev di 3000 milik pengembang + suite E2E yang
 * menjalankan build produksi), proses dev menimpa berkas build produksi dan
 * sebaliknya: server produksi kehilangan CSS/JS-nya, dan tab dev dipenuhi
 * "Failed to load resource: 404" untuk seluruh `/_next/`. Dengan pemisahan ini,
 * E2E memakai `.next-e2e` sendiri dan sesi dev tidak pernah terusik.
 */
const distDir = process.env.NEXT_DIST_DIR || ".next"

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: {
    formats: ['image/avif', 'image/webp'],
    // Gambar remote (unsplash/pravatar/cloudinary) adalah aset statis dengan URL
    // berkualitas tetap. Cache optimizer minimal 30 hari: tanpa ini, setiap
    // `next build` menghapus .next/cache/images dan restart server memicu burst
    // refetch upstream — yang saat jaringan lambat berakhir sebagai
    // TimeoutError undici (code 23) di log, satu per varian gambar yang gagal.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // No heavy bundle config — Next.js handles us. Preload warning note:
  // Dev runtime logs “resource preloaded but not used within load event” for
  // critical-chain CSS because Next.js preload is used by RSC hydration only
  // after the first render cycle, and Chrome logs proactively. This does not
  // affect production performance. No runtime suppression — no negative perf.
}

export default nextConfig
