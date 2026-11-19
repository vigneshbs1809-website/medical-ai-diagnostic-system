# Medical AI Diagnostic System - Frontend Client

A high-performance, clinical-grade medical SaaS dashboard built with React 18, Vite, Tailwind CSS, Recharts, and Axios.

---

## 1. Design System & Palette

Designed strictly according to clinical specifications:
- **Main Background:** `#F8FAFC` (Clean hospital slate)
- **Cards & Surfaces:** `#FFFFFF`
- **Primary Navy:** `#183B56`
- **Accent Blue:** `#367CB8`
- **Light Blue Tint:** `#EAF3FA`
- **Primary Text:** `#243447`
- **Secondary Text:** `#718096`
- **Success / Negative:** `#27865C`
- **Alert / High Risk:** `#DC2626`
- **Borders & Dividers:** `#E2E8F0`
- **Typography:** Inter (Clean, legible clinical sans-serif)
- **Icons:** Lucide SVG Vector Icons (No emojis, no decorative symbols)

---

## 2. Integrated Modules & Pages

1. **Overview Dashboard (`/`):**
   - Live backend connectivity monitor (`GET /api/health`).
   - Deep learning model readiness indicators (EfficientNet-B3 & YOLO26m).
   - Dedicated launch cards for Leukemia and Myeloma pipelines.
   - Real-time statistics derived strictly from persistent user records.
   - Recent evaluations table with direct navigation.

2. **Leukemia (B-ALL) Classification (`/leukemia`):**
   - Drag-and-drop single-cell cytology microscopy uploader (JPG, JPEG, PNG).
   - Audited checkpoint selector: `EfficientNet-B3` (Seed 42 Best Checkpoint, 0.9429 Macro-F1).
   - Real-time inference forward pass with latency profiling.
   - Interactive class probability distribution chart (`Normal` vs `B-ALL`) via Recharts.
   - Cytology specimen zoom inspector modal.
   - Instant clinical PDF report generator.

3. **Multiple Myeloma Detection (`/myeloma`):**
   - High-resolution bone marrow aspirate slide uploader (JPG, JPEG, PNG).
   - Audited detector: `YOLO26m` (End-to-End NMS-Free Head, $800 \times 800$ resolution).
   - Interactive visual toggle: AI Annotated Overlay vs Original vs Side-by-Side.
   - Plasmacytosis evaluation against the $>10.0\%$ diagnostic cutoff.
   - Detected bounding box coordinates table with per-cell confidence scores.
   - Instant clinical PDF report generator.

4. **Analysis History (`/history`):**
   - Persistently archives all evaluations in local storage.
   - Multi-parameter search (by file, ID, outcome, or patient ID).
   - Module filter (`All`, `Leukemia`, `Myeloma`) and Risk level filter (`All`, `High Risk`, `Low Risk`).
   - Inspection modal with raw JSON metrics and thumbnail captures.

5. **Diagnostic Reports (`/reports`):**
   - Multi-specimen consultation report synthesizer combining patient records, clinical notes, and AI findings.
   - Official downloadable PDF medical reports generated with `jsPDF`.
   - Printable clinical consultation view.

6. **Model Information (`/models`):**
   - Separate audited specifications for EfficientNet-B3 and YOLO26m.
   - Input tensor resolutions, layer heads, loss functions, optimizers, and checkpoint paths.
   - Full benchmark comparison tables against baseline models (ResNet50, DenseNet121, ConvNeXt-Tiny, Swin-T, YOLOv8m).

7. **Settings (`/settings`):**
   - Dynamic FastAPI backend URL configuration (defaults to `http://localhost:8000`).
   - Real-time network ping test.
   - Local database export (JSON) and storage reset.

---

## 3. Development & Startup

### Step 1: Install Dependencies
```bash
cd client
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

The application will be accessible at: **`http://localhost:5173`**

### Step 3: Production Build
```bash
npm run build
```
Build output will be bundled to `client/dist/`.
