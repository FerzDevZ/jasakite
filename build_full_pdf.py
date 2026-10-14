import os
import weasyprint

html_content = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Buku Panduan Lengkap Titanium Swarm v4.5: Sub-Agents & 1055 Modular Skills</title>
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 16mm 22mm 16mm;
    @top-left {
      content: "TITANIUM SWARM v4.5 • TITANIUM MULTI-AGENT ARCHITECTURE";
      font-family: 'Liberation Sans', sans-serif;
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
    }
    @top-right {
      content: "OFFICIAL TECHNICAL SPECIFICATION & MANUAL";
      font-family: 'Liberation Sans', sans-serif;
      font-size: 7pt;
      font-weight: 600;
      color: #94a3b8;
    }
    @bottom-left {
      content: "Buku Panduan Resmi: 46 Sub-Agents, 1055 Skills, dan Paralelisasi Swarm";
      font-family: 'Liberation Sans', sans-serif;
      font-size: 7pt;
      color: #94a3b8;
    }
    @bottom-right {
      content: "Halaman " counter(page) " dari " counter(pages);
      font-family: 'Liberation Sans', sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      color: #334155;
    }
  }

  @page:first {
    margin: 0;
    @top-left { content: normal; }
    @top-right { content: normal; }
    @bottom-left { content: normal; }
    @bottom-right { content: normal; }
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Liberation Sans', Arial, sans-serif;
    color: #1e293b;
    line-height: 1.45;
    font-size: 8.5pt;
    margin: 0;
    padding: 0;
  }

  /* COVER PAGE */
  .cover {
    page-break-after: always;
    height: 100vh;
    padding: 65px 50px;
    background: linear-gradient(135deg, #090d16 0%, #0f172a 55%, #1e293b 100%);
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 14px solid #2563eb;
  }

  .badge-tag {
    display: inline-block;
    background: rgba(37, 99, 235, 0.25);
    border: 1px solid #3b82f6;
    color: #93c5fd;
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  .cover-title {
    font-size: 27pt;
    font-weight: 900;
    line-height: 1.15;
    color: #ffffff;
    margin: 0 0 14px 0;
    letter-spacing: -0.5px;
  }

  .cover-sub {
    font-size: 12pt;
    font-weight: 400;
    color: #94a3b8;
    line-height: 1.4;
    margin-bottom: 25px;
    max-width: 95%;
  }

  .stats-grid {
    display: flex;
    gap: 12px;
    margin: 25px 0;
  }

  .stat-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 14px 16px;
    flex: 1;
    text-align: center;
  }

  .stat-number {
    font-size: 24pt;
    font-weight: 900;
    color: #38bdf8;
    line-height: 1;
    margin-bottom: 6px;
  }

  .stat-title {
    font-size: 7.5pt;
    color: #cbd5e1;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .cover-highlights {
    background: rgba(15, 23, 42, 0.75);
    border-left: 4px solid #10b981;
    border-radius: 0 6px 6px 0;
    padding: 16px 20px;
    margin: 15px 0;
  }

  .cover-highlights h4 {
    margin: 0 0 8px 0;
    color: #34d399;
    font-size: 9.5pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cover-highlights p {
    margin: 0;
    font-size: 8.5pt;
    color: #e2e8f0;
    line-height: 1.5;
  }

  .cover-meta {
    border-top: 1px solid rgba(255,255,255,0.15);
    padding-top: 18px;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #64748b;
  }

  .cover-meta strong {
    color: #e2e8f0;
  }

  /* HEADINGS */
  h1 {
    font-size: 15pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 5px;
    margin-top: 20px;
    margin-bottom: 12px;
    letter-spacing: -0.3px;
  }

  h2 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 14px;
    margin-bottom: 8px;
    border-left: 3.5px solid #3b82f6;
    padding-left: 8px;
  }

  h3 {
    font-size: 9.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 4px;
  }

  p {
    margin: 0 0 8px 0;
    text-align: justify;
    line-height: 1.45;
  }

  /* CALLOUTS */
  .callout {
    padding: 9px 13px;
    margin: 10px 0;
    border-radius: 5px;
    font-size: 8pt;
    line-height: 1.45;
  }

  .callout-blue {
    background: #eff6ff;
    border-left: 4px solid #2563eb;
    color: #1e40af;
  }

  .callout-green {
    background: #ecfdf5;
    border-left: 4px solid #10b981;
    color: #065f46;
  }

  .callout-amber {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }

  .callout-dark {
    background: #0f172a;
    border-left: 4px solid #38bdf8;
    color: #f8fafc;
  }

  /* TABLES */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 14px 0;
    font-size: 7.5pt;
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
  }

  th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #1e293b;
    letter-spacing: 0.3px;
  }

  td {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    line-height: 1.35;
  }

  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* CODE BLOCKS */
  pre, code {
    font-family: 'Liberation Mono', 'Courier New', monospace;
  }

  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 9px 12px;
    border-radius: 5px;
    font-size: 7.2pt;
    line-height: 1.35;
    margin: 8px 0 10px 0;
    border: 1px solid #1e293b;
    page-break-inside: avoid;
  }

  code.inline {
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 7.5pt;
    border: 1px solid #cbd5e1;
  }

  /* BADGES */
  .badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 6.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .badge-arch { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
  .badge-front { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
  .badge-back { background: #ede9fe; color: #5b21b6; border: 1px solid #ddd6fe; }
  .badge-ai { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .badge-sec { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  .badge-ops { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }

  /* STEPS */
  .steps-box {
    display: flex;
    gap: 8px;
    margin: 10px 0 14px 0;
  }

  .step-item {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-top: 3px solid #2563eb;
    border-radius: 4px;
    padding: 7px 9px;
  }

  .step-item-title {
    font-size: 8pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 3px;
  }

  .step-item-desc {
    font-size: 7pt;
    color: #475569;
    line-height: 1.3;
  }

  .page-break {
    page-break-after: always;
  }

  ul, ol {
    margin: 4px 0 8px 16px;
    padding: 0;
    font-size: 8pt;
  }

  li {
    margin-bottom: 3px;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div>
    <div class="badge-tag">Freebuff Superpower Ultra • Titanium Swarm v4.5</div>
    <div class="cover-title">BUKU PANDUAN LENGKAP & DEEP DIVE ARSITEKTUR<br>SUB-AGENTS & 1055 MODULAR SKILLS</div>
    <div class="cover-sub">
      Panduan Rinci dan Tajam Mengenai Mekanisme Paralelisasi, Orkestrasi 46 Sub-Agents Spesialis,
      Dual-Gate Quality Invariants, dan Taksonomi 1055 Modular Engineering Skills Tanpa AI-Slop.
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-number">46</div>
      <div class="stat-title">Sub-Agents Spesialis</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">1,055</div>
      <div class="stat-title">Modular Skills</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">9</div>
      <div class="stat-title">Klaster Rekayasa</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">Dual-Gate</div>
      <div class="stat-title">Quality Invariants</div>
    </div>
  </div>

  <div class="cover-highlights">
    <h4>Ringkasan Kemampuan Sistem:</h4>
    <p>
      • <strong>Parallel Swarm Execution:</strong> Meluncurkan $N$ sub-agen simultan tanpa blocking.<br>
      • <strong>Zero AI-Slop Manifesto:</strong> Larangan keras kode placeholder <code>// TODO</code>, modul khayalan, dan filler korporat.<br>
      • <strong>Just-In-Time (JIT) Skill Injection:</strong> Memuat kapabilitas spesifik on-demand tanpa context bloat.<br>
      • <strong>Standardized Inter-Agent Handoff:</strong> Alur teruji <code>@architect &rarr; @programmer &rarr; @tddmaster &rarr; @security &rarr; memory-by-ferz</code>.
    </p>
  </div>

  <div class="cover-meta">
    <div>
      Versi Dokumen: <strong>4.5 (Production Release)</strong><br>
      Lingkungan Proyek: <strong>/home/firman/weblomba</strong>
    </div>
    <div style="text-align: right;">
      Standar Mutu: <strong>Strict Anti-AI-Slop &amp; Dual-Gate QA</strong><br>
      Orkestrator: <strong>Titanium Swarm Autonomous Engine</strong>
    </div>
  </div>
</div>

<!-- HALAMAN 1: EXECUTIVE SUMMARY & CORE ARCHITECTURE -->
<h1>BAB I: RINGKASAN EKSEKUTIF &amp; ARSITEKTUR TITANIUM SWARM</h1>

<div class="callout callout-blue">
  <strong>Inti Filosofi Sistem:</strong> Titanium Swarm v4.5 dirancang untuk mengatasi kelemahan mendasar model AI konvensional: 
  <em>context window bloating</em>, degradasi kognitif saat tugas menumpuk, dan kemunculan <em>AI-slop</em> (kode setengah jadi yang tidak dapat dieksekusi). 
  Dengan memecah beban ke dalam <strong>46 Sub-Agents Spesialis</strong> dan <strong>1,055 Modular Skills</strong>, 
  setiap agen bekerja dengan fokus sempit berpresisi tinggi.
</div>

<h2>1.1 Mengapa Multi-Agent Swarm Paralel Diperlukan?</h2>
<p>
  Dalam proyek perangkat lunak nyata, pengerjaan sekuensial (serial) oleh satu agen membuat waktu eksekusi membengkak dan menghasilkan 
  konteks yang tercampur aduk (misal: kode frontend terdistorsi oleh aturan query database yang panjang). 
  Titanium Swarm menerapkan pendekatan modular:
</p>
<ul>
  <li><strong>Isolasi Ruang Kerja (Workspace Isolation):</strong> Setiap sub-agen memiliki context window, transcript, dan tools terpisah yang tidak saling mengotori.</li>
  <li><strong>Eksekusi Paralel Simultan:</strong> Sub-agen audit keamanan, pengujian beban, dan penulisan dokumentasi berjalan pada detik yang sama di latar belakang.</li>
  <li><strong>Konsumsi Token Efisien:</strong> Hanya sub-agen yang dibutuhkan yang dipanggil. Agen lain tetap berada dalam status <em>idle</em> tanpa memakan kuota token.</li>
</ul>

<h2>1.2 3-Tier Cognitive Depth Execution Matrix</h2>
<p>
  Setiap instruksi secara otomatis diklasifikasikan ke dalam matriks kognitif untuk menentukan kedalaman perencanaan:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 18%;">Tingkat Kerumitan</th>
      <th style="width: 25%;">Kondisi Pemicu</th>
      <th style="width: 32%;">Protokol Eksekusi</th>
      <th style="width: 25%;">Jaminan Kualitas</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Tier 1: Surgical</strong></td>
      <td>Typo fixes, styling CSS tweak, rename 1 variabel, patch cepat.</td>
      <td>Eksekusi langsung secara bedah tanpa overhead dokumen RFC. Verifikasi linter/build kilat.</td>
      <td>Selesai dalam hitungan detik, zero planning bloat.</td>
    </tr>
    <tr>
      <td><strong>Tier 2: Feature Flow</strong></td>
      <td>Endpoint baru, komponen UI baru, migrasi skema tabel, utility helper.</td>
      <td>Alur berantai: <code>@planner</code> (dekomposisi) &rarr; <code>@programmer</code> (implementasi) &rarr; <code>@tddmaster</code> (unit test).</td>
      <td>Minimal 1 happy path test dan 2 negative edge case tests.</td>
    </tr>
    <tr>
      <td><strong>Tier 3: Deep Swarm</strong></td>
      <td>Refaktor arsitektur, auth system, ledger keuangan, sistem multi-service.</td>
      <td><strong>War-Room Lengkap:</strong> Wajib terbitkan <code>RFC.md</code> sebelum modifikasi kode. Verifikasi Dual-Gate QA.</td>
      <td>100% Zero AI-Slop, lolos audit keamanan OWASP, zero regresi.</td>
    </tr>
  </tbody>
</table>

<h2>1.3 Dual-Gate Quality Invariants (Standar Mutu Mutlak)</h2>
<p>Kode dilarang keras dianggap tuntas sebelum lulus kedua gerbang verifikasi berikut:</p>

<div class="steps-box">
  <div class="step-item" style="border-top-color: #2563eb;">
    <div class="step-item-title">Gate 1: Static Quality</div>
    <div class="step-item-desc">
      • Strict TypeScript (zero implicit any).<br>
      • Zero AI-Slop (tanpa <code>// TODO</code>, tanpa elipsis).<br>
      • Hallucination Circuit-Breaker (semua package diverifikasi ke registry).
    </div>
  </div>
  <div class="step-item" style="border-top-color: #10b981;">
    <div class="step-item-title">Gate 2: Behavioral</div>
    <div class="step-item-desc">
      • Verifikasi Happy-Path fungsional.<br>
      • Minimal 2 uji Negative Edge-Case (input invalid, expired token).<br>
      • Self-Healing Loop otomatis jika test gagal.
    </div>
  </div>
  <div class="step-item" style="border-top-color: #8b5cf6;">
    <div class="step-item-title">Gate 3: Memory Sync</div>
    <div class="step-item-desc">
      • Penyimpanan state ke <code>memory/MEMORY.md</code> via <code>memory-by-ferz</code>.<br>
      • Preservasi keputusan arsitektur lintas sesi kerja.
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- HALAMAN 2: MEKANISME PARALELISASI & CARA KERJA SUB-AGENTS -->
<h1>BAB II: MEKANISME PARALELISASI &amp; CARA KERJA SUB-AGENTS</h1>

<p>
  Titanium Swarm memanfaatkan fitur <strong>Multi-Agent Background Execution</strong>. 
  Bagian ini menguraikan bagaimana paralelisasi dihidupkan, dikontrol, dan disinkronisasikan.
</p>

<h2>2.1 Cara Kerja Teknis Paralelisasi</h2>
<p>
  Paralelisasi sub-agen terjadi ketika orkestrator memanggil tool <code>invoke_subagent</code> dengan menyertakan beberapa agen sekaligus 
  dalam satu array <code>Subagents</code>:
</p>

<pre><code>// Tool Call Pemanggilan 3 Sub-Agen Secara Simultan (Paralel)
invoke_subagent({
  Subagents: [
    {
      TypeName: "self",
      Role: "Security Auditor",
      Prompt: "Audit seluruh endpoint /api/v1 terhadap OWASP Top 10 dan laporkan celah otentikasi."
    },
    {
      TypeName: "self",
      Role: "QA Master",
      Prompt: "Tulis test suite Vitest untuk skenario happy path dan 3 kasus kegagalan ekstrim."
    },
    {
      TypeName: "self",
      Role: "Tech Writer",
      Prompt: "Susun panduan OpenAPI 3.1 dan sequence diagram untuk sistem pembayaran."
    }
  ]
});
</code></pre>

<div class="callout callout-green">
  <strong>Siklus Hidup Eksekusi Paralel (Parallel Lifecycle):</strong>
  <ol style="margin: 4px 0 0 16px;">
    <li><strong>Forking &amp; Context Isolation:</strong> Sistem membuat instance terpisah untuk masing-masing agen dengan ID percakapan independen.</li>
    <li><strong>Simultaneous Background Running:</strong> Agen-agen tersebut menjalankan shell commands, pembacaan file, atau analisis secara independen tanpa memblokir thread induk.</li>
    <li><strong>Reactive Wakeup:</strong> Parent agent tidak perlu melakukan polling (mengecek berulang). Sistem otomatis membangunkan parent agent melalui event callback saat pesan atau hasil kerja selesai dikirim.</li>
    <li><strong>Synthesis &amp; Arbitration:</strong> Parent agent mengumpulkan hasil dari seluruh sub-agen, memecahkan potensi perbedaan analisis, dan memfinalisasi solusi.</li>
  </ol>
</div>

<h2>2.2 Standar Protokol Handoff Antar Sub-Agen (Swarm Pipeline)</h2>
<p>
  Untuk menghindari konflik modifikasi file pada eksekusi paralel, sistem menetapkan protokol alur kerja:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 15%;">Tahap</th>
      <th style="width: 25%;">Pelaksana</th>
      <th style="width: 30%;">Aktivitas Teknis</th>
      <th style="width: 30%;">Artefak Dokumen</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Fase 1</strong></td>
      <td><code>@architect</code> + <code>@planner</code></td>
      <td>Analisis kebutuhan, pembuatan interface types, DDL tabel.</td>
      <td><code>RFC.md</code> &amp; <code>ADR.md</code></td>
    </tr>
    <tr>
      <td><strong>Fase 2</strong></td>
      <td><code>@programmer</code> + <code>@implementer</code></td>
      <td>Implementasi kode secara bedah, penulisan file, strictly-typed.</td>
      <td>Source Code + <code>DIFF_LOG.md</code></td>
    </tr>
    <tr>
      <td><strong>Fase 3</strong></td>
      <td><code>@tddmaster</code> + <code>@qa</code></td>
      <td>Eksekusi unit test, integration test, fuzzing, dan regression suite.</td>
      <td><code>TEST_REPORT.md</code></td>
    </tr>
    <tr>
      <td><strong>Fase 4</strong></td>
      <td><code>@security</code> + <code>@reviewer</code></td>
      <td>Pemindaian kerentanan OWASP, kebocoran token/secret, eliminasi slop.</td>
      <td>Security Sign-Off Certificate</td>
    </tr>
    <tr>
      <td><strong>Fase 5</strong></td>
      <td><code>[Skill: memory-by-ferz]</code></td>
      <td>Sinkronisasi status arsitektur aktif ke memori persisten.</td>
      <td><code>memory/MEMORY.md</code></td>
    </tr>
  </tbody>
</table>

<h2>2.3 Strategi Pencegahan Merge Conflict &amp; Loop</h2>
<ul>
  <li><strong>Aturan Single-Writer:</strong> Hanya satu agen yang memegang hak modifikasi (write) pada file tertentu dalam satu waktu. Sub-agen lain yang bekerja secara paralel hanya diberikan peran read-only (auditing, planning, drafting).</li>
  <li><strong>Autonomous Healer Circuit-Breaker:</strong> Jika suatu unit test gagal setelah perubahan kode, sistem memicu <code>[Skill: autonomous-swe-loop-healer]</code> secara otomatis hingga maksimal 3 iterasi mandiri sebelum eskalasi.</li>
</ul>

<div class="page-break"></div>

<!-- HALAMAN 3: KATALOG LENGKAP 46 SUB-AGENTS (BAGIAN 1) -->
<h1>BAB III: KATALOG LENGKAP 46 SUB-AGENTS SPESIALIS (1/2)</h1>

<p>
  Berikut rincian 46 Sub-Agents resmi dalam <code>.freebuff/agents/</code> yang dikelompokkan ke dalam 9 klaster rekayasa sistem:
</p>

<!-- Cluster 1 -->
<h2>1. Architecture &amp; System Design (7 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@programmer-omni</code><br><span class="badge badge-arch">Supreme Commander</span></td>
      <td>Panglima tertinggi swarm dengan akses 66 skills, otoritas dispatching penuh, dan penegakan strict anti-AI-slop.</td>
      <td>Proyek baru berskala besar, koordinasi multi-service, refaktor kritis.</td>
    </tr>
    <tr>
      <td><code>@architect</code><br><span class="badge badge-arch">System Design</span></td>
      <td>Dekomposisi First-Principles, merancang topology sistem, DDL database terstruktur, dan interface boundaries.</td>
      <td>Penyusunan formal <code>RFC.md</code> sebelum coding dimulai.</td>
    </tr>
    <tr>
      <td><code>@planner</code><br><span class="badge badge-arch">Task Decomposition</span></td>
      <td>Memecah requirement besar menjadi sub-tugas atomik berbasis DAG (Directed Acyclic Graph) tanpa mengubah kode.</td>
      <td>Manajemen dependensi tugas teknis dan roadmap implementasi.</td>
    </tr>
    <tr>
      <td><code>@monorepo-architect</code><br><span class="badge badge-arch">Monorepo</span></td>
      <td>Arsitek monorepo enterprise: Turborepo, Nx, PNPM workspaces, package boundary isolation, dan shared configs.</td>
      <td>Pemisahan paket multi-library dan manajemen monorepo.</td>
    </tr>
    <tr>
      <td><code>@microservices-mesh</code><br><span class="badge badge-arch">Microservices</span></td>
      <td>Arsitektur terdistribusi: Istio Service Mesh, gRPC HTTP/2, Kafka event streams, dan fault tolerance patterns.</td>
      <td>Komunikasi antar-service, traffic routing, microservices.</td>
    </tr>
    <tr>
      <td><code>@explore-plus</code><br><span class="badge badge-arch">Codebase Explorer</span></td>
      <td>Pemetaan cepat struktur kode asing: entry points, call graphs, dan dependensi tersembunyi.</td>
      <td>Onboarding repositori warisan (legacy) atau codebase baru.</td>
    </tr>
    <tr>
      <td><code>@researcher</code><br><span class="badge badge-arch">Deep Research</span></td>
      <td>Riset otonom: ekstraksi dokumentasi resmi, paper ilmiah, benchmark teknologi, dan perbandingan solusi.</td>
      <td>Evaluasi teknologi baru, pemilihan framework, analisis CVE.</td>
    </tr>
  </tbody>
</table>

<!-- Cluster 2 -->
<h2>2. Frontend &amp; UI/UX Experience (8 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@frontend</code><br><span class="badge badge-front">Modern Web</span></td>
      <td>Frontend modern: React 19, Next.js 15 App Router, Tailwind CSS, shadcn/ui dengan pendekatan anti-slop.</td>
      <td>Pembangunan komponen web responsif dan state management.</td>
    </tr>
    <tr>
      <td><code>@design-engineer</code><br><span class="badge badge-front">Design System</span></td>
      <td>Penerjemah token brand, visual micro-interactions, OKLCH color token, dan tipografi Swiss/Editorial.</td>
      <td>Pembangunan design system eksklusif tanpa kesan template AI.</td>
    </tr>
    <tr>
      <td><code>@generative-ui-engineer</code><br><span class="badge badge-front">GenUI &amp; Streaming</span></td>
      <td>Streaming React Server Components (RSC) via Vercel AI SDK, client WebGPU LLMs, dan generative tool-calling UI.</td>
      <td>Aplikasi obrolan AI canggih dan widget visual streaming.</td>
    </tr>
    <tr>
      <td><code>@game-dev-3d</code><br><span class="badge badge-front">3D &amp; WebGL</span></td>
      <td>Grafika 3D interaktif: Three.js, WebGL, custom GLSL shaders, React Three Fiber (R3F), engine fisika Rapier.</td>
      <td>Pengalaman 3D interaktif 60 FPS langsung di browser web.</td>
    </tr>
    <tr>
      <td><code>@accessibility-champion</code><br><span class="badge badge-front">WCAG 2.2 AAA</span></td>
      <td>Kepatuhan aksesibilitas tinggi: trap fokus keyboard, screen reader live regions (<code>aria-live</code>), rasio kontras.</td>
      <td>Audit website inklusif dan sertifikasi aksesibilitas formal.</td>
    </tr>
    <tr>
      <td><code>@localization-i18n-pro</code><br><span class="badge badge-front">i18n &amp; RTL</span></td>
      <td>Internasionalisasi enterprise: routing dinamis multilingual, layout RTL (Arab/Ibrani), ICU message strings.</td>
      <td>Aplikasi global multibahasa dengan dukungan teks dua arah.</td>
    </tr>
    <tr>
      <td><code>@seo-growth</code><br><span class="badge badge-front">pSEO &amp; Vitals</span></td>
      <td>Programmatic SEO, Schema.org JSON-LD, kartu OpenGraph dinamis, optimasi Core Web Vitals (LCP/INP).</td>
      <td>Peningkatan ranking pencarian Google dan GEO AI citation.</td>
    </tr>
    <tr>
      <td><code>@pwa-offline-architect</code><br><span class="badge badge-front">PWA Offline</span></td>
      <td>Progressive Web App: service worker caching (Workbox), sync offline background, web push notifications.</td>
      <td>Aplikasi web yang dapat berfungsi penuh tanpa jaringan internet.</td>
    </tr>
  </tbody>
</table>

<!-- Cluster 3 -->
<h2>3. Backend &amp; Database Engineering (6 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@backend</code><br><span class="badge badge-back">APIs &amp; Auth</span></td>
      <td>REST/gRPC APIs aman, sesi HttpOnly, rate limiting distributed, validasi skema Zod/Pydantic.</td>
      <td>Pembangunan fondasi server, middleware, dan lifecycle auth.</td>
    </tr>
    <tr>
      <td><code>@database</code><br><span class="badge badge-back">Database Architect</span></td>
      <td>PostgreSQL internals, indexing B-Tree/GIN, query plan tuning, zero-downtime expand-contract migration.</td>
      <td>Pembersihan query lambat dan perancangan skema data besar.</td>
    </tr>
    <tr>
      <td><code>@data-engineer-olap</code><br><span class="badge badge-back">OLAP &amp; Streaming</span></td>
      <td>Analitik real-time: ClickHouse, DuckDB SQL in-process, format data Parquet, ingestion jutaan data/detik.</td>
      <td>Dashboard analitik data masif dengan respon sub-detik.</td>
    </tr>
    <tr>
      <td><code>@websocket-realtime</code><br><span class="badge badge-back">Realtime &amp; SSE</span></td>
      <td>Koneksi dua arah: WebSockets, Server-Sent Events, Redis Pub/Sub cluster, presence tracking.</td>
      <td>Chat multi-user, kolaborasi dokumen real-time, live feeds.</td>
    </tr>
    <tr>
      <td><code>@fintech-architect</code><br><span class="badge badge-back">Fintech Payments</span></td>
      <td>Siklus pembayaran Stripe/Xendit, verifikasi webhook signature, idempotency replay cache.</td>
      <td>Sistem checkout pembayaran dan pencegahan double-charge.</td>
    </tr>
    <tr>
      <td><code>@tokenomics-fintech-ledger</code><br><span class="badge badge-back">ACID Ledgers</span></td>
      <td>Pembukuan Double-Entry berstandar akuntansi, transaksi ACID mutlak, audit trails immutable.</td>
      <td>Dompet digital, sistem perbankan terdesentralisasi, saldo saldo.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- HALAMAN 4: KATALOG LENGKAP 46 SUB-AGENTS (BAGIAN 2) -->
<h1>BAB III: KATALOG LENGKAP 46 SUB-AGENTS SPESIALIS (2/2)</h1>

<!-- Cluster 4 & 5 -->
<h2>4. Core Implementation &amp; Craftsmanship (3 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@programmer</code><br><span class="badge badge-arch">Super Programmer</span></td>
      <td>Ultimate Super Programmer v3.5: rekayasa bedah satu arah, kode bersih standar manusia, dan sync memory-by-ferz.</td>
      <td>Penulisan kode produksi inti yang ringkas, cepat, dan rapi.</td>
    </tr>
    <tr>
      <td><code>@implementer</code><br><span class="badge badge-arch">Fullstack Exec</span></td>
      <td>Eksekusi fitur end-to-end berpegang pada RFC dengan git diff minimal dan verifikasi build instan.</td>
      <td>Implementasi fitur komplit frontend + backend dalam 1 siklus.</td>
    </tr>
    <tr>
      <td><code>@refactor-expert</code><br><span class="badge badge-arch">AST &amp; Modernize</span></td>
      <td>Refactoring skala besar menggunakan Abstract Syntax Tree (AST), pembersihan code smell, dan Clean Architecture.</td>
      <td>Migrasi modul usang tanpa mengubah fungsionalitas (zero regression).</td>
    </tr>
  </tbody>
</table>

<h2>5. Mobile &amp; Cross-Platform (2 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@mobile-engineer</code><br><span class="badge badge-front">Mobile Cross-Platform</span></td>
      <td>React Native (Expo) &amp; Flutter: gestur sentuh, bottom-sheets bersuspensi fluida, background sync, notifikasi push.</td>
      <td>Aplikasi iOS dan Android native berkinerja tinggi 60 FPS.</td>
    </tr>
    <tr>
      <td><code>@flutter-specialist</code><br><span class="badge badge-front">Flutter Deep</span></td>
      <td>Spesialis Flutter murni: state management BLoC/Riverpod, CustomPainter animasi kompleks, native platform channels.</td>
      <td>Aplikasi Flutter dengan UI kustom dan performa rendering native.</td>
    </tr>
  </tbody>
</table>

<!-- Cluster 6 & 7 -->
<h2>6. AI, NLP &amp; Cognitive Systems (5 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@ai-engineer</code><br><span class="badge badge-ai">AI Systems</span></td>
      <td>Infrastruktur RAG: pgvector/Qdrant, evaluasi prompt LLM, routing token cerdas, dan local LLM deployment (Ollama).</td>
      <td>Pembuatan pipeline pencarian semantik dan integrasi LLM.</td>
    </tr>
    <tr>
      <td><code>@nlp-rag-specialist</code><br><span class="badge badge-ai">Advanced RAG</span></td>
      <td>Sistem retrieval presisi: hybrid search (BM25 + vector), semantic chunking, Cohere Rerank v3, dan HyDE.</td>
      <td>Knowledge base korporat dengan akurasi pencarian tinggi.</td>
    </tr>
    <tr>
      <td><code>@deepseek-reasoner-pro</code><br><span class="badge badge-ai">Deep Reasoning</span></td>
      <td>Penalaran matematika murni, optimasi algoritma komputasi rumit, dan pembuktian invarian sistem.</td>
      <td>Pemecahan algoritma graf, optimasi komputasional, verifikasi formal.</td>
    </tr>
    <tr>
      <td><code>@glm-chat</code><br><span class="badge badge-ai">Idea Brainstorm</span></td>
      <td>Konsultasi ide kilat (144 tok/s), eksplorasi alternatif solusi, dan brainstorming arsitektur.</td>
      <td>Fase perumusan ide dan diskusi opsi teknis di awal proyek.</td>
    </tr>
    <tr>
      <td><code>@prompt-red-teamer</code><br><span class="badge badge-ai">AI Red Teaming</span></td>
      <td>Uji penetrasi AI: penangkal prompt injection adversarial, jailbreak defense, indirect data poisoning, guardrails.</td>
      <td>Pengerasan keamanan prompt dan tool calling sebelum produksi.</td>
    </tr>
  </tbody>
</table>

<h2>7. DevOps, Cloud Native &amp; SRE (4 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@devops</code><br><span class="badge badge-ops">CI/CD &amp; Docker</span></td>
      <td>Docker multi-stage aman (&lt;50MB), pipeline GitHub Actions, Terraform IaC, dan otomasi bash POSIX.</td>
      <td>Penyusunan alur build otomatis dan infrastruktur container.</td>
    </tr>
    <tr>
      <td><code>@cloud-native-devops-k8s</code><br><span class="badge badge-ops">Kubernetes</span></td>
      <td>Kubernetes enterprise: Helm charts, ArgoCD GitOps, autoscaling HPA/KEDA, dan deployment zero-downtime.</td>
      <td>Orkestrasi klaster K8s dan manajemen rilis terdistribusi.</td>
    </tr>
    <tr>
      <td><code>@sre</code><br><span class="badge badge-ops">SRE &amp; Metrics</span></td>
      <td>Site Reliability Engineering: SLO/SLI budgets, Prometheus/Grafana alerts, dan mitigasi downtime sistem.</td>
      <td>Pemeliharaan keandalan sistem produksi 99.99% dan triage insiden.</td>
    </tr>
    <tr>
      <td><code>@release</code><br><span class="badge badge-ops">Release Management</span></td>
      <td>Manajemen rilis: version bump otomatis SemVer, pembuatan changelog, dan publishing GitHub Release tags.</td>
      <td>Finalisasi pengiriman perangkat lunak ke publik.</td>
    </tr>
  </tbody>
</table>

<!-- Cluster 8 & 9 -->
<h2>8. Security, Governance &amp; Auditing (5 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@security</code><br><span class="badge badge-sec">OWASP Security</span></td>
      <td>Audit OWASP Top 10, scanning kebocoran kredensial (.env), hardening CSP, dan kepatuhan IAM.</td>
      <td>Pemeriksaan celah kerentanan aplikasi sebelum deployment.</td>
    </tr>
    <tr>
      <td><code>@cloud-security-architect</code><br><span class="badge badge-sec">Zero Trust Cloud</span></td>
      <td>Arsitektur Zero-Trust: AWS/GCP IAM least-privilege, segmentasi VPC, mutual TLS, dan manajemen Vault.</td>
      <td>Hardening keamanan cloud dan audit akses infrastruktur.</td>
    </tr>
    <tr>
      <td><code>@smart-contract-auditor</code><br><span class="badge badge-sec">Web3 &amp; Solidity</span></td>
      <td>Audit smart contract EVM/Solidity: pencegahan reentrancy, optimasi gas Yul, dan fuzzing Foundry.</td>
      <td>Audit keamanan protokol blockchain dan tokenomics.</td>
    </tr>
    <tr>
      <td><code>@reviewer</code><br><span class="badge badge-sec">Code Reviewer</span></td>
      <td>Tinjauan kualitas independen: mendeteksi bug tersembunyi, anti-pattern, dan memverifikasi kesiapan PR.</td>
      <td>Code review objektif sebelum merge kode ke branch utama.</td>
    </tr>
    <tr>
      <td><code>@writer</code><br><span class="badge badge-sec">Technical Writer</span></td>
      <td>Penulisan dokumentasi teknis: README komprehensif, panduan API OpenAPI, dan format dokumen resmi.</td>
      <td>Penyusunan dokumentasi yang sinkron dengan kode sumber nyata.</td>
    </tr>
  </tbody>
</table>

<h2>9. Performance, QA &amp; Forensics Testing (6 Agen)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Nama Agen</th>
      <th style="width: 45%;">Peran &amp; Spesialisasi</th>
      <th style="width: 30%;">Kasus Penggunaan Optimal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>@tddmaster</code><br><span class="badge badge-ai">TDD Master</span></td>
      <td>Metodologi Red-Green-Refactor murni: test suite deterministik, edge case coverage, dan mock isolation.</td>
      <td>Menulis test suite komprehensif sebelum modul diimplementasi.</td>
    </tr>
    <tr>
      <td><code>@qa</code><br><span class="badge badge-ai">E2E Automation</span></td>
      <td>Otomasi Playwright end-to-end, simulasi alur multi-role pengguna, dan pelaporan cacat perangkat lunak.</td>
      <td>Pengujian alur pengguna dari browser secara otomatis.</td>
    </tr>
    <tr>
      <td><code>@chaos-tester</code><br><span class="badge badge-ai">Chaos &amp; Load</span></td>
      <td>Chaos engineering: simulasi kegagalan jaringan, pengujian beban ekstrem Grafana k6, dan circuit breakers.</td>
      <td>Pengujian ketahanan sistem saat terjadi bencana trafik atau server mati.</td>
    </tr>
    <tr>
      <td><code>@perf</code><br><span class="badge badge-ai">Performance</span></td>
      <td>Optimasi latensi: profiling flamegraph CPU, memory allocation, dan perbaikan metrik Core Web Vitals.</td>
      <td>Memangkas response time lambat dan lag animasi.</td>
    </tr>
    <tr>
      <td><code>@debugger</code><br><span class="badge badge-ai">Bug Triage</span></td>
      <td>Isolasi dan reproduksi bug secara deterministik, penelusuran akar masalah, dan perbaikan minimal presisi.</td>
      <td>Memperbaiki bug rumit tanpa mengganggu bagian kode lain.</td>
    </tr>
    <tr>
      <td><code>@system-debugger-forensics</code><br><span class="badge badge-ai">Forensics eBPF</span></td>
      <td>Forensik level rendah: tracing Linux kernel via eBPF, analisis thread lock, dan dump heap memory.</td>
      <td>Investigasi crash misterius di level OS atau runtime native.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- HALAMAN 5: SISTEM 1055 SKILLS & 28 FLAGSHIPS -->
<h1>BAB IV: SISTEM 1,055 SKILLS &amp; SPOTLIGHT 28 FLAGSHIP SKILLS</h1>

<p>
  Titanium Swarm memiliki perbendaharaan <strong>1,055 Keterampilan Rekayasa Modular (Skills)</strong> yang disimpan di 
  <code>.freebuff/skills/</code>. Setiap modul berisi aturan deterministik, SOP rekayasa teruji, dan skrip otomasi.
</p>

<h2>4.1 Peta Distribusi 9 Pilar Rekayasa</h2>
<p>
  Berdasarkan analisis kurasi mendalam, seluruh 1,055 skills terdistribusi ke dalam 9 domain spesifik:
</p>
<ul>
  <li><strong>Frontend &amp; UI Design (315+ skills):</strong> Menguasai React, Tailwind v4, Radix Primitives, Canvas 60 FPS, micro-interactions, dan WCAG AAA.</li>
  <li><strong>Backend &amp; APIs (102+ skills):</strong> Runtime Bun, Go concurrency, microservices, gRPC HTTP/2, GraphQL Federation, dan transaksi idempoten.</li>
  <li><strong>Automation &amp; Tooling (87+ skills):</strong> Skrip POSIX bash, AST codemods Tree-sitter, sanitasi kode otomatis, dan SDD templates.</li>
  <li><strong>Workflow, Memory &amp; DX (78+ skills):</strong> Persistent memory-by-ferz, automated SWE loop healing, konvensi commit, dan audit DX.</li>
  <li><strong>Architecture &amp; Clean Code (43+ skills):</strong> First-principles reasoning, state machines, Chesterton's fence, dan anti-overengineering.</li>
  <li><strong>Security &amp; Invariants (38+ skills):</strong> OWASP Top 10, Passkeys WebAuthn, pemindaian SAST/DAST, dan audit smart contract EVM.</li>
  <li><strong>Data &amp; Storage (37+ skills):</strong> PostgreSQL internals, ClickHouse OLAP, DuckDB, Redis streams, dan migrasi expand/contract.</li>
  <li><strong>Testing &amp; Quality (33+ skills):</strong> TDD red-green, k6 load testing, Playwright visual diffs, dan mutation testing Stryker.</li>
  <li><strong>DevOps &amp; Cloud (18+ skills) &amp; Mobile (13+ skills):</strong> K8s Helm, Cloudflare KV edge, Flutter BLoC, dan PWA offline caching.</li>
</ul>

<h2>4.2 Kurasi 28 Flagship Skills Paling Transformatif</h2>
<p>
  Tabel berikut menyajikan 28 flagship skills revolusioner yang dapat diaktifkan menggunakan tag <code>[Skill: &lt;nama&gt;]</code> atau shortcut terkait:
</p>

<table>
  <thead>
    <tr>
      <th style="width: 28%;">Nama Skill &amp; Jalur</th>
      <th style="width: 44%;">Fungsi Teknis &amp; Mekanisme</th>
      <th style="width: 28%;">Dampak Rekayasa Sistem</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>autonomous-swe-loop-healer</code><br><span class="badge badge-arch">Shortcut: /heal</span></td>
      <td>Otomatis mendiagnosis stack trace, merumuskan hipotesis, menerapkan patch, dan menjalankan ulang test hingga lulus.</td>
      <td><strong>Self-healing bugfix mandiri</strong> tanpa intervensi manual manusia.</td>
    </tr>
    <tr>
      <td><code>memory-by-ferz</code><br><span class="badge badge-arch">Shortcut: /memory</span></td>
      <td>Mesin memori persisten poliglot di <code>memory/MEMORY.md</code> yang merekam arsitektur aktif dan skema DB.</td>
      <td><strong>Zero context amnesia</strong>; progres tetap terjaga sempurna lintas sesi.</td>
    </tr>
    <tr>
      <td><code>hallmark</code><br><span class="badge badge-front">Tag Prompt</span></td>
      <td>Standar desain UI anti-slop: evaluasi P5 H4 E5 S4 R5 V5, warna OKLCH, larangan kartu ungu-neon klise buatan AI.</td>
      <td>Antarmuka berkelas dunia setara karya desainer produk papan atas.</td>
    </tr>
    <tr>
      <td><code>no-hallucinated-dependencies</code><br><span class="badge badge-sec">Tag Prompt</span></td>
      <td>Circuit-breaker yang memverifikasi setiap package impor ke registri publik resmi sebelum dieksekusi.</td>
      <td><strong>Nol impor fiktif</strong>; mencegah build error fatal di CI/CD.</td>
    </tr>
    <tr>
      <td><code>kill-ai-slop</code><br><span class="badge badge-sec">Shortcut: /review</span></td>
      <td>Menghapus basa-basi percakapan, placeholder <code>// TODO</code>, komentar restatement, dan elipsis kode.</td>
      <td>Menghasilkan kode produksi yang 100% tuntas dan bermutu tinggi.</td>
    </tr>
    <tr>
      <td><code>agentic-rag-hybrid-reranking-cohere</code><br><span class="badge badge-ai">Tag Prompt</span></td>
      <td>Multi-stage retrieval: Reciprocal Rank Fusion (vector + BM25) &rarr; HyDE &rarr; Cohere Rerank v3 filtering.</td>
      <td>Presisi pencarian semantik dokumen mencapai akurasi &gt; 95%.</td>
    </tr>
    <tr>
      <td><code>spec-driven-development-sdlc</code><br><span class="badge badge-arch">Shortcut: /plan</span></td>
      <td>Mewajibkan pembuatan formal <code>RFC.md</code> dan DDL skema sebelum menulis kode implementasi.</td>
      <td>Mengeliminasi salah arah arsitektur dan menghemat waktu rework.</td>
    </tr>
    <tr>
      <td><code>state-machine-invariant-reasoning</code><br><span class="badge badge-arch">Tag Prompt</span></td>
      <td>Memodelkan alur kerja menjadi Finite State Machine (FSM); membuat state ilegal mustahil terjadi pada level tipe data.</td>
      <td>Mencegah race condition dan transisi data tidak sah secara matematis.</td>
    </tr>
    <tr>
      <td><code>deterministic-code-sanitizer</code><br><span class="badge badge-arch">Tag Prompt</span></td>
      <td>Memindai dan memusnahkan stub palsu, dummy mock, dan empty error handlers secara otomatis dari codebase.</td>
      <td>Kode bersih dari artefak prototipe yang rentan jebol di produksi.</td>
    </tr>
    <tr>
      <td><code>binary-search-debugging-isolate</code><br><span class="badge badge-ai">Tag Prompt</span></td>
      <td>Menemukan commit dan baris penyebab regresi dalam $O(\log n)$ langkah menggunakan git bisect otomatis.</td>
      <td>Isolasi akar penyebab bug misterius dalam hitungan menit.</td>
    </tr>
    <tr>
      <td><code>bun-runtime-hyper-fast-apis</code><br><span class="badge badge-back">Tag Prompt</span></td>
      <td>Membangun backend microservices dan WebSockets menggunakan native <code>Bun.serve()</code> dan embedded SQLite.</td>
      <td>Throughput API hingga 30x lebih kencang dengan cold-start minimal.</td>
    </tr>
    <tr>
      <td><code>idempotency-distributed-transactions</code><br><span class="badge badge-back">Tag Prompt</span></td>
      <td>Pola transaksi idempoten via header <code>Idempotency-Key</code>, Redis distributed locks, dan replay cache.</td>
      <td>Keamanan mutlak transaksi keuangan dan antrean distributed messaging.</td>
    </tr>
    <tr>
      <td><code>postgresql-internals-indexing-master</code><br><span class="badge badge-back">Tag Prompt</span></td>
      <td>Optimasi engine internal Postgres: indeks B-Tree, GIN, BRIN, analisis EXPLAIN BUFFERS, dan autovacuum tuning.</td>
      <td>Query berkecepatan sub-milidetik pada database volume terabyte.</td>
    </tr>
    <tr>
      <td><code>prompt-injection-defense-guardrails</code><br><span class="badge badge-ai">Tag Prompt</span></td>
      <td>Membentengi LLM dari adversarial prompt injection, jailbreak, dan indirect poisoning via NeMo Guardrails.</td>
      <td>Perlindungan maksimal bagi agen AI yang menerima input publik bebas.</td>
    </tr>
    <tr>
      <td><code>k6-spike-soak-breakpoint-testing</code><br><span class="badge badge-ai">Tag Prompt</span></td>
      <td>Pengujian beban Grafana k6: lonjakan trafik 10x, soak test memori 24 jam, dan penemuan limit breakpoint kapasitas.</td>
      <td>Mengetahui daya tampung sistem secara eksak sebelum launching.</td>
    </tr>
    <tr>
      <td><code>playwright-visual-regression-testing</code><br><span class="badge badge-front">Tag Prompt</span></td>
      <td>Uji regresi visual pixel-perfect: membandingkan diff screenshot multi-viewport dan mode Light/Dark.</td>
      <td>Nol pergeseran layout (CLS) atau cacat visual yang lolos ke staging.</td>
    </tr>
    <tr>
      <td><code>mutation-testing-stryker-mutmut</code><br><span class="badge badge-ai">Tag Prompt</span></td>
      <td>Menyuntikkan mutasi bug sengaja ke kode untuk menguji apakah unit test benar-benar efektif mendeteksi eror.</td>
      <td>Memvalidasi kualitas hakiki dari test suite tanpa false confidence.</td>
    </tr>
    <tr>
      <td><code>zero-downtime-migration-expand-contract</code><br><span class="badge badge-back">Tag Prompt</span></td>
      <td>Evolusi skema database: Expand (tambah kolom baru) &rarr; Dual-write &rarr; Backfill &rarr; Contract (hapus kolom lama).</td>
      <td>Migrasi skema database aman dengan ketersediaan sistem 99.99%.</td>
    </tr>
    <tr>
      <td><code>crdt-realtime-collaboration-yjs</code><br><span class="badge badge-front">Tag Prompt</span></td>
      <td>Sinkronisasi data multi-user kolaboratif (Figma/Notion-like) dengan Yjs CRDTs dan awareness cursor sync.</td>
      <td>Kolaborasi real-time tanpa resiko penimpaan data (merge conflicts).</td>
    </tr>
    <tr>
      <td><code>distributed-tracing-opentelemetry</code><br><span class="badge badge-ops">Tag Prompt</span></td>
      <td>Pelacakan request end-to-end terdistribusi dengan OpenTelemetry (OTel), context propagation W3C, dan Jaeger.</td>
      <td>Visibilitas penuh latensi mikroservice dan deteksi bottleneck instan.</td>
    </tr>
    <tr>
      <td><code>bento-grid-dashboard-ui</code><br><span class="badge badge-front">Tag Prompt</span></td>
      <td>Desain dashboard modern bento-grid asimetris dengan dynamic masonry spans dan kartu glassmorphic.</td>
      <td>Penyajian metrik analitik yang padat informasi, intuitif, dan mewah.</td>
    </tr>
    <tr>
      <td><code>accessible-wcag-aaa-keyboard-aria</code><br><span class="badge badge-front">Tag Prompt</span></td>
      <td>Penerapan kepatuhan WCAG 2.2 AAA: keyboard focus trap, aria-live announce regions, dan validasi rasio kontras.</td>
      <td>Antarmuka yang dapat dioperasikan penuh oleh pengguna disabilitas.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<!-- HALAMAN 6: CHEATSHEET OPERASIONAL & CARA MENGAKTIFKAN -->
<h1>BAB V: PANDUAN PRAKTIS &amp; CHEAT SHEET OPERASIONAL</h1>

<p>
  Bab ini memberikan instruksi langsung dan contekan sintaks praktis untuk mengoperasikan Sub-Agents dan Skills 
  secara maksimal di terminal maupun antarmuka chat harian.
</p>

<h2>5.1 Panduan Cepat Perintah Slash (Command Palette)</h2>
<table>
  <thead>
    <tr>
      <th style="width: 20%;">Perintah Shortcut</th>
      <th style="width: 30%;">Sub-Agent / Skill yang Aktif</th>
      <th style="width: 50%;">Tindakan Teknis Otomatis</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/plan &lt;task&gt;</code></td>
      <td><code>@architect</code> + <code>@planner</code></td>
      <td>Menganalisis kebutuhan, mendesain interface &amp; DDL tabel, menyusun <code>RFC.md</code> sebelum koding.</td>
    </tr>
    <tr>
      <td><code>/build &lt;feature&gt;</code></td>
      <td><code>@programmer</code> + <code>@implementer</code></td>
      <td>Mengeksekusi pembuatan fitur end-to-end secara strictly typed dengan standar anti-AI-slop.</td>
    </tr>
    <tr>
      <td><code>/test &lt;target&gt;</code></td>
      <td><code>@tddmaster</code> + <code>@qa</code></td>
      <td>Menulis dan menjalankan test suite komprehensif (minimal 1 happy-path dan 2 edge cases).</td>
    </tr>
    <tr>
      <td><code>/heal</code></td>
      <td><code>[Skill: autonomous-swe-loop-healer]</code></td>
      <td>Mendeteksi error build/runtime, mengisolasi akar masalah, menerapkan patch, dan menguji ulang.</td>
    </tr>
    <tr>
      <td><code>/review</code></td>
      <td><code>@reviewer</code> + <code>@security</code></td>
      <td>Mengaudit kebenaran logika, scanning celah OWASP, memeriksa integritas tipe data, dan membersihkan slop.</td>
    </tr>
    <tr>
      <td><code>/memory</code></td>
      <td><code>[Skill: memory-by-ferz]</code></td>
      <td>Menyimpan ringkasan arsitektur aktif dan kemajuan proyek ke <code>memory/MEMORY.md</code>.</td>
    </tr>
  </tbody>
</table>

<h2>5.2 Tiga Metode Mengaktifkan Sub-Agents &amp; Skills</h2>

<h3>Metode 1: Tag Mention (@) &amp; Skill Tag dalam Prompt Chat</h3>
<p>
  Cukup sebutkan peran agen dan skill yang diinginkan dalam instruksi natural Anda:
</p>
<pre><code>"Tolong @architect rancang sistem antrian pemesanan tiket dengan [Skill: spec-driven-development-sdlc].
Lalu @programmer implementasikan menggunakan [Skill: bun-runtime-hyper-fast-apis] dan pastikan
transaksinya aman dengan [Skill: idempotency-distributed-transactions]."</code></pre>

<h3>Metode 2: Aktivasi Paralel Multi-Agent (Prompt Simultan)</h3>
<p>
  Perintahkan beberapa agen bekerja bersamaan dalam satu prompt instruksi:
</p>
<pre><code>"Jalankan secara PARALEL sekarang:
1. @security: Audit file auth.ts terhadap celah session hijacking dan CSRF.
2. @qa: Buat test suite Vitest untuk mensimulasikan token kedaluwarsa.
3. @writer: Susun dokumentasi alur login OAuth2 untuk tim frontend."</code></pre>

<h3>Metode 3: Aktivasi Paralel via API Tool Call (Otomasi Terprogram)</h3>
<pre><code>{
  "name": "invoke_subagent",
  "args": {
    "Subagents": [
      {
        "TypeName": "self",
        "Role": "Database Optimizer",
        "Prompt": "Analisis query lambat pada tabel transaksi dan rekomendasikan indeks BRIN/GIN."
      },
      {
        "TypeName": "self",
        "Role": "Security Specialist",
        "Prompt": "Pindai seluruh dependency di package.json menggunakan [Skill: no-hallucinated-dependencies]."
      }
    ]
  }
}</code></pre>

<h2>5.3 Ringkasan Praktik Terbaik (Anti-Failure Rules)</h2>
<div class="callout callout-dark">
  <div style="color: #38bdf8; font-weight: 700; margin-bottom: 6px; font-size: 8.5pt;">5 ATURAN EMAS OPERASIONAL TITANIUM SWARM:</div>
  1. <strong>Jangan Pernah Gunakan Dummy Code:</strong> Larangan keras menulis <code>// TODO</code> atau mengabaikan blok catch. Semua kode harus fungsional nyata.<br>
  2. <strong>Cegah Halusinasi Dependensi:</strong> Selalu cek <code>package.json</code> sebelum mengimpor pustaka baru; jangan mengarang nama package.<br>
  3. <strong>Satu Penulis Kode (Single Writer):</strong> Dalam alur paralel, hanya satu agen yang boleh memodifikasi file target untuk mencegah konflik merge.<br>
  4. <strong>Lakukan Sync Memori Rutin:</strong> Ketik <code>/memory</code> sebelum mengakhiri sesi kerja agar konteks penting tidak lenyap di sesi berikutnya.<br>
  5. <strong>Jalankan Uji Edge-Case:</strong> Keberhasilan satu skenario happy path belum cukup; selalu sertakan 2 kasus pengujian ekstrem (input kosong, token expired).
</div>

<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b;">
  <div>Sistem: <strong>Freebuff Superpower Ultra v4.5</strong></div>
  <div>Status: <strong>Verified &amp; Certified Production Architecture</strong></div>
  <div>Lokasi: <strong>/home/firman/weblomba</strong></div>
</div>

</body>
</html>
"""

html_path = "/home/firman/weblomba/docs_titanium_swarm.html"
pdf_path = "/home/firman/weblomba/PANDUAN_TITANIUM_SWARM_SUBAGENTS_DAN_SKILLS.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML saved to {html_path}")
print("Rendering PDF via WeasyPrint...")
doc = weasyprint.HTML(filename=html_path)
doc.write_pdf(pdf_path)
print(f"SUCCESS! PDF rendered at {pdf_path}")
print(f"File size: {os.path.getsize(pdf_path) / 1024:.2f} KB")
