# QLoRA 4-bit Quantized Fine-Tuning

- Base Model: Llama-3-8B-Instruct (4-bit NF4)
- LoRA Rank $r = 16$, $\alpha = 32$, Target Modules: `q_proj, k_proj, v_proj, o_proj`
