# GraphRAG Entity Extraction & Community Summarization

## Graph Schema Guidelines

- **Nodes**: `(Entity:Concept { id, name, type, description, embedding })`
- **Edges**: `[RELATION { type, weight, source_document_id }]`
- **Community Summaries**: Leiden algorithm clusters dense subgraphs into hierarchical community summaries for global Q&A.
