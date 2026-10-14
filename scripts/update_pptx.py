#!/usr/bin/env python3
"""Update JASAKITE EMOSTFET11 deck: add 2 UX slides (latest features), renumber all."""
import copy, re
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

SRC = "ppt/JASAKITE-ULTIMATE-FINAL-EMOSTFET11.pptx"

# Design system (extracted from existing slides)
BG      = RGBColor(0xF7, 0xF5, 0xEE)
INK     = RGBColor(0x0A, 0x0A, 0x0A)
MUTED   = RGBColor(0x6E, 0x66, 0x5D)
ACCENT  = RGBColor(0xFF, 0x6B, 0x35)
CARD    = RGBColor(0xFF, 0xFF, 0xFF)
DIVIDER = RGBColor(0xE8, 0xE1, 0xD6)
FONT    = "Inter"

prs = Presentation(SRC)

def set_bg(slide, color):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color

def rect(slide, x, y, w, h, fill, line=None):
    from pptx.enum.shapes import MSO_SHAPE
    sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line; sh.line.width = Pt(0.75)
    sh.shadow.inherit = False
    return sh

def tb(slide, x, y, w, h, lines, align=PP_ALIGN.LEFT):
    """lines: list of (text, size_pt, color, bold) tuples -> one paragraph each."""
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    for i, (text, size, color, bold) in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = Pt(size * 1.4)
        r = p.add_run(); r.text = text
        r.font.name = FONT; r.font.size = Pt(size); r.font.bold = bold
        r.font.color.rgb = color
    return box

def chrome(slide, kicker, number, title_no, title_rest, subtitle):
    """Standard slide furniture: top rule, kicker, slide no, bottom rule, section title, accent bar, subtitle."""
    set_bg(slide, BG)
    rect(slide, 0.50, 0.35, 12.33, 0.012, INK)
    tb(slide, 0.50, 0.42, 6.0, 0.25, [(kicker, 7, MUTED, True)])
    tb(slide, 11.83, 0.42, 1.00, 0.25, [(number, 7, MUTED, True)], align=PP_ALIGN.RIGHT)
    rect(slide, 0.50, 7.05, 12.33, 0.012, DIVIDER)
    # section title: number orange + rest ink (two runs, one paragraph)
    box = slide.shapes.add_textbox(Inches(0.50), Inches(0.88), Inches(12.0), Inches(0.32))
    p = box.text_frame.paragraphs[0]; p.line_spacing = Pt(15.4)
    r1 = p.add_run(); r1.text = title_no + "  "
    r1.font.name = FONT; r1.font.size = Pt(11); r1.font.bold = True; r1.font.color.rgb = ACCENT
    r2 = p.add_run(); r2.text = title_rest
    r2.font.name = FONT; r2.font.size = Pt(11); r2.font.bold = True; r2.font.color.rgb = INK
    rect(slide, 0.50, 1.18, 0.60, 0.08, ACCENT)
    tb(slide, 0.50, 1.38, 12.0, 0.60, [(subtitle, 9, MUTED, False)])

def card(slide, x, label, v1, v2, bullets):
    y = 2.45
    rect(slide, x, y, 2.95, 4.10, CARD)
    tb(slide, x + 0.25, y + 0.30, 2.45, 0.20, [(label, 7, MUTED, True)])
    tb(slide, x + 0.25, y + 0.55, 2.45, 0.50, [(v1, 11, INK, True), (v2, 11, INK, True)])
    rect(slide, x + 0.25, y + 1.10, 0.50, 0.03, ACCENT)
    tb(slide, x + 0.25, y + 1.30, 2.45, 2.50, [(b, 9, MUTED, False) for b in bullets])

def make_slide(kicker, title_no, title_rest, subtitle, cards):
    layout = prs.slide_layouts[6]  # blank
    s = prs.slides.add_slide(layout)
    chrome(s, kicker, "№--/36", title_no, title_rest, subtitle)
    xs = [0.50, 3.75, 7.00, 10.25]
    for x, c in zip(xs, cards):
        card(s, x, *c)
    return s

