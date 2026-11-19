"""
Model Loader Module: Medical AI Diagnostic System
Loads and initializes the Leukemia (EfficientNet-B3) and Multiple Myeloma (YOLO26m) models.
Ensures single-instance (singleton) lifecycle management at application startup.
"""

import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import torch
import torch.nn as nn

logger = logging.getLogger("medical_ai.model_loader")

# Base directory paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

DEFAULT_LEUKEMIA_CKPT = PROJECT_ROOT / "models" / "leukemia" / "checkpoints" / "seed42" / "efficientnet_b3_best.pt"
DEFAULT_MYELOMA_CKPT = PROJECT_ROOT / "models" / "myeloma" / "final_yolo26m.pt"
DEFAULT_MYELOMA_CONFIG = PROJECT_ROOT / "models" / "myeloma" / "final_config.json"


# ---------------------------------------------------------------------------
# Leukemia Architecture Definition (Exact Match to Training Source)
# ---------------------------------------------------------------------------
class ClassifierHead(nn.Module):
    """
    Standardized classification head used across all training experiments:
    Dropout(0.3) -> Linear(in_dim, 256) -> GELU -> Dropout(0.3) -> Linear(256, 2)
    """
    def __init__(self, in_dim: int = 1536, hidden: int = 256, dropout: float = 0.3, num_classes: int = 2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(in_dim, hidden),
            nn.GELU(),
            nn.Dropout(p=dropout),
            nn.Linear(hidden, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class LeukemiaClassifier(nn.Module):
    """
    Timm-based EfficientNet-B3 classifier matching training implementation.
    """
    def __init__(self, timm_name: str = "efficientnet_b3", hidden: int = 256, dropout: float = 0.3):
        super().__init__()
        import timm
        # num_classes=0 yields the pooled feature vector (1536-dim for B3)
        self.backbone = timm.create_model(timm_name, pretrained=False, num_classes=0)
        self.head = ClassifierHead(in_dim=self.backbone.num_features, hidden=hidden, dropout=dropout, num_classes=2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        return self.head(features)


# ---------------------------------------------------------------------------
# Singleton Model Manager
# ---------------------------------------------------------------------------
class ModelManager:
    """
    Manages loading, status, and access to both deep learning models.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.leukemia_model: Optional[LeukemiaClassifier] = None
        self.leukemia_info: Dict[str, Any] = {}
        
        self.myeloma_model: Optional[Any] = None
        self.myeloma_config: Dict[str, Any] = {}
        self.myeloma_info: Dict[str, Any] = {}
        
        self.load_status: Dict[str, Any] = {
            "leukemia": {"loaded": False, "error": None, "load_time_sec": None},
            "myeloma": {"loaded": False, "error": None, "load_time_sec": None}
        }
        self._initialized = True

    def load_all_models(
        self,
        leukemia_ckpt_path: Optional[Path] = None,
        myeloma_ckpt_path: Optional[Path] = None,
        myeloma_config_path: Optional[Path] = None
    ):
        """Loads both models sequentially into memory if not already loaded."""
        if self.load_status["leukemia"]["loaded"] and self.load_status["myeloma"]["loaded"]:
            logger.info("Both models are already loaded in memory.")
            return

        logger.info(f"Using compute device: {self.device}")
        
        leukemia_path = leukemia_ckpt_path or DEFAULT_LEUKEMIA_CKPT
        myeloma_path = myeloma_ckpt_path or DEFAULT_MYELOMA_CKPT
        myeloma_cfg = myeloma_config_path or DEFAULT_MYELOMA_CONFIG

        if not self.load_status["leukemia"]["loaded"]:
            self.load_leukemia_model(leukemia_path)
        if not self.load_status["myeloma"]["loaded"]:
            self.load_myeloma_model(myeloma_path, myeloma_cfg)

    def load_leukemia_model(self, ckpt_path: Path):
        t0 = time.time()
        logger.info(f"Loading Leukemia Model from: {ckpt_path}")
        try:
            if not ckpt_path.exists():
                raise FileNotFoundError(f"Checkpoint not found at: {ckpt_path}")

            # Instantiate architecture
            model = LeukemiaClassifier(timm_name="efficientnet_b3", hidden=256, dropout=0.3)
            
            # Load state dictionary
            ckpt = torch.load(str(ckpt_path), map_location=self.device, weights_only=False)
            if "model" in ckpt:
                state_dict = ckpt["model"]
            else:
                state_dict = ckpt

            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()

            self.leukemia_model = model
            duration = round(time.time() - t0, 3)
            
            self.leukemia_info = {
                "architecture": "EfficientNet-B3 + MLP Head",
                "framework": "PyTorch / timm",
                "checkpoint": str(ckpt_path.name),
                "checkpoint_path": str(ckpt_path.resolve()),
                "input_resolution": [300, 300, 3],
                "classes": {0: "Normal", 1: "B-ALL"},
                "best_epoch": ckpt.get("epoch", 2) if isinstance(ckpt, dict) else 2,
                "device": str(self.device),
                "load_duration_sec": duration
            }
            self.load_status["leukemia"] = {"loaded": True, "error": None, "load_time_sec": duration}
            logger.info(f"Leukemia Model loaded successfully in {duration}s on {self.device}")

        except Exception as e:
            err = f"Failed to load Leukemia model: {str(e)}"
            logger.error(err, exc_info=True)
            self.leukemia_model = None
            self.load_status["leukemia"] = {"loaded": False, "error": str(e), "load_time_sec": None}

    def load_myeloma_model(self, ckpt_path: Path, config_path: Path):
        t0 = time.time()
        logger.info(f"Loading Multiple Myeloma Model from: {ckpt_path}")
        try:
            if not ckpt_path.exists():
                raise FileNotFoundError(f"Checkpoint not found at: {ckpt_path}")
            if not config_path.exists():
                raise FileNotFoundError(f"Config not found at: {config_path}")

            with open(config_path, "r") as f:
                self.myeloma_config = json.load(f)

            from ultralytics import YOLO
            model = YOLO(str(ckpt_path))

            self.myeloma_model = model
            duration = round(time.time() - t0, 3)

            self.myeloma_info = {
                "architecture": "YOLO26m (NMS-Free End-to-End)",
                "framework": "Ultralytics YOLO / PyTorch",
                "checkpoint": str(ckpt_path.name),
                "checkpoint_path": str(ckpt_path.resolve()),
                "input_resolution": [self.myeloma_config.get("imgsz", 800), self.myeloma_config.get("imgsz", 800), 3],
                "classes": self.myeloma_config.get("names", {"0": "plasma_cell", "1": "non_plasma_cell"}),
                "confidence_threshold": self.myeloma_config.get("conf", 0.65),
                "nms_iou": self.myeloma_config.get("nms_iou", 0.60),
                "plasma_id": self.myeloma_config.get("plasma_id", 0),
                "device": str(self.device),
                "load_duration_sec": duration
            }
            self.load_status["myeloma"] = {"loaded": True, "error": None, "load_time_sec": duration}
            logger.info(f"Myeloma Model loaded successfully in {duration}s")

        except Exception as e:
            err = f"Failed to load Myeloma model: {str(e)}"
            logger.error(err, exc_info=True)
            self.myeloma_model = None
            self.load_status["myeloma"] = {"loaded": False, "error": str(e), "load_time_sec": None}

    def get_status(self) -> Dict[str, Any]:
        return {
            "device": str(self.device),
            "models": {
                "leukemia": {
                    "is_ready": self.load_status["leukemia"]["loaded"],
                    "error": self.load_status["leukemia"]["error"],
                    "info": self.leukemia_info if self.load_status["leukemia"]["loaded"] else None
                },
                "myeloma": {
                    "is_ready": self.load_status["myeloma"]["loaded"],
                    "error": self.load_status["myeloma"]["error"],
                    "info": self.myeloma_info if self.load_status["myeloma"]["loaded"] else None
                }
            }
        }


# Global singleton instance
model_manager = ModelManager()
