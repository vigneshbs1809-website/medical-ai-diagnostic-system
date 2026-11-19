"""
End-to-End Full Stack Integration Verification Suite
Tests all 5 API endpoints with real model checkpoints, sample cytology images,
and validates response schemas expected by the React frontend.
"""

import os
import sys
import time
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from model_loader import model_manager
from leukemia_service import run_leukemia_inference
from myeloma_service import run_myeloma_inference
from report_service import ReportRequest, PatientInfo, generate_diagnostic_report
from main import app, health_check, get_models_info, predict_leukemia, predict_myeloma, generate_report


def print_step(title):
    print(f"\n{'='*70}\n[INTEGRATION TEST] {title}\n{'='*70}")


def main():
    print_step("STEP 1: Verify ModelManager Singleton & Weights Readiness")
    t0 = time.time()
    model_manager.load_all_models()
    load_time = time.time() - t0
    status = model_manager.get_status()
    print(f"Device: {status['device']}")
    print(f"Leukemia Model Ready: {status['models']['leukemia']['is_ready']}")
    print(f"Myeloma Model Ready: {status['models']['myeloma']['is_ready']}")
    print(f"Loading completed in {load_time:.2f}s")
    assert status['models']['leukemia']['is_ready'], "Leukemia model failed to load"
    assert status['models']['myeloma']['is_ready'], "Myeloma model failed to load"

    # ------------------------------------------------------------------------
    print_step("STEP 2: Verify GET /api/health Endpoint Contract")
    import asyncio
    health_resp = asyncio.run(health_check())
    print(f"Health Response: {health_resp}")
    assert health_resp["status"] in ["healthy", "degraded"], f"Unexpected health status: {health_resp['status']}"
    assert "models" in health_resp
    assert health_resp["models"]["leukemia_model_ready"] is True
    assert health_resp["models"]["myeloma_model_ready"] is True
    print("✓ GET /api/health contract verified.")

    # ------------------------------------------------------------------------
    print_step("STEP 3: Verify GET /api/models Endpoint Contract")
    models_resp = asyncio.run(get_models_info())
    assert models_resp["status"] == "success"
    sys_status = models_resp["system_status"]
    assert "leukemia" in sys_status["models"]
    assert "myeloma" in sys_status["models"]
    leuk_info = sys_status["models"]["leukemia"].get("info", {})
    myel_info = sys_status["models"]["myeloma"].get("info", {})
    print(f"Leukemia Architecture: {leuk_info.get('architecture')}")
    print(f"Leukemia Classes: {leuk_info.get('classes')}")
    print(f"Myeloma Architecture: {myel_info.get('architecture')}")
    print(f"Myeloma Classes: {myel_info.get('classes')}")
    print("✓ GET /api/models contract verified.")

    # ------------------------------------------------------------------------
    print_step("STEP 4: Verify POST /api/leukemia/predict Workflow")
    sample_leukemia_path = backend_dir / "tests" / "sample_leukemia.jpg"
    assert sample_leukemia_path.exists(), f"Sample image not found: {sample_leukemia_path}"

    with open(sample_leukemia_path, "rb") as f:
        leukemia_bytes = f.read()

    print(f"Read sample cytology image: {sample_leukemia_path.name} ({len(leukemia_bytes)} bytes)")
    leukemia_resp = run_leukemia_inference(leukemia_bytes, filename=sample_leukemia_path.name)

    # Validate schema expected by React frontend
    assert leukemia_resp["status"] == "success"
    assert leukemia_resp["task"] == "leukemia_classification"
    assert "prediction" in leukemia_resp
    pred = leukemia_resp["prediction"]
    assert "class_name" in pred
    assert pred["class_name"] in ["Normal", "B-ALL"]
    assert "confidence" in pred
    assert 0.0 <= pred["confidence"] <= 1.0
    assert "probabilities" in pred
    assert "Normal" in pred["probabilities"]
    assert "B-ALL" in pred["probabilities"]
    assert "performance" in leukemia_resp
    assert "inference_duration_ms" in leukemia_resp["performance"]

    print(f"Predicted Class: {pred['class_name']}")
    print(f"Confidence: {pred['confidence'] * 100:.2f}%")
    print(f"Probabilities: {pred['probabilities']}")
    print(f"Inference Latency: {leukemia_resp['performance']['inference_duration_ms']} ms")
    print("✓ POST /api/leukemia/predict workflow verified.")

    # ------------------------------------------------------------------------
    print_step("STEP 5: Verify POST /api/myeloma/predict Workflow")
    sample_myeloma_path = backend_dir / "tests" / "sample_myeloma.jpg"
    assert sample_myeloma_path.exists(), f"Sample image not found: {sample_myeloma_path}"

    with open(sample_myeloma_path, "rb") as f:
        myeloma_bytes = f.read()

    print(f"Read sample marrow image: {sample_myeloma_path.name} ({len(myeloma_bytes)} bytes)")
    myeloma_resp = run_myeloma_inference(myeloma_bytes, filename=sample_myeloma_path.name, return_annotated=True)

    # Validate schema expected by React frontend
    assert myeloma_resp["status"] == "success"
    assert myeloma_resp["task"] == "multiple_myeloma_detection"
    assert "cell_counts" in myeloma_resp
    counts = myeloma_resp["cell_counts"]
    assert "total_cells" in counts
    assert "plasma_cells" in counts
    assert "non_plasma_cells" in counts
    assert "plasma_cell_percentage" in counts
    assert "diagnosis" in myeloma_resp
    diag = myeloma_resp["diagnosis"]
    assert "myeloma_suspected" in diag
    assert "diagnostic_threshold_pct" in diag
    assert "detections" in myeloma_resp
    assert isinstance(myeloma_resp["detections"], list)
    assert "annotated_image_base64" in myeloma_resp
    assert len(myeloma_resp["annotated_image_base64"]) > 1000

    print(f"Total Cells Detected: {counts['total_cells']}")
    print(f"Plasma Cells: {counts['plasma_cells']}")
    print(f"Non-Plasma Cells: {counts['non_plasma_cells']}")
    print(f"Plasma Ratio: {counts['plasma_cell_percentage']}%")
    print(f"Myeloma Suspected Flag (>10%): {diag['myeloma_suspected']}")
    print(f"Annotated Image Rendered: {len(myeloma_resp['annotated_image_base64'])} chars base64")
    print(f"Inference Latency: {myeloma_resp['performance']['inference_duration_ms']} ms")
    print("✓ POST /api/myeloma/predict workflow verified.")

    # ------------------------------------------------------------------------
    print_step("STEP 6: Verify POST /api/report/generate Workflow")
    report_req = ReportRequest(
        patient_info=PatientInfo(
            patient_id="PT-2026-INT-001",
            age=62,
            gender="Male",
            sample_id="SMP-2026-BMA",
            sample_date="2026-11-17",
            clinical_history="Investigation for normocytic anemia and hypercalcemia.",
            ordering_physician="Dr. J. Martinez, MD"
        ),
        leukemia_result=leukemia_resp,
        myeloma_result=myeloma_resp,
        custom_notes="Urgent clinical correlation requested."
    )

    report_resp = generate_diagnostic_report(report_req)
    assert "report_id" in report_resp
    assert "overall_status" in report_resp
    assert "risk_level" in report_resp
    assert "recommendations" in report_resp
    assert len(report_resp["recommendations"]) > 0
    assert "markdown_report" in report_resp
    assert len(report_resp["markdown_report"]) > 100

    print(f"Generated Report ID: {report_resp['report_id']}")
    print(f"Overall Status: {report_resp['overall_status']}")
    print(f"Risk Level: {report_resp['risk_level']}")
    print(f"Recommendations Count: {len(report_resp['recommendations'])}")
    print("✓ POST /api/report/generate workflow verified.")

    # ------------------------------------------------------------------------
    print_step("STEP 7: Negative Testing & Invalid Input Handling")
    try:
        # Pass non-image corrupted bytes
        run_leukemia_inference(b"NOT_AN_IMAGE_FILE", filename="corrupt.jpg")
        assert False, "Should have raised ValueError on corrupt file"
    except ValueError as ve:
        print(f"Corrupt Leukemia File Error Caught Successfully: {ve}")

    try:
        run_myeloma_inference(b"CORRUPT_BYTES", filename="corrupt.png")
        assert False, "Should have raised ValueError on corrupt file"
    except ValueError as ve:
        print(f"Corrupt Myeloma File Error Caught Successfully: {ve}")

    # ------------------------------------------------------------------------
    print_step("STEP 8: Verify Downloadable Backend PDF Generation (ReportLab)")
    from pdf_service import generate_leukemia_pdf, generate_myeloma_pdf

    leuk_pdf = generate_leukemia_pdf(leukemia_resp, original_image_bytes=leukemia_bytes, patient_id="PT-INT-001")
    assert leuk_pdf.startswith(b"%PDF-"), "Leukemia PDF must start with %PDF- header"
    assert len(leuk_pdf) > 5000, f"Leukemia PDF too small ({len(leuk_pdf)} bytes)"
    print(f"✓ Leukemia Downloadable PDF generated successfully: {len(leuk_pdf)} bytes")

    myel_pdf = generate_myeloma_pdf(myeloma_resp, original_image_bytes=myeloma_bytes, patient_id="PT-INT-002")
    assert myel_pdf.startswith(b"%PDF-"), "Myeloma PDF must start with %PDF- header"
    assert len(myel_pdf) > 5000, f"Myeloma PDF too small ({len(myel_pdf)} bytes)"
    print(f"✓ Multiple Myeloma Downloadable PDF generated successfully: {len(myel_pdf)} bytes")

    print_step("ALL 8 INTEGRATION & PDF VERIFICATION STEPS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
