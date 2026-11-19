"""
Report Service Module: Clinical Diagnostic Report Generator
Aggregates patient metadata, Leukemia classification findings, and Multiple Myeloma detection
into a standardized medical diagnostic report with clinical risk stratification.
"""

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PatientInfo(BaseModel):
    patient_id: str = Field(..., description="Unique Patient Identifier (e.g. PAT-001)")
    age: Optional[int] = Field(None, description="Patient age in years")
    gender: Optional[str] = Field(None, description="Patient gender (Male, Female, Other)")
    sample_id: Optional[str] = Field(None, description="Specimen/Slide identifier")
    sample_date: Optional[str] = Field(None, description="Date specimen was collected (YYYY-MM-DD)")
    clinical_history: Optional[str] = Field(None, description="Relevant clinical history or symptoms")
    ordering_physician: Optional[str] = Field(None, description="Ordering clinician or hematologist")


class ReportRequest(BaseModel):
    patient_info: PatientInfo
    leukemia_result: Optional[Dict[str, Any]] = None
    myeloma_result: Optional[Dict[str, Any]] = None
    custom_notes: Optional[str] = None


def generate_diagnostic_report(request: ReportRequest) -> Dict[str, Any]:
    """
    Generates a structured medical report and formatted Markdown document.
    """
    report_id = f"RPT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()
    p_info = request.patient_info

    findings: List[str] = []
    recommendations: List[str] = []
    risk_level = "LOW"
    overall_status = "NORMAL / LOW RISK"

    # Evaluate Leukemia finding
    leukemia_summary = None
    if request.leukemia_result:
        l_pred = request.leukemia_result.get("prediction", {})
        l_class = l_pred.get("class_name", "Unknown")
        l_conf = l_pred.get("confidence", 0.0)
        l_probs = l_pred.get("probabilities", {})

        leukemia_summary = {
            "tested": True,
            "classification": l_class,
            "confidence": l_conf,
            "probabilities": l_probs,
            "flag": l_pred.get("diagnostic_flag")
        }

        if l_class == "B-ALL":
            findings.append(f"Leukemia Cytology: Positive for B-cell Acute Lymphoblastic Leukemia blasts (Confidence: {l_conf * 100:.1f}%).")
            risk_level = "HIGH"
            overall_status = "ABNORMAL / CRITICAL FINDINGS"
            recommendations.append("Immediate flow cytometry immunophenotyping (CD10, CD19, CD20, CD22, TdT).")
            recommendations.append("Urgent bone marrow aspirate cytogenetics and molecular testing (BCR-ABL1, KMT2A).")
            recommendations.append("Immediate referral to pediatric/adult hematology-oncology.")
        else:
            findings.append(f"Leukemia Cytology: Negative for lymphoblasts. Morphology consistent with normal lymphoid elements (Confidence: {l_conf * 100:.1f}%).")

    # Evaluate Myeloma finding
    myeloma_summary = None
    if request.myeloma_result:
        m_counts = request.myeloma_result.get("cell_counts", {})
        m_diag = request.myeloma_result.get("diagnosis", {})
        
        plasma_pct = m_counts.get("plasma_cell_percentage", 0.0)
        n_plasma = m_counts.get("plasma_cells", 0)
        total_cells = m_counts.get("total_cells", 0)
        suspected = m_diag.get("myeloma_suspected", False)

        myeloma_summary = {
            "tested": True,
            "total_cells": total_cells,
            "plasma_cells": n_plasma,
            "plasma_cell_percentage": plasma_pct,
            "myeloma_suspected": suspected,
            "status": m_diag.get("diagnostic_status")
        }

        if suspected:
            findings.append(f"Myeloma Cytology: Plasma cell fraction is {plasma_pct:.1f}% ({n_plasma}/{total_cells} cells), exceeding the 10.0% diagnostic threshold.")
            if risk_level != "HIGH":
                risk_level = "HIGH"
                overall_status = "ABNORMAL / SUSPECTED MYELOMA"
            recommendations.append("Serum protein electrophoresis (SPEP) and immunofixation electrophoresis (IFE).")
            recommendations.append("Serum free light chain (sFLC) ratio and 24-hour urine protein electrophoresis (UPEP).")
            recommendations.append("Core bone marrow biopsy with CD138 immunohistochemistry for plasma cell volume quantification.")
            recommendations.append("Whole-body low-dose CT or skeletal survey to evaluate osteolytic lesions.")
        else:
            findings.append(f"Myeloma Cytology: Plasma cell fraction is {plasma_pct:.1f}% ({n_plasma}/{total_cells} cells), within physiological marrow range (<= 10.0%).")

    if not findings:
        findings.append("No diagnostic modules were provided for analysis.")
        overall_status = "INCOMPLETE"
        risk_level = "INDETERMINATE"
        recommendations.append("Upload cytology slide images to initiate AI-assisted diagnostics.")
    elif risk_level == "LOW":
        recommendations.append("Correlate findings with clinical symptoms and standard CBC with differential.")
        recommendations.append("Routine clinical follow-up as clinically indicated.")

    # Generate Markdown Presentation
    md_lines = [
        f"# AI HEMATOLOGIC DIAGNOSTIC REPORT",
        f"**Report ID:** {report_id}  |  **Date:** {timestamp[:10]}  |  **Generated:** {timestamp[11:19]} UTC",
        f"",
        f"---",
        f"## 1. Patient & Specimen Information",
        f"- **Patient ID:** {p_info.patient_id}",
        f"- **Age / Gender:** {p_info.age or 'N/A'} yrs / {p_info.gender or 'N/A'}",
        f"- **Sample ID:** {p_info.sample_id or 'N/A'}",
        f"- **Collection Date:** {p_info.sample_date or 'N/A'}",
        f"- **Ordering Clinician:** {p_info.ordering_physician or 'Not Specified'}",
        f"- **Clinical History:** {p_info.clinical_history or 'None provided'}",
        f"",
        f"---",
        f"## 2. Diagnostic Assessment Summary",
        f"**Overall Assessment:** `{overall_status}`  ",
        f"**Calculated Risk Level:** **{risk_level}**",
        f"",
        f"### Key Findings:",
    ]
    for f in findings:
        md_lines.append(f"- {f}")

    if leukemia_summary:
        md_lines.extend([
            f"",
            f"---",
            f"## 3. Leukemia / B-ALL Cytology Details",
            f"- **AI Classification:** `{leukemia_summary['classification']}`",
            f"- **Confidence Score:** `{leukemia_summary['confidence'] * 100:.2f}%`",
            f"- **Model Used:** EfficientNet-B3 (PyTorch / timm, input: 300x300 px)",
        ])

    if myeloma_summary:
        md_lines.extend([
            f"",
            f"---",
            f"## 4. Multiple Myeloma Cell Detection Details",
            f"- **Total Nucleated Cells Analyzed:** `{myeloma_summary['total_cells']}`",
            f"- **Plasma Cell Count:** `{myeloma_summary['plasma_cells']}`",
            f"- **Calculated Plasma Cell Fraction:** `{myeloma_summary['plasma_cell_percentage']:.2f}%` (Diagnostic Cutoff: `>10.0%`)",
            f"- **Multiple Myeloma Suspected:** `{'YES' if myeloma_summary['myeloma_suspected'] else 'NO'}`",
            f"- **Model Used:** YOLO26m (Ultralytics End-to-End NMS-Free, input: 800x800 px)",
        ])

    md_lines.extend([
        f"",
        f"---",
        f"## 5. Clinical Recommendations",
    ])
    for r in recommendations:
        md_lines.append(f"1. {r}")

    if request.custom_notes:
        md_lines.extend([
            f"",
            f"---",
            f"## 6. Clinician Addendum",
            f"{request.custom_notes}"
        ])

    md_lines.extend([
        f"",
        f"---",
        f"*Disclaimer: This AI diagnostic report is generated by deep-learning models as clinical decision support. "
        f"Final diagnosis must be rendered by a certified hematopathologist in conjunction with complete clinical, histological, and laboratory data.*"
    ])

    formatted_md = "\n".join(md_lines)

    return {
        "report_id": report_id,
        "generated_at": timestamp,
        "patient_info": p_info.model_dump(),
        "overall_status": overall_status,
        "risk_level": risk_level,
        "findings": findings,
        "recommendations": recommendations,
        "leukemia_module": leukemia_summary,
        "myeloma_module": myeloma_summary,
        "custom_notes": request.custom_notes,
        "formatted_markdown": formatted_md,
        "markdown_report": formatted_md
    }
