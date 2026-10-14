import Link from "next/link"
import { getCategoryIcon } from "@/lib/category-icons"

type Category = {
  id: string | number
  slug: string
  name: string
  serviceCount: number
}

/**
 * Grid pintasan kategori — dua baris ikon di mobile, seperti layar utama
 * aplikasi pesan-antar.
 *
 * Bentuknya sengaja berbeda dari kartu kategori besar yang ada di bawah
 * halaman: di sini kategori adalah *navigasi* (ikon + label, tanpa penjelasan),
 * sedangkan kartu besar adalah *etalase*. Membedakan keduanya mencegah
 * halaman berisi dua blok kartu yang terlihat sama tetapi berperilaku beda.
 */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section aria-labelledby="pintasan-kategori" className="mx-auto max-w-7xl px-4">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="pintasan-kategori"
          className="text-lg font-bold tracking-tight sm:text-xl"
        >
          Mau kerjakan apa hari ini?
        </h2>
        <Link
          href="/services"
          className="focus-ring shrink-0 rounded text-xs font-semibold text-primary-strong underline-offset-4 hover:underline"
        >
          Semua kategori
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 lg:grid-cols-8">
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.slug)
          return (
            <li key={category.id}>
              <Link
                href={`/services?category=${category.id}`}
                className="focus-ring group flex h-full flex-col items-center gap-2 text-center active:scale-95"
              >
                {/* Lingkaran penuh ala layar utama aplikasi pesan-antar: ikon
                    terapung di atas warna tanpa kotak border — lebih ringan dan
                    khas mobile-app dibanding kartu berbingkai. */}
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary-strong transition-[background-color,transform] duration-fast ease-smooth group-hover:bg-primary/20 sm:h-16 sm:w-16">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
                </span>
                <span className="line-clamp-2 text-2xs font-semibold leading-tight">
                  {category.name}
                </span>
                <span className="mt-auto text-[10px] text-muted-foreground">
                  {category.serviceCount} jasa
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
