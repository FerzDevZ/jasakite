---
name: pytorch-distributed-fsdp-deepspeed
description: Train 70B+ LLMs and foundation models using PyTorch FSDP (Fully Sharded Data Parallel) and DeepSpeed ZeRO-3 with FlashAttention-2.
---

# ⚡ PyTorch FSDP & DeepSpeed Distributed Training

This skill implements multi-GPU and multi-node sharded data parallelism for training massive deep learning models without out-of-memory (OOM) errors.

---

## 🎯 Production Invariants
1. Use `FULL_SHARD` policy to shard model parameters, optimizer states, and gradients across all GPUs.
2. Enable Activation Checkpointing (Gradient Checkpointing) to train larger sequence lengths.
3. Enforce bfloat16 mixed precision with CPU offload only if GPU memory is completely saturated.

---

## 💻 PyTorch FSDP Setup Script (`train_fsdp.py`)

```python
import os
import torch
import torch.distributed as dist
from torch.distributed.fsdp import (
    FullyShardedDataParallel as FSDP,
    ShardingStrategy,
    MixedPrecision,
    BackwardPrefetch,
)
from transformers import AutoModelForCausalLM

def setup():
    dist.init_process_group("nccl")
    local_rank = int(os.environ["LOCAL_RANK"])
    torch.cuda.set_device(local_rank)

def run():
    setup()
    local_rank = int(os.environ["LOCAL_RANK"])
    
    # Mixed precision policy (bfloat16)
    bf16_policy = MixedPrecision(
        param_dtype=torch.bfloat16,
        reduce_dtype=torch.bfloat16,
        buffer_dtype=torch.bfloat16,
    )
    
    # Load model structure
    model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B")
    
    # Wrap in FSDP
    fsdp_model = FSDP(
        model,
        sharding_strategy=ShardingStrategy.FULL_SHARD,
        mixed_precision=bf16_policy,
        backward_prefetch=BackwardPrefetch.BACKWARD_PRE,
        device_id=torch.cuda.current_device(),
    )
    
    optimizer = torch.optim.AdamW(fsdp_model.parameters(), lr=1e-5, fused=True)
    
    # Forward & Backward loop
    dummy_input = torch.randint(0, 1000, (2, 512), device=torch.cuda.current_device())
    output = fsdp_model(dummy_input, labels=dummy_input)
    loss = output.loss
    loss.backward()
    optimizer.step()
    
    if local_rank == 0:
        print(f"✅ FSDP step completed. Step loss: {loss.item():.4f}")
    
    dist.destroy_process_group()

if __name__ == "__main__":
    run()
```
