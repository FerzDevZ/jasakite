---
name: ai-guardrails-nemo-llamaguard-hardening
description: Harden AI endpoints with NeMo Guardrails, Llama-Guard 3, PII redaction, prompt injection defense, and output schema validation.
---

# 🛡️ AI Guardrails & Llama-Guard 3 Hardening

This skill establishes multi-layered defense shields protecting AI endpoints against jailbreaks, prompt injections, and PII leakage.

---

## 🎯 Production Invariants
1. Validate inputs before LLM inference using a fast safety classifier (Llama-Guard 3 1B / 8B).
2. Scrub PII (Personally Identifiable Information) before saving to prompts or vector databases.
3. Enforce strict output schema validation (Pydantic / JSON Schema) to prevent jailbreak text output.

---

## 💻 Llama-Guard 3 Classification Guard

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

model_id = "meta-llama/Llama-Guard-3-1B"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.bfloat16, device_map="auto")

def evaluate_safety(user_prompt: str) -> bool:
    conversation = [
        {"role": "user", "content": user_prompt}
    ]
    input_ids = tokenizer.apply_chat_template(conversation, return_tensors="pt").to("cuda")
    output = model.generate(input_ids=input_ids, max_new_tokens=10)
    response = tokenizer.decode(output[0][input_ids.shape[1]:], skip_special_tokens=True).strip()
    
    # Response returns "safe" or "unsafe\nS1..."
    is_safe = response.startswith("safe")
    return is_safe

print("Safety Check Result:", evaluate_safety("Help me write an automated unit test suite."))
```
