# Medical AI Diagnostic System - Full Stack Platform

A dual deep-learning medical decision-support platform for hematological image analysis:
1. **Leukemia (B-ALL) Single-Cell Cytology Classifier:** EfficientNet-B3 (`timm`) with custom 2-layer MLP head.
2. **Multiple Myeloma Bone Marrow Detection & Plasmacytosis Counter:** YOLO26m (`Ultralytics`) end-to-end NMS-free object detector with C3k2 and C2PSA attention modules.

---

## Architecture Overview

```
frontend/
├── backend/                  # FastAPI Python Deep-Learning Backend
│   ├── .venv/                # Python virtual environment
│   ├── main.py               # FastAPI server entrypoint & CORS middleware
│   ├── model_loader.py       # ModelManager singleton loading models once
│   ├── leukemia_service.py   # 300x300 ImageNet preprocessing & inference
│   ├── myeloma_service.py    # 800x800 YOLO26m inference, counts & overlays
│   ├── report_service.py     # Pydantic structured medical report generator
│   └── requirements.txt      # Production dependencies
│
├── client/                   # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api/              # Axios API clients for all endpoints
│   │   ├── components/       # Reusable clinical UI components
│   │   ├── context/          # Backend health & persistent history contexts
│   │   ├── pages/            # 7 Medical SaaS pages
│   │   └── utils/            # Clinical PDF generator & formatters
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Custom clinical palette
│   └── vite.config.js        # Vite dev server & proxy
│
├── models/                   # Audited Trained Checkpoints
│   ├── leukemia/checkpoints/ # efficientnet_b3_best.pt (Seed 42)
│   └── myeloma/              # final_yolo26m.pt (YOLO26m)
│
└── documentation/            # Audits & Architecture Technical Reports
    └── model_audit.md        # Complete multi-model technical audit
```

---

## Quick Start Guide

### 1. Launch the Backend Server
Open a terminal in the project root:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Launch the Frontend Application
Open a second terminal:

```powershell
cd client
npm run dev
```

- Frontend Web App: [http://localhost:5173](http://localhost:5173)

---

## Design System & Constraints

- **Theme:** Exclusively clean Light Mode (hospital workstation aesthetic).
- **Primary Color:** `#183B56` (Deep Navy)
- **Accent:** `#367CB8` (Clinical Cyan-Blue)
- **Background:** `#F8FAFC`
- **Cards:** `#FFFFFF`
- **Typography:** Inter Sans-Serif
- **Strict Compliance:** Zero emojis, zero decorative symbols, zero mock predictions, zero hardcoded statistics.
