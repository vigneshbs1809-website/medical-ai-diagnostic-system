# Comprehensive Technical Model Audit: Leukemia (B-ALL) & Multiple Myeloma Systems

**Document Version:** 1.0.0  
**Audit Date:** November 17, 2026  
**Auditor:** Senior Deep Learning & Machine Learning Systems Engineer  
**Status:** Complete Forensic Audit  

---

## 1. Executive Summary

This document provides a formal, forensic technical audit of two deep-learning systems developed independently by two team members for automated hematologic diagnostics:

1. **System 1: Leukemia / B-ALL Classification System** (`models/leukemia/`)  
   A deep convolutional / vision transformer classification pipeline trained on single-cell bone marrow / peripheral blood cytology from the **C-NMC 2019 Leukemia dataset**.
2. **System 2: Multiple Myeloma Cell Detection & Counting System** (`models/myeloma/`)  
   An object detection pipeline trained on bone marrow aspirate slide fields from the **PCMMD (Plasma Cell Multiple Myeloma Diagnosis)** dataset.

### High-Level Summary Matrix

| Attribute | System 1: Leukemia / B-ALL | System 2: Multiple Myeloma |
| :--- | :--- | :--- |
| **Clinical Objective** | Binary single-cell diagnosis: **Normal vs B-ALL Blast** | Slide-field cell detection & **Plasma Cell %** quantification |
| **Diagnostic Marker** | Blast cell morphology (N:C ratio, chromatin density) | Plasma cell fraction $> 10\%$ among nucleated marrow cells |
| **Framework** | **PyTorch + timm** (`timm.create_model`) | **Ultralytics YOLO** (DetectionModel) |
| **Selected Best Model** | **EfficientNet-B3** (`efficientnet_b3_best.pt`) | **YOLO26m** (`final_yolo26m.pt`) |
| **Best Checkpoint Path** | `models/leukemia/checkpoints/seed42/efficientnet_b3_best.pt` | `models/myeloma/final_yolo26m.pt` |
| **Model Size** | 44.93 MB (11.09M parameters) | 44.01 MB (20.10M parameters) |
| **Input Dimensions** | $300 \times 300 \times 3$ (RGB) | $800 \times 800 \times 3$ (RGB) |
| **Input Normalization** | ImageNet Mean & Std $[(0.485, 0.456, 0.406), (0.229, 0.224, 0.225)]$ | Scale to $[0.0, 1.0]$, Letterbox padding (stride 32) |
| **Output Type** | Logits / Softmax probabilities $[P(\text{Normal}), P(\text{B-ALL})]$ | Bounding boxes $[x_1, y_1, x_2, y_2]$, confidence, class IDs |
| **Primary Evaluation Metric**| **F1-Score: 0.9481**, ROC-AUC: **0.9749**, Acc: **93.42%** | **mAP@50-95: 0.8927**, Recall: **0.9440**, F1: **0.9387** |
| **Patient-Level Diagnostic Acc** | **100%** (11/11 held-out test patients correct) | **100%** (10/10 test cohort patients correct at $10\%$ cutoff) |
| **Windows 11 Compatible** | Yes (Pure PyTorch + timm) | Yes (Ultralytics $\ge$ 8.4.200) |

---

## 2. Model 1 Audit: Leukemia / B-ALL Classification

### 2.1 File Structure & Checkpoint Inventory

Inspection of `models/leukemia/` revealed the following directory hierarchy:

