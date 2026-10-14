---
name: llm-evals-deepeval-ragas-judge
description: Quantify AI accuracy, faithfulness, hallucination, and answer relevance using DeepEval, RAGAS, and calibrated LLM-as-a-Judge.
---

# 📊 LLM Evals, RAGAS & DeepEval Benchmarking

This skill provides automated quantitative evaluation metrics for production AI applications.

---

## 🎯 Production Invariants
1. Evaluate every RAG pipeline across the core triad: Faithfulness, Answer Relevancy, and Context Precision.
2. Automate CI/CD test gates: fail test suites if Faithfulness < 0.90.
3. Swap prompt position ordering when using pairwise LLM judges to eliminate positional bias.

---

## 💻 DeepEval Test Suite (`test_rag_pipeline.py`)

```python
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric

def test_customer_support_rag():
    test_case = LLMTestCase(
        input="How do I reset my API key?",
        actual_output="Navigate to Settings -> API Keys and click 'Regenerate Key'.",
        retrieval_context=["To reset an API key, users must visit the Settings page under API Keys and select 'Regenerate Key'."],
    )
    
    faithfulness = FaithfulnessMetric(threshold=0.9, model="gpt-4o")
    relevancy = AnswerRelevancyMetric(threshold=0.85, model="gpt-4o")
    
    assert_test(test_case, [faithfulness, relevancy])
```
