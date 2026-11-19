"""
PDF Generation Service Module: Medical AI Diagnostic Reports
Generates professional clinical-grade PDF documents using ReportLab for:
1. Leukemia (B-ALL) Single-Cell Classification
2. Multiple Myeloma Bone Marrow Detection & Plasmacytosis Counter

Clean white styling with navy-blue headings (#183B56), structured clinical tables,
embedded specimen images, and audited model benchmark comparisons.
"""

import io
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from PIL import Image

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    HRFlowable
)

# ---------------------------------------------------------------------------
# Clinical Color Palette
# ---------------------------------------------------------------------------
NAVY_PRIMARY = colors.HexColor("#183B56")
ACCENT_BLUE = colors.HexColor("#367CB8")
LIGHT_BLUE_BG = colors.HexColor("#EAF3FA")
SLATE_BG = colors.HexColor("#F8FAFC")
TEXT_MAIN = colors.HexColor("#243447")
TEXT_MUTED = colors.HexColor("#718096")
BORDER_COLOR = colors.HexColor("#CBD5E1")
SUCCESS_GREEN = colors.HexColor("#27865C")
DANGER_RED = colors.HexColor("#C53030")
LIGHT_GREEN_BG = colors.HexColor("#F0FDF4")
LIGHT_RED_BG = colors.HexColor("#FEF2F2")


def _get_clinical_styles():
    """Builds clean, professional typographic styles."""
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.white
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#E2E8F0")
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=NAVY_PRIMARY,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=NAVY_PRIMARY,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_MAIN
    )

    body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=TEXT_MAIN
    )

    caption_style = ParagraphStyle(
        'DocCaption',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MUTED,
        alignment=1
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=NAVY_PRIMARY
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MAIN
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=TEXT_MAIN
    )

    disclaimer_style = ParagraphStyle(
        'DocDisclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7,
        leading=9.5,
        textColor=TEXT_MUTED
    )

    return {
        'title': title_style,
        'subtitle': subtitle_style,
        'h1': h1_style,
        'h2': h2_style,
        'body': body_style,
        'body_bold': body_bold,
        'caption': caption_style,
        'th': table_header_style,
        'td': table_cell_style,
        'td_bold': table_cell_bold,
        'disclaimer': disclaimer_style,
    }


def _process_image_for_reportlab(image_input: Any, max_w: float = 3.0, max_h: float = 2.4) -> Optional[RLImage]:
    """
    Safely resizes and packages image bytes or PIL Image into a ReportLab Image Flowable.
    """
    if not image_input:
        return None

    try:
        if isinstance(image_input, bytes):
            pil_img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            pil_img = image_input
        else:
            return None

        # Ensure RGB
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        orig_w, orig_h = pil_img.size
        aspect = orig_w / float(orig_h)

        # Scale within maximum bounding box
        target_w = max_w * inch
        target_h = target_w / aspect
        if target_h > max_h * inch:
            target_h = max_h * inch
            target_w = target_h * aspect

        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=88)
        buf.seek(0)

        rl_img = RLImage(buf, width=target_w, height=target_h)
        return rl_img
    except Exception as e:
        print(f"Warning: Image conversion failed for PDF: {e}")
        return None


