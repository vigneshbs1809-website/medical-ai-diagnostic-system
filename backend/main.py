"""
Main Application Entry Point: Medical AI Diagnostic Backend
FastAPI server providing endpoints for Leukemia (B-ALL) classification,
Multiple Myeloma detection & counting, and automated clinical report generation.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from leukemia_service import run_leukemia_inference
from model_loader import model_manager
from myeloma_service import run_myeloma_inference
from pdf_service import generate_leukemia_pdf, generate_myeloma_pdf
from report_service import ReportRequest, generate_diagnostic_report

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("medical_ai.api")


# ---------------------------------------------------------------------------
# Application Lifespan: Load Models Once on Startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Medical AI Diagnostic Backend...")
    # Load both models once at startup
    model_manager.load_all_models()
    yield
    logger.info("Shutting down Medical AI Diagnostic Backend...")


app = FastAPI(
    title="Medical AI Diagnostic API",
    description="Dual deep-learning diagnostic backend for Leukemia (B-ALL) classification and Multiple Myeloma cell detection.",
    version="1.0.0",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# Cross-Origin Resource Sharing (CORS) Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local frontend integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------
@app.exception_handler(ValueError)
async def value_error_handler(request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"status": "error", "error_type": "ValidationError", "message": str(exc)}
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request, exc: RuntimeError):
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "error", "error_type": "ModelExecutionError", "message": str(exc)}
    )


# ---------------------------------------------------------------------------
# Health & Status Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """
    Returns system status, active compute device, and model readiness.
    """
    st = model_manager.get_status()
    all_ready = st["models"]["leukemia"]["is_ready"] and st["models"]["myeloma"]["is_ready"]
    return {
        "status": "healthy" if all_ready else "degraded",
        "service": "Medical AI Diagnostic Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "device": st["device"],
        "models": {
            "leukemia_model_ready": st["models"]["leukemia"]["is_ready"],
            "myeloma_model_ready": st["models"]["myeloma"]["is_ready"]
        }
    }


@app.get("/api/models", tags=["System"])
async def get_models_info() -> Dict[str, Any]:
    """
    Returns detailed architectural and configuration specifications for both models.
    """
    return {
        "status": "success",
        "system_status": model_manager.get_status()
    }


# ---------------------------------------------------------------------------
# Diagnostic Inference Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/leukemia/predict", tags=["Diagnostics"])
async def predict_leukemia(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Performs B-cell Acute Lymphoblastic Leukemia (B-ALL) single-cell classification.
    Accepts JPG, JPEG, or PNG cytology cell images.
    """
    filename = file.filename or "unknown.jpg"
    try:
        content = await file.read()
        result = run_leukemia_inference(content, filename=filename)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        logger.error(f"Leukemia prediction unexpected failure: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference failure: {str(e)}")


@app.post("/api/myeloma/predict", tags=["Diagnostics"])
async def predict_myeloma(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Performs Multiple Myeloma bone marrow aspirate slide cell detection,
    plasma cell counting, and diagnostic risk ratio computation.
    Accepts JPG, JPEG, or PNG bone marrow microscopy images.
    """
    filename = file.filename or "unknown.jpg"
    try:
        content = await file.read()
        result = run_myeloma_inference(content, filename=filename, return_annotated=True)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(re))
    except Exception as e:
        logger.error(f"Myeloma prediction unexpected failure: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference failure: {str(e)}")


# ---------------------------------------------------------------------------
# Clinical Report Generation Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/report/generate", tags=["Reporting"])
async def generate_report(request: ReportRequest) -> Dict[str, Any]:
    """
    Generates a structured medical report and formatted Markdown document
    combining patient information with Leukemia and Myeloma diagnostic findings.
    """
    try:
        report = generate_diagnostic_report(request)
        return {"status": "success", "report": report}
    except Exception as e:
        logger.error(f"Report generation error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report error: {str(e)}")


# ---------------------------------------------------------------------------
# Professional PDF Report Download Endpoints
# ---------------------------------------------------------------------------
class PDFExportPayload(BaseModel):
    prediction_result: Dict[str, Any]
    patient_id: Optional[str] = "ANONYMOUS"
    custom_notes: Optional[str] = None


@app.post("/api/leukemia/report/pdf", tags=["Reporting", "PDF"])
async def download_leukemia_pdf_from_upload(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form("ANONYMOUS"),
    custom_notes: Optional[str] = Form(None)
):
    """
    Executes Leukemia classification on uploaded cytology image and streams back
    a downloadable, professional clinical PDF report.
    """
    filename = file.filename or "cytology_slide.jpg"
    try:
        content = await file.read()
        result = run_leukemia_inference(content, filename=filename)
        pdf_bytes = generate_leukemia_pdf(
            result,
            original_image_bytes=content,
            patient_id=patient_id or "ANONYMOUS",
            custom_notes=custom_notes
        )
        report_filename = f"Leukemia_Report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{report_filename}"',
                "Content-Type": "application/pdf"
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to generate Leukemia PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/myeloma/report/pdf", tags=["Reporting", "PDF"])
async def download_myeloma_pdf_from_upload(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form("ANONYMOUS"),
    custom_notes: Optional[str] = Form(None)
):
    """
    Executes Multiple Myeloma cell detection on uploaded bone marrow slide and streams back
    a downloadable, professional clinical PDF report with original and annotated images.
    """
    filename = file.filename or "marrow_slide.jpg"
    try:
        content = await file.read()
        result = run_myeloma_inference(content, filename=filename, return_annotated=True)
        pdf_bytes = generate_myeloma_pdf(
            result,
            original_image_bytes=content,
            patient_id=patient_id or "ANONYMOUS",
            custom_notes=custom_notes
        )
        report_filename = f"Myeloma_Report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{report_filename}"',
                "Content-Type": "application/pdf"
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to generate Myeloma PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/leukemia/export-pdf", tags=["Reporting", "PDF"])
async def export_leukemia_pdf_from_json(payload: PDFExportPayload):
    """
    Generates a downloadable clinical PDF report from an existing Leukemia prediction result.
    """
    try:
        pdf_bytes = generate_leukemia_pdf(
            payload.prediction_result,
            original_image_bytes=None,
            patient_id=payload.patient_id or "ANONYMOUS",
            custom_notes=payload.custom_notes
        )
        report_filename = f"Leukemia_Report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{report_filename}"',
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to export Leukemia PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/myeloma/export-pdf", tags=["Reporting", "PDF"])
async def export_myeloma_pdf_from_json(payload: PDFExportPayload):
    """
    Generates a downloadable clinical PDF report from an existing Myeloma prediction result.
    """
    try:
        pdf_bytes = generate_myeloma_pdf(
            payload.prediction_result,
            original_image_bytes=None,
            patient_id=payload.patient_id or "ANONYMOUS",
            custom_notes=payload.custom_notes
        )
        report_filename = f"Myeloma_Report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{report_filename}"',
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        logger.error(f"Failed to export Myeloma PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ---------------------------------------------------------------------------
# Server Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
