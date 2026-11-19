# Medical AI Diagnostic System - Backend Service

High-performance FastAPI service providing clinical decision-support APIs for automated hematological analysis.

Integrates two independently trained deep learning pipelines:
1. **Leukemia (B-ALL) Single-Cell Classifier:** EfficientNet-B3 (timm) with custom MLP classification head ($300 \times 300$ px).
2. **Multiple Myeloma Detection & Plasmacytosis Counter:** YOLO26m (Ultralytics) end-to-end NMS-free object detector ($800 \times 800$ px).

---

## 1. Directory Structure

```
backend/
├── .venv/                   # Python virtual environment (ignored in git)
├── main.py                  # FastAPI application entrypoint & API routes
├── model_loader.py          # ModelManager singleton; architecture definitions & weight loading
├── leukemia_service.py      # B-ALL image validation, preprocessing & inference service
├── myeloma_service.py       # Multiple Myeloma cell detection, ratio calculation & visual overlay
├── report_service.py        # Clinical diagnostic report generator
├── requirements.txt         # Production Python dependencies
└── README.md                # System documentation & setup guide
```

---

## 2. Prerequisites & Environment

- **Operating System:** Windows 10/11 (x64), Linux, or macOS
- **Python Version:** Python 3.10, 3.11, or 3.12 (Tested on Python 3.12.2)
- **Hardware:**
  - **CPU:** Supported out of the box (modern multi-core CPU).
  - **GPU (Optional):** NVIDIA GPU with CUDA 12.1+ for accelerated batch processing.

---

## 3. Installation & Setup

### Step 1: Open Terminal in `backend/`
```bash
cd backend
```

### Step 2: Create Virtual Environment
```bash
python -m venv .venv
```

### Step 3: Activate Virtual Environment
- **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- **Windows (CMD):**
  ```cmd
  .\.venv\Scripts\activate.bat
  ```
- **Linux / macOS:**
  ```bash
  source .venv/bin/activate
  ```

### Step 4: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Running the Server

Start the FastAPI application with Uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative Redoc Interface:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 5. API Reference & Examples

### 1. System Health Check
**`GET /api/health`**

Checks server status, compute device (CPU/CUDA), and model readiness.

```bash
curl -X GET http://localhost:8000/api/health
```

**Response Example:**
```json
{
  "status": "healthy",
  "service": "Medical AI Diagnostic Backend",
  "timestamp": "2026-11-17T11:20:00Z",
  "device": "cpu",
  "models": {
    "leukemia_model_ready": true,
    "myeloma_model_ready": true
  }
}
```

---

### 2. Model Specifications & Metadata
**`GET /api/models`**

Returns architectural parameters, checkpoint paths, and input specifications.

```bash
curl -X GET http://localhost:8000/api/models
```

---

### 3. Leukemia / B-ALL Classification
**`POST /api/leukemia/predict`**

Classifies a single-cell cytology image as **Normal** or **B-ALL Blast**.
- **Accepted Formats:** JPG, JPEG, PNG
- **Content-Type:** `multipart/form-data`

```bash
curl -X POST http://localhost:8000/api/leukemia/predict \
     -F "file=@sample_blast_cell.jpg"
```

**Response Example:**
```json
{
  "status": "success",
  "task": "leukemia_classification",
  "model_id": "efficientnet_b3",
  "model_architecture": "EfficientNet-B3 (timm) + MLP Head",
  "input_specs": {
    "original_dimensions": [450, 450],
    "processed_dimensions": [300, 300],
    "color_channels": 3,
    "filename": "sample_blast_cell.jpg"
  },
  "prediction": {
    "class_id": 1,
    "class_name": "B-ALL",
    "confidence": 0.9697,
    "probabilities": {
      "Normal": 0.0303,
      "B-ALL": 0.9697
    },
    "decision_threshold": 0.50,
    "diagnostic_flag": "HIGH_CONFIDENCE_BLAST",
    "clinical_interpretation": "High morphologic probability of B-cell lymphoblastic leukemia (blast cell)."
  },
  "performance": {
    "inference_duration_ms": 32.5,
    "device": "cpu"
  }
}
```