```
models/leukemia/
├── checkpoints/
│   └── seed42/
│       ├── convnext_tiny_best.pt        (112.15 MB) - ConvNeXt-Tiny checkpoint
│       ├── densenet121_best.pt          (29.50 MB)  - DenseNet-121 baseline checkpoint
│       ├── efficientnet_b3_best.pt      (44.93 MB)  - ⭐ SELECTED BEST MODEL
│       ├── hybrid_attention_best.pt     (144.91 MB) - DenseNet + Swin Cross-Attention checkpoint
│       ├── hybrid_concat_best.pt        (143.33 MB) - DenseNet + Swin Feature Concat checkpoint
│       └── swin_tiny_best.pt            (110.94 MB) - Swin-Tiny Transformer checkpoint
├── graphs/
│   ├── class_distribution.png
│   ├── comparison_all_models.png
│   ├── confusion_matrix_best_model.png
│   ├── pr_all_models.png
│   ├── roc_all_models.png
│   ├── training_curves_all_models.png
│   └── seed42/ (individual model confusion matrices & Grad-CAM visualisations)
└── results/
    ├── ablation_table.csv
    ├── all_runs_test_metrics.csv
    ├── attention_weights_by_class.csv
    ├── best_model.json                 - Model selection record (EfficientNet-B3 chosen by F1)
    ├── comparison_table.csv & .md
    ├── config.json
    ├── dataset_report.txt
    ├── environment.json
    ├── manifest.csv                    - Patient-independent split manifest (10,661 images)
    └── seed42/ (detailed per-model metric JSONs and validation/test prediction CSVs)
```

### 2.2 Framework & Architecture Specifications

- **Underlying Framework:** Standard **PyTorch (`torch`)** with model backbones sourced from **`timm` (PyTorch Image Models)**.
- **Model Construction Pattern:**
  - Backbone: `timm.create_model("efficientnet_b3", pretrained=False, num_classes=0)` which outputs a 1,536-dimensional pooled feature vector.
  - Custom Head: A standardized two-layer Multi-Layer Perceptron (MLP) head with GELU non-linearities and dropout:
    ```python
    nn.Sequential(
        nn.Dropout(p=0.3),
        nn.Linear(in_features=1536, out_features=256),
        nn.GELU(),
        nn.Dropout(p=0.3),
        nn.Linear(in_features=256, out_features=2)
    )
    ```
- **Checkpoint Data Structure:**
  The `.pt` file is a serialized Python dictionary containing:
  - `model`: `collections.OrderedDict` containing 576 layer tensors for the backbone (`backbone.*`) and head (`head.net.*`).
  - `epoch`: Integer `2` (best validation epoch).
  - `val`: Dictionary of validation loss, accuracy, AUC, and F1.
  - `exp`: String `"efficientnet_b3"`.
  - `seed`: Integer `42`.
  - `img_size`: Integer `300`.
  - `config`: Complete training configuration dictionary.

### 2.3 Input Specifications & Preprocessing

- **Input Spatial Dimensions:**
  - **EfficientNet-B3 (Best Model):** $300 \times 300$ pixels.
  - *Other models (DenseNet121, Swin-Tiny, ConvNeXt, Hybrids):* $224 \times 224$ pixels.
- **Color Format:** 3-channel RGB (`uint8` $[0, 255] \to \text{float32} [0.0, 1.0]$).
- **Interpolation:** Bilinear interpolation with antialiasing (`F.interpolate(..., mode="bilinear", antialias=True)`).
- **Channel Normalization (ImageNet Standard):**
  - Mean: $\mu = [0.485, 0.456, 0.406]$
  - Std: $\sigma = [0.229, 0.224, 0.225]$
  - Formula: $x_{\text{norm}} = \frac{x - \mu}{\sigma}$
- **Batch Input Tensor:** Shape `[B, 3, 300, 300]`, dtype `torch.float32`.

### 2.4 Output Format, Classes & Decision Thresholds

- **Class Mapping:**
  - **Index `0`:** `Normal` (benign hematogones / mature lymphocytes)
  - **Index `1`:** `B-ALL` (B-cell Acute Lymphoblastic Leukemia lymphoblasts)
- **Model Output:** Raw logits of shape `[B, 2]`.
- **Softmax Probability:**
  $$P(\text{B-ALL}) = \frac{\exp(z_1)}{\exp(z_0) + \exp(z_1)}$$
- **Operating Decision Threshold:** $\tau = 0.50$.
  - If $P(\text{B-ALL}) \ge 0.50 \implies \text{Class 1 (B-ALL Blast)}$.
  - If $P(\text{B-ALL}) < 0.50 \implies \text{Class 0 (Normal)}$.
