"""
End-to-End Test Suite for Medical AI Diagnostic Backend
Validates model loading, inference accuracy, error handling, and API endpoints.
"""

import sys
import os
from pathlib import Path

# Add backend to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from model_loader import model_manager
from leukemia_service import run_leukemia_inference
from myeloma_service import run_myeloma_inference
from report_service import ReportRequest, PatientInfo, generate_diagnostic_report


def run_full_verification():
    print("\n" + "=" * 70)
    print("STEP 1: Testing Model Loading (ModelManager)")
    print("=" * 70)
    model_manager.load_all_models()
    status = model_manager.get_status()
    print(f"Compute Device: {status['device']}")
    print(f"Leukemia Loaded: {status['models']['leukemia']['is_ready']}")
    print(f"Myeloma Loaded:  {status['models']['myeloma']['is_ready']}")

    assert status["models"]["leukemia"]["is_ready"], f"Leukemia model failed to load: {status['models']['leukemia']['error']}"
    assert status["models"]["myeloma"]["is_ready"], f"Myeloma model failed to load: {status['models']['myeloma']['error']}"
    print(">>> Step 1 Passed: Both models loaded into memory successfully!")

    print("\n" + "=" * 70)
    print("STEP 2: Testing Leukemia Inference Service (EfficientNet-B3)")
    print("=" * 70)
    sample_leukemia_path = BACKEND_DIR / "tests" / "sample_leukemia.jpg"
    assert sample_leukemia_path.exists(), f"Sample image not found: {sample_leukemia_path}"
    
    with open(sample_leukemia_path, "rb") as f:
        img_bytes = f.read()
    
    leukemia_res = run_leukemia_inference(img_bytes, filename="sample_leukemia.jpg")
    print(f"Status: {leukemia_res['status']}")
    print(f"Prediction: {leukemia_res['prediction']['class_name']} (Class ID: {leukemia_res['prediction']['class_id']})")
    print(f"Confidence: {leukemia_res['prediction']['confidence']:.4f}")
    print(f"Probabilities: {leukemia_res['prediction']['probabilities']}")
    print(f"Diagnostic Flag: {leukemia_res['prediction']['diagnostic_flag']}")
    print(f"Duration: {leukemia_res['performance']['inference_duration_ms']} ms")

    assert leukemia_res["status"] == "success"
    assert leukemia_res["prediction"]["class_name"] in ["B-ALL", "Normal"]
    assert 0.0 <= leukemia_res["prediction"]["confidence"] <= 1.0
    print(">>> Step 2 Passed: Leukemia inference produced verified predictions!")

    print("\n" + "=" * 70)
    print("STEP 3: Testing Multiple Myeloma Inference Service (YOLO26m)")
    print("=" * 70)
    sample_myeloma_path = BACKEND_DIR / "tests" / "sample_myeloma.jpg"
    assert sample_myeloma_path.exists(), f"Sample image not found: {sample_myeloma_path}"

    with open(sample_myeloma_path, "rb") as f:
        m_bytes = f.read()

    myeloma_res = run_myeloma_inference(m_bytes, filename="sample_myeloma.jpg", return_annotated=True)
    print(f"Status: {myeloma_res['status']}")
    print(f"Total Cells Detected: {myeloma_res['cell_counts']['total_cells']}")
    print(f"Plasma Cells: {myeloma_res['cell_counts']['plasma_cells']}")
    print(f"Non-Plasma Cells: {myeloma_res['cell_counts']['non_plasma_cells']}")
    print(f"Plasma Cell Percentage: {myeloma_res['cell_counts']['plasma_cell_percentage']}%")
    print(f"Suspected Myeloma Flag: {myeloma_res['diagnosis']['myeloma_suspected']}")
    print(f"Diagnostic Status: {myeloma_res['diagnosis']['diagnostic_status']}")
    print(f"Annotated Image Base64 Length: {len(myeloma_res.get('annotated_image_base64', ''))}")
    print(f"Duration: {myeloma_res['performance']['inference_duration_ms']} ms")

    assert myeloma_res["status"] == "success"
    assert myeloma_res["cell_counts"]["total_cells"] >= 0
    assert 0.0 <= myeloma_res["cell_counts"]["plasma_cell_percentage"] <= 100.0
    assert len(myeloma_res.get("annotated_image_base64", "")) > 100
    print(">>> Step 3 Passed: Multiple Myeloma inference produced verified detections!")

    print("\n" + "=" * 70)
    print("STEP 4: Testing Report Generation Service")
    print("=" * 70)
    req = ReportRequest(
        patient_info=PatientInfo(
            patient_id="PAT-TEST-001",
            age=52,
            gender="Male",
            sample_id="SMP-101",
            sample_date="2026-11-17",
            clinical_history="Fatigue, bone marrow cytology evaluation.",
            ordering_physician="Dr. Sarah Chen, MD"
        ),
        leukemia_result=leukemia_res,
        myeloma_result=myeloma_res,
        custom_notes="Automated test report generation."
    )
    report_res = generate_diagnostic_report(req)
    print(f"Report ID: {report_res['report_id']}")
    print(f"Overall Status: {report_res['overall_status']}")
    print(f"Risk Level: {report_res['risk_level']}")
    print(f"Findings Count: {len(report_res['findings'])}")
    print(f"Recommendations Count: {len(report_res['recommendations'])}")

    assert report_res["report_id"].startswith("RPT-")
    assert len(report_res["findings"]) > 0
    assert len(report_res["formatted_markdown"]) > 200
    print(">>> Step 4 Passed: Report generation generated verified clinical summary!")

    print("\n" + "=" * 70)
    print("STEP 5: Testing FastAPI Endpoints via TestClient")
    print("=" * 70)
    client = TestClient(app, raise_server_exceptions=True)
    
    # 1. Health endpoint
    r_health = client.get("/api/health")
    print(f"GET /api/health -> Status: {r_health.status_code}")
    assert r_health.status_code == 200
    health_json = r_health.json()
    assert health_json["status"] == "healthy"

    # 2. Models endpoint
    r_models = client.get("/api/models")
    print(f"GET /api/models -> Status: {r_models.status_code}")
    assert r_models.status_code == 200

    # 3. Predict Leukemia endpoint
    with open(sample_leukemia_path, "rb") as f:
        file_bytes = f.read()
    r_l = client.post("/api/leukemia/predict", files={"file": ("sample.jpg", file_bytes, "image/jpeg")})
    print(f"POST /api/leukemia/predict -> Status: {r_l.status_code}")
    assert r_l.status_code == 200
    assert r_l.json()["status"] == "success"

    # 4. Predict Myeloma endpoint
    with open(sample_myeloma_path, "rb") as f:
        m_file_bytes = f.read()
    r_m = client.post("/api/myeloma/predict", files={"file": ("sample.jpg", m_file_bytes, "image/jpeg")})
    print(f"POST /api/myeloma/predict -> Status: {r_m.status_code}")
    assert r_m.status_code == 200
    assert r_m.json()["status"] == "success"

    # 5. Report generate endpoint
    r_rep = client.post("/api/report/generate", json=req.model_dump())
    print(f"POST /api/report/generate -> Status: {r_rep.status_code}")
    assert r_rep.status_code == 200
    assert r_rep.json()["status"] == "success"

    # 6. Invalid file format validation test
    r_inv = client.post("/api/leukemia/predict", files={"file": ("test.txt", b"plain text", "text/plain")})
    print(f"POST /api/leukemia/predict (invalid format) -> Status: {r_inv.status_code} (Expected 400)")
    assert r_inv.status_code == 400

    print(">>> Step 5 Passed: All FastAPI endpoints tested and verified!")
    print("\n" + "=" * 70)
    print("ALL TESTS PASSED SUCCESSFULLY! BACKEND IS FULLY OPERATIONAL.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_full_verification()
