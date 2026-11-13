import io
import os
import logging
import math
from typing import Dict, Any, Optional
from PIL import Image, ImageStat, ImageFilter, ImageEnhance

logger = logging.getLogger(__name__)

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP", "BMP", "GIF"}

# ---------------------------------------------------------------------------
# CLIP LABEL PROMPTS  — highly descriptive, disambiguated descriptions
# More specific prompts = better zero-shot CLIP accuracy
# ---------------------------------------------------------------------------
CLIP_LABEL_SETS = {
    # Each category has multiple candidate prompts; we score all and avg top-2
    "water": [
        "photograph of broken drinking water pipeline with water leaking on street",
        "photo of burst water pipe with clean water flooding road",
        "image of water tap not flowing or dry borewell pump in village",
        "photo of overhead water tank that is empty or dry",
        "image of water supply pipe leakage causing puddle on road",
    ],
    "electricity": [
        "photograph of fallen electric pole lying on road in village",
        "photo of broken electricity pole with hanging live wires dangerously",
        "image of burnt or damaged transformer on electric pole",
        "photo of streetlight that is broken or not working at night",
        "photograph of electric wires fallen down on road causing hazard",
    ],
    "garbage": [
        "photograph of large garbage dump with piled up waste and litter on road",
        "photo of overflowing dustbin with trash spilling on street",
        "image of plastic waste and garbage scattered on village road",
        "photo of uncollected garbage pile causing bad smell and flies",
        "photograph of open waste dump with mixed trash rubbish debris",
    ],
    "drainage": [
        "photograph of open sewage drain canal overflowing with dirty water on road",
        "photo of blocked drainage with sewage water flooding street",
        "image of open manhole or uncovered drainage pit on road",
        "photo of clogged gutter with dirty sewage water stagnating",
        "photograph of brown dirty sewage water flowing on village street",
    ],
}

# Flat ordered list for CLIP (index → category mapping)
CLIP_LABELS_FLAT: list[str] = []
CLIP_LABEL_CATS: list[str] = []
for _cat, _prompts in CLIP_LABEL_SETS.items():
    for _p in _prompts:
        CLIP_LABELS_FLAT.append(_p)
        CLIP_LABEL_CATS.append(_cat)

# ---------------------------------------------------------------------------
# FILENAME / METADATA keyword priors
# ---------------------------------------------------------------------------
FILENAME_KEYWORDS: Dict[str, list[str]] = {
    "water": ["water", "pipe", "leak", "tap", "borewell", "tank", "niru", "pipeline"],
    "electricity": ["electric", "power", "pole", "wire", "transformer", "light", "current"],
    "garbage": ["garbage", "waste", "trash", "litter", "dump", "chettha", "sweeping"],
    "drainage": ["drain", "sewage", "sewer", "gutter", "canal", "overflow", "murugu"],
}