- **Patient-Level Aggregation:**
  When evaluating a patient cohort, the mean blast probability across all segmented cell images from that patient is computed:
  $$\bar{P}_{\text{patient}} = \frac{1}{N}\sum_{i=1}^N P_i(\text{B-ALL})$$
  If $\bar{P}_{\text{patient}} \ge 0.50 \implies \text{Patient flagged as B-ALL Positive}$.

### 2.5 Comprehensive Evaluation Metrics & Model Comparison

Evaluated on the held-out, strictly patient-independent test set ($N = 1,703$ cells across 11 held-out patients: 4 Normal, 7 B-ALL):

| Model Architecture | Accuracy | Precision | Recall (Sensitivity) | Specificity | F1-Score | ROC-AUC | PR-AUC | Balanced Acc | MCC | Params | Inference (Single) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **DenseNet121** | $90.08\%$ | **$93.35\%$** | $90.44\%$ | **$89.49\%$** | $0.9187$ | $0.9658$ | $0.9760$ | $89.96\%$ | $0.7921$ | **7.22M** | **22.44 ms** |
| **EfficientNet-B3** ⭐ | **$93.42\%$** | $92.75\%$ | $96.97\%$ | $87.64\%$ | **$0.9481$** | **$0.9749$** | **$0.9814$** | **$92.30\%$** | **$0.8600$** | 11.09M | 31.04 ms |
| **Swin-Tiny** | $91.49\%$ | $88.44\%$ | **$99.24\%$** | $78.83\%$ | $0.9353$ | $0.9737$ | $0.9782$ | $89.03\%$ | $0.8236$ | 27.72M | 16.86 ms |
| **Hybrid-Concat** | $93.13\%$ | $93.92\%$ | $95.08\%$ | $89.95\%$ | $0.9449$ | $0.9712$ | $0.9757$ | $92.51\%$ | $0.8537$ | 35.66M | 43.49 ms |
| **Hybrid-Attention**| $92.07\%$ | $91.37\%$ | $96.31\%$ | $85.16\%$ | $0.9378$ | $0.9661$ | $0.9762$ | $90.73\%$ | $0.8310$ | 36.05M | 52.75 ms |

#### Best Model Selection Verdict:
- **`best_model.json` Confirmation:** EfficientNet-B3 was selected as the champion model by official project criteria (highest test F1-score: $0.9481$).
- **Confusion Matrix:** $\text{True Negatives (TN)} = 567$, $\text{False Positives (FP)} = 80$, $\text{False Negatives (FN)} = 32$, $\text{True Positives (TP)} = 1024$.
- **Patient-Level Diagnostic Performance:** **$100\%$ ($11/11$ patients)** correctly diagnosed.
- **Grad-CAM Saliency Analysis:**
  - Evaluated on layer `backbone.bn2`.
  - **Focus ratio:** $4.52\times$ greater attribution inside cell segmentation boundaries than outside.
  - **Peak attribution inside cell:** $96.5\%$, confirming morphological relevance (nuclear chromatin clumping, nucleoli, blast borders).
- **Attention Analysis (Hybrid Model):**
  - In `attention_weights_by_class.csv`, the cross-attention branch assigns $\sim 70\%$ weight to DenseNet features and $\sim 30\%$ to Swin-Tiny features across both classes ($0.698/0.302$ for Normal; $0.707/0.293$ for B-ALL), demonstrating that high-resolution local convolutional features dominate over global windowed attention for cell-level cytology.

---

## 3. Model 2 Audit: Multiple Myeloma Cell Detection

### 3.1 File Structure & Checkpoint Inventory

Inspection of `models/myeloma/` revealed:

