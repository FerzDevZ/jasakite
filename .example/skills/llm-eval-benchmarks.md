# LLM-as-a-Judge Evaluation & Prompt Calibration

## Evaluation Metrics Taxonomy

| Metric | Target | Formula / Method |
|---|---|---|
| **Format Validity** | `100%` | JSON schema validation via Pydantic/Zod |
| **Grounding / Faithfulness** | `> 0.95` | Claims in answer supported directly by source context |
| **Conciseness** | `> 0.90` | Token count ratio vs gold standard reference (no waffle) |
| **Negative Rejection** | `100%` | Model correctly answers "I don't have enough information" when context lacks facts |

## Judge Prompt Template
```markdown
You are an impartial evaluation judge. Rate the following model response based strictly on factual accuracy and adherence to instructions on a scale of 1 to 5.
[Criteria]:
- Score 5: Fully accurate, concise, strictly adheres to JSON format.
- Score 1: Hallucinated claims, format violations, or conversational filler.
```
