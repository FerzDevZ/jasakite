# RAG Chunking Strategies & Evaluation Metrics

## 1. Chunking Techniques

| Technique | Size / Overlap | Best Used For |
|---|---|---|
| **Recursive Character / Markdown** | 500-1000 tokens, 10-15% overlap | Technical documentation, API specs, Markdown repos. |
| **Hierarchical / Parent-Child** | Small child chunks (200 tokens) linked to Parent (1500 tokens) | Precise search matching with full surrounding context for generation. |
| **Semantic Splitter** | Dynamic based on cosine distance threshold | Unstructured essays, transcripts, continuous prose. |

## 2. Ragas Evaluation Metrics

- **Context Precision**: Signal-to-noise ratio in retrieved chunks.
- **Context Recall**: Does the retrieved context contain all facts required to answer the prompt?
- **Faithfulness**: Are all claims in the generated response strictly grounded in context?
- **Answer Relevance**: Does the generated text address the user's explicit question?