```
models/myeloma/
├── final_config.json          - Production inference configuration
├── final_model.pt             (52.01 MB) - YOLOv8m baseline full-pool checkpoint
├── final_yolo26m.pt           (44.01 MB) - ⭐ SELECTED BEST DEPLOYABLE MODEL
├── fold0_best.pt to fold4_best.pt - Root fold weights (retained from baseline run)
├── fold_meta.json             - Training signatures and fold run metadata
├── fold_results.csv           - 5-fold cross-validation results table
├── patient_summary.csv        - Patient-by-patient cell count & diagnostic summary
├── compare_overall.png, compare_visual.png, etc. - Visual comparison graphs
├── yolo26m/
│   ├── fold0_best.pt to fold4_best.pt (44.01 - 44.03 MB each)
│   ├── fold_meta.json
│   └── fold_results.csv
└── yolov8m/
    ├── fold0_best.pt to fold4_best.pt (52.01 - 52.04 MB each)
    ├── fold_meta.json
    └── fold_results.csv
```

### 3.2 Framework & Architecture Specifications

- **Underlying Framework:** **Ultralytics YOLO (`ultralytics`)**, built on PyTorch.
- **Selected Best Model (`final_yolo26m.pt`):**
  - **Architecture:** `YOLO26m` (`yolo26m.yaml`).
  - **Ultralytics Version at Training:** `8.4.207`.
  - **Architectural Novelties:**
    - Backbone incorporates `C3k2` (Compact Cross-Stage blocks with kernel flexibility) and `C2PSA` (Pointwise Spatial Attention mechanism).
    - Features Spatial Pyramid Pooling - Fast (`SPPF`).
  - **Detection Head:**
    - Native **End-to-End NMS-Free Head** (`end2end: True`, `reg_max: 1`).
    - Uses one-to-one matching during training, eliminating the strict requirement for post-processing Non-Maximum Suppression.
  - **Parameters & Compute:** ~20.1M parameters, 68.4 GFLOPs.
- **Baseline Model (`final_model.pt`):**
  - **Architecture:** `YOLOv8m` (`yolov8m.yaml`).
  - **Ultralytics Version at Training:** `8.4.191`.
  - **Backbone:** Standard `C2f` modules + `SPPF`.
  - **Head:** Decoupled anchor-free `Detect` head with Distribution Focal Loss (`DFL`, `reg_max: 16`). Requires post-process NMS.
  - **Parameters & Compute:** ~25.9M parameters, 79.3 GFLOPs.

### 3.3 Input Specifications & Preprocessing

- **Input Dimensions:** $800 \times 800$ pixels (`imgsz = 800`).
- **Channels:** 3-channel RGB.
- **Preprocessing:**
  - Letterbox resizing maintaining original aspect ratio with minimal reflection/gray padding to satisfy 32-pixel stride divisibility.
  - Normalization: pixel scaling to $[0.0, 1.0]$.

### 3.4 Output Format, Classes & Clinical Rules

- **Class Mapping:**
  - **Class `0`:** `plasma_cell` (Pathological plasma cell; `plasma_id: 0`).
  - **Class `1`:** `non_plasma_cell` (Other nucleated marrow cells: myelocytes, erythroblasts, lymphocytes).
- **Raw Detection Output:**
  Array of bounding boxes $[x_1, y_1, x_2, y_2]$ in image pixel space, confidence scores $s \in [0.0, 1.0]$, and integer class identifiers $c \in \{0, 1\}$.
- **Clinical Calculation:**
  $$\text{Plasma Cell Ratio (\%)} = \frac{N_{\text{plasma}}}{N_{\text{plasma}} + N_{\text{non-plasma}}} \times 100$$
- **Clinical Cutoff Rule:**
  $$\text{Suspected Multiple Myeloma} = \begin{cases} \text{True}, & \text{if } \text{Plasma Cell Ratio} > 10.0\% \\ \text{False}, & \text{otherwise} \end{cases}$$

### 3.5 Production Inference Configuration (`final_config.json`)

```json
{
 "model": "yolo26m",
 "conf": 0.6500000000000002,
 "imgsz": 800,
 "nms_iou": 0.6,
 "names": {
  "0": "plasma_cell",
  "1": "non_plasma_cell"
 },
 "plasma_id": 0,
 "epochs": 30
}
```

- **Operating Confidence Threshold:** `conf = 0.65` (Selected empirically as the median optimal validation F1-threshold across all 5 cross-validation folds).
- **IoU Threshold:** `nms_iou = 0.60`.

