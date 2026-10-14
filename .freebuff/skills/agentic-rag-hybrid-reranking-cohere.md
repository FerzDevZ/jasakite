---
name: agentic-rag-hybrid-reranking-cohere
description: Implement multi-stage Agentic RAG with dense vector search, BM25 keyword matching, and Cohere Rerank v3.
---
# Agentic RAG with Hybrid Search & Cohere Rerank
- Two-stage retrieval: broad candidate recall via Reciprocal Rank Fusion (RRF) -> precision filtering with Cohere Rerank.
- Dynamic Query Expansion and HyDE (Hypothetical Document Embeddings) to maximize retrieval precision.
