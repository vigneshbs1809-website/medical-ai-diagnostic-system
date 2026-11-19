"""
Verification script for ReportLab backend PDF generation.
Tests both Leukemia and Multiple Myeloma PDF generation with real sample images.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from leukemia_service import run_leukemia_inference
from myeloma_service import run_myeloma_inference
from pdf_service import generate_leukemia_pdf, generate_myeloma_pdf
from model_loader import model_manager

def main():
    print("Testing PDF Generation...")
    model_manager.load_all_models()

    # 1. Test Leukemia PDF
    sample_leukemia = backend_dir / "tests" / "sample_leukemia.jpg"
    with open(sample_leukemia, "rb") as f:
        leuk_bytes = f.read()

    leuk_result = run_leukemia_inference(leuk_bytes, filename=sample_leukemia.name)
    leuk_pdf = generate_leukemia_pdf(leuk_result, original_image_bytes=leuk_bytes, patient_id="PT-TEST-LEUK-01")
    assert len(leuk_pdf) > 5000, f"Leukemia PDF too small: {len(leuk_pdf)} bytes"
    assert leuk_pdf.startswith(b"%PDF-"), "File is not a valid PDF binary"
    print(f"✓ Leukemia PDF generated successfully ({len(leuk_pdf)} bytes)")

    # 2. Test Myeloma PDF
    sample_myeloma = backend_dir / "tests" / "sample_myeloma.jpg"
    with open(sample_myeloma, "rb") as f:
        myel_bytes = f.read()

    myel_result = run_myeloma_inference(myel_bytes, filename=sample_myeloma.name, return_annotated=True)
    myel_pdf = generate_myeloma_pdf(myel_result, original_image_bytes=myel_bytes, patient_id="PT-TEST-MYEL-02")
    assert len(myel_pdf) > 5000, f"Myeloma PDF too small: {len(myel_pdf)} bytes"
    assert myel_pdf.startswith(b"%PDF-"), "File is not a valid PDF binary"
    print(f"✓ Myeloma PDF generated successfully ({len(myel_pdf)} bytes)")

    # Save samples to disk for inspection
    out_dir = backend_dir / "tests" / "output_reports"
    out_dir.mkdir(exist_ok=True)
    with open(out_dir / "Leukemia_Report_Sample.pdf", "wb") as f:
        f.write(leuk_pdf)
    with open(out_dir / "Myeloma_Report_Sample.pdf", "wb") as f:
        f.write(myel_pdf)
    print(f"Saved sample PDFs to: {out_dir}")

if __name__ == "__main__":
    main()
