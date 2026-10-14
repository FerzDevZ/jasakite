import { Button } from "@/components/ui/button"
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon"
import { buildWhatsAppShareText, buildWhatsAppShareUrl } from "@/lib/share"

type WhatsAppShareButtonProps = {
  title: string
  price: number
  url: string
  className?: string
}

/**
 * Tombol bagikan WhatsApp pada halaman detail jasa.
 *
 * Teks pesan dibangun saat render (bukan saat klik) sehingga href-nya sudah
 * ada di HTML: bisa di-tap panjang untuk salin tautan, dibuka tab baru, atau
 * diklik tengah — tanpa bergantung pada window dan tanpa risiko hydration
 * mismatch. Harga ikut bereaksi terhadap pemilihan paket karena `price`
 * adalah state yang sama dengan yang tampil di kartu harga.
 */
export function WhatsAppShareButton({
  title,
  price,
  url,
  className,
}: WhatsAppShareButtonProps) {
  const href = buildWhatsAppShareUrl(
    buildWhatsAppShareText({ title, price, url })
  )

  return (
    <Button variant="outline" size="icon" className={className} asChild>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bagikan ke WhatsApp"
        title="Bagikan ke WhatsApp"
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
    </Button>
  )
}