---

### 4. Multiple Myeloma Cell Detection
**`POST /api/myeloma/predict`**

Detects cells in a bone marrow aspirate slide field, counts plasma and non-plasma cells, calculates the plasma-cell ratio, and applies the $>10.0\%$ diagnostic cutoff.

```bash
curl -X POST http://localhost:8000/api/myeloma/predict \
     -F "file=@marrow_slide_field.jpg"
```

**Response Example:**
```json
{
  "status": "success",
  "task": "multiple_myeloma_detection",
  "model_id": "yolo26m",
  "model_architecture": "YOLO26m (Ultralytics, End-to-End NMS-Free)",
  "input_specs": {
    "original_dimensions": [1280, 960],
    "inference_dimensions": [800, 800],
    "color_channels": 3,
    "filename": "marrow_slide_field.jpg"
  },
  "cell_counts": {
    "total_cells": 199,
    "plasma_cells": 85,
    "non_plasma_cells": 114,
    "plasma_cell_percentage": 42.71
  },
  "diagnosis": {
    "myeloma_suspected": true,
    "diagnostic_threshold_pct": 10.0,
    "diagnostic_status": "SUSPECTED_MULTIPLE_MYELOMA",
    "clinical_interpretation": "Plasma cell percentage (42.71%) exceeds the 10.0% diagnostic threshold. Suggestive of clonal plasma cell proliferative disorder (Multiple Myeloma)."
  },
  "parameters": {
    "confidence_threshold": 0.65,
    "nms_iou": 0.60,
    "imgsz": 800
  },
  "detections": [
    {
      "bbox": [142.5, 310.2, 215.8, 384.6],
      "confidence": 0.8921,
      "class_id": 0,
      "class_name": "plasma_cell"
    }
  ],
  "annotated_image_base64": "<base64_encoded_jpeg_string>",
  "performance": {
    "inference_duration_ms": 142.8,
    "device": "cpu"
  }
}
```

---

### 5. Generate Diagnostic Report
**`POST /api/report/generate`**

Combines patient metadata and AI diagnostic outputs into an official diagnostic report and formatted Markdown document.

```bash
curl -X POST http://localhost:8000/api/report/generate \
     -H "Content-Type: application/json" \
     -d '{
       "patient_info": {
         "patient_id": "PAT-2026-081",
         "age": 58,
         "gender": "Male",
         "sample_id": "BM-ASP-092",
         "sample_date": "2026-11-17",
         "clinical_history": "Bone pain, elevated serum creatinine, anemia."
       },
       "myeloma_result": {
         "cell_counts": {
           "total_cells": 200,
           "plasma_cells": 84,
           "plasma_cell_percentage": 42.0
         },
         "diagnosis": {
           "myeloma_suspected": true,
           "diagnostic_status": "SUSPECTED_MULTIPLE_MYELOMA"
         }
       }
     }'
```

---

### 6. Professional Downloadable PDF Reports
- **`POST /api/leukemia/report/pdf`**: Ingests single-cell cytology image and streams back an official clinical PDF report attachment with embedded microscopy capture, Softmax probability distribution table, and audited model benchmark metrics.
- **`POST /api/myeloma/report/pdf`**: Ingests bone marrow microscopy slide and streams back an official clinical PDF report attachment with dual image panels (original + annotated bounding boxes), cell count breakdown table, and audited mAP benchmark metrics.
- **`POST /api/leukemia/export-pdf`**: Accepts prediction JSON and returns the official downloadable PDF.
- **`POST /api/myeloma/export-pdf`**: Accepts prediction JSON and returns the official downloadable PDF.

---

## 7. Model Verification & Safety Notes

- **No Retraining or Modifying Weights:** The system loads pre-trained weights from `models/leukemia/` and `models/myeloma/`.
- **Validation:** Uploaded files undergo format verification, dimension checks, and corrupt-byte detection.
- **Fail-Safe Policy:** If model inference encounters an error, a structured HTTP 500/503 error is returned. Dummy or synthetic prediction results are never substituted.
