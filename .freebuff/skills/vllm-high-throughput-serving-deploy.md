---
name: vllm-high-throughput-serving-deploy
description: Deploy high-throughput, low-latency LLM inference engines using vLLM, continuous batching, prefix caching, and speculative decoding.
---

# ⚡ vLLM High-Throughput Serving & Optimization

This skill configures enterprise-grade LLM inference servers with PagedAttention, KV cache prefix sharing, and sub-10ms TTFT.

---

## 🎯 Production Invariants
1. Always enable `--enable-prefix-caching` for multi-turn chat and repeated context.
2. Set `--gpu-memory-utilization 0.92` to maximize KV-cache token capacity without OOM.
3. Use `--chunked-prefill` to prevent latency spikes on concurrent user requests.

---

## 🐳 Production Docker & CLI Deployment

```bash
#!/usr/bin/env bash
# Deploy Qwen 2.5 Coder 32B with Tensor Parallelism across 2 GPUs
python3 -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-Coder-32B-Instruct \
  --tensor-parallel-size 2 \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.92 \
  --enable-prefix-caching \
  --enable-chunked-prefill \
  --max-num-seqs 256 \
  --dtype bfloat16 \
  --port 8000 \
  --host 0.0.0.0
```

## 💻 Client Streaming Request (Python)

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="token-vllm")

response = client.chat.completions.create(
    model="Qwen/Qwen2.5-Coder-32B-Instruct",
    messages=[{"role": "user", "content": "Write a high-performance LRU cache in Rust"}],
    stream=True,
    temperature=0.2,
)

for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)
```
