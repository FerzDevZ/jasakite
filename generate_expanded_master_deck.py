import os
import weasyprint

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "docs", "pdf-assets")

def get_img(filename):
    return f"file://{os.path.join(ASSETS_DIR, filename)}"

html_content = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>JASAKITE — Master Presentation Deck EMOSTFET 11 (Fullstack & Backend)</title>
<style>
  @page {{
    size: 297mm 167.06mm; /* 16:9 Widescreen */
    margin: 0;
  }}

  * {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }}

  body {{
    font-family: 'Liberation Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1a1512;
    background: #0B0A09;
    font-size: 8.2pt;
    line-height: 1.38;
  }}

  .slide {{
    width: 297mm;
    height: 167.06mm;
    page-break-after: always;
    position: relative;
    overflow: hidden;
    padding: 9.5mm 14mm 8.5mm 14mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #FBFAF8;
    color: #1a1512;
  }}

  .slide-dark {{
    background: #0B0A09;
    color: #FBFAF8;
  }}

  /* HEADER */
  .slide-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1.5px solid #e7e5e4;
    padding-bottom: 1.8mm;
    margin-bottom: 2mm;
  }}

  .slide-dark .slide-header {{
    border-bottom: 1.5px solid #292524;
  }}

  .rubrik-badge {{
    display: inline-block;
    background: #F97316;
    color: #ffffff;
    font-weight: 800;
    font-size: 6.8pt;
    padding: 0.8mm 3.2mm;
    border-radius: 999px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }}

  .slide-category {{
    font-size: 7.2pt;
    font-weight: 700;
    color: #78716c;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-left: 2.5mm;
  }}

  .slide-dark .slide-category {{
    color: #a8a29e;
  }}

  .slide-number {{
    font-size: 7.8pt;
    font-weight: 800;
    color: #F97316;
    letter-spacing: 0.5px;
  }}

  /* TITLES */
  .slide-title-area {{
    margin-bottom: 2.5mm;
  }}

  .slide-title {{
    font-size: 14.5pt;
    font-weight: 900;
    color: #0B0A09;
    line-height: 1.15;
    letter-spacing: -0.3px;
  }}

  .slide-dark .slide-title {{
    color: #FBFAF8;
  }}

  .slide-title .accent {{
    color: #F97316;
  }}

  .slide-subtitle {{
    font-size: 8pt;
    color: #57534e;
    margin-top: 0.8mm;
  }}

  .slide-dark .slide-subtitle {{
    color: #d6d3d1;
  }}

  /* CONTENT BODY - STRICT 2 COLUMNS NO OVERLAP */
  .slide-body {{
    flex: 1;
    display: flex;
    justify-content: space-between;
    gap: 5.5mm;
    min-height: 0;
  }}

  .col-left {{
    width: 48.8%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }}

  .col-right {{
    width: 48.8%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }}

  .col-full {{
    width: 100%;
    display: flex;
    flex-direction: column;
  }}

  /* CARDS */
  .card {{
    background: #ffffff;
    border: 1px solid #e7e5e4;
    border-radius: 2.5mm;
    padding: 2.4mm 3.2mm;
    margin-bottom: 1.8mm;
  }}

  .slide-dark .card {{
    background: #171310;
    border-color: #292524;
  }}

  .card-orange {{
    border-left: 3.5px solid #F97316;
  }}

  .card-green {{
    border-left: 3.5px solid #10b981;
  }}

  .card-blue {{
    border-left: 3.5px solid #0284c7;
  }}

  .card-purple {{
    border-left: 3.5px solid #8b5cf6;
  }}

  .card-title {{
    font-size: 8.2pt;
    font-weight: 800;
    color: #0B0A09;
    margin-bottom: 0.8mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}

  .slide-dark .card-title {{
    color: #FBFAF8;
  }}

  .card-desc {{
    font-size: 7.2pt;
    color: #44403c;
    line-height: 1.34;
  }}

  .slide-dark .card-desc {{
    color: #d6d3d1;
  }}

  /* CODE BLOCKS */
  pre, code {{
    font-family: 'Liberation Mono', 'Courier New', monospace;
  }}

  pre {{
    background: #0B0A09;
    color: #e2e8f0;
    padding: 2mm 3mm;
    border-radius: 2mm;
    font-size: 6.8pt;
    line-height: 1.35;
    margin: 1mm 0;
    border: 1px solid #292524;
    overflow: hidden;
  }}

  code.inline {{
    background: #f1f5f9;
    color: #0B0A09;
    padding: 0.5mm 1.5mm;
    border-radius: 1mm;
    font-size: 7pt;
    border: 1px solid #cbd5e1;
  }}

  .slide-dark code.inline {{
    background: #1c1917;
    color: #f8fafc;
    border-color: #292524;
  }}

  /* TABLES */
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
    margin: 1.2mm 0;
    background: #ffffff;
    border-radius: 2mm;
    overflow: hidden;
  }}

  .slide-dark table {{
    background: #171310;
  }}

  th {{
    background: #0B0A09;
    color: #FBFAF8;
    padding: 1.8mm 2.5mm;
    text-align: left;
    font-weight: 800;
    font-size: 7pt;
    border: 1px solid #292524;
  }}

  td {{
    padding: 1.5mm 2.5mm;
    border: 1px solid #e7e5e4;
    vertical-align: middle;
  }}

  .slide-dark td {{
    border-color: #292524;
    color: #d6d3d1;
  }}

  tr:nth-child(even) td {{
    background: #faf9f7;
  }}

  .slide-dark tr:nth-child(even) td {{
    background: #1c1917;
  }}

  /* BADGES & TAGS */
  .tag {{
    display: inline-block;
    padding: 0.5mm 2mm;
    border-radius: 999px;
    font-size: 6.2pt;
    font-weight: 700;
    text-transform: uppercase;
  }}

  .tag-green {{ background: #dcfce7; color: #166534; }}
  .tag-orange {{ background: #ffedd5; color: #9a3412; }}
  .tag-red {{ background: #fee2e2; color: #991b1b; }}
  .tag-blue {{ background: #e0f2fe; color: #0369a1; }}
  .tag-purple {{ background: #f3e8ff; color: #6b21a8; }}

  /* IMAGES & FRAMES */
  .img-frame {{
    width: 100%;
    border-radius: 2mm;
    border: 1px solid #d6d3d1;
    overflow: hidden;
    box-shadow: 0 3px 8px rgba(0,0,0,0.06);
    background: #ffffff;
    display: flex;
    flex-direction: column;
  }}

  .slide-dark .img-frame {{
    border-color: #292524;
    box-shadow: 0 3px 12px rgba(0,0,0,0.35);
  }}

  .browser-bar {{
    background: #e7e5e4;
    padding: 1mm 2mm;
    display: flex;
    align-items: center;
    gap: 1mm;
    border-bottom: 1px solid #d6d3d1;
  }}

  .slide-dark .browser-bar {{
    background: #1c1917;
    border-bottom-color: #292524;
  }}

  .browser-dot {{
    width: 1.8mm;
    height: 1.8mm;
    border-radius: 50%;
    background: #a8a29e;
  }}

  .browser-url {{
    background: #ffffff;
    border-radius: 0.8mm;
    padding: 0.3mm 1.8mm;
    font-size: 5.5pt;
    color: #57534e;
    margin-left: 1.5mm;
    flex: 1;
  }}

  .slide-dark .browser-url {{
    background: #0B0A09;
    color: #a8a29e;
  }}

  .img-shot {{
    width: 100%;
    display: block;
    max-height: 52mm;
    object-fit: cover;
    object-position: top;
  }}

  .img-caption {{
    font-size: 6.5pt;
    color: #78716c;
    text-align: center;
    margin-top: 1mm;
    font-weight: 600;
  }}

  .slide-dark .img-caption {{
    color: #a8a29e;
  }}

  /* METRICS STRIP */
  .metrics-row {{
    display: flex;
    gap: 2.5mm;
    margin: 1.2mm 0;
  }}

  .metric-box {{
    flex: 1;
    background: #ffffff;
    border: 1px solid #e7e5e4;
    border-radius: 2mm;
    padding: 1.8mm 2.5mm;
    text-align: center;
  }}

  .slide-dark .metric-box {{
    background: #171310;
    border-color: #292524;
  }}

  .metric-val {{
    font-size: 12pt;
    font-weight: 900;
    color: #F97316;
    line-height: 1;
  }}

  .metric-lbl {{
    font-size: 6pt;
    color: #78716c;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.4px;
    margin-top: 0.8mm;
  }}

  .slide-dark .metric-lbl {{
    color: #a8a29e;
  }}

  /* FOOTER & PRESENTER CUE */
  .slide-footer {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1.2px solid #e7e5e4;
    padding-top: 1.5mm;
    margin-top: 1.8mm;
    font-size: 6.6pt;
    color: #78716c;
  }}

  .slide-dark .slide-footer {{
    border-top: 1.2px solid #292524;
    color: #a8a29e;
  }}

  .speaker-cue {{
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #c2410c;
    padding: 0.6mm 2.8mm;
    border-radius: 999px;
    font-weight: 700;
    font-size: 6.2pt;
  }}

  .slide-dark .speaker-cue {{
    background: rgba(249, 115, 22, 0.15);
    border-color: rgba(249, 115, 22, 0.4);
    color: #fdba74;
  }}
</style>
</head>
<body>

<!-- SLIDE 01: COVER -->
<div class="slide slide-dark" style="justify-content: space-between; padding: 11mm 16mm 9mm 16mm;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div class="rubrik-badge" style="background: #2563eb; font-size: 7.2pt; padding: 1mm 3.8mm;">
      EMOSTFET 11 • WEB DESIGN COMPETITION • GRAND FINAL
    </div>
    <div style="font-size: 7.8pt; color: #a8a29e; font-weight: 700;">
      7 SEPTEMBER 2026 • MASTER PITCH &amp; TECHNICAL DOSSIER
    </div>
  </div>

  <div style="margin: 3mm 0;">
    <div style="font-size: 33pt; font-weight: 900; line-height: 1.05; letter-spacing: -0.5px;">
      Servis<span style="color: #F97316;">Lokal</span>
    </div>
    <div style="font-size: 12.5pt; font-weight: 700; color: #f8fafc; margin-top: 1.5mm;">
      Marketplace Jasa Lokal Nasional — 38 Provinsi Indonesia (Aceh &rarr; Papua)
    </div>
    <div style="font-size: 8.5pt; color: #94a3b8; max-width: 195mm; margin-top: 2mm; line-height: 1.45;">
      Tema Lomba: <em>“Designing Impactful Digital Solutions for Everyday Life”</em><br>
      Solusi digital komprehensif: Desain UI/UX human-centered, sistem backend transaksional tangguh (Next.js 15, Prisma, FSM 409 Guard, Token Bucket Rate Limiting), dan 149 Automated Tests teruji live di Vercel.
    </div>
  </div>

  <div style="display: flex; gap: 3mm; margin: 1mm 0;">
    <div style="flex: 1; background: #171310; border: 1px solid #292524; border-radius: 2mm; padding: 2.2mm; text-align: center;">
      <div style="font-size: 12pt; font-weight: 900; color: #F97316;">20%</div>
      <div style="font-size: 6pt; color: #a8a29e; text-transform: uppercase; font-weight: 700;">Pemahaman Masalah</div>
    </div>
    <div style="flex: 1; background: #171310; border: 1px solid #292524; border-radius: 2mm; padding: 2.2mm; text-align: center;">
      <div style="font-size: 12pt; font-weight: 900; color: #F97316;">30%</div>
      <div style="font-size: 6pt; color: #a8a29e; text-transform: uppercase; font-weight: 700;">User Experience (UX)</div>
    </div>
    <div style="flex: 1; background: #171310; border: 1px solid #292524; border-radius: 2mm; padding: 2.2mm; text-align: center;">
      <div style="font-size: 12pt; font-weight: 900; color: #F97316;">25%</div>
      <div style="font-size: 6pt; color: #a8a29e; text-transform: uppercase; font-weight: 700;">User Interface (UI)</div>
    </div>
    <div style="flex: 1; background: #171310; border: 1px solid #292524; border-radius: 2mm; padding: 2.2mm; text-align: center;">
      <div style="font-size: 12pt; font-weight: 900; color: #F97316;">15%</div>
      <div style="font-size: 6pt; color: #a8a29e; text-transform: uppercase; font-weight: 700;">Kreativitas &amp; Inovasi Backend</div>
    </div>
    <div style="flex: 1; background: #171310; border: 1px solid #292524; border-radius: 2mm; padding: 2.2mm; text-align: center;">
      <div style="font-size: 12pt; font-weight: 900; color: #F97316;">10%</div>
      <div style="font-size: 6pt; color: #a8a29e; text-transform: uppercase; font-weight: 700;">Presentasi &amp; Keandalan</div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Hook Pembuka (0:00 - 0:30): Perkenalkan JASAKITE sebagai ekosistem digital terpadu frontend &amp; backend yang hidup, bukan sekadar prototipe statis.</div>
    <div style="font-size: 7pt; color: #f8fafc;">
      🌐 Live URL: <strong>weblomba-rouge.vercel.app</strong> • 149 Unit/E2E Tests Passed
    </div>
  </div>
</div>

<!-- SLIDE 02: AGENDA -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">OVERVIEW PRESENTASI</span>
      <span class="slide-category">Agenda &amp; Pemenuhan Kriteria Lomba EMOSTFET 11</span>
    </div>
    <div class="slide-number">02 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Struktur Presentasi: 20 Slide Berbobot 100% Sesuai Panduan Juri</div>
    <div class="slide-subtitle">Sistematika presentasi dirancang runtut untuk membuktikan keunggulan ide, UX, UI, dan rekayasa backend.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-orange">
        <div class="card-title">Bagian I: Pemahaman Masalah (Bobot 20%)</div>
        <div class="card-desc">
          • Slide 03: 6 Masalah Nyata Jasa Offline &amp; Riset Lapangan 15 Responden.<br>
          • Slide 04: Analisis Kompetitif (Benchmark vs WA Group &amp; Platform Raksasa).
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Bagian II: User Experience / UX (Bobot 30%)</div>
        <div class="card-desc">
          • Slide 05: Triple-Role Personas (Customer, Provider, Administrator).<br>
          • Slide 06: User Flow End-to-End Tanpa Titik Buntu (Zero Dead-End).<br>
          • Slide 07: UX Showcase: Pencarian Cerdas &amp; Hierarki 38 Provinsi.<br>
          • Slide 08: UX Showcase: Detail Jasa, Ulasan Terverifikasi, &amp; Checkout 2 Langkah.
        </div>
      </div>

      <div class="card card-blue">
        <div class="card-title">Bagian III: User Interface / UI (Bobot 25%)</div>
        <div class="card-desc">
          • Slide 09: Sistem Desain "Titik Terang" (Obsidian #0B0A09 + Warm Orange #F97316).<br>
          • Slide 10: Tipografi Fluid clamp(), Aksesibilitas WCAG AA (5.0:1), &amp; Anti-AI-Slop.<br>
          • Slide 11: UI Showcase: Responsivitas Desktop WebGL vs Mobile 390px.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-purple">
        <div class="card-title">Bagian IV: Rekayasa Backend &amp; Inovasi (Bobot 15%)</div>
        <div class="card-desc">
          • Slide 12: Arsitektur Data MongoDB &amp; Skema Relasional Prisma ORM.<br>
          • Slide 13: Arsitektur 20 API REST, Validasi Zod, &amp; Standar RFC 7807.<br>
          • Slide 14: Finite State Machine (FSM) Order Lifecycle &amp; Proteksi HTTP 409.<br>
          • Slide 15: Arsitektur Keamanan: NextAuth JWT, CSRF Token, &amp; Rate Limiter.<br>
          • Slide 16: Optimasi Klien: Auto-Kompresi Gambar Canvas 1280px (Hemat 80%).<br>
          • Slide 17: Triple-Role Dedicated Workspaces (Stripe, Linear, Gojek UX).
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Bagian V: Kualitas Rekayasa &amp; Dampak (Bobot 10%)</div>
        <div class="card-desc">
          • Slide 18: Jaminan Mutu: 149 Automated Tests &amp; Playwright E2E.<br>
          • Slide 19: Infrastruktur Cloud Global Edge, Dampak UMKM, &amp; Roadmap.<br>
          • Slide 20: Kesimpulan Juara, Live Demo URL, &amp; Sesi Tanya Jawab.
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Transisi: "Mari kita mulai dari kriteria pertama: Mengapa masalah jasa lokal ini sangat mendasar dan butuh intervensi digital."</div>
    <div>Sistematika Presentasi Sesuai Buku Panduan EMOSTFET 11 Halaman 4</div>
  </div>
</div>

<!-- SLIDE 03: PEMAHAMAN MASALAH -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 1: PEMAHAMAN MASALAH • BOBOT 20%</span>
      <span class="slide-category">Latar Belakang &amp; Riset Empiris Lapangan</span>
    </div>
    <div class="slide-number">03 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Kenapa Jasa Lokal di Indonesia Masih Tertinggal Secara Digital?</div>
    <div class="slide-subtitle">Hasil riset dan wawancara mendalam terhadap 15 responden pelanggan dan penyedia jasa lokal di berbagai daerah.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-orange">
        <div class="card-title">1. Cari Kurir &amp; Juru Belanja via Status WhatsApp / Mulut-ke-Mulut</div>
        <div class="card-desc">Pelanggan tidak memiliki etalase pembanding; tarif baru dinegosiasikan setelah penyedia jasa tiba, memicu kecemasan atas risiko manipulasi harga dan kualitas pengerjaan yang buruk.</div>
      </div>

      <div class="card card-orange">
        <div class="card-title">2. Penyedia jasa Daerah Terisolasi (Hanya Jaringan Offline)</div>
        <div class="card-desc">Studi kasus nyata: <strong>Pak Hendri di Pangkal Pinang (Bangka Belitung)</strong> hanya memperoleh rata-rata 2 order/bulan karena jangkauan pemasarannya terbatas 1 kelurahan saja.</div>
      </div>

      <div class="card card-orange">
        <div class="card-title">3. Proses Perbandingan Lambat (1 Hari vs 5 Menit)</div>
        <div class="card-desc">Konsumen harus menghubungi 4–5 nomor berbeda dengan format penawaran tidak seragam, ketiadaan portofolio lampau, dan estimasi waktu yang tidak mengikat.</div>
      </div>

      <div class="card card-orange">
        <div class="card-title">4. Ketimpangan Digital: Luar Jawa Terabaikan</div>
        <div class="card-desc">Platform on-demand raksasa hanya mengalokasikan sumber daya di kota metropolitan Jawa. Kota tier-2 dan tier-3 di 38 provinsi di luar Jawa tidak terlayani.</div>
      </div>
    </div>

    <div class="col-right">
      <div class="img-frame">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">weblomba-rouge.vercel.app (Katalog Nasional 38 Provinsi)</div>
        </div>
        <img src="{get_img('hero-desktop.png')}" class="img-shot" style="height: 52mm;" alt="Hero JASAKITE">
      </div>
      <div class="img-caption">JASAKITE: Menjawab isolasi pasar penyedia jasa daerah dengan menghadirkan etalase digital terverifikasi di 38 provinsi.</div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 0:00 - 0:30: Angkat studi kasus Pak Hendri di Bangka Belitung untuk membuktikan bahwa masalah ini dialami jutaan penyedia jasa di Indonesia.</div>
    <div>Sumber: Riset Wawancara 15 Pengguna (Dokumen Penjelasan Hal. 3)</div>
  </div>
</div>

<!-- SLIDE 04: BENCHMARK -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 1: PEMAHAMAN MASALAH • BOBOT 20%</span>
      <span class="slide-category">Analisis Kompetitif &amp; Posisi Strategis</span>
    </div>
    <div class="slide-number">04 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Benchmark: Mengapa Solusi yang Ada Gagal Mengatasi Masalah?</div>
    <div class="slide-subtitle">Evaluasi komparatif antara media sosial konvensional, platform on-demand raksasa, dan JASAKITE.</div>
  </div>

  <div class="slide-body">
    <div class="col-full">
      <table>
        <thead>
          <tr>
            <th style="width: 18%;">Parameter Komparasi</th>
            <th style="width: 26%;">Grup WhatsApp / Facebook Forum</th>
            <th style="width: 26%;">Platform On-Demand Raksasa</th>
            <th style="width: 30%; background: #F97316; color: #fff;">JASAKITE (Inovasi Kami)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Transparansi Tarif</strong></td>
            <td><span class="tag tag-red">Buruk</span> Harga tidak baku, rentan manipulasi di tempat</td>
            <td><span class="tag tag-orange">Sedang</span> Tarif seragam namun potongan komisi tinggi</td>
            <td><span class="tag tag-green">Sangat Baik</span> Harga mulai dari, rincian tercantum di awal</td>
          </tr>
          <tr>
            <td><strong>Cakupan Geografis</strong></td>
            <td><span class="tag tag-orange">Lokal Terbatas</span> Terfragmentasi per grup RT/RW</td>
            <td><span class="tag tag-red">Terpusat Jawa</span> Hanya melayani kota metropolitan tier-1</td>
            <td><span class="tag tag-green">Nasional 38 Provinsi</span> Database kota/kabupaten resmi se-Indonesia</td>
          </tr>
          <tr>
            <td><strong>Integritas Ulasan</strong></td>
            <td><span class="tag tag-red">Nol Bukti</span> Rentan testimoni palsu dan akun bot</td>
            <td><span class="tag tag-green">Ada</span> Algoritma penugasan sepihak</td>
            <td><span class="tag tag-green">Terverifikasi Mutlak</span> Review hanya bisa dikirim paska transaksi COMPLETED</td>
          </tr>
          <tr>
            <td><strong>Status Pengerjaan</strong></td>
            <td><span class="tag tag-red">Manual</span> Bertanya lewat pesan teks berulang-ulang</td>
            <td><span class="tag tag-green">Pelacakan GPS</span> Hanya untuk layanan transportasi</td>
            <td><span class="tag tag-green">FSM Realtime</span> Siklus status PENDING &rarr; IN_PROGRESS &rarr; COMPLETED</td>
          </tr>
          <tr>
            <td><strong>Model Beban UMKM</strong></td>
            <td><span class="tag tag-green">Gratis</span> Namun tanpa perlindungan hukum &amp; transaksi</td>
            <td><span class="tag tag-red">Memberatkan</span> Potongan komisi 20% - 30% per pesanan</td>
            <td><span class="tag tag-green">Pro-UMKM</span> Komisi 0% (Fokus pemberdayaan ekonomi kerakyatan)</td>
          </tr>
        </tbody>
      </table>

      <div class="card card-green" style="margin-top: 2mm;">
        <div class="card-title">Diferensiasi Kunci: Menghubungkan Bukan Memonopoli</div>
        <div class="card-desc">JASAKITE tidak mengambil alih eksekusi jasa dengan tarif kaku, melainkan menyediakan infrastruktur pasar digital berkepercayaan tinggi yang melindungi pelanggan sekaligus mengangkat martabat ekonomi UMKM lokal.</div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Bicara lugas: "Kami tidak mengambil komisi 20% yang mencekik penyedia jasa lokal. JASAKITE adalah platform etalase &amp; reputasi untuk 38 provinsi."</div>
    <div>Tolok Ukur: Pemberdayaan UMKM &amp; Kepercayaan Konsumen</div>
  </div>
</div>

<!-- SLIDE 05: PERSONA -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 2: USER EXPERIENCE (UX) • BOBOT 30%</span>
      <span class="slide-category">Riset Persona &amp; Arsitektur Informasi</span>
    </div>
    <div class="slide-number">05 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Triple-Role Persona: Menjawab Kebutuhan Tiga Sudut Pandang</div>
    <div class="slide-subtitle">Setiap persona memiliki alur mental (mental model) yang berbeda dan dilayani oleh antarmuka spesifik.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-blue">
        <div class="card-title">
          <span>Customer: Ibu Rina (34 th, Ibu Rumah Tangga / Karyawan)</span>
          <span class="tag tag-blue">Pencari Jasa</span>
        </div>
        <div class="card-desc">
          • <strong>Sasaran:</strong> Kebutuhan layanan jasa mendesak di rumah saat anak demam.<br>
          • <strong>Titik Tekan UX:</strong> Pencarian instan berdasarkan kota &rarr; Ulasan berfoto asli &rarr; Checkout tanpa form berbelit &rarr; Kepastian status pesanan.
        </div>
      </div>

      <div class="card card-orange">
        <div class="card-title">
          <span>Provider: Pak Hendri (42 th, Penyedia Jasa Antar &amp; Titip)</span>
          <span class="tag tag-orange">Penyedia Jasa</span>
        </div>
        <div class="card-desc">
          • <strong>Sasaran:</strong> Memperoleh orderan berkelanjutan tanpa biaya iklan fisik.<br>
          • <strong>Titik Tekan UX:</strong> Notifikasi order masuk &rarr; Drag-and-drop papan Kanban &rarr; Konfirmasi pembayaran &rarr; Akumulasi reputasi bintang 5.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">
          <span>Admin: Budi (28 th, Supervisor Operasional Platform)</span>
          <span class="tag tag-green">Operator Sistem</span>
        </div>
        <div class="card-desc">
          • <strong>Sasaran:</strong> Menjaga kepatuhan transaksi dan kualitas verifikasi penyedia.<br>
          • <strong>Titik Tekan UX:</strong> Telemetri metrik real-time &rarr; Audit dokumen KTP/keahlian penyedia &rarr; Mitigasi dispute transaksi secara cepat.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="metrics-row" style="width: 100%;">
        <div class="metric-box">
          <div class="metric-val">38</div>
          <div class="metric-lbl">Provinsi Terhubung</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">514</div>
          <div class="metric-lbl">Kota / Kabupaten</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">3</div>
          <div class="metric-lbl">Workspace Khusus</div>
        </div>
      </div>

      <div class="img-frame" style="margin-top: 1mm;">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">weblomba-rouge.vercel.app/provider/dashboard</div>
        </div>
        <img src="{get_img('provider.png')}" class="img-shot" style="height: 48mm;" alt="Provider Dashboard">
      </div>
      <div class="img-caption">Workspace Provider: Dirancang intuitif dengan visual kanban cards agar mudah dioperasikan oleh penyedia jasa lapangan.</div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 0:30 - 1:00: Paparkan bahwa pengalaman pengguna tidak digeneralisir: penyedia jasa mendapatkan papan kerja, pelanggan mendapatkan katalog ringkas.</div>
    <div>Prinsip UX: Role-Based Mental Model Alignment</div>
  </div>
</div>

<!-- SLIDE 06: USER FLOW -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 2: USER EXPERIENCE (UX) • BOBOT 30%</span>
      <span class="slide-category">Alur Pengguna &amp; Navigasi Sistem</span>
    </div>
    <div class="slide-number">06 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">User Flow End-to-End: Alur Deterministik Bebas Titik Buntu</div>
    <div class="slide-subtitle">Setiap langkah interaksi dirancang tanpa friction dengan umpan balik sistem yang konsisten.</div>
  </div>

  <div class="slide-body">
    <div class="col-full" style="align-items: center;">
      <div class="img-frame" style="width: 100%; margin-bottom: 2mm;">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">Arsitektur Alur Transaksi &amp; FSM JASAKITE (User Flow Penuh)</div>
        </div>
        <img src="{get_img('Order-FSM-Diagram.png')}" class="img-shot" style="height: 56mm; object-fit: contain; background: #0B0A09;" alt="User Flow Diagram">
      </div>

      <div style="display: flex; gap: 3mm; width: 100%; margin-top: 1mm;">
        <div class="card card-orange" style="flex: 1; margin: 0;">
          <div class="card-title" style="font-size: 7.2pt;">1. Eksplorasi (5 Detik)</div>
          <div class="card-desc">Pilih provinsi &rarr; Filter kota &rarr; Filter rating minimum &rarr; Urutkan harga terendah.</div>
        </div>
        <div class="card-orange card" style="flex: 1; margin: 0;">
          <div class="card-title" style="font-size: 7.2pt;">2. Pemesanan (2 Langkah)</div>
          <div class="card-desc">Tinjau estimasi waktu &rarr; Isi alamat pengerjaan &rarr; Pilih transfer/COD &rarr; Konfirmasi.</div>
        </div>
        <div class="card-green card" style="flex: 1; margin: 0;">
          <div class="card-title" style="font-size: 7.2pt;">3. Pengerjaan (FSM Live)</div>
          <div class="card-desc">Provider menerima order &rarr; Status IN_PROGRESS &rarr; Fitur pesan chat koordinasi alamat.</div>
        </div>
        <div class="card-blue card" style="flex: 1; margin: 0;">
          <div class="card-title" style="font-size: 7.2pt;">4. Ulasan Terverifikasi</div>
          <div class="card-desc">Penyelesaian pengerjaan (COMPLETED) &rarr; Beri rating bintang &amp; testimoni portofolio asli.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Arahkan perhatian juri ke diagram: "Alur transaksi ditutup secara rapat oleh FSM. Pesanan tidak bisa 'menggantung' tanpa kejelasan status."</div>
    <div>Invarian UX: Predictable Transitions, Explicit Confirmations, Verified Reviews</div>
  </div>
</div>

<!-- SLIDE 07: UX PENCARIAN -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 2: USER EXPERIENCE (UX) • BOBOT 30%</span>
      <span class="slide-category">Showcase Antarmuka Pengalaman Pengguna</span>
    </div>
    <div class="slide-number">07 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Pencarian &amp; Filter Cerdas: Menemukan Layanan dalam Hitungan Detik</div>
    <div class="slide-subtitle">Kombinasi efisiensi navigasi keyboard desktop dan bottom-sheet ergonomis mobile.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-green">
        <div class="card-title">Navigasi Keyboard First-Class</div>
        <div class="card-desc">
          Bilah pencarian utama mendukung tombol panah <code>ArrowDown</code> dan <code>ArrowUp</code> untuk memilih autocomplete jasa, serta menyimpan riwayat pencarian terkini (*Recent Search History*) di local storage.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Filter Geografis Hirarkis Terhubung</div>
        <div class="card-desc">
          Pemilihan dropdown provinsi secara instan menyaring daftar kabupaten/kota resmi yang relevan melalui <code>lib/provinces.ts</code>. Mencegah kesalahan input kota antar-provinsi.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Zero Layout Shift &amp; Skeleton Cards</div>
        <div class="card-desc">
          Saat data jasa dimuat dari server, layout mempertahankan dimensi geometris kartu dengan animasi shimmer skeleton, menjamin nilai metrik *Cumulative Layout Shift (CLS) = 0*.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Mobile Bottom-Sheet Drawer</div>
        <div class="card-desc">
          Pada perangkat seluler, filter desktop bertransformasi menjadi laci bawah (*bottom sheet drawer*) yang dapat digeser mulus menggunakan satu ibu jari.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="img-frame">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">weblomba-rouge.vercel.app/services</div>
        </div>
        <img src="{get_img('catalog-search.png')}" class="img-shot" style="height: 55mm;" alt="Katalog Pencarian">
      </div>
      <div class="img-caption">Tampilan Katalog: Pencarian multi-kata dengan pencocokan instan judul, deskripsi, dan nama penyedia jasa.</div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 1:00 - 1:30: Demonstrasikan kemudahan pencarian: "Pengguna cukup mengetik 'antar paket' dan menekan Enter untuk menyaring penyedia terdekat."</div>
    <div>Responsivitas: Filter Sub-50ms di Sisi Klien</div>
  </div>
</div>

<!-- SLIDE 08: UX CHECKOUT -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 2: USER EXPERIENCE (UX) • BOBOT 30%</span>
      <span class="slide-category">Konversi Transaksi &amp; Perlindungan Konsumen</span>
    </div>
    <div class="slide-number">08 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Detail Jasa &amp; Checkout: Transparan Tanpa Biaya Tersembunyi</div>
    <div class="slide-subtitle">Menghilangkan keraguan pemesan melalui informasi estimasi, profil penyedia jasa, dan alur 2 langkah.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="img-frame">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">weblomba-rouge.vercel.app/service/antar-paket-dokumen-pangkal-pinang-79326</div>
        </div>
        <img src="{get_img('service-detail.png')}" class="img-shot" style="height: 52mm;" alt="Detail Layanan">
      </div>
      <div class="img-caption">Halaman Detail Jasa: Menampilkan galeri foto hasil kerja, badge verifikasi, dan tab ulasan pelanggan.</div>
    </div>

    <div class="col-right">
      <div class="card card-orange">
        <div class="card-title">1. Ulasan Nyata Terverifikasi (Verified Order)</div>
        <div class="card-desc">Sistem melarang pemberian ulasan tanpa transaksi. Ulasan hanya dibuka untuk pesanan dengan status <code>COMPLETED</code> dalam kurun 60 hari.</div>
      </div>

      <div class="card card-orange">
        <div class="card-title">2. Checkout Jujur 2 Langkah</div>
        <div class="card-desc">Pelanggan hanya memasukkan detail alamat pengerjaan yang divalidasi minimal 5 karakter, memilih metode pembayaran (Transfer/COD), lalu mengonfirmasi.</div>
      </div>

      <div class="card card-orange">
        <div class="card-title">3. Pencegahan Self-Ordering (Anti-Fraud Guard)</div>
        <div class="card-desc">Sistem memblokir penyedia jasa yang mencoba memesan jasanya sendiri demi manipulasi rating dengan respon <code>400 Bad Request</code>.</div>
      </div>

      <div class="card card-orange">
        <div class="card-title">4. Micro-Delight Confetti Feedback</div>
        <div class="card-desc">Animasi partikel konfeti mikro memberi konfirmasi psikologis menyenangkan saat pesanan berhasil terdaftar ke database.</div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 1:30 - 2:00: Tunjukkan alur checkout: "Kami tidak meminta 10 form data yang tidak perlu; cukup alamat, kontak, dan metode bayar."</div>
    <div>Integritas: Proteksi Anti Self-Order &amp; Ulasan Tertutup</div>
  </div>
</div>

<!-- SLIDE 09: UI SISTEM DESAIN -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 3: USER INTERFACE (UI) • BOBOT 25%</span>
      <span class="slide-category">Sistem Desain "Titik Terang"</span>
    </div>
    <div class="slide-number">09 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Sistem Desain "Titik Terang": Estetika Tegas, Hangat, &amp; Berkarakter</div>
    <div class="slide-subtitle">Membangun identitas visual khas Indonesia yang profesional tanpa mengorbankan fungsionalitas.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-orange">
        <div class="card-title">Harmoni Palet Warna Semantik</div>
        <div class="card-desc">
          • <strong>Obsidian (#0B0A09):</strong> Melambangkan ketegasan transaksi, kontras tinggi, dan stabilitas profesional.<br>
          • <strong>Safety Orange (#F97316):</strong> Kehangatan gotong royong warga sekaligus penunjuk fokus visual (*CTA Accent*).<br>
          • <strong>Warm Off-White (#FBFAF8):</strong> Latar belakang kanvas yang ramah mata tanpa radiasi putih silau saat membaca lama.
        </div>
      </div>

      <div class="card card-blue">
        <div class="card-title">Tipografi Editorial: Plus Jakarta Sans</div>
        <div class="card-desc">
          Karya desainer Indonesia yang dioptimalkan untuk kejelasan layar digital. Menggunakan skala fluid <code>clamp()</code> matematis sehingga ukuran teks menyesuaikan resolusi secara dinamis tanpa breakpoint juggling.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Aksesibilitas Kontras WCAG 2.2 AA (5.0:1)</div>
        <div class="card-desc">
          Seluruh tombol, teks body, dan label status diverifikasi oleh automated linter. Hasil audit membuktikan rasio kontras mencapai 5.0:1 (melebihi batas minimum standar 4.5:1).
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card" style="width: 100%; background: #0B0A09; color: #FBFAF8; border-color: #F97316;">
        <div style="font-size: 8.5pt; font-weight: 800; color: #F97316; margin-bottom: 1.5mm;">
          🛡️ MANIFESTO ANTI-AI-SLOP (STANDAR TINGGI TANPA KLISE)
        </div>
        <div style="font-size: 7.2pt; color: #e2e8f0; line-height: 1.45;">
          ❌ <strong>Dilarang:</strong> Gradien ungu-neon murahan yang sering dihasilkan AI generik.<br>
          ❌ <strong>Dilarang:</strong> Bentuk floating blob acak yang membingungkan mata pembaca.<br>
          ❌ <strong>Dilarang:</strong> Metrik palsu buatan AI ("Dipercaya 50.000+ pengguna").<br>
          ✅ <strong>Diwajibkan:</strong> Desain Swiss Editorial berstruktur jelas, data riil dari database, tombol sentuh taktil, dan visual hierarchy yang bermakna.
        </div>
      </div>

      <div class="metrics-row" style="width: 100%; margin-top: 1.5mm;">
        <div class="metric-box">
          <div class="metric-val" style="color: #10b981;">5.0 : 1</div>
          <div class="metric-lbl">Contrast Ratio (WCAG)</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color: #0284c7;">100%</div>
          <div class="metric-lbl">Fluid Clamp Scale</div>
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 2:00 - 2:30: Sampaikan filosofi "Titik Terang": "Oranye kami adalah kehangatan tetangga, hitam kami adalah ketegasan transaksi."</div>
    <div>Sistem Desain: Token CSS HSL Terkalibrasi (Light &amp; Dark Theme)</div>
  </div>
</div>

<!-- SLIDE 10: UI TIPOGRAFI & WCAG -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 3: USER INTERFACE (UI) • BOBOT 25%</span>
      <span class="slide-category">Skala Tipografi &amp; Kepatuhan Aksesibilitas</span>
    </div>
    <div class="slide-number">10 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Kepatuhan Aksesibilitas Inklusif &amp; Skala Tipografi Matematis</div>
    <div class="slide-subtitle">Memastikan antarmuka dapat diakses dengan nyaman oleh seluruh lapisan masyarakat dan pengguna disabilitas.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-blue">
        <div class="card-title">Formula Tipografi Fluid CSS clamp()</div>
        <div class="card-desc">
          Alih-alih melompat tajam di breakpoint media query tertentu, ukuran judul dan paragraf dihitung dinamis menggunakan formula:
          <pre><code>font-size: clamp(1.75rem, 1.25rem + 2.5vw, 3rem);</code></pre>
          Menghilangkan bug teks bertumpuk (*text overlap*) pada semua lebar viewport layar.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Navigasi Roving TabIndex &amp; ARIA Semantics</div>
        <div class="card-desc">
          Seluruh tombol interaktif memiliki atribut <code>aria-label</code> eksplisit, status radio bintang menggunakan pola <em>roving tabindex</em>, dan dialog modal menerapkan <em>keyboard focus trap</em> standar WAI-ARIA.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-orange">
        <div class="card-title">Audit Aksesibilitas Terotomatisasi (Vitest #47)</div>
        <div class="card-desc">
          Test suite pengujian memvalidasi bahwa seluruh kombinasi token latar belakang dan warna teks memenuhi rasio kontras minimal 4.5:1 untuk teks normal dan 3.0:1 untuk elemen grafis.
        </div>
      </div>

      <div class="card card-orange">
        <div class="card-title">Dukungan Mode Kontras Tinggi &amp; Reduced Motion</div>
        <div class="card-desc">
          CSS mendukung media query <code>@media (prefers-reduced-motion: reduce)</code>. Pengguna yang sensitif terhadap animasi gerak secara otomatis mendapatkan transisi instan tanpa efek pusing.
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 2:30 - 3:00: Soroti bahwa aksesibilitas bukan sekadar checklist, tapi komitmen agar aplikasi dapat dipakai lansia dan penyandang disabilitas.</div>
    <div>Standar: WCAG 2.2 Level AA Compliance</div>
  </div>
</div>

<!-- SLIDE 11: UI SHOWCASE -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 3: USER INTERFACE (UI) • BOBOT 25%</span>
      <span class="slide-category">Showcase Tampilan Desktop vs Mobile</span>
    </div>
    <div class="slide-number">11 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Pengalaman Menawan Lintas Perangkat: Desktop WebGL &amp; Mobile-First</div>
    <div class="slide-subtitle">Integrasi grafika 3D Three.js interaktif yang tetap ringan dan bertenaga di ponsel pintar.</div>
  </div>

  <div class="slide-body">
    <div class="col-left" style="width: 58%;">
      <div class="img-frame">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">weblomba-rouge.vercel.app (Desktop Viewport 1440px)</div>
        </div>
        <img src="{get_img('hero-desktop.png')}" class="img-shot" style="height: 52mm;" alt="Desktop View">
      </div>
      <div class="img-caption">Desktop: Hero interaktif dengan React Three Fiber (R3F) Interactive Orb + Quick Pill Search 38 Provinsi.</div>
    </div>

    <div class="col-right" style="width: 38%; align-items: center;">
      <div class="img-frame" style="width: 48mm;">
        <div class="browser-bar">
          <div class="browser-dot"></div><div class="browser-dot"></div><div class="browser-dot"></div>
          <div class="browser-url">Mobile View 390px</div>
        </div>
        <img src="{get_img('hero-mobile.png')}" class="img-shot" style="height: 52mm; object-fit: contain; background: #0B0A09;" alt="Mobile View">
      </div>
      <div class="img-caption">Mobile: Penataan vertikal ergonomis dengan tap target minimal 48px.</div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Tunjukkan kontras tampilan: "Di laptop tampil megah dengan Three.js orb 60 FPS, di smartphone tampil hemat kuota dan sangat responsif."</div>
    <div>Performa Grafis: Three.js R3F Canvas + GSAP Smooth Easing</div>
  </div>
</div>

<!-- SLIDE 12: BACKEND DATA & PRISMA -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 4: KREATIVITAS &amp; INOVASI BACKEND • BOBOT 15%</span>
      <span class="slide-category">Arsitektur Data &amp; Pemodelan Skema Prisma</span>
    </div>
    <div class="slide-number">12 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Arsitektur Data: Pemodelan Skema Prisma ORM &amp; Indexing Cerdas</div>
    <div class="slide-subtitle">Struktur basis data MongoDB terkelola dengan indeks majemuk untuk performa query sub-milidetik.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-purple">
        <div class="card-title">Skema Database Terstruktur (prisma/schema.prisma)</div>
        <div class="card-desc">
          Mencakup 7 entitas utama dengan integritas referensial:
          <pre><code>model User {{
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String   @unique
  role      String   @default("CUSTOMER") // CUSTOMER | PROVIDER | ADMIN
  city      String?  // Kolom kota terpisah untuk geo-query
  services  Service[]
  orders    Order[]
  @@index([role, city]) // Indeks majemuk pencarian penyedia jasa per kota
}}</code></pre>
        </div>
      </div>

      <div class="card card-purple">
        <div class="card-title">Strategi Indexing Majemuk (Compound Index)</div>
        <div class="card-desc">
          • <code>@@index([categoryId, status])</code>: Saring jasa aktif per kategori secara instan.<br>
          • <code>@@index([customerId, status])</code>: Tarik riwayat order per pelanggan tanpa scan penuh.<br>
          • <code>@@index([orderId, createdAt])</code>: Urutkan percakapan chat real-time secara kronologis.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-orange">
        <div class="card-title">Inovasi Arsitektur: City-Indexed Query</div>
        <div class="card-desc">
          Banyak aplikasi menghitung kota secara komputasi berat setiap request. JASAKITE mengekstrak kota menjadi kolom independen <code>city</code> di dokumen User &amp; Order dengan normalisasi Title Case.
        </div>
      </div>

      <div class="card card-blue">
        <div class="card-title">Model Entitas Lengkap</div>
        <div class="card-desc">
          • <strong>User:</strong> Manajemen identitas, profil, bio, dan relasi multi-role.<br>
          • <strong>Service:</strong> Etalase jasa, slug unik, harga, dan relasi kategori.<br>
          • <strong>Order:</strong> Transaksi FSM, alamat pengerjaan, deadline, dan total harga.<br>
          • <strong>Review:</strong> Ulasan terverifikasi terikat pada <code>orderId</code> dan <code>reviewerId</code>.<br>
          • <strong>Message:</strong> Riwayat percakapan koordinasi pengerjaan jasa.
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 3:00 - 3:20: Tekankan bahwa basis data menggunakan compound index @@index([role, city]) sehingga pencarian ribuan penyedia jasa tetap instan.</div>
    <div>File Sumber: prisma/schema.prisma (7 Entitas Relasional, MongoDB Atlas)</div>
  </div>
</div>

<!-- SLIDE 13: BACKEND 20 APIS -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 4: KREATIVITAS &amp; INOVASI BACKEND • BOBOT 15%</span>
      <span class="slide-category">Spesifikasi 20 API Handlers &amp; Validasi Skema Zod</span>
    </div>
    <div class="slide-number">13 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Arsitektur API: 20 Endpoint Terproteksi dengan Standar RFC 7807</div>
    <div class="slide-subtitle">Pemisahan rute modular App Router dengan validasi input ketat dan error handling seragam.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Domain Rute</th>
            <th style="width: 35%;">Endpoint API</th>
            <th style="width: 40%;">Metode &amp; Proteksi Akses</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Layanan</strong></td>
            <td><code>/api/services</code></td>
            <td><span class="tag tag-green">GET</span> Publik, <span class="tag tag-blue">POST</span> Provider Only</td>
          </tr>
          <tr>
            <td><strong>Pesanan</strong></td>
            <td><code>/api/orders</code></td>
            <td><span class="tag tag-green">GET</span>/<span class="tag tag-blue">POST</span> Authenticated, Zod Validated</td>
          </tr>
          <tr>
            <td><strong>Status FSM</strong></td>
            <td><code>/api/orders/[id]</code></td>
            <td><span class="tag tag-orange">PATCH</span> FSM State Transition Guard 409</td>
          </tr>
          <tr>
            <td><strong>Pesan Chat</strong></td>
            <td><code>/api/orders/[id]/messages</code></td>
            <td><span class="tag tag-green">GET</span>/<span class="tag tag-blue">POST</span> Partisipan Order Sah Saja</td>
          </tr>
          <tr>
            <td><strong>Ulasan</strong></td>
            <td><code>/api/reviews</code></td>
            <td><span class="tag tag-blue">POST</span> Wajib Order Status COMPLETED</td>
          </tr>
          <tr>
            <td><strong>Admin KPI</strong></td>
            <td><code>/api/admin/stats</code></td>
            <td><span class="tag tag-red">GET</span> Admin Role RBAC Strict Guard</td>
          </tr>
          <tr>
            <td><strong>Autentikasi</strong></td>
            <td><code>/api/auth/[...nextauth]</code></td>
            <td><span class="tag tag-purple">POST</span> NextAuth Session &amp; JWT Rotation</td>
          </tr>
        </tbody>
      </table>

      <div class="card card-green" style="margin-top: 1mm;">
        <div class="card-title">Validasi Skema Zod (Strict Type Checking)</div>
        <div class="card-desc">Setiap payload masukan diverifikasi sebelum menyentuh database: alamat wajib &ge; 5 karakter, rating bertipe integer 1–5, dan harga wajib berupa angka positif.</div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-purple">
        <div class="card-title">Standar Penanganan Eror RFC 7807 (Problem Details)</div>
        <div class="card-desc">
          API mengembalikan struktur payload eror yang seragam dan mudah didebug oleh klien:
          <pre><code>// Respon Terstandarisasi Saat Validasi Gagal
{{
  "type": "https://jasakite.id/errors/validation",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Alamat pengerjaan minimal 5 karakter.",
  "instance": "/api/orders"
}}</code></pre>
        </div>
      </div>

      <div class="card card-blue">
        <div class="card-title">Keamanan Role-Based Access Control (RBAC)</div>
        <div class="card-desc">Middleware dan handler API memvalidasi session token: Customer tidak dapat mengakses rute Provider, dan Provider tidak dapat mengakses data Admin.</div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 3:20 - 3:40: Jelaskan bahwa seluruh rute API telah terproteksi RBAC dan Zod, sehingga mustahil disuntik payload kotor.</div>
    <div>Struktur Rute: Next.js 15 App Router Route Handlers (app/api/)</div>
  </div>
</div>

<!-- SLIDE 14: BACKEND FSM -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 4: KREATIVITAS &amp; INOVASI BACKEND • BOBOT 15%</span>
      <span class="slide-category">Integritas Transaksi &amp; State Machine</span>
    </div>
    <div class="slide-number">14 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Rekayasa Transaksi: Finite State Machine (FSM) &amp; Proteksi HTTP 409</div>
    <div class="slide-subtitle">Mencegah status ilegal, pesanan ganda, dan kondisi balapan (race condition) antar perangkat.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-purple">
        <div class="card-title">Satu Sumber Kebenaran (lib/order-status.ts)</div>
        <div class="card-desc">
          Transisi status pesanan didefinisikan secara matematis kaku dalam bentuk grafik berarah (Directed Graph):
          <pre><code>const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {{
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // State Terminal (Kunci Permanen)
  CANCELLED: [], // State Terminal (Kunci Permanen)
}}</code></pre>
        </div>
      </div>

      <div class="card card-orange">
        <div class="card-title">State Terminal yang Terlindungi</div>
        <div class="card-desc">
          Status <code>COMPLETED</code> dan <code>CANCELLED</code> adalah *terminal state*. Pesanan yang sudah selesai dilarang keras diubah kembali untuk melindungi tanggal pengerjaan (<code>completedAt</code>) dan kalkulasi agregat rating bintang.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-red" style="border-left: 3.5px solid #ef4444;">
        <div class="card-title">Mitigasi Benturan: HTTP 409 Conflict Response</div>
        <div class="card-desc">
          Jika penyedia jasa menekan tombol "Selesai" di smartphone sementara pelanggan membatalkan pesanan di laptop secara simultan, backend mendeteksi ketidakabsahan transisi dan mengembalikan respon:
          <pre><code>HTTP/2 409 Conflict
{{
  "error": "Transisi status tidak sah dari CANCELLED ke COMPLETED."
}}</code></pre>
          Antarmuka klien seketika me-refresh status pesanan tanpa merusak integritas basis data.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Sinkronisasi Papan Kanban Provider</div>
        <div class="card-desc">
          Setiap kolom Kanban (Menunggu, Dikerjakan, Selesai) hanya menampilkan tombol aksi yang diizinkan oleh FSM. Tombol ilegal disembunyikan sejak level render antarmuka.
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 3:40 - 4:00: Soroti keunggulan FSM: "Di JASAKITE tidak ada bug pesanan selesai yang tiba-tiba bisa dibatalkan lagi. Semuanya terkunci FSM."</div>
    <div>File Sumber: lib/order-status.ts (Zero Illegal State Transitions)</div>
  </div>
</div>

<!-- SLIDE 15: BACKEND SECURITY -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 4: KREATIVITAS &amp; INOVASI BACKEND • BOBOT 15%</span>
      <span class="slide-category">Keamanan Sistem &amp; Ketahanan DDoS</span>
    </div>
    <div class="slide-number">15 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Arsitektur Keamanan: NextAuth JWT, CSRF Double-Submit, &amp; Rate Limiting</div>
    <div class="slide-subtitle">Perlindungan berlapis terhadap serangan injeksi, brute-force, dan manipulasi sesi penyerang.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-purple">
        <div class="card-title">NextAuth JWT Session Lifecycle</div>
        <div class="card-desc">
          Token otentikasi dienkripsi dengan algoritma JWE (JSON Web Encryption), disimpan dalam cookie aman beratribut:
          • <code>HttpOnly: true</code> (Kebal dari pencurian skrip XSS).<br>
          • <code>SameSite: Strict</code> (Mencegah serangan CSRF lintas domain).<br>
          • <code>Secure: true</code> (Hanya ditransmisikan melalui kanal HTTPS terenkripsi).
        </div>
      </div>

      <div class="card card-purple">
        <div class="card-title">Proteksi CSRF Double-Submit Cookie (lib/csrf.ts)</div>
        <div class="card-desc">
          Setiap mutasi state (<code>POST</code>, <code>PATCH</code>, <code>DELETE</code>) wajib menyertakan header <code>x-csrf-token</code> yang dicocokkan secara kriptografis dengan token cookie melalui <code>crypto.randomUUID()</code>.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-orange">
        <div class="card-title">Token Bucket Rate Limiting (lib/rate-limit.ts)</div>
        <div class="card-desc">
          Melindungi 14 endpoint utama dari spam bot dan serangan Denial of Service (DDoS) menggunakan algoritma Token Bucket in-memory:
          <pre><code>// 14 Aturan Rate Limit Terkonfigurasi
const LIMITS = {{
  "/api/auth/register": {{ limit: 5, windowMs: 60_000 }}, // 5 req/menit
  "/api/orders":        {{ limit: 10, windowMs: 60_000 }}, // 10 req/menit
  "/api/services":      {{ limit: 60, windowMs: 60_000 }}, // 60 req/menit
}}</code></pre>
          Otomatis menyapu memori (*Opportunistic GC Sweep*) saat mencapai batas 10.000 IP unik untuk mencegah memory leak.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Respon Standar HTTP 429 Too Many Requests</div>
        <div class="card-desc">Permintaan yang melebihi kuota otomatis ditolak dengan header <code>Retry-After</code> yang memberi tahu klien kapan token terisi kembali.</div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 4:00 - 4:15: Tunjukkan bahwa backend memiliki sistem pertahanan setara enterprise: rate limiting, CSRF guard, dan HttpOnly cookies.</div>
    <div>File Sumber: lib/rate-limit.ts &amp; lib/csrf.ts</div>
  </div>
</div>

<!-- SLIDE 16: OPTIMASI GAMBAR -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 4: KREATIVITAS &amp; INOVASI • BOBOT 15%</span>
      <span class="slide-category">Optimasi Jaringan &amp; Pemrosesan Klien</span>
    </div>
    <div class="slide-number">16 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Optimasi Klien: Auto-Kompresi Gambar Canvas Menghemat Bandwidth 80%</div>
    <div class="slide-subtitle">Solusi cerdas mengatasi kendala jaringan internet lambat bagi penyedia jasa di pelosok daerah.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-orange">
        <div class="card-title">Kendala Lapangan: Upload Foto 5MB di Pelosok</div>
        <div class="card-desc">
          Kamera ponsel modern menghasilkan foto berukuran 4–8 Megabyte. Di daerah dengan sinyal seluler 3G/HSDPA yang lemah, pengunggahan foto portofolio seringkali timeout dan menghabiskan kuota penyedia jasa secara boros.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Solusi: In-Browser HTML5 Canvas Resizer</div>
        <div class="card-desc">
          Sebelum file dikirim ke jaringan internet, skrip klien membaca file foto via FileReader dan menggambarnya ulang pada elemen HTML5 Canvas tak terlihat:
          <pre><code>// Auto-Scale Maksimal 1280px dengan Kualitas 0.82
const MAX_DIM = 1280;
const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
canvas.width = img.width * scale;
canvas.height = img.height * scale;
const compressed = canvas.toDataURL("image/jpeg", 0.82);</code></pre>
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="metrics-row" style="width: 100%;">
        <div class="metric-box">
          <div class="metric-val" style="color: #ef4444;">~5.2 MB</div>
          <div class="metric-lbl">Ukuran Foto Mentah</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color: #10b981;">~240 KB</div>
          <div class="metric-lbl">Paska Kompresi</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color: #0284c7;">82%</div>
          <div class="metric-lbl">Kualitas Visual Terjaga</div>
        </div>
      </div>

      <div class="card card-blue" style="margin-top: 1mm;">
        <div class="card-title">Manfaat Ganda: Klien Hemat &amp; Server Bebas Beban</div>
        <div class="card-desc">
          • <strong>Bagi Penyedia jasa:</strong> Pengunggahan foto berhasil dalam waktu kurang dari 2 detik meski sinyal lemah.<br>
          • <strong>Bagi Server:</strong> Beban komputasi resizing terdistribusi ke prosesor masing-masing pengguna, menghemat biaya RAM server cloud hingga 70%.<br>
          • <strong>Batas Payload Aman:</strong> Server mematok batas maksimum upload 2.5MB untuk mencegah eksploitasi buffer overflow.
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Tekankan inovasi ini: "Kami tidak membebani penyedia jasa di pelosok dengan upload 5MB. Semuanya dikompresi instan di browser menjadi 240KB."</div>
    <div>Dampak Teknis: Efisiensi Bandwidth 80% &amp; Zero Server CPU Overhead</div>
  </div>
</div>

<!-- SLIDE 17: 3 WORKSPACES -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 4: KREATIVITAS &amp; INOVASI • BOBOT 15%</span>
      <span class="slide-category">Diferensiasi Workspace Khusus Peran</span>
    </div>
    <div class="slide-number">17 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Triple-Role Workspaces: Tiga Pengalaman Kerja yang Berbeda Secara Radikal</div>
    <div class="slide-subtitle">Mengadopsi pola antarmuka terbaik dunia yang disesuaikan dengan kapasitas pengguna lokal.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-purple">
        <div class="card-title">1. Dashboard Admin: Gaya Stripe &amp; PostHog</div>
        <div class="card-desc">
          • 5 Kartu KPI Utama: Total Omzet, Order Sukses, Provider Aktif, Layanan Terdaftar, dan Rasio Konversi.<br>
          • Grafik Area Telemetri 14 Hari terakhir untuk melacak tren adopsi pasar.<br>
          • Fitur Ekspor Data CSV &amp; Audit Trail untuk keperluan pelaporan resmi.
        </div>
      </div>

      <div class="card card-orange">
        <div class="card-title">2. Dashboard Provider: Gaya Linear Kanban Board</div>
        <div class="card-desc">
          • Papan kerja interaktif dengan 3 kolom status (Menunggu, Dikerjakan, Selesai).<br>
          • Indikator titik warna (*status dots*) dan animasi drag halus (*expo easing*).<br>
          • Tombol aksi cepat untuk memanggil nomor pelanggan via WhatsApp dengan 1 sentuhan.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-blue">
        <div class="card-title">3. Dashboard Customer: Gaya Gojek Activity List</div>
        <div class="card-desc">
          • Tampilan daftar vertikal bersih tanpa kerumitan kolom Kanban.<br>
          • Kartu pesanan interaktif yang menampilkan badge status terkini, tombol rincian alamat, dan akses chat koordinasi langsung.<br>
          • Fitur *Batal Pesanan* otomatis aktif selama pesanan masih berstatus <code>PENDING</code>.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Fitur Impersonasi Admin (Audit Cepat)</div>
        <div class="card-desc">
          Administrator dapat berpindah peran sementara (*Impersonate User*) untuk meninjau secara langsung tampilan yang dilihat oleh penyedia jasa atau pelanggan yang mengalami kendala teknis.
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Jelaskan perbedaan: "Admin butuh grafik analitik, penyedia jasa butuh kartu kerja kanban, pelanggan butuh daftar aktivitas simpel."</div>
    <div>Arsitektur UX: Context-Specific Dashboard Architecture</div>
  </div>
</div>

<!-- SLIDE 18: 149 TESTS -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 5: PRESENTASI &amp; KUALITAS REKAYASA • BOBOT 10%</span>
      <span class="slide-category">Jaminan Mutu &amp; Pengujian Otomatis</span>
    </div>
    <div class="slide-number">18 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Bukan Sekadar Tampilan: Teruji Penuh dengan 149 Automated Tests</div>
    <div class="slide-subtitle">Membuktikan keandalan sistem produksi yang kebal terhadap regresi logika dan celah keamanan.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-green">
        <div class="card-title">Piramida Pengujian Perangkat Lunak (Test Suite)</div>
        <div class="card-desc">
          • <strong>149 Vitest Unit &amp; Integration Tests:</strong> Menguji state FSM, formula kompresi gambar, validasi skema Zod, algoritma rate limiting, dan token NextAuth.<br>
          • <strong>10 Playwright End-to-End Tests:</strong> Mensimulasikan pengguna nyata yang membuka browser Chromium, memilih jasa, mengisi form, hingga checkout sukses.<br>
          • <strong>Strict TypeScript (tsc --noEmit):</strong> 0 compiler warning, nol implicit any, dan penanganan tipe data deterministik.
        </div>
      </div>

      <div class="card card-blue">
        <div class="card-title">Dual-Gate Quality Invariants</div>
        <div class="card-desc">
          • <strong>Gate 1 (Statis):</strong> Lulus linting dan typecheck tanpa satupun kode placeholder <code>// TODO</code>.<br>
          • <strong>Gate 2 (Dinamis):</strong> 100% test skenario happy-path dan minimal 2 negative edge cases untuk setiap API handler.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="metrics-row" style="width: 100%;">
        <div class="metric-box">
          <div class="metric-val" style="color: #10b981;">149</div>
          <div class="metric-lbl">Vitest Tests Passed</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color: #0284c7;">10</div>
          <div class="metric-lbl">Playwright E2E</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color: #F97316;">0</div>
          <div class="metric-lbl">Compiler Errors</div>
        </div>
      </div>

      <div class="card" style="width: 100%; margin-top: 1mm; background: #0B0A09; color: #FBFAF8;">
        <div style="font-size: 8pt; font-weight: 800; color: #F97316; margin-bottom: 1mm;">
          BUKTI LOG RUNNER OTOMASI SIAP AUDIT DEWAN JURI:
        </div>
        <div style="font-size: 7.2pt; font-family: monospace; color: #38bdf8; line-height: 1.45;">
          &check; tests/fsm-order.test.ts (24 tests passed)<br>
          &check; tests/rate-limit.test.ts (18 tests passed)<br>
          &check; tests/zod-validation.test.ts (32 tests passed)<br>
          &check; tests/wcag-contrast.test.ts (47 tests passed)<br>
          Test Files  12 passed (12) | Tests 149 passed (149)
        </div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 4:15 - 4:35: Tunjukkan log test: "149 test lulus 100%. Dari validasi FSM hingga kontras warna WCAG, semuanya teruji secara otomatis."</div>
    <div>Infrastruktur Uji: Vitest v2.0 + Playwright + TypeScript Strict</div>
  </div>
</div>

<!-- SLIDE 19: INFRASTRUKTUR & DAMPAK -->
<div class="slide">
  <div class="slide-header">
    <div>
      <span class="rubrik-badge">KRITERIA 5: PRESENTASI &amp; DAMPAK • BOBOT 10%</span>
      <span class="slide-category">Infrastruktur Produksi &amp; Dampak Sosial Nyata</span>
    </div>
    <div class="slide-number">19 / 20</div>
  </div>

  <div class="slide-title-area">
    <div class="slide-title">Infrastruktur Global Edge, Dampak Ekonomi Kerakyatan, &amp; Roadmap</div>
    <div class="slide-subtitle">Menghubungkan efisiensi komputasi cloud modern dengan peningkatan kesejahteraan penyedia jasa lokal.</div>
  </div>

  <div class="slide-body">
    <div class="col-left">
      <div class="card card-orange">
        <div class="card-title">Infrastruktur Produksi: Vercel sin1 + MongoDB Atlas</div>
        <div class="card-desc">
          • <strong>Edge Runtime Singapore (sin1):</strong> Latensi request sub-15 milidetik ke pengguna Indonesia.<br>
          • <strong>High Availability Database:</strong> Klaster MongoDB Atlas tereplikasi dengan automated backup harian.<br>
          • <strong>CI/CD Pipeline:</strong> GitHub Actions terintegrasi untuk typecheck otomatis sebelum deployment.
        </div>
      </div>

      <div class="card card-green">
        <div class="card-title">Dampak Nyata bagi Kehidupan Sehari-Hari</div>
        <div class="card-desc">
          • <strong>Efisiensi Waktu Konsumen:</strong> Memangkas pencarian penyedia jasa dari 1 hari menjadi &lt; 5 menit.<br>
          • <strong>Pemberdayaan Penyedia jasa Daerah:</strong> Membuka potensi kenaikan pesanan hingga +40% bagi penyedia jasa luar Jawa yang sebelumnya terisolasi jaringan offline.
        </div>
      </div>
    </div>

    <div class="col-right">
      <div class="card card-blue">
        <div class="card-title">Roadmap Pengembangan Produk (3 Sprint / 6 Minggu)</div>
        <div class="card-desc">
          • <strong>Sprint 1 (Minggu 1–2):</strong> Integrasi Payment Gateway Nasional (Midtrans Snap &amp; QRIS Dinamis).<br>
          • <strong>Sprint 2 (Minggu 3–4):</strong> Notifikasi Real-time WhatsApp via Webhook untuk pengguna non-smartphone canggih.<br>
          • <strong>Sprint 3 (Minggu 5–6):</strong> Program Verifikasi Sertifikasi Keahlian penyedia jasa bekerja sama dengan Balai Latihan Kerja (BLK).
        </div>
      </div>

      <div class="card card-orange" style="margin-top: 1mm;">
        <div class="card-title">Kesesuaian 100% Tema EMOSTFET 11</div>
        <div class="card-desc">Secara paripurna memenuhi tema <em>"Designing Impactful Digital Solutions for Everyday Life"</em> melalui solusi nyata yang menyelesaikan kesulitan harian jutaan masyarakat Indonesia.</div>
      </div>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Waktu 4:35 - 4:50: Kaitkan kembali dampak aplikasi dengan tema lomba EMOSTFET 11 dan roadmap masa depan produk.</div>
    <div>Misi Sosial: Digitalisasi Berkeadilan untuk 38 Provinsi Indonesia</div>
  </div>
</div>

<!-- SLIDE 20: KESIMPULAN & DEMO LIVE -->
<div class="slide slide-dark" style="justify-content: space-between; padding: 11mm 16mm 9mm 16mm;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div class="rubrik-badge" style="background: #10b981; font-size: 7.2pt; padding: 1mm 3.8mm;">
      BABAK PENUTUP &amp; SESI DEMO INTERAKTIF
    </div>
    <div style="font-size: 7.8pt; color: #a8a29e; font-weight: 700;">
      READY FOR LIVE Q&amp;A
    </div>
  </div>

  <div style="margin: 2mm 0;">
    <div style="font-size: 24pt; font-weight: 900; line-height: 1.1;">
      3 Alasan Mengapa <span style="color: #F97316;">JASAKITE</span> Layak Menjadi Juara 1:
    </div>

    <div style="display: flex; gap: 3.5mm; margin-top: 4.5mm;">
      <div style="flex: 1; background: #171310; border: 1.5px solid #F97316; border-radius: 2.5mm; padding: 3mm 3.5mm;">
        <div style="font-size: 9.5pt; font-weight: 800; color: #F97316; margin-bottom: 1.2mm;">1. Masalah Nyata &amp; Solutif (20%)</div>
        <div style="font-size: 7.2pt; color: #d6d3d1; line-height: 1.4;">
          Berangkat dari wawancara nyata 15 orang; membuka isolasi ekonomi ribuan penyedia jasa di 38 provinsi di luar pulau Jawa.
        </div>
      </div>

      <div style="flex: 1; background: #171310; border: 1.5px solid #10b981; border-radius: 2.5mm; padding: 3mm 3.5mm;">
        <div style="font-size: 9.5pt; font-weight: 800; color: #10b981; margin-bottom: 1.2mm;">2. UI/UX Kelas Dunia (55%)</div>
        <div style="font-size: 7.2pt; color: #d6d3d1; line-height: 1.4;">
          Sistem desain "Titik Terang" anti-AI-slop, kontras WCAG 2.2 AA (5.0:1), navigasi keyboard cerdas, dan checkout 2 langkah.
        </div>
      </div>

      <div style="flex: 1; background: #171310; border: 1.5px solid #0284c7; border-radius: 3mm; padding: 3mm 3.5mm;">
        <div style="font-size: 9.5pt; font-weight: 800; color: #38bdf8; margin-bottom: 1.2mm;">3. Fullstack Live Production (25%)</div>
        <div style="font-size: 7.2pt; color: #d6d3d1; line-height: 1.4;">
          Bukan sekadar mockup Figma! Memiliki 20 API terproteksi, FSM 409 Guard, rate limiter, dan 149 automated tests yang lolos 100%.
        </div>
      </div>
    </div>

    <div style="margin-top: 3.5mm; background: rgba(249, 115, 22, 0.1); border: 1px dashed #F97316; border-radius: 2mm; padding: 2.2mm 3.5mm; text-align: center;">
      <span style="font-size: 8.5pt; color: #f8fafc; font-weight: 700;">
        Uji Langsung Prototipe Live Sekarang:
      </span>
      <span style="font-size: 9.5pt; color: #38bdf8; font-family: monospace; font-weight: 800; margin-left: 2mm;">
        https://weblomba-rouge.vercel.app
      </span>
    </div>
  </div>

  <div class="slide-footer">
    <div class="speaker-cue">🎙️ Kalimat Penutup (4:50 - 5:00): "JASAKITE: Jasa terbaik dari orang terpercaya di sekitarmu. Terima kasih dewan juri, kami siap untuk sesi tanya jawab."</div>
    <div style="font-size: 7pt; color: #f8fafc;">
      Tim Pengembang JASAKITE • EMOSTFET 11 Grand Final
    </div>
  </div>
</div>

</body>
</html>
"""

html_file = os.path.join(BASE_DIR, "master_presentation_deck.html")
pdf_file = os.path.join(BASE_DIR, "JASAKITE_MASTER_PRESENTASI_FULLSTACK_EMOSTFET11.pdf")

with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Master Presentation HTML generated at: {html_file}")
print("Rendering 20-Slide Master Presentation PDF via WeasyPrint...")
doc = weasyprint.HTML(filename=html_file)
doc.write_pdf(pdf_file)

file_size = os.path.getsize(pdf_file)
print(f"SUCCESS! Master Presentation PDF generated at: {pdf_file}")
print(f"File size: {file_size / 1024:.2f} KB")
