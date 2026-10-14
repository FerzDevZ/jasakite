# AI Coding Agent Benchmarking Standards

## Key Benchmark Metrics

| Metric | Industry Standard | Formula / Measurement |
|---|---|---|
| **Pass@1 (SWE-bench)** | `> 40% - 60%` | Single-attempt resolution of real GitHub issues |
| **Tool Calling Accuracy** | `> 98%` | Zero malformed JSON tool arguments or invalid paths |
| **File Edit Precision** | `> 95%` | Correct lines targeted without corrupting adjacent code |
| **Token Efficiency** | `< 40k tokens/task` | Average input/output token footprint per resolved task |
