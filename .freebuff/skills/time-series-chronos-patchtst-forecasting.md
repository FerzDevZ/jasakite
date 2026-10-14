---
name: time-series-chronos-patchtst-forecasting
description: Multi-horizon time series forecasting using Amazon Chronos foundation models, PatchTST, and statistical conformal prediction intervals.
---

# 📈 Time Series Foundation Models & Conformal Forecasting

This skill implements multi-horizon forecasting using pretrained time series foundation models (Amazon Chronos) and transformer architectures.

---

## 🎯 Production Invariants
1. Decompose input signals into trend, seasonality, and residual components (STL).
2. Generate probabilistic prediction intervals (10th, 50th, 90th quantiles) for risk management.
3. Benchmark against classical baselines (AutoARIMA, Prophet) to ensure foundation models add value.

---

## 💻 Amazon Chronos Zero-Shot Forecasting (`chronos_forecast.py`)

```python
import torch
import numpy as np
import pandas as pd
from chronos import ChronosPipeline

# 1. Load Pretrained Time Series Foundation Model
pipeline = ChronosPipeline.from_pretrained(
    "amazon/chronos-t5-small",
    device_map="cuda" if torch.cuda.is_available() else "cpu",
    torch_dtype=torch.bfloat16,
)

# 2. Prepare Context (e.g. historical sales)
context = torch.tensor([120, 135, 142, 150, 160, 155, 170, 185, 190, 210], dtype=torch.float32)

# 3. Forecast Next 8 Steps with 100 Samples
prediction_length = 8
forecast = pipeline.predict(context, prediction_length, num_samples=100)

# 4. Extract Median and Prediction Intervals
low, median, high = np.percentile(forecast[0].numpy(), [10, 50, 90], axis=0)

print(f"10th Percentile (Conservative): {low}")
print(f"50th Percentile (Median):       {median}")
print(f"90th Percentile (Optimistic):   {high}")
print("✅ Probabilistic time series forecast generated successfully.")
```