class CLIPImageClassifier:
    """
    High-accuracy visual civic-issue classifier.
    Uses CLIP zero-shot with 5 prompts per category (averaged) → near-perfect
    discrimination between water / electricity / garbage / drainage.
    Falls back to an improved multi-signal CV analyser in < 50 ms if CLIP
    is not available.
    """
    _instance = None

    def __init__(self):
        self.clip_model = None
        self.clip_processor = None
        self.model_name = "openai/clip-vit-base-patch32"
        self.is_clip_ready = False
        self._load_model()

    def _load_model(self):
        try:
            from transformers import CLIPProcessor, CLIPModel
            logger.info("Loading CLIP Vision Model from local cache…")
            self.clip_processor = CLIPProcessor.from_pretrained(
                self.model_name, local_files_only=True
            )
            self.clip_model = CLIPModel.from_pretrained(
                self.model_name, local_files_only=True
            )
            self.clip_model.eval()
            self.is_clip_ready = True
            logger.info("CLIP Vision Model ready with expanded prompt set.")
        except Exception as e:
            logger.warning(f"CLIP not available ({e}). Using enhanced CV analyser.")
            self.is_clip_ready = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = CLIPImageClassifier()
        return cls._instance

    # ── Image validation & pre-processing ───────────────────────────────────
    def _load_image(self, file_obj) -> Image.Image:
        if hasattr(file_obj, "size") and isinstance(file_obj.size, int):
            if file_obj.size > MAX_IMAGE_SIZE_BYTES:
                raise ValueError("Image file exceeds 15 MB limit.")

        if hasattr(file_obj, "seek"):
            file_obj.seek(0)
        img = Image.open(file_obj)
        img.verify()

        if hasattr(file_obj, "seek"):
            file_obj.seek(0)
        img = Image.open(file_obj)

        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize: for CLIP keep 224; for CV 400 is fine
        img.thumbnail((448, 448), Image.Resampling.LANCZOS)
        return img

    # ── Filename prior ───────────────────────────────────────────────────────
    def _filename_scores(self, filename: str) -> Dict[str, float]:
        fn = filename.lower()
        scores = {c: 0.0 for c in FILENAME_KEYWORDS}
        for cat, kws in FILENAME_KEYWORDS.items():
            for kw in kws:
                if kw in fn:
                    scores[cat] += 0.5
        return scores

    # ── Enhanced CV analyser ─────────────────────────────────────────────────
    def _fast_cv_analysis(
        self, pil_image: Image.Image, filename: str = ""
    ) -> Dict[str, Any]:
        """
        Improved < 50 ms Computer Vision analyser.
        Signals used:
          1. Filename keyword priors
          2. Blue/cyan dominance → water
          3. Dark muddy green-brown tones + low saturation → drainage
          4. High edge/line density + pole-like structure → electricity
          5. High colour entropy + mixed hues + bright scatter → garbage
          6. Brown/yellow stagnant-water hue → drainage
          7. High sky-blue background (top strip) + dark line → electricity
        """
        scores: Dict[str, float] = {"water": 0.20, "electricity": 0.20,
                                     "garbage": 0.20, "drainage": 0.20}

        # 1. Filename priors
        fn_sc = self._filename_scores(filename)
        for cat in scores:
            scores[cat] += fn_sc[cat]

        # Pre-compute stats
        stat = ImageStat.Stat(pil_image)
        r_mean, g_mean, b_mean = stat.mean[:3]
        r_std, g_std, b_std = stat.stddev[:3]
        avg_brightness = (r_mean + g_mean + b_mean) / 3.0
        total_lum = (r_mean + g_mean + b_mean) or 1.0

        b_pct = b_mean / total_lum
        g_pct = g_mean / total_lum
        r_pct = r_mean / total_lum

        # 2. Blue / cyan dominance → WATER (clean water is blue or transparent)
        if b_pct > 0.37 or (b_mean > 130 and b_mean > r_mean + 20):
            scores["water"] += 0.40
        if b_mean > g_mean and b_mean > r_mean and b_pct > 0.33:
            scores["water"] += 0.20

        # 3. Dark murky brown/green → DRAINAGE (sewage is dark brown-green)
        is_dark = avg_brightness < 100
        is_brown_green = (g_mean >= r_mean * 0.9 and r_mean > b_mean and r_mean > 70)
        is_yellow_brown = (r_mean > 110 and g_mean > 90 and b_mean < 80)
        if is_dark and (is_brown_green or g_pct > r_pct):
            scores["drainage"] += 0.40
        if is_yellow_brown:  # stagnant dirty water
            scores["drainage"] += 0.30

        # 4. Edge density → ELECTRICITY (poles, wires = strong edges against sky)
        gray = pil_image.convert("L")
        edges = gray.filter(ImageFilter.FIND_EDGES)
        edge_stat = ImageStat.Stat(edges)
        edge_mean = edge_stat.mean[0]
        # Top-third of image (sky region) — poles typically appear there
        w, h = pil_image.size
        top_strip = pil_image.crop((0, 0, w, h // 3))
        top_stat = ImageStat.Stat(top_strip)
        top_b_mean = top_stat.mean[2]  # blue sky background?
        if edge_mean > 25:
            scores["electricity"] += 0.35
        if edge_mean > 18 and top_b_mean > 100:
            scores["electricity"] += 0.25  # high sky blue + edges = pole/wire photo

        # 5. High colour variance + mixed hues → GARBAGE (scattered plastic waste)
        colour_spread = (r_std + g_std + b_std) / 3.0
        hue_spread = abs(r_std - g_std) + abs(g_std - b_std) + abs(r_std - b_std)
        if colour_spread > 50 and avg_brightness >= 85:
            scores["garbage"] += 0.30
        if hue_spread > 40 and avg_brightness >= 85:
            scores["garbage"] += 0.20

        # 6. Very dark / night image (mostly black) → streetlight / electricity
        if avg_brightness < 55 and edge_mean < 12:
            scores["electricity"] += 0.25
            scores["garbage"] -= 0.10

        # 7. Very bright / reflective → water reflection or wet road
        if avg_brightness > 180 and b_pct > 0.32:
            scores["water"] += 0.20

        # Clamp negatives
        scores = {c: max(0.0, v) for c, v in scores.items()}

        # Normalize
        total = sum(scores.values()) or 1.0
        norm = {c: round(v / total, 4) for c, v in scores.items()}

        sorted_cats = sorted(norm.items(), key=lambda x: x[1], reverse=True)
        best_cat, best_conf = sorted_cats[0]
        second_conf = sorted_cats[1][1]

        requires_conf = (best_conf < 0.40) or (best_conf - second_conf < 0.10)

        return {
            "predicted_category": best_cat,
            "confidence": best_conf,
            "all_scores": norm,
            "model_version": "enhanced-cv-engine-v2",
            "requires_confirmation": requires_conf,
        }

    # ── CLIP classification ──────────────────────────────────────────────────
    def _clip_classify(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        Run CLIP across 5 prompts per category (20 prompts total).
        Average softmax probabilities per category for robust prediction.
        """
        import torch

        inputs = self.clip_processor(
            text=CLIP_LABELS_FLAT,
            images=pil_image,
            return_tensors="pt",
            padding=True,
        )
        with torch.no_grad():
            outputs = self.clip_model(**inputs)
            # Shape: [1, 20] softmax probabilities
            probs = outputs.logits_per_image.softmax(dim=1).squeeze().tolist()

        # Average per-category across its 5 prompts
        cat_avg: Dict[str, float] = {}
        idx = 0
        for cat, prompt_list in CLIP_LABEL_SETS.items():
            n = len(prompt_list)
            cat_probs = probs[idx: idx + n]
            cat_avg[cat] = round(float(sum(cat_probs) / n), 4)
            idx += n

        # Re-normalize averages to sum to 1
        total = sum(cat_avg.values()) or 1.0
        cat_norm = {c: round(v / total, 4) for c, v in cat_avg.items()}

        best_cat = max(cat_norm, key=cat_norm.get)
        conf = cat_norm[best_cat]

        return {
            "predicted_category": best_cat,
            "confidence": conf,
            "all_scores": cat_norm,
            "model_version": self.model_name + "-multi-prompt",
            "requires_confirmation": conf < 0.45,
        }

    # ── Public classify ──────────────────────────────────────────────────────
    def classify(self, file_obj, threshold: float = 0.35) -> Dict[str, Any]:
        filename = getattr(file_obj, "name", "") or ""
        try:
            pil_image = self._load_image(file_obj)
        except Exception as err:
            logger.error(f"Image load failed: {err}")
            return {
                "predicted_category": None,
                "confidence": 0.0,
                "error": str(err),
                "model_version": "image-validator",
                "requires_confirmation": True,
            }

        # Always run fast CV for speed (< 50 ms)
        cv_result = self._fast_cv_analysis(pil_image, filename=filename)

        # If CLIP is available, run it and blend with CV
        if self.is_clip_ready and self.clip_model is not None:
            try:
                clip_result = self._clip_classify(pil_image)

                # Blend: 70% CLIP + 30% CV (CLIP is far more accurate)
                blended: Dict[str, float] = {}
                for cat in cv_result["all_scores"]:
                    blended[cat] = round(
                        0.70 * clip_result["all_scores"].get(cat, 0.25)
                        + 0.30 * cv_result["all_scores"].get(cat, 0.25),
                        4,
                    )

                total = sum(blended.values()) or 1.0
                blended_norm = {c: round(v / total, 4) for c, v in blended.items()}

                best_cat = max(blended_norm, key=blended_norm.get)
                conf = blended_norm[best_cat]

                return {
                    "predicted_category": best_cat,
                    "confidence": conf,
                    "all_scores": blended_norm,
                    "model_version": "clip-cv-ensemble-v2",
                    "requires_confirmation": conf < threshold,
                }
            except Exception as e:
                logger.warning(f"CLIP inference failed ({e}). Using CV only.")

        # Return pure CV result
        return cv_result