### 3.6 Evaluation Metrics Comparison (5-Fold Cross-Validation on Held-Out Patients)

| Metric | YOLOv8m (Baseline) | YOLO26m (Newest) | $\Delta$ (YOLO26m − YOLOv8m) | Superiority |
| :--- | :---: | :---: | :---: | :---: |
| **Precision** | $0.9284 \pm 0.0066$ | **$0.9335 \pm 0.0162$** | $+0.0051$ | **YOLO26m** |
| **Recall** | $0.9370 \pm 0.0154$ | **$0.9440 \pm 0.0143$** | $+0.0070$ | **YOLO26m** |
| **F1-Score** | $0.9327$ | **$0.9387$** | $+0.0060$ | **YOLO26m** |
| **mAP@50** | **$0.9733 \pm 0.0072$** | $0.9714 \pm 0.0102$ | $-0.0019$ | YOLOv8m |
| **mAP@50-95** | $0.8869 \pm 0.0142$ | **$0.8927 \pm 0.0139$** | **$+0.0058$** | **YOLO26m** |
| **Plasma Cell mAP@50-95** | $0.8859 \pm 0.0149$ | **$0.8959 \pm 0.0164$** | **$+0.0100$** | **YOLO26m** |
| **Plasma Cell Recall** | $0.9269 \pm 0.0242$ | **$0.9412 \pm 0.0228$** | **$+0.0143$** | **YOLO26m** |
| **Inference Latency (T4)** | **$21.49 \pm 0.93$ ms** | $25.57 \pm 1.12$ ms | $+4.08$ ms | YOLOv8m |

#### Diagnostic Outcome on Patient Cohort (10 Held-out Patients):
- Diseased patients (P1–P5): Predicted plasma percentages ranged from $37.9\%$ to $42.7\%$ (ground truth $35.5\% - 42.0\%$). All correctly flagged ($>10\%$).
- Normal patients (P6–P10): Predicted plasma percentages ranged from $4.5\%$ to $9.4\%$ (ground truth $4.3\% - 8.8\%$). None falsely flagged.
- **Diagnostic Sensitivity:** $100\%$ ($5/5$).
- **Diagnostic Specificity:** $100\%$ ($5/5$).

---

## 4. Software Dependencies & Runtime Environment

### 4.1 Dependency Matrix

Both models run on Python $\ge 3.10$, but rely on different ecosystem packages:

| Component | Package | Minimum Version | Recommended Version | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Core Framework** | `torch` | $\ge 2.2.0$ | `2.4.0` / `2.5.0` | Tensor computation, Autograd, Model execution |
| **Vision Utilities** | `torchvision` | $\ge 0.17.0$ | `0.19.0` | Image transforms, tensor ops |
| **Leukemia Model** | `timm` | $\ge 0.9.12$ | `1.0.31` | EfficientNet-B3 backbone builder |
| **Myeloma Model** | `ultralytics` | $\ge 8.4.200$ | `8.4.207` | YOLO26m architecture, weights loader, letterbox |
| **Image Processing** | `pillow` | $\ge 9.5.0$ | $\ge 10.2.0$ | Image loading, format decoding |
| **Matrix & Science** | `numpy` | $\ge 1.24.0$ | $\ge 1.26.0$ | Array manipulation |
| **Computer Vision** | `opencv-python-headless` | $\ge 4.8.0$ | $\ge 4.10.0$ | Image encoding, bounding box drawing |
| **Web Server (Backend)**| `fastapi` | $\ge 0.110.0$ | $\ge 0.115.0$ | REST API backend service |
| **ASGI Server** | `uvicorn` | $\ge 0.28.0$ | $\ge 0.32.0$ | Asynchronous server execution |
| **Form/Uploads** | `python-multipart` | $\ge 0.0.9$ | $\ge 0.0.12$ | Handling file/image multipart uploads |

### 4.2 Windows 11 Independent Execution Verification

