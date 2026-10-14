---
name: rlhf-grpo-deepseek-r1-alignment
description: Implement Group Relative Policy Optimization (GRPO) for reasoning LLMs (DeepSeek-R1 style) without a critic network using verifier reward functions.
---

# 🧠 GRPO (Group Relative Policy Optimization) for Reasoning LLMs

This skill equips engineers to implement the DeepSeek-R1 style alignment technique, sampling groups of responses and estimating advantages relatively without training a separate critic/value network.

---

## 🎯 Production Invariants
1. Generate a group of \(G\) candidate outputs per input prompt (\(G \ge 4\)).
2. Compute reward scores \(R = [r_1, r_2, \dots, r_G]\) using rule-based/verifier functions (e.g. math correctness, test pass).
3. Normalize rewards to derive relative advantages: \(A_i = \frac{r_i - \text{mean}(R)}{\text{std}(R) + \epsilon}\).
4. Apply clipped surrogate objective with KL divergence regularization against the reference model.

---

## 💻 GRPO Loss Calculation (`grpo_loss.py`)

```python
import torch
import torch.nn.functional as F

def compute_grpo_loss(
    log_probs: torch.Tensor,       # [B, G, T] Log probs of policy model
    old_log_probs: torch.Tensor,   # [B, G, T] Log probs from sampling
    ref_log_probs: torch.Tensor,   # [B, G, T] Log probs of frozen reference model
    rewards: torch.Tensor,         # [B, G] Group rewards
    mask: torch.Tensor,            # [B, G, T] Token mask
    clip_eps: float = 0.2,
    beta: float = 0.04,
) -> torch.Tensor:
    # 1. Compute Relative Advantage per group
    mean = rewards.mean(dim=1, keepdim=True)
    std = rewards.std(dim=1, keepdim=True) + 1e-8
    advantages = ((rewards - mean) / std).unsqueeze(-1) # [B, G, 1]

    # 2. Probability Ratio
    ratio = torch.exp(log_probs - old_log_probs)
    surr1 = ratio * advantages
    surr2 = torch.clamp(ratio, 1.0 - clip_eps, 1.0 + clip_eps) * advantages
    policy_loss = -torch.min(surr1, surr2)

    # 3. KL Penalty against reference model: D_KL = exp(ref - pol) - (ref - pol) - 1
    kl = torch.exp(ref_log_probs - log_probs) - (ref_log_probs - log_probs) - 1.0
    total_loss = (policy_loss + beta * kl) * mask

    return total_loss.sum() / mask.sum()

print("✅ GRPO loss module compiled for mathematical and reasoning post-training.")
```