# ===========================================================================
# 1. Leukemia Classification Clinical Report Generator
# ===========================================================================
def generate_leukemia_pdf(
    prediction_result: Dict[str, Any],
    original_image_bytes: Optional[bytes] = None,
    patient_id: str = "ANONYMOUS",
    custom_notes: Optional[str] = None
) -> bytes:
    """
    Builds a professional clinical PDF report for Leukemia (B-ALL) Classification.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    styles = _get_clinical_styles()
    story: List[Any] = []

    # Analysis ID and Timestamp
    analysis_id = f"ANL-LEUK-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    analysis_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    pred = prediction_result.get("prediction", {})
    perf = prediction_result.get("performance", {})
    specs = prediction_result.get("input_specs", {})
    is_ball = pred.get("class_name") == "B-ALL"

    # --- Header Banner Table ---
    header_data = [
        [
            Paragraph("MEDICAL AI DIAGNOSTIC SYSTEM", styles['title']),
            Paragraph(f"<b>REPORT ID:</b> {analysis_id}<br/><b>DATE:</b> {analysis_time[:10]}", styles['subtitle'])
        ],
        [
            Paragraph("Automated Hematological Decision Support & Cytology Analysis", styles['subtitle']),
            Paragraph("<b>CONFIDENTIAL MEDICAL REPORT</b>", styles['subtitle'])
        ]
    ]
    header_table = Table(header_data, colWidths=[4.2 * inch, 2.8 * inch])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY_PRIMARY),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # --- Document Sub-Title ---
    story.append(Paragraph("CLINICAL EVALUATION REPORT: B-ALL CYTOLOGY CLASSIFICATION", styles['h1']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_BLUE, spaceBefore=1, spaceAfter=8))

    # --- Section 1: Metadata Grid ---
    metadata = [
        [
            Paragraph("<b>Patient Identifier:</b>", styles['td']),
            Paragraph(patient_id, styles['td_bold']),
            Paragraph("<b>Diagnostic Pipeline:</b>", styles['td']),
            Paragraph("Leukemia Blast Classifier", styles['td_bold'])
        ],
        [
            Paragraph("<b>Specimen File:</b>", styles['td']),
            Paragraph(specs.get("filename", "cytology_slide.jpg"), styles['td']),
            Paragraph("<b>Analysis Timestamp:</b>", styles['td']),
            Paragraph(analysis_time, styles['td'])
        ],
        [
            Paragraph("<b>Original Dimensions:</b>", styles['td']),
            Paragraph(f"{specs.get('original_dimensions', ['-','-'])[0]} x {specs.get('original_dimensions', ['-','-'])[1]} px", styles['td']),
            Paragraph("<b>Inference Latency:</b>", styles['td']),
            Paragraph(f"{perf.get('inference_duration_ms', 0):.1f} ms ({perf.get('device', 'cpu').upper()})", styles['td'])
        ]
    ]
    meta_table = Table(metadata, colWidths=[1.5 * inch, 2.0 * inch, 1.5 * inch, 2.0 * inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SLATE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # --- Section 2: Model Specifications ---
    story.append(Paragraph("1. Model Identification & Architecture", styles['h1']))
    model_specs_data = [
        [Paragraph("<b>Model Identifier</b>", styles['th']), Paragraph("efficientnet_b3", styles['td'])],
        [Paragraph("<b>Network Architecture</b>", styles['th']), Paragraph("EfficientNet-B3 (timm backbone) with custom 2-layer MLP classification head", styles['td'])],
        [Paragraph("<b>Checkpoint Path</b>", styles['th']), Paragraph("models/leukemia/checkpoints/seed42/efficientnet_b3_best.pt", styles['td'])],
        [Paragraph("<b>Input Resolution</b>", styles['th']), Paragraph("300 x 300 x 3 px (Bicubic resize, ImageNet normalization)", styles['td'])],
        [Paragraph("<b>Class Output Mapping</b>", styles['th']), Paragraph("{0: 'Normal', 1: 'B-ALL'}", styles['td'])],
        [Paragraph("<b>Decision Threshold</b>", styles['th']), Paragraph("tau = 0.50 (Positive blast cutoff: P(B-ALL) >= 0.50)", styles['td'])],
    ]
    model_table = Table(model_specs_data, colWidths=[2.2 * inch, 4.8 * inch])
    model_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), SLATE_BG),
        ('PADDING', (0, 0), (-1, -1), 3.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(model_table)
    story.append(Spacer(1, 10))

    # --- Section 3: Diagnostic Prediction Results ---
    story.append(Paragraph("2. Diagnostic Prediction & Classification Findings", styles['h1']))

    callout_color = DANGER_RED if is_ball else SUCCESS_GREEN
    callout_bg = LIGHT_RED_BG if is_ball else LIGHT_GREEN_BG
    callout_title = "POSITIVE: B-CELL ACUTE LYMPHOBLASTIC LEUKEMIA (B-ALL)" if is_ball else "NEGATIVE: NORMAL / BENIGN LYMPHOID CYTOLOGY"

    result_callout_data = [
        [
            Paragraph(f"<font color='{callout_color.hexval()}'><b>PRIMARY CLASSIFICATION: {callout_title}</b></font>", styles['h2']),
            Paragraph(f"<b>Confidence:</b> {pred.get('confidence', 0.0) * 100:.2f}%", styles['body_bold'])
        ],
        [
            Paragraph(f"<b>Morphological Interpretation:</b> {pred.get('clinical_interpretation', 'Morphology evaluated.')}", styles['body']),
            Paragraph(f"<b>Diagnostic Flag:</b> {pred.get('diagnostic_flag', 'EVALUATED')}", styles['body_bold'])
        ]
    ]
    callout_table = Table(result_callout_data, colWidths=[5.2 * inch, 1.8 * inch])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), callout_bg),
        ('BOX', (0, 0), (-1, -1), 1.0, callout_color),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 6))

    # Actual Class Probabilities Table
    probs = pred.get("probabilities", {})
    prob_rows = [
        [
            Paragraph("<b>Target Class</b>", styles['th']),
            Paragraph("<b>Probability Score</b>", styles['th']),
            Paragraph("<b>Percentage</b>", styles['th']),
            Paragraph("<b>Diagnostic Significance</b>", styles['th'])
        ],
        [
            Paragraph("<b>Normal (Benign)</b>", styles['td']),
            Paragraph(f"{probs.get('Normal', 0.0):.4f}", styles['td']),
            Paragraph(f"{probs.get('Normal', 0.0) * 100:.2f}%", styles['td']),
            Paragraph("Physiological lymphoid cellular elements", styles['td'])
        ],
        [
            Paragraph("<b>B-ALL (Malignant)</b>", styles['td']),
            Paragraph(f"{probs.get('B-ALL', 0.0):.4f}", styles['td']),
            Paragraph(f"{probs.get('B-ALL', 0.0) * 100:.2f}%", styles['td']),
            Paragraph("Immature B-cell lymphoblastic leukemia proliferation", styles['td'])
        ]
    ]
    prob_table = Table(prob_rows, colWidths=[1.8 * inch, 1.4 * inch, 1.3 * inch, 2.5 * inch])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 10))

    # --- Section 4: Cytology Image Visualization ---
    story.append(Paragraph("3. Cytological Specimen Visual Inspection", styles['h1']))
    rl_img = _process_image_for_reportlab(original_image_bytes, max_w=2.8, max_h=2.2)

    if rl_img:
        img_table_data = [
            [
                rl_img,
                Paragraph(
                    "<b>Specimen Microscopy Field:</b><br/>"
                    f"Filename: {specs.get('filename', 'cytology_slide.jpg')}<br/>"
                    f"Processed Dimensions: {specs.get('processed_dimensions', [300, 300])[0]} x {specs.get('processed_dimensions', [300, 300])[1]} px<br/>"
                    "Color Space: 3-channel RGB (ImageNet bicubic normalized)<br/><br/>"
                    "<i>Note: Single-cell cytology slide examined for blast morphology, "
                    "nuclear-to-cytoplasmic ratio, and chromatin pattern.</i>",
                    styles['body']
                )
            ]
        ]
        img_table = Table(img_table_data, colWidths=[3.2 * inch, 3.8 * inch])
        img_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), SLATE_BG),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(img_table)
    else:
        story.append(Paragraph("<i>Specimen image tensor processed successfully (Image payload not attached).</i>", styles['caption']))
    story.append(Spacer(1, 10))

    # --- Section 5: Model Evaluation & Benchmark Metrics (Clearly Separated) ---
    story.append(Paragraph("4. Audited Model Evaluation & Benchmark Metrics (Non-Inference Data)", styles['h1']))
    story.append(Paragraph("The performance benchmarks below reflect official cross-validation and test set evaluation on the audited benchmark dataset (independent of this individual patient inference):", styles['body']))
    story.append(Spacer(1, 4))

    benchmark_data = [
        [
            Paragraph("<b>Architecture</b>", styles['th']),
            Paragraph("<b>Parameters</b>", styles['th']),
            Paragraph("<b>Val Macro-F1</b>", styles['th']),
            Paragraph("<b>Test Macro-F1</b>", styles['th']),
            Paragraph("<b>Status</b>", styles['th'])
        ],
        [
            Paragraph("<b>EfficientNet-B3 (Deployed)</b>", styles['td_bold']),
            Paragraph("12.2 M", styles['td']),
            Paragraph("0.9413", styles['td']),
            Paragraph("<b>0.9429</b>", styles['td_bold']),
            Paragraph("Selected Champion (Seed 42)", styles['td'])
        ],
        [
            Paragraph("ConvNeXt-Tiny", styles['td']),
            Paragraph("28.6 M", styles['td']),
            Paragraph("0.9298", styles['td']),
            Paragraph("0.9312", styles['td']),
            Paragraph("Benchmark Baseline", styles['td'])
        ],
        [
            Paragraph("Swin-T (Transformer)", styles['td']),
            Paragraph("28.3 M", styles['td']),
            Paragraph("0.9265", styles['td']),
            Paragraph("0.9280", styles['td']),
            Paragraph("Benchmark Baseline", styles['td'])
        ],
        [
            Paragraph("DenseNet-121", styles['td']),
            Paragraph("7.0 M", styles['td']),
            Paragraph("0.9234", styles['td']),
            Paragraph("0.9251", styles['td']),
            Paragraph("Benchmark Baseline", styles['td'])
        ]
    ]
    bench_table = Table(benchmark_data, colWidths=[2.2 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch, 1.5 * inch])
    bench_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(bench_table)
    story.append(Spacer(1, 10))

    # --- Section 6: Research Disclaimer ---
    story.append(Paragraph("5. Research Governance & Clinical Disclaimer", styles['h1']))
    disclaimer_text = (
        "<b>INVESTIGATIONAL USE ONLY:</b> This diagnostic report was generated by an artificial intelligence decision support system "
        "powered by the EfficientNet-B3 deep learning neural network. The predictions, probabilities, and classifications provided in this "
        "document are intended solely as clinical research and diagnostic decision support. They do not constitute an autonomous medical "
        "diagnosis. Definitive diagnosis of B-cell Acute Lymphoblastic Leukemia requires comprehensive clinical correlation, including "
        "bone marrow aspirate flow cytometry immunophenotyping, cytogenetic testing, and histological examination by a board-certified hematopathologist."
    )
    disclaimer_table = Table([[Paragraph(disclaimer_text, styles['disclaimer'])]], colWidths=[7.0 * inch])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SLATE_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(disclaimer_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


# ===========================================================================
# 2. Multiple Myeloma Detection Clinical Report Generator
# ===========================================================================
def generate_myeloma_pdf(
    prediction_result: Dict[str, Any],
    original_image_bytes: Optional[bytes] = None,
    patient_id: str = "ANONYMOUS",
    custom_notes: Optional[str] = None
) -> bytes:
    """
    Builds a professional clinical PDF report for Multiple Myeloma Detection & Plasmacytosis Counter.
    Includes both original slide and annotated detection overlay with bounding boxes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )

    styles = _get_clinical_styles()
    story: List[Any] = []

    analysis_id = f"ANL-MYEL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    analysis_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    counts = prediction_result.get("cell_counts", {})
    diag = prediction_result.get("diagnosis", {})
    perf = prediction_result.get("performance", {})
    specs = prediction_result.get("input_specs", {})
    detections = prediction_result.get("detections", [])
    is_suspected = bool(diag.get("myeloma_suspected", False))
    plasma_pct = counts.get("plasma_cell_percentage", 0.0)

    # --- Header Banner Table ---
    header_data = [
        [
            Paragraph("MEDICAL AI DIAGNOSTIC SYSTEM", styles['title']),
            Paragraph(f"<b>REPORT ID:</b> {analysis_id}<br/><b>DATE:</b> {analysis_time[:10]}", styles['subtitle'])
        ],
        [
            Paragraph("Automated Hematological Decision Support & Cytology Analysis", styles['subtitle']),
            Paragraph("<b>CONFIDENTIAL MEDICAL REPORT</b>", styles['subtitle'])
        ]
    ]
    header_table = Table(header_data, colWidths=[4.2 * inch, 2.8 * inch])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY_PRIMARY),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 8),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # --- Document Sub-Title ---
    story.append(Paragraph("CLINICAL EVALUATION REPORT: MULTIPLE MYELOMA CELL DETECTION", styles['h1']))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_BLUE, spaceBefore=1, spaceAfter=8))

    # --- Section 1: Metadata Grid ---
    metadata = [
        [
            Paragraph("<b>Patient Identifier:</b>", styles['td']),
            Paragraph(patient_id, styles['td_bold']),
            Paragraph("<b>Diagnostic Pipeline:</b>", styles['td']),
            Paragraph("Multiple Myeloma Cell Detector", styles['td_bold'])
        ],
        [
            Paragraph("<b>Specimen File:</b>", styles['td']),
            Paragraph(specs.get("filename", "marrow_slide.jpg"), styles['td']),
            Paragraph("<b>Analysis Timestamp:</b>", styles['td']),
            Paragraph(analysis_time, styles['td'])
        ],
        [
            Paragraph("<b>Original Dimensions:</b>", styles['td']),
            Paragraph(f"{specs.get('original_dimensions', ['-','-'])[0]} x {specs.get('original_dimensions', ['-','-'])[1]} px", styles['td']),
            Paragraph("<b>Inference Latency:</b>", styles['td']),
            Paragraph(f"{perf.get('inference_duration_ms', 0):.1f} ms ({perf.get('device', 'cpu').upper()})", styles['td'])
        ]
    ]
    meta_table = Table(metadata, colWidths=[1.5 * inch, 2.0 * inch, 1.5 * inch, 2.0 * inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SLATE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # --- Section 2: Model Specifications ---
    story.append(Paragraph("1. Model Identification & Architecture", styles['h1']))
    model_specs_data = [
        [Paragraph("<b>Model Identifier</b>", styles['th']), Paragraph("yolo26m", styles['td'])],
        [Paragraph("<b>Detector Architecture</b>", styles['th']), Paragraph("YOLO26m (Ultralytics) with Native End-to-End NMS-Free Head and C3k2/C2PSA Attention", styles['td'])],
        [Paragraph("<b>Checkpoint Path</b>", styles['th']), Paragraph("models/myeloma/final_yolo26m.pt", styles['td'])],
        [Paragraph("<b>Inference Dimensions</b>", styles['th']), Paragraph("800 x 800 x 3 px", styles['td'])],
        [Paragraph("<b>Target Classes</b>", styles['th']), Paragraph("{0: 'plasma_cell', 1: 'non_plasma_cell'}", styles['td'])],
        [Paragraph("<b>Inference Parameters</b>", styles['th']), Paragraph("Confidence Threshold: 0.65 | NMS IoU: 0.60 | Diagnostic Cutoff: >10.0% Plasma Ratio", styles['td'])],
    ]
    model_table = Table(model_specs_data, colWidths=[2.2 * inch, 4.8 * inch])
    model_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 0), (0, -1), SLATE_BG),
        ('PADDING', (0, 0), (-1, -1), 3.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(model_table)
    story.append(Spacer(1, 10))

    # --- Section 3: Diagnostic Plasmacytosis Assessment ---
    story.append(Paragraph("2. Plasmacytosis Assessment & Quantitative Cell Counts", styles['h1']))

    callout_color = DANGER_RED if is_suspected else SUCCESS_GREEN
    callout_bg = LIGHT_RED_BG if is_suspected else LIGHT_GREEN_BG
    callout_title = "HIGH RISK: SUSPECTED MULTIPLE MYELOMA (PLASMACYTOSIS > 10%)" if is_suspected else "LOW RISK: PHYSIOLOGICAL PLASMA CELL RANGE (<= 10%)"

    result_callout_data = [
        [
            Paragraph(f"<font color='{callout_color.hexval()}'><b>DIAGNOSTIC STATUS: {callout_title}</b></font>", styles['h2']),
            Paragraph(f"<b>Plasma Fraction:</b> {plasma_pct:.2f}%", styles['body_bold'])
        ],
        [
            Paragraph(f"<b>Clinical Interpretation:</b> {diag.get('clinical_interpretation', 'Cellular counts evaluated.')}", styles['body']),
            Paragraph(f"<b>Diagnostic Threshold:</b> > {diag.get('diagnostic_threshold_pct', 10.0):.1f}%", styles['body_bold'])
        ]
    ]
    callout_table = Table(result_callout_data, colWidths=[5.2 * inch, 1.8 * inch])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), callout_bg),
        ('BOX', (0, 0), (-1, -1), 1.0, callout_color),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 6))

    # Quantitative Cell Counts Table
    count_rows = [
        [
            Paragraph("<b>Cell Category</b>", styles['th']),
            Paragraph("<b>Count</b>", styles['th']),
            Paragraph("<b>Percentage of Marrow Sample</b>", styles['th']),
            Paragraph("<b>Clinical Relevance</b>", styles['th'])
        ],
        [
            Paragraph("<b>Plasma Cells (Target)</b>", styles['td_bold']),
            Paragraph(f"<font color='{DANGER_RED.hexval()}'><b>{counts.get('plasma_cells', 0)}</b></font>", styles['td']),
            Paragraph(f"<b>{plasma_pct:.2f}%</b>", styles['td_bold']),
            Paragraph("Key marker for clonal plasma cell disorder", styles['td'])
        ],
        [
            Paragraph("<b>Non-Plasma Cells (Marrow)</b>", styles['td']),
            Paragraph(f"{counts.get('non_plasma_cells', 0)}", styles['td']),
            Paragraph(f"{100.0 - plasma_pct:.2f}%", styles['td']),
            Paragraph("Background hematopoietic & stromal marrow cells", styles['td'])
        ],
        [
            Paragraph("<b>Total Cells Detected</b>", styles['td_bold']),
            Paragraph(f"<b>{counts.get('total_cells', 0)}</b>", styles['td_bold']),
            Paragraph("100.00%", styles['td']),
            Paragraph("Total localized bounding box targets", styles['td'])
        ]
    ]
    count_table = Table(count_rows, colWidths=[2.0 * inch, 1.2 * inch, 1.8 * inch, 2.0 * inch])
    count_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(count_table)
    story.append(Spacer(1, 10))

    # --- Section 4: Dual Microscopy Visualizations (Original vs Annotated) ---
    story.append(Paragraph("3. Microscopy Slide Inspection & AI Detections", styles['h1']))

    orig_rl_img = _process_image_for_reportlab(original_image_bytes, max_w=3.2, max_h=2.2)

    # Check for annotated base64
    annotated_rl_img = None
    if prediction_result.get("annotated_image_base64"):
        try:
            import base64
            ann_bytes = base64.b64decode(prediction_result["annotated_image_base64"])
            annotated_rl_img = _process_image_for_reportlab(ann_bytes, max_w=3.2, max_h=2.2)
        except Exception as e:
            print(f"Warning: Failed to decode annotated image base64: {e}")

    if orig_rl_img or annotated_rl_img:
        visual_cells = []
        if orig_rl_img and annotated_rl_img:
            visual_cells = [
                [orig_rl_img, annotated_rl_img],
                [
                    Paragraph("<b>Figure A: Original Marrow Micrograph</b>", styles['caption']),
                    Paragraph("<b>Figure B: YOLO26m Annotated Bounding Boxes (Red=Plasma, Blue=Non-Plasma)</b>", styles['caption'])
                ]
            ]
            vis_table = Table(visual_cells, colWidths=[3.5 * inch, 3.5 * inch])
        elif annotated_rl_img:
            visual_cells = [
                [annotated_rl_img],
                [Paragraph("<b>Figure: YOLO26m Cellular Bounding Boxes (Red=Plasma, Blue=Non-Plasma)</b>", styles['caption'])]
            ]
            vis_table = Table(visual_cells, colWidths=[7.0 * inch])
        else:
            visual_cells = [
                [orig_rl_img],
                [Paragraph("<b>Figure: Original Bone Marrow Microscopy Slide</b>", styles['caption'])]
            ]
            vis_table = Table(visual_cells, colWidths=[7.0 * inch])

        vis_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('BACKGROUND', (0, 0), (-1, -1), SLATE_BG),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(vis_table)
    else:
        story.append(Paragraph("<i>Microscopy slide tensor processed successfully (Visual images not attached).</i>", styles['caption']))
    story.append(Spacer(1, 10))

    # --- Section 5: Audited Model Evaluation & Benchmark Metrics (Clearly Separated) ---
    story.append(Paragraph("4. Audited Detector Evaluation & Benchmark Metrics (Non-Inference Data)", styles['h1']))
    story.append(Paragraph("The performance benchmarks below reflect official cross-validation and test set evaluation on the audited bone marrow dataset (independent of this individual patient inference):", styles['body']))
    story.append(Spacer(1, 4))

    benchmark_data = [
        [
            Paragraph("<b>Architecture</b>", styles['th']),
            Paragraph("<b>Parameters</b>", styles['th']),
            Paragraph("<b>mAP50</b>", styles['th']),
            Paragraph("<b>mAP50-95</b>", styles['th']),
            Paragraph("<b>Plasma Precision</b>", styles['th']),
            Paragraph("<b>Status</b>", styles['th'])
        ],
        [
            Paragraph("<b>YOLO26m (Deployed)</b>", styles['td_bold']),
            Paragraph("25.5 M", styles['td']),
            Paragraph("<b>0.812 (81.2%)</b>", styles['td_bold']),
            Paragraph("0.658", styles['td']),
            Paragraph("0.841", styles['td']),
            Paragraph("Selected Champion (NMS-Free)", styles['td'])
        ],
        [
            Paragraph("YOLOv8m", styles['td']),
            Paragraph("25.9 M", styles['td']),
            Paragraph("0.784 (78.4%)", styles['td']),
            Paragraph("0.612", styles['td']),
            Paragraph("0.803", styles['td']),
            Paragraph("Benchmark Baseline", styles['td'])
        ]
    ]
    bench_table = Table(benchmark_data, colWidths=[2.0 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch])
    bench_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BLUE_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 3),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(bench_table)
    story.append(Spacer(1, 10))

    # --- Section 6: Research Disclaimer ---
    story.append(Paragraph("5. Research Governance & Clinical Disclaimer", styles['h1']))
    disclaimer_text = (
        "<b>INVESTIGATIONAL USE ONLY:</b> This diagnostic report was generated by an artificial intelligence decision support system "
        "powered by the YOLO26m end-to-end cellular detector. The cellular localizations, counts, and plasmacytosis percentages provided "
        "in this document are intended strictly as clinical research and diagnostic decision support. They do not constitute an autonomous "
        "medical diagnosis. Definitive diagnosis of Multiple Myeloma requires comprehensive multi-parameter evaluation, including bone marrow core "
        "biopsy with CD138 immunohistochemistry, serum protein electrophoresis (SPEP/IFE), and serum free light chain (sFLC) analysis."
    )
    disclaimer_table = Table([[Paragraph(disclaimer_text, styles['disclaimer'])]], colWidths=[7.0 * inch])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SLATE_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(disclaimer_table)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
