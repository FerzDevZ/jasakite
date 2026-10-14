---
name: graphrag-hybrid-reranking-pipeline
description: Eliminate hallucination with GraphRAG (Neo4j knowledge graphs), BM25 + dense hybrid search with RRF, and cross-encoder rerankers.
---

# 🌐 GraphRAG & Hybrid Search Reranking

This skill implements knowledge-graph-augmented retrieval, BM25 lexical search, vector similarity, and Cohere/BGE cross-encoders.

---

## 🎯 Production Invariants
1. **Reciprocal Rank Fusion (RRF)**: Blend lexical BM25 and vector semantic ranks using standard RRF formula (\(RRF(d) = \sum \frac{1}{60 + r_i(d)}\)).
2. **Cross-Encoder Filter**: Prune top-20 retrieved candidates down to top-5 most relevant context snippets using a cross-encoder.
3. **Graph Traversal**: Expand entities with 1-hop and 2-hop graph relationships from Neo4j.

---

## 💻 Hybrid Search with RRF Fusion (`hybrid_rrf.py`)

```python
from collections import defaultdict

def reciprocal_rank_fusion(dense_results: list[str], sparse_results: list[str], k: int = 60) -> list[tuple[str, float]]:
    scores = defaultdict(float)
    
    for rank, doc_id in enumerate(dense_results):
        scores[doc_id] += 1.0 / (k + rank + 1)
        
    for rank, doc_id in enumerate(sparse_results):
        scores[doc_id] += 1.0 / (k + rank + 1)
        
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ranked

dense_top = ["doc_A", "doc_B", "doc_C"]
sparse_top = ["doc_B", "doc_D", "doc_A"]

fused = reciprocal_rank_fusion(dense_top, sparse_top)
print("RRF Fused Top-K:", fused)
```
