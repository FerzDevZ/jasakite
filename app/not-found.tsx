import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Search className="h-10 w-10 text-primary-strong" />
      </div>
      <h1 className="text-6xl font-extrabold tracking-tight text-primary-strong">404</h1>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">
        Halaman tidak ditemukan
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button>Beranda</Button>
        </Link>
        <Link href="/services">
          <Button variant="outline">Jelajahi Jasa</Button>
        </Link>
      </div>
    </div>
  )
}
