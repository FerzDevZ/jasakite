---
name: onnx-tensorrt-quantization-pipeline
description: Export PyTorch models to ONNX and compile high-speed INT8 / FP16 TensorRT engines with calibration datasets for edge and server inference.
---

# ⚡ ONNX & TensorRT Quantization Pipeline

This skill converts deep learning models into optimized INT8 and FP16 execution graphs using ONNX Runtime and NVIDIA TensorRT.

---

## 🎯 Production Invariants
1. Use `torch.onnx.export` with dynamic axes for variable batch and sequence lengths.
2. Optimize graph topology using `onnxslim` and constant folding before TensorRT compilation.
3. Perform INT8 Post-Training Quantization (PTQ) using a representative calibration dataset.

---

## 💻 ONNX Export & TensorRT Compilation (`export_trt.py`)

```python
import torch
import torchvision.models as models

# 1. Export PyTorch Model to ONNX
model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT).eval().cuda()
dummy_input = torch.randn(1, 3, 224, 224, device="cuda")

torch.onnx.export(
    model,
    dummy_input,
    "resnet50.onnx",
    export_params=True,
    opset_version=17,
    do_constant_folding=True,
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
)
print("✅ ONNX export successful: resnet50.onnx")

# 2. Compile to TensorRT FP16 Engine via CLI
# Command:
# trtexec --onnx=resnet50.onnx --saveEngine=resnet50.engine --fp16 --minShapes=input:1x3x224x224 --optShapes=input:8x3x224x224 --maxShapes=input:32x3x224x224
print("✅ Ready to build TensorRT engine with trtexec.")
```
