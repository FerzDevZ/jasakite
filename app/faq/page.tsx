import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { MessageCircle } from "lucide-react"
import { FaqContent } from "@/components/layout/faq-content"
import { FAQ_SECTIONS } from "@/lib/faq-data"

export const metadata: Metadata = {
  title: "FAQ & Bantuan — JASAKITE",
  description:
    "Pertanyaan yang sering diajukan tentang JASAKITE: cara memesan jasa, metode pembayaran, kebijakan, dan lainnya.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "FAQ & Bantuan — JASAKITE",
    description:
      "Temukan jawaban atas pertanyaan umum tentang JASAKITE.",
    type: "website",
    url: "/faq",
  },
}

export default function FAQPage() {
  // Hanya pertanyaan yang benar-benar punya jawaban yang boleh masuk JSON-LD:
  // Question tanpa acceptedAnswer.text adalah markup tidak valid dan lebih
  // berbahaya daripada tidak ada markup sama sekali.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => item.q.trim().length > 0 && item.a.trim().length > 0)
        .map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        }))
    ),
  }

  return (
    <PageShell width="prose" className="py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary-strong">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Pertanyaan Umum
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Temukan jawaban atas pertanyaan yang sering diajukan. Tidak menemukan
          yang Anda cari? Hubungi kami di{" "}
          <a
            href="mailto:halo@jasakite.id"
            className="font-medium text-primary-strong hover:underline"
          >
            halo@jasakite.id
          </a>
        </p>
      </div>

      <FaqContent />
    </PageShell>
  )
}