# ---- New slide A: Navigasi & Orientasi ----
make_slide(
    "UX 30%  •  NAVIGASI & ORIENTASI",
    "08", "NAVIGASI — TIDAK PERNAH TERSASAR",
    "Breadcrumb di semua halaman + shortcut keyboard — pengguna selalu tahu posisinya dan jalan pulang",
    [
        ("BREADCRUMB", "Semua Halaman", "12 Rute", [
            "• Beranda › Jasa › Detail › Checkout",
            "• auth-breadcrumb di login/register",
            "• otomatis via DashboardShell",
            "• file: components/layout/breadcrumb.tsx",
        ]),
        ("SHORTCUT", "\"/\" Search", "Keyboard-First", [
            "• tekan / → fokus pencarian instan",
            "• arrow keys memindah kartu kanban",
            "• Esc menutup semua modal",
            "• fokus ter-trap di dialog (Radix)",
        ]),
        ("WELCOME MODAL", "Per Role", "3 Variasi", [
            "• muncul sekali per role, bukan global",
            "• key: jasakite-welcomed-{role}",
            "• checklist onboarding di dashboard",
            "• file: components/dashboard/welcome-modal.tsx",
        ]),
        ("RECENT SEARCH", "localStorage", "Riwayat Cerdas", [
            "• pencarian terakhir tersimpan",
            "• dropdown saran saat fokus",
            "• clear history satu klik",
            "• file: components/layout/search-bar.tsx",
        ]),
    ],
)

# ---- New slide B: Polish & Delight ----
make_slide(
    "UX 30%  •  POLISH & DELIGHT",
    "09", "POLISH — DETAIL YANG DIRASAKAN",
    "Transisi, micro-interaction, dan aksesibilitas live — kualitas yang juri rasakan dalam 5 menit demo",
    [
        ("CROSSFADE", "Skeleton → Konten", "0.4s Expo-Out", [
            "• animate-content-in: fade + slide 8px",
            "• 10 halaman utama konsisten",
            "• tanpa 'pop' kasar saat konten masuk",
            "• hormat prefers-reduced-motion",
        ]),
        ("MICRO-INTERACTION", "active:scale-95", "Press Feedback", [
            "• chip filter menekan saat diklik",
            "• heart pulse saat simpan jasa",
            "• hover state di semua elemen",
            "• file: components/services/*.tsx",
        ]),
        ("SCROLL-TO-TOP", "Auto > 500px", "Anti-Overlap", [
            "• muncul setelah 500px scroll",
            "• hidden di mobile < lg — tak tabrak CTA",
            "• smooth scroll ke atas",
            "• file: components/layout/scroll-to-top.tsx",
        ]),
        ("LIVE REGION", "aria-live", "Screen Reader", [
            "• notifikasi dibacakan otomatis",
            "• status dinamis diumumkan SR",
            "• kontras diuji test otomatis",
            "• file: components/layout/notification-bell.tsx",
        ]),
    ],
)

# ---- Reorder: move the 2 new slides to positions 10 & 11 (after Katalog) ----
sldIds = prs.slides._sldIdLst
ids = list(sldIds)
new_a, new_b = ids[-2], ids[-1]
sldIds.remove(new_a); sldIds.insert(9, new_a)
sldIds.remove(new_b); sldIds.insert(10, new_b)

# ---- Renumber everything ----
total = len(prs.slides)  # 36
num_re = re.compile(r"^№\d{2}/\d+$")
sec_re = re.compile(r"^(\d{2})(\s{2}.+)$", re.S)

for idx, slide in enumerate(prs.slides, 1):
    for sh in slide.shapes:
        if not sh.has_text_frame:
            continue
        tf = sh.text_frame
        txt = tf.text.strip()
        # slide number chip
        if num_re.match(txt):
            for p in tf.paragraphs:
                for r in p.runs:
                    if num_re.match(r.text.strip()):
                        r.text = f"№{idx:02d}/{total}"
            continue
        # section number prefix
        m = sec_re.match(txt)
        if m and idx >= 3:
            new_no = f"{idx - 2:02d}"
            # rewrite first run(s): find run containing the old number
            for p in tf.paragraphs:
                for r in p.runs:
                    if re.match(r"^\d{2}\s{2}", r.text):
                        r.text = new_no + r.text[2:]
                        break
                else:
                    continue
                break

# ---- Fix stale references ----
for slide in prs.slides:
    for sh in slide.shapes:
        if not sh.has_text_frame:
            continue
        for p in sh.text_frame.paragraphs:
            for r in p.runs:
                if "34 Slide" in r.text:
                    r.text = r.text.replace("34 Slide", "36 Slide")
                if "DOKUMEN PDF HAL 4" in r.text:
                    r.text = r.text.replace("DOKUMEN PDF HAL 4", "DOKUMEN PDF HAL 3")

prs.save(SRC)
print(f"Saved {SRC} with {total} slides")
