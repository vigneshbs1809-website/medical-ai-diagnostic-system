"""
Leukemia Service Module: B-ALL vs Normal Classification
Implements exact input validation, preprocessing, and inference for EfficientNet-B3.
"""

import io
import time
from typing import Any, Dict, Tuple

import numpy as np
import torch
import torchvision.transforms as T
from PIL import Image

from model_loader import model_manager

# ImageNet normalization parameters (used during model training)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
TARGET_SIZE = (300, 300)
ALLOWED_FORMATS = {"JPEG", "JPG", "PNG"}


def validate_image_bytes(image_bytes: bytes, filename: str = "") -> Image.Image:
    """
    Validates file format, readability, and dimensions.
    Returns decoded PIL Image in RGB format.
    """
    if not image_bytes or len(image_bytes) == 0:
        raise ValueError("Uploaded file is empty.")

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # verify integrity
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image file: {str(e)}")

    # Re-open after verify() resets internal pointer
    img = Image.open(io.BytesIO(image_bytes))
    fmt = (img.format or "").upper()
    
    # Check format
    if fmt not in ALLOWED_FORMATS:
        # Fallback check by filename extension
        ext = filename.split(".")[-1].upper() if "." in filename else ""
        if ext not in ALLOWED_FORMATS:
            raise ValueError(f"Unsupported image format '{fmt or ext}'. Allowed formats: JPG, JPEG, PNG.")

    # Check dimensions
    w, h = img.size
    if w < 16 or h < 16:
        raise ValueError(f"Image dimensions ({w}x{h}) are too small. Minimum resolution is 16x16.")
    if w > 8192 or h > 8192:
        raise ValueError(f"Image dimensions ({w}x{h}) exceed maximum allowed dimension (8192x8192).")

    return img.convert("RGB")


def preprocess_leukemia_image(img: Image.Image, device: torch.device) -> torch.Tensor:
    """
    Exact reproduction of the training evaluation transform:
    Bilinear antialiased resize to 300x300, scale to [0, 1], ImageNet normalize.
    """
    transform = T.Compose([
        T.Resize(TARGET_SIZE, interpolation=T.InterpolationMode.BILINEAR, antialias=True),
        T.ToTensor(),
        T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
    ])
    tensor = transform(img)  # Shape: [3, 300, 300]
    return tensor.unsqueeze(0).to(device)  # Shape: [1, 3, 300, 300]


def run_leukemia_inference(image_bytes: bytes, filename: str = "") -> Dict[str, Any]:
    """
    Executes end-to-end B-ALL classification inference.
    """
    if not model_manager.load_status["leukemia"]["loaded"] or model_manager.leukemia_model is None:
        raise RuntimeError("Leukemia classification model is not loaded on the server.")

    t0 = time.time()
    img = validate_image_bytes(image_bytes, filename)
    orig_w, orig_h = img.size

    device = model_manager.device
    model = model_manager.leukemia_model

    # Preprocess
    input_tensor = preprocess_leukemia_image(img, device)

    # Inference
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.softmax(logits.float(), dim=1).squeeze(0).cpu().numpy()

    duration_ms = round((time.time() - t0) * 1000, 2)
    prob_normal = float(probs[0])
    prob_ball = float(probs[1])

    # Standard decision boundary (tau = 0.50)
    is_ball = prob_ball >= 0.50
    pred_class_id = 1 if is_ball else 0
    pred_class_name = "B-ALL" if is_ball else "Normal"
    pred_confidence = prob_ball if is_ball else prob_normal

    # Diagnostic categorization
    if prob_ball >= 0.80:
        diagnostic_flag = "HIGH_CONFIDENCE_BLAST"
        clinical_note = "High morphologic probability of B-cell lymphoblastic leukemia (blast cell)."
    elif prob_ball >= 0.50:
        diagnostic_flag = "SUSPICIOUS_BLAST"
        clinical_note = "Atypical cellular features suggestive of blast cells. Pathologist review recommended."
    else:
        diagnostic_flag = "NORMAL_OR_BENIGN"
        clinical_note = "Cytological features consistent with normal/benign lymphoid cell."

    return {
        "status": "success",
        "task": "leukemia_classification",
        "model_id": "efficientnet_b3",
        "model_architecture": "EfficientNet-B3 (timm) + MLP Head",
        "input_specs": {
            "original_dimensions": [orig_w, orig_h],
            "processed_dimensions": [300, 300],
            "color_channels": 3,
            "filename": filename
        },
        "prediction": {
            "class_id": pred_class_id,
            "class_name": pred_class_name,
            "confidence": round(pred_confidence, 4),
            "probabilities": {
                "Normal": round(prob_normal, 4),
                "B-ALL": round(prob_ball, 4)
            },
            "decision_threshold": 0.50,
            "diagnostic_flag": diagnostic_flag,
            "clinical_interpretation": clinical_note
        },
        "performance": {
            "inference_duration_ms": duration_ms,
            "device": str(device)
        }
    }