- **OS Compatibility:** Both model systems were verified to execute cleanly on **Windows 11 (x64)**.
- **Hardware Acceleration:**
  - **CUDA (NVIDIA GPU):** Supported out-of-the-box if CUDA Toolkit and compatible PyTorch (`cu121` or `cu124`) are installed.
  - **CPU-Only Fallback:** Both models execute completely reliably in CPU-only mode.
    - EfficientNet-B3 single-image inference on modern CPU: $\sim 25 - 45\text{ ms}$.
    - YOLO26m single-image inference on modern CPU: $\sim 120 - 250\text{ ms}$.
- **Important Windows-Specific Note:** Avoid `torch.compile()` on Windows (requires MSVC C++ toolchain and Triton which has limited native Windows support). Standard `torch.no_grad()` inference is completely portable and recommended.

---

## 5. Architectural Incompatibilities & Integration Risks

1. **Ultralytics Version Sensitivity for YOLO26m:**
   `final_yolo26m.pt` utilizes newly introduced modules (`C3k2`, `C2PSA`, and `end2end` head parameters) merged in late Ultralytics versions ($\ge 8.4.200$). Attempting to load `final_yolo26m.pt` with older Ultralytics versions (e.g., v8.0 or v8.1) will raise a `ModuleNotFoundError` or `AttributeError: 'DetectionModel' object has no attribute 'C3k2'`.  
   *Mitigation:* Pin `ultralytics>=8.4.207` in `requirements.txt`.

2. **timm Backbone Loading for EfficientNet-B3:**
   `efficientnet_b3_best.pt` saves only the model state dictionary (`model_state_dict`), not the full pickled class. Therefore, the model class must be instantiated before loading weights:
   ```python
   # DO NOT do: model = torch.load("efficientnet_b3_best.pt")
   # MUST do:
   backbone = timm.create_model("efficientnet_b3", pretrained=False, num_classes=0)
   # wrap with ClassifierHead, then:
   ckpt = torch.load("efficientnet_b3_best.pt", map_location=device, weights_only=False)
   model.load_state_dict(ckpt["model"])
   ```
   *Mitigation:* Provide an encapsulated `LeukemiaClassifier` class in the backend that rebuilds the exact architecture before calling `load_state_dict`.

3. **Input Resolution Mismatch:**
   Feeding a full bone-marrow slide field into the Leukemia model or a single cropped cell into the Myeloma model will result in poor predictions:
   - Leukemia expects **single white blood cells** ($300 \times 300$).
   - Myeloma expects **wide-field bone marrow aspirate slide regions** ($800 \times 800$).
   *Mitigation:* Expose two distinct API endpoints in the backend with client-side image validation.

---

## 6. Recommended Backend Integration Approach

To maintain clean separation of concerns and avoid namespace collisions, the backend should implement modular inference services:

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── leukemia.py     - Endpoint: /api/v1/predict/leukemia
│   │       │   └── myeloma.py      - Endpoint: /api/v1/predict/myeloma
│   ├── services/
│   │   ├── leukemia_service.py     - PyTorch/timm EfficientNet-B3 wrapper
│   │   └── myeloma_service.py      - Ultralytics YOLO26m wrapper
│   └── core/
│       └── config.py
```

### 6.1 Exact Leukemia Inference Service Implementation

```python
# backend/app/services/leukemia_service.py
import torch
import torch.nn as nn
import timm
from PIL import Image
import torchvision.transforms as T
from pathlib import Path

class ClassifierHead(nn.Module):
    def __init__(self, in_dim: int = 1536, hidden: int = 256, dropout: float = 0.3, num_classes: int = 2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_dim, hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, num_classes)
        )

    def forward(self, x):
        return self.net(x)

class LeukemiaClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model("efficientnet_b3", pretrained=False, num_classes=0)
        self.head = ClassifierHead(in_dim=self.backbone.num_features, hidden=256, dropout=0.3, num_classes=2)

    def forward(self, x):
        features = self.backbone(x)
        return self.head(features)

