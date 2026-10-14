---
name: synthetic-dataset-pipeline-dspy
description: Build synthetic instruction datasets using DSPy teleprompters, evolutionary complexity scaling (Evol-Instruct), and quality filters.
---

# 🧬 Synthetic Dataset Engineering & DSPy Optimization

This skill establishes automated synthetic data generation, quality filtering, and prompt optimization via DSPy.

---

## 🎯 Production Invariants
1. Implement iterative complexity mutations: add constraints, deepen domain reasoning, reverse engineer solutions.
2. Scrub model refusal patterns ("As an AI...", "Sure, here is...") using regex and semantic filters.
3. Deduplicate dataset prompts using MinHash LSH before feeding into training loops.

---

## 💻 DSPy Synthetic Generator (`dspy_generator.py`)

```python
import dspy
from pydantic import BaseModel, Field

# Configure Teacher Model
lm = dspy.LM('openai/gpt-4o', api_key="sk-...")
dspy.configure(lm=lm)

class CodingTask(BaseModel):
    difficulty: str = Field(description="Junior, Senior, or Staff")
    domain: str = Field(description="Distributed Systems, Compilers, or Web")

class EvolvedExercise(BaseModel):
    problem_statement: str
    constraints: list[str]
    solution_code: str
    unit_tests: str

class SyntheticExerciseGenerator(dspy.Signature):
    """Generate an industry-grade coding problem with realistic edge-cases and tests."""
    task_spec: CodingTask = dspy.InputField()
    exercise: EvolvedExercise = dspy.OutputField()

generator = dspy.Predict(SyntheticExerciseGenerator)
result = generator(task_spec=CodingTask(difficulty="Staff", domain="Distributed Systems"))

print("Problem:", result.exercise.problem_statement)
print("Constraints:", result.exercise.constraints)
```
