"""
Myeloma Service Module: Multiple Myeloma Cell Detection & Counting
Implements exact inference for YOLO26m, cell counting, plasma percentage calculation,
and clinical Multiple Myeloma decision support flags (>10%).
"""

import base64
import io
import time
from typing import Any, Dict, List

import cv2
import numpy as np
from PIL import Image

from model_loader import model_manager

ALLOWED_FORMATS = {"JPEG", "JPG", "PNG"}


def validate_image_bytes(image_bytes: bytes, filename: str = "") -> Image.Image:
    """Validates file format, readability, and dimensions."""
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Uploaded file is empty.")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image file: {str(e)}")

    img = Image.open(io.BytesIO(image_bytes))
    fmt = (img.format or "").upper()
    if fmt not in ALLOWED_FORMATS:
        ext = filename.split(".")[-1].upper() if "." in filename else ""
        if ext not in ALLOWED_FORMATS:
            raise ValueError(f"Unsupported image format '{fmt or ext}'. Allowed formats: JPG, JPEG, PNG.")

    w, h = img.size
    if w < 32 or h < 32:
        raise ValueError(f"Image dimensions ({w}x{h}) are too small for cell detection. Minimum is 32x32.")
    if w > 16384 or h > 16384:
        raise ValueError(f"Image dimensions ({w}x{h}) exceed maximum allowed dimension (16384x16384).")

    return img.convert("RGB")


def render_annotated_image(pil_img: Image.Image, detections: List[Dict[str, Any]]) -> str:
    """
    Renders bounding boxes and labels onto the image and returns a base64-encoded JPEG.
    Plasma cells: Red/Crimson (#e74c3c), Non-plasma cells: Teal/Blue (#3498db).
    """
    np_img = np.array(pil_img)
    # Convert RGB to BGR for OpenCV
    bgr = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

    for det in detections:
        box = det["bbox"]
        x1, y1, x2, y2 = [int(v) for v in box]
        cls_id = det["class_id"]
        conf = det["confidence"]
        name = det["class_name"]

        # Color scheme: Plasma cells Red (BGR: 44, 76, 231), Non-plasma Cyan/Blue (BGR: 219, 152, 52)
        color = (44, 76, 231) if cls_id == 0 else (219, 152, 52)
        thickness = 2
        cv2.rectangle(bgr, (x1, y1), (x2, y2), color, thickness)

        label_txt = f"{name} {conf:.2f}"
        (tw, th), baseline = cv2.getTextSize(label_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(bgr, (x1, max(0, y1 - th - baseline - 4)), (x1 + tw + 4, max(0, y1)), color, -1)
        cv2.putText(bgr, label_txt, (x1 + 2, max(th, y1 - 3)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

    # Encode to JPEG base64
    _, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buf).decode("utf-8")


def run_myeloma_inference(image_bytes: bytes, filename: str = "", return_annotated: bool = True) -> Dict[str, Any]:
    """
    Executes Multiple Myeloma cell detection, counting, and ratio computation.
    """
    if not model_manager.load_status["myeloma"]["loaded"] or model_manager.myeloma_model is None:
        raise RuntimeError("Multiple Myeloma detection model is not loaded on the server.")

    t0 = time.time()
    img = validate_image_bytes(image_bytes, filename)
    orig_w, orig_h = img.size

    cfg = model_manager.myeloma_config
    conf_thr = float(cfg.get("conf", 0.65))
    nms_iou = float(cfg.get("nms_iou", 0.60))
    imgsz = int(cfg.get("imgsz", 800))
    plasma_id = int(cfg.get("plasma_id", 0))
    names = cfg.get("names", {"0": "plasma_cell", "1": "non_plasma_cell"})

    model = model_manager.myeloma_model

    # Run YOLO prediction
    results = model.predict(
        source=img,
        imgsz=imgsz,
        conf=conf_thr,
        iou=nms_iou,
        verbose=False
    )

    duration_ms = round((time.time() - t0) * 1000, 2)
    r = results[0]

    boxes = r.boxes.xyxy.cpu().numpy()
    confs = r.boxes.conf.cpu().numpy()
    classes = r.boxes.cls.int().cpu().numpy()

    detections = []
    n_plasma = 0
    n_non_plasma = 0

    for box, conf, cls_id in zip(boxes, confs, classes):
        c_id = int(cls_id)
        c_name = names.get(str(c_id), "unknown")
        if c_id == plasma_id:
            n_plasma += 1
        else:
            n_non_plasma += 1

        detections.append({
            "bbox": [round(float(coord), 1) for coord in box],
            "confidence": round(float(conf), 4),
            "class_id": c_id,
            "class_name": c_name
        })

    total_cells = len(detections)
    plasma_ratio = round((n_plasma / total_cells * 100.0), 2) if total_cells > 0 else 0.0
    is_myeloma_suspected = bool(plasma_ratio > 10.0)

    # Clinical Interpretation
    if total_cells == 0:
        diagnostic_status = "INCONCLUSIVE_NO_CELLS"
        clinical_note = "No cells detected above confidence threshold. Inspect slide quality or illumination."
    elif is_myeloma_suspected:
        diagnostic_status = "SUSPECTED_MULTIPLE_MYELOMA"
        clinical_note = (
            f"Plasma cell percentage ({plasma_ratio}%) exceeds the 10.0% diagnostic threshold. "
            "Suggestive of clonal plasma cell proliferative disorder (Multiple Myeloma)."
        )
    else:
        diagnostic_status = "NORMAL_PLASMA_RANGE"
        clinical_note = (
            f"Plasma cell percentage ({plasma_ratio}%) is within normal marrow limits (<= 10.0%). "
            "No morphological evidence of plasmacytosis in this field."
        )

    response = {
        "status": "success",
        "task": "multiple_myeloma_detection",
        "model_id": "yolo26m",
        "model_architecture": "YOLO26m (Ultralytics, End-to-End NMS-Free)",
        "input_specs": {
            "original_dimensions": [orig_w, orig_h],
            "inference_dimensions": [imgsz, imgsz],
            "color_channels": 3,
            "filename": filename
        },
        "cell_counts": {
            "total_cells": total_cells,
            "plasma_cells": n_plasma,
            "non_plasma_cells": n_non_plasma,
            "plasma_cell_percentage": plasma_ratio
        },
        "diagnosis": {
            "myeloma_suspected": is_myeloma_suspected,
            "diagnostic_threshold_pct": 10.0,
            "diagnostic_status": diagnostic_status,
            "clinical_interpretation": clinical_note
        },
        "parameters": {
            "confidence_threshold": conf_thr,
            "nms_iou": nms_iou,
            "imgsz": imgsz
        },
        "detections": detections,
        "performance": {
            "inference_duration_ms": duration_ms,
            "device": str(model_manager.device)
        }
    }

    if return_annotated:
        response["annotated_image_base64"] = render_annotated_image(img, detections)

    return response
