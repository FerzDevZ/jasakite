#!/usr/bin/env python3
"""Fix audit findings: placeholder chips, agenda ranges, stale footer, geometry polish."""
import re
from pptx import Presentation
from pptx.util import Inches

SRC = "ppt/JASAKITE-ULTIMATE-FINAL-EMOSTFET11.pptx"
prs = Presentation(SRC)
fixes = []

# --- 1. Replace №--/36 placeholders on new slides 10 & 11 + match original chip geometry ---
for idx, num in [(9, 10), (10, 11)]:
    for sh in prs.slides[idx].shapes:
        if sh.has_text_frame and "№--" in sh.text_frame.text:
            for p in sh.text_frame.paragraphs:
                for r in p.runs:
                    if "№--" in r.text:
                        r.text = f"№{num:02d}/36"
            sh.left = Inches(12.13)
            sh.width = Inches(0.70)
            fixes.append(f"slide {idx+1}: chip -> №{num:02d}/36 @ (12.13,0.42,0.70)")

# --- 2. Agenda ranges on slide 2 (slide positions shifted +2 after insertion) ---
RANGES = {"08–13": "08–14", "14–16": "15–16", "17–21": "17–23", "22–34": "24–36"}
for sh in prs.slides[1].shapes:
    if not sh.has_text_frame:
        continue
    for p in sh.text_frame.paragraphs:
        for r in p.runs:
            if r.text.strip() in RANGES:
                old = r.text
                r.text = RANGES[r.text.strip()]
                fixes.append(f"slide 2: agenda range {old.strip()} -> {r.text.strip()}")

# --- 3. Slide 36 footer: '34 slide' -> '36 slide' ---
for sh in prs.slides[35].shapes:
    if not sh.has_text_frame:
        continue
    for p in sh.text_frame.paragraphs:
        for r in p.runs:
            if "34 slide" in r.text:
                r.text = r.text.replace("34 slide", "36 slide")
                fixes.append("slide 36: '34 slide' -> '36 slide'")

# --- 4. New-slide geometry polish: section title y 0.88 -> 0.90, h 0.32 -> 0.30 ---
for idx in (9, 10):
    for sh in prs.slides[idx].shapes:
        if sh.has_text_frame:
            t = sh.text_frame.text.strip()
            if re.match(r"^(08|09)\s{2}", t):
                sh.top = Inches(0.90)
                sh.height = Inches(0.30)
                fixes.append(f"slide {idx+1}: title box y->0.90 h->0.30")

prs.save(SRC)
print(f"{len(fixes)} fixes applied:")
for f in fixes:
    print("  -", f)
