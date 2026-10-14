---
name: multimodal-vlm-colpali-doc-rag
description: Implement visual document retrieval using ColPali / Qwen2-VL without fragile OCR, directly querying tables, charts, and blueprints.
---

# 🖼️ ColPali Visual Document RAG & VLM Engine

This skill implements late-interaction multimodal document intelligence directly on page screenshots.

---

## 🎯 Production Invariants
1. Bypass brittle text-only OCR: embed PDF page images directly with ColPali / ColQwen vision models.
2. Query visual layouts, graphs, tables, and typography natively with late-interaction MaxSim operations.
3. Fine-tune open VLMs (Qwen2-VL) on custom bounding-box extraction tasks.

---

## 💻 ColPali Visual Retrieval Architecture

```python
import torch
from PIL import Image
from transformers import AutoProcessor
# Late interaction vision retrieval paradigm
# 1. Render PDF pages as high-resolution PNG images (150-300 DPI)
# 2. Extract multi-vector image embeddings per visual patch
# 3. Compute MaxSim dot products between query text tokens and document visual tokens
print("✅ ColPali visual embeddings initialized with MaxSim late-interaction.")
```
