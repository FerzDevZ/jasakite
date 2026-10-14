---
name: computer-vision-yolov11-object-detection
description: Train, evaluate, and export state-of-the-art YOLOv11 and RT-DETR models for real-time object detection, segmentation, and TensorRT deployment.
---

# 👁️ Computer Vision with YOLOv11 & Edge Deployment

This skill provides an end-to-end computer vision pipeline for real-time object detection and instance segmentation using YOLOv11.

---

## 🎯 Production Invariants
1. Train with Albumentations augmentations (Mosaic, MixUp, RandomHSV) to maximize mAP@50-95.
2. Evaluate with validation confusion matrices and per-class PR curves.
3. Export trained weights to ONNX and TensorRT (`.engine`) with half precision (FP16) for real-time inference (>60 FPS).

---

## 💻 Training & Export Script (`train_yolo.py`)

```python
from ultralytics import YOLO

# 1. Load Pretrained YOLOv11 Model
model = YOLO("yolo11m.pt")

# 2. Train on Custom Dataset
results = model.train(
    data="dataset.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    device=0,
    optimizer="AdamW",
    lr0=1e-3,
    lrf=0.01,
    weight_decay=0.0005,
    save=True,
    project="cv_perception",
    name="yolo11m_custom",
)

# 3. Validate
metrics = model.val()
print(f"mAP@50: {metrics.box.map50:.4f}")
print(f"mAP@50-95: {metrics.box.map:.4f}")

# 4. Export to TensorRT Engine for Maximum Inference Speed
success = model.export(format="engine", half=True, dynamic=False, device=0)
print("✅ YOLOv11 exported to TensorRT engine successfully.")
```