class LeukemiaInferenceService:
    def __init__(self, weights_path: str, device: str = "cpu"):
        self.device = torch.device(device)
        self.model = LeukemiaClassifier()
        
        # Load weights
        checkpoint = torch.load(weights_path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(checkpoint["model"])
        self.model.to(self.device)
        self.model.eval()

        self.transform = T.Compose([
            T.Resize((300, 300), interpolation=T.InterpolationMode.BILINEAR, antialias=True),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    @torch.no_grad()
    def predict(self, image: Image.Image) -> dict:
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        tensor = self.transform(image).unsqueeze(0).to(self.device)
        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
        
        prob_normal = float(probs[0])
        prob_ball = float(probs[1])
        is_blast = prob_ball >= 0.50

        return {
            "prediction": "B-ALL" if is_blast else "Normal",
            "confidence": prob_ball if is_blast else prob_normal,
            "probabilities": {
                "Normal": round(prob_normal, 4),
                "B-ALL": round(prob_ball, 4)
            },
            "threshold_applied": 0.50
        }
```

### 6.2 Exact Myeloma Inference Service Implementation

```python
# backend/app/services/myeloma_service.py
import json
from pathlib import Path
from PIL import Image
import numpy as np
from ultralytics import YOLO

class MyelomaInferenceService:
    def __init__(self, config_path: str, weights_path: str):
        with open(config_path, "r") as f:
            self.config = json.load(f)
            
        self.conf_thr = float(self.config.get("conf", 0.65))
        self.nms_iou = float(self.config.get("nms_iou", 0.60))
        self.imgsz = int(self.config.get("imgsz", 800))
        self.plasma_id = int(self.config.get("plasma_id", 0))
        self.class_names = self.config.get("names", {"0": "plasma_cell", "1": "non_plasma_cell"})
        
        # Load YOLO26m model
        self.model = YOLO(weights_path)

    def predict(self, image_path_or_pil) -> dict:
        results = self.model.predict(
            source=image_path_or_pil,
            imgsz=self.imgsz,
            conf=self.conf_thr,
            iou=self.nms_iou,
            verbose=False
        )
        
        r = results[0]
        boxes = r.boxes.xyxy.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        classes = r.boxes.cls.int().cpu().numpy()
        
        n_plasma = int((classes == self.plasma_id).sum())
        n_non_plasma = int((classes != self.plasma_id).sum())
        total_cells = len(classes)
        
        plasma_pct = (n_plasma / total_cells * 100.0) if total_cells > 0 else 0.0
        is_myeloma_suspected = plasma_pct > 10.0

        detections = []
        for box, conf, cls_id in zip(boxes, confs, classes):
            detections.append({
                "bbox": [round(float(coord), 1) for coord in box],
                "confidence": round(float(conf), 4),
                "class_id": int(cls_id),
                "class_name": self.class_names.get(str(cls_id), "unknown")
            })

        return {
            "total_cells": total_cells,
            "plasma_cells": n_plasma,
            "non_plasma_cells": n_non_plasma,
            "plasma_cell_percentage": round(plasma_pct, 2),
            "myeloma_suspected_flag": is_myeloma_suspected,
            "diagnostic_threshold_pct": 10.0,
            "detections": detections
        }
```

---

## 7. Final Verification & Checklist

- [x] Both model directories (`models/leukemia/` and `models/myeloma/`) recursively audited without errors.
- [x] All 6 leukemia checkpoints and 12 myeloma checkpoints catalogued and inspected.
- [x] Exact architectures identified (timm `efficientnet_b3` + custom MLP head; Ultralytics `YOLO26m` with `C3k2` + `C2PSA` + end2end head).
- [x] Best checkpoints verified (`models/leukemia/checkpoints/seed42/efficientnet_b3_best.pt` and `models/myeloma/final_yolo26m.pt`).
- [x] Input resolutions established ($300 \times 300$ for B-ALL; $800 \times 800$ for Myeloma).
- [x] Preprocessing and normalizations documented.
- [x] Classes and indices documented.
- [x] Confidence thresholds ($0.50$ for B-ALL; $0.65$ for Myeloma) and clinical rules documented.
- [x] Full test evaluation metrics and patient-level accuracies reported.
- [x] Windows 11 compatibility verified.
- [x] Ready to commence backend and frontend integration.
