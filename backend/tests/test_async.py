import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import httpx
from main import app
from model_loader import model_manager

async def test():
    print("Testing with AsyncClient...")
    model_manager.load_all_models()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/health")
        print("GET /api/health:", r.status_code, r.json())
        
        r2 = await ac.get("/api/models")
        print("GET /api/models:", r2.status_code)
        
        # Test leukemia predict
        sample_l = BACKEND_DIR / "tests" / "sample_leukemia.jpg"
        with open(sample_l, "rb") as f:
            r3 = await ac.post("/api/leukemia/predict", files={"file": ("sample.jpg", f.read(), "image/jpeg")})
        print("POST /api/leukemia/predict:", r3.status_code, r3.json()["prediction"]["class_name"])
        
        # Test myeloma predict
        sample_m = BACKEND_DIR / "tests" / "sample_myeloma.jpg"
        with open(sample_m, "rb") as f:
            r4 = await ac.post("/api/myeloma/predict", files={"file": ("sample.jpg", f.read(), "image/jpeg")})
        print("POST /api/myeloma/predict:", r4.status_code, "cells:", r4.json()["cell_counts"]["total_cells"])
        
        # Test report
        from report_service import ReportRequest, PatientInfo
        req = ReportRequest(
            patient_info=PatientInfo(patient_id="P-01"),
            leukemia_result=r3.json(),
            myeloma_result=r4.json()
        )
        r5 = await ac.post("/api/report/generate", json=req.model_dump())
        print("POST /api/report/generate:", r5.status_code, "report_id:", r5.json()["report"]["report_id"])
        
        # Test validation error
        r6 = await ac.post("/api/leukemia/predict", files={"file": ("test.txt", b"plain text", "text/plain")})
        print("POST /api/leukemia/predict (invalid):", r6.status_code)

if __name__ == "__main__":
    asyncio.run(test())
