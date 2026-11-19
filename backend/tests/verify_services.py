"""
Comprehensive Direct Service & Endpoint Verification Script
Tests model loading, inference logic, diagnostic calculations, and FastAPI endpoint handlers directly.
"""

import asyncio
import io
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import UploadFile
from model_loader import model_manager
from leukemia_service import run_leukemia_inference
from myeloma_service import run_myeloma_inference
from report_service import ReportRequest, PatientInfo, generate_diagnostic_report
import main


async def verify():
    print("\n" + "=" * 75)
    print("TEST 1: ModelManager Initialization & Weights Loading")
    print("=" * 75)
    model_manager.load_all_models()
    status = model_manager.get_status()
    print(f"Device: {status['device']}")
    print(f"Leukemia Status: {status['models']['leukemia']['is_ready']}")
    print(f"Myeloma Status:  {status['models']['myeloma']['is_ready']}")
    assert status["models"]["leukemia"]["is_ready"], f"Leukemia failed: {status['models']['leukemia']['error']}"
    assert status["models"]["myeloma"]["is_ready"], f"Myeloma failed: {status['models']['myeloma']['error']}"
    print(">>> TEST 1 PASSED: Both models loaded into memory successfully!")

    print("\n" + "=" * 75)
    print("TEST 2: Leukemia Single-Cell Inference (EfficientNet-B3)")
    print("=" * 75)
    sample_l = BACKEND_DIR / "tests" / "sample_leukemia.jpg"
    with open(sample_l, "rb") as f:
        l_bytes = f.read()

    l_res = run_leukemia_inference(l_bytes, filename="sample_leukemia.jpg")
    print(f"Result Status: {l_res['status']}")
    print(f"Predicted Class: {l_res['prediction']['class_name']} (ID: {l_res['prediction']['class_id']})")
    print(f"Confidence: {l_res['prediction']['confidence']:.4f}")
    print(f"Probabilities: {l_res['prediction']['probabilities']}")
    print(f"Diagnostic Flag: {l_res['prediction']['diagnostic_flag']}")
    print(f"Interpretation: {l_res['prediction']['clinical_interpretation']}")
    print(f"Latency: {l_res['performance']['inference_duration_ms']} ms")
    assert l_res["status"] == "success"
    assert l_res["prediction"]["class_name"] in ["B-ALL", "Normal"]
    assert 0.0 <= l_res["prediction"]["confidence"] <= 1.0
    print(">>> TEST 2 PASSED: Leukemia inference verified!")

    print("\n" + "=" * 75)
    print("TEST 3: Multiple Myeloma Cell Detection & Counting (YOLO26m)")
    print("=" * 75)
    sample_m = BACKEND_DIR / "tests" / "sample_myeloma.jpg"
    with open(sample_m, "rb") as f:
        m_bytes = f.read()

    m_res = run_myeloma_inference(m_bytes, filename="sample_myeloma.jpg", return_annotated=True)
    print(f"Result Status: {m_res['status']}")
    print(f"Total Cells Detected: {m_res['cell_counts']['total_cells']}")
    print(f"Plasma Cells: {m_res['cell_counts']['plasma_cells']}")
    print(f"Non-Plasma Cells: {m_res['cell_counts']['non_plasma_cells']}")
    print(f"Plasma Cell Ratio: {m_res['cell_counts']['plasma_cell_percentage']}%")
    print(f"Suspected Myeloma Flag: {m_res['diagnosis']['myeloma_suspected']}")
    print(f"Diagnostic Status: {m_res['diagnosis']['diagnostic_status']}")
    print(f"Interpretation: {m_res['diagnosis']['clinical_interpretation']}")
    print(f"Annotated Image Encoded: {len(m_res.get('annotated_image_base64', '')) > 100} ({len(m_res.get('annotated_image_base64', ''))} chars)")
    print(f"Latency: {m_res['performance']['inference_duration_ms']} ms")
    assert m_res["status"] == "success"
    assert m_res["cell_counts"]["total_cells"] >= 0
    assert 0.0 <= m_res["cell_counts"]["plasma_cell_percentage"] <= 100.0
    print(">>> TEST 3 PASSED: Multiple Myeloma detection verified!")

    print("\n" + "=" * 75)
    print("TEST 4: Report Generation Service")
    print("=" * 75)
    req = ReportRequest(
        patient_info=PatientInfo(
            patient_id="PAT-TEST-001",
            age=54,
            gender="Female",
            sample_id="SMP-2026-X",
            sample_date="2026-11-17",
            clinical_history="Routine hematological diagnostic screening.",
            ordering_physician="Dr. Emily Thorne, MD"
        ),
        leukemia_result=l_res,
        myeloma_result=m_res,
        custom_notes="Diagnostic screening test run."
    )
    rep_res = generate_diagnostic_report(req)
    print(f"Report ID: {rep_res['report_id']}")
    print(f"Overall Status: {rep_res['overall_status']}")
    print(f"Risk Rating: {rep_res['risk_level']}")
    print(f"Findings Count: {len(rep_res['findings'])}")
    print(f"Recommendations Count: {len(rep_res['recommendations'])}")
    assert rep_res["report_id"].startswith("RPT-")
    assert len(rep_res["findings"]) > 0
    assert len(rep_res["recommendations"]) > 0
    print(">>> TEST 4 PASSED: Report generation verified!")

    print("\n" + "=" * 75)
    print("TEST 5: FastAPI Route Handlers Direct Invocation")
    print("=" * 75)
    # Health check handler
    h = await main.health_check()
    print("Handler main.health_check():", h["status"])
    assert h["status"] == "healthy"

    # Models info handler
    m_info = await main.get_models_info()
    print("Handler main.get_models_info():", m_info["status"])
    assert m_info["status"] == "success"

    # Leukemia endpoint handler with UploadFile
    uf_l = UploadFile(file=io.BytesIO(l_bytes), filename="sample_l.jpg", headers={"content-type": "image/jpeg"})
    res_l_route = await main.predict_leukemia(file=uf_l)
    print("Handler main.predict_leukemia():", res_l_route["status"], "->", res_l_route["prediction"]["class_name"])
    assert res_l_route["status"] == "success"

    # Myeloma endpoint handler with UploadFile
    uf_m = UploadFile(file=io.BytesIO(m_bytes), filename="sample_m.jpg", headers={"content-type": "image/jpeg"})
    res_m_route = await main.predict_myeloma(file=uf_m)
    print("Handler main.predict_myeloma():", res_m_route["status"], "-> Total cells:", res_m_route["cell_counts"]["total_cells"])
    assert res_m_route["status"] == "success"

    # Report endpoint handler
    res_rep_route = await main.generate_report(request=req)
    print("Handler main.generate_report():", res_rep_route["status"], "-> Report ID:", res_rep_route["report"]["report_id"])
    assert res_rep_route["status"] == "success"

    print(">>> TEST 5 PASSED: All FastAPI endpoint handlers verified!")

    print("\n" + "=" * 75)
    print("ALL TESTS PASSED WITH 100% INTEGRITY AND ZERO FAILURES!")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    asyncio.run(verify())
