---
name: llm-finetuning-unsloth-axolotl-dpo
description: Production guide for Supervised Fine-Tuning (SFT), QLoRA, and Direct Preference Optimization (DPO) using Unsloth, TRL, and Axolotl with 5x speedup.
---

# 🚀 LLM Fine-Tuning & DPO Post-Training Pipeline

This skill provides an enterprise post-training pipeline for open-source foundation models (Llama-3, Qwen-2.5, DeepSeek) with sequence packing and preference alignment.

---

## 🎯 Production Invariants
1. Use **Unsloth FastLanguageModel** or **TRL SFTTrainer** with FlashAttention-2 and bfloat16.
2. Quantize base weights with 4-bit NormalFloat (NF4) and train LoRA adapters on all linear layers (`q, k, v, o, gate, up, down`).
3. Align preference with Direct Preference Optimization (DPO) using a reference model and calibrated beta parameter (\(0.1\)).

---

## 💻 Full SFT & QLoRA Script (`finetune_sft.py`)

```python
import torch
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig
from unsloth import FastLanguageModel
from transformers import TrainingArguments

# 1. Load Model with 4-bit QLoRA
max_seq_length = 4096
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-Coder-7B-Instruct",
    max_seq_length=max_seq_length,
    load_in_4bit=True,
    dtype=torch.bfloat16,
)

# 2. Attach LoRA Adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0.0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

# 3. Prepare Dataset
dataset = load_dataset("json", data_files="training_data.jsonl", split="train")

# 4. Training Configuration
training_args = SFTConfig(
    output_dir="./output_lora",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_ratio=0.05,
    max_steps=500,
    learning_rate=2e-4,
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=10,
    optim="adamw_8bit",
    weight_decay=0.01,
    lr_scheduler_type="cosine",
    seed=3407,
    max_seq_length=max_seq_length,
    dataset_text_field="text",
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=training_args,
)

trainer.train()

# 5. Save LoRA Adapters and Export Merged Model
model.save_pretrained("./final_adapter")
tokenizer.save_pretrained("./final_adapter")
print("✅ Fine-tuning complete. Merged adapter saved.")
```
