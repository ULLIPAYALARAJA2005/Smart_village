import logging
import math
import re
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# TIER-1: HIGH-CONFIDENCE EXCLUSIVE PHRASES  (weight 10 each)
# If ANY phrase here matches → that category wins immediately (confidence 0.97+)
# These phrases are unambiguous — they appear in ONLY one category.
# ---------------------------------------------------------------------------
EXCLUSIVE_PHRASES: Dict[str, List[str]] = {
    "drainage": [
        # Telugu — drainage-specific
        "మురుగు నీరు రోడ్డుపైకి", "మురుగు కాల్వ పొంగింది", "మురుగు నీటి వాసన",
        "కాలువలు నిండిపోయాయి", "మురుగు నీరు వస్తోంది", "మురుగు కాలువ పగిలింది",
        "మురుగు పారుదల ఆగింది", "డ్రైనేజీ పైపులు మూసుకుపోయాయి",
        "మురుగు నీరు ఇళ్లలోకి", "కాలువ మూసుకుపోయింది", "కాలువ పొంగింది",
        "మురుగు గుంత", "సెప్టిక్ ట్యాంకు", "మురుగు పైపు", "మురుగు లీకేజ్",
        "madi niru", "murugu niru",
        # English — drainage-specific
        "sewage overflowing", "sewage overflow", "sewage flooding", "sewage on road",
        "sewage water on street", "clogged drain", "blocked drain", "blocked drainage",
        "drainage overflow", "drainage blocked", "open drainage", "open sewer",
        "manhole overflow", "septic tank overflow", "storm drain blocked",
        "sewage pipe burst", "drainage canal blocked", "gutter overflow",
        "wastewater on road", "dirty water flooding", "drain choked",
        "sewer blocked", "sewer overflow", "sewer backup",
    ],
    "water": [
        # Telugu — water-specific
        "మంచినీళ్లు రావడం లేదు", "మంచినీరు రావడం లేదు", "నీళ్లు రావడం లేదు",
        "తాగునీటి సమస్య", "మంచినీటి సరఫరా లేదు", "మంచినీటి పైప్‌లైన్ పగిలింది",
        "పైప్‌లైన్ లీకేజ్", "మంచినీటి పైపు లీక్", "బోరు మోటారు పనిచేయడం లేదు",
        "బోరు నీళ్లు రావడం లేదు", "కుళాయి నుండి నీళ్లు రావడం లేదు",
        "పంచాయతీ ట్యాంకు ఖాళీ", "ట్యాంకు నీళ్లు నిండలేదు",
        "మంచినీటి కాలుష్యం", "నీళ్లు కలుషితమయ్యాయి", "మురికి నీళ్లు",
        "water pipe burst", "water pipeline broken",
        # English — water-specific
        "no water supply", "drinking water not coming", "tap water not coming",
        "water pipeline burst", "water pipe leakage", "water pipe broken",
        "borewell not working", "borewell motor broken", "water tank empty",
        "water supply failure", "drinking water contaminated", "contaminated water",
        "water not flowing", "tap not working", "water connection broken",
        "overhead tank empty", "water pressure low", "no drinking water",
        "water shortage", "irregular water supply",
    ],
    "electricity": [
        # Telugu — electricity-specific
        "కరెంటు లేదు", "కరెంటు పోయింది", "విద్యుత్ సరఫరా నిలిచింది",
        "ట్రాన్స్‌ఫార్మర్ కాలిపోయింది", "ట్రాన్స్‌ఫార్మర్ పేలింది",
        "కరెంటు వైర్లు వేలాడుతున్నాయి", "విద్యుత్ స్తంభం విరిగింది",
        "వీధి దీపాలు వెలగడం లేదు", "వీధి లైట్లు పనిచేయడం లేదు",
        "మీటర్ సమస్య", "లోవోల్టేజ్ సమస్య", "పవర్ కట్",
        "కరెంటు తీగలు", "విద్యుత్ తంతి వేలాడుతోంది",
        # English — electricity-specific
        "power cut", "power failure", "power outage", "no electricity",
        "electricity not coming", "electric pole broken", "electric pole fallen",
        "transformer burnt", "transformer exploded", "transformer damaged",
        "streetlight not working", "street light off", "streetlights broken",
        "power line down", "electric wire hanging", "live wire exposed",
        "low voltage problem", "voltage fluctuation", "frequent power cuts",
        "electricity meter problem", "no power supply",
    ],
    "garbage": [
        # Telugu — garbage-specific
        "చెత్త కుప్పలు పేరుకుపోయాయి", "చెత్త బండి రావడం లేదు",
        "చెత్త తీయడం లేదు", "చెత్త తొట్టెలు నిండిపోయాయి",
        "పారిశుధ్యం పనులు లేవు", "దుర్వాసన వస్తోంది చెత్త",
        "చెత్త వేయడం లేదు", "చెత్త తీయలేదు", "చెత్త బిన్ నిండిపోయింది",
        "దోమలు పెరుగుతున్నాయి చెత్త", "మురికి పెరుగుతోంది",
        # English — garbage-specific
        "garbage not collected", "garbage collection stopped", "waste not collected",
        "trash not picked up", "dustbin overflowing", "dustbin full",
        "garbage dump near house", "garbage pile", "waste dumped on road",
        "open garbage", "open waste", "sanitation worker not coming",
        "sweeper not coming", "no garbage collection", "litter on road",
        "plastic waste dumped", "flies and mosquitoes due to garbage",
        "bad smell from garbage", "foul smell garbage", "overflowing dustbin",
    ],
}

# ---------------------------------------------------------------------------
# TIER-2: STRONG KEYWORDS (weight 5 each)
# Domain-specific single or short words, moderately distinctive.
# ---------------------------------------------------------------------------
STRONG_KEYWORDS: Dict[str, List[str]] = {
    "drainage": [
        "మురుగు", "కాలువ", "డ్రైనేజీ", "డ్రైన్", "గట్టర్", "మ్యాన్‌హోల్",
        "sewage", "drainage", "sewer", "gutter", "manhole", "canal",
        "overflow", "flooded street", "waterlogging",
    ],
    "water": [
        "మంచినీటి", "మంచినీళ్లు", "మంచినీరు", "తాగునీరు", "కుళాయి",
        "పైప్‌లైన్", "పైపు", "బోరు", "ట్యాంకు", "మోటారు",
        "drinking water", "pipeline", "borewell", "water tank", "tap water",
        "water supply", "water pump", "overhead tank", "water meter",
    ],
    "electricity": [
        "కరెంటు", "విద్యుత్", "ట్రాన్స్‌ఫార్మర్", "స్తంభం", "వైర్",
        "దీపాలు", "లైట్లు", "మీటర్", "వోల్టేజ్",
        "electricity", "transformer", "electric pole", "streetlight",
        "power", "voltage", "wire", "electric meter",
    ],
    "garbage": [
        "చెత్త", "పారిశుధ్యం", "వ్యర్థాలు", "దుర్వాసన", "దోమలు",
        "garbage", "waste", "trash", "litter", "rubbish", "dustbin",
        "sanitation", "sweeping", "mosquito", "smell", "plastic",
    ],
}

# ---------------------------------------------------------------------------
# TIER-3: WEAK/CONTEXTUAL KEYWORDS (weight 1.5 each)
# Common words that may appear in multiple categories — counted but can be
# overridden by disambiguation rules.
# ---------------------------------------------------------------------------
WEAK_KEYWORDS: Dict[str, List[str]] = {
    "drainage": [
        "నీరు నిలిచింది", "నీళ్లు నిలిచాయి", "రోడ్డుపై నీళ్లు",
        "water stagnation", "standing water", "puddle", "flood",
    ],
    "water": [
        "నీళ్లు", "నీరు", "water",
    ],
    "electricity": [
        "చీకటి", "వెలుతురు లేదు", "dark", "darkness", "light not working",
    ],
    "garbage": [
        "కీటకాలు", "ఎలుకలు", "insects", "rats", "rodents", "flies",
    ],
}

# ---------------------------------------------------------------------------
# DISAMBIGUATION RULES: suppression multipliers
# If a category's tier-1/tier-2 score is detected, suppress others.
# ---------------------------------------------------------------------------
SUPPRESSION_RULES: List[Tuple[str, str, float]] = [
    # (triggering_category, suppressed_category, suppression_factor)
    # If drainage-specific words found → heavily suppress water
    ("drainage", "water", 0.15),
    # If strong water keywords → suppress drainage
    ("water", "drainage", 0.30),
    # If electricity found → suppress water and garbage
    ("electricity", "water", 0.20),
    ("electricity", "garbage", 0.20),
    # If garbage found → suppress drainage
    ("garbage", "drainage", 0.30),
]

# ---------------------------------------------------------------------------
# PROTOTYPE SENTENCES for SentenceTransformer embedding (expanded for coverage)
# ---------------------------------------------------------------------------
CATEGORY_PROTOTYPES = {
    "water": [
        "మా వీధిలో మూడు రోజులుగా నీళ్లు రావడం లేదు",
        "మంచినీటి పైప్‌లైన్ పగిలి నీరు వృధాగా పోతోంది",
        "బోరు మోటారు పనిచేయడం లేదు తాగునీటి సమస్య ఉంది",
        "పంచాయతీ ట్యాంకు నుండి నీరు రావడం లేదు",
        "కుళాయి నుండి నీళ్లు రావడం లేదు",
        "మంచినీటి పైపు లీక్ అవుతోంది రోడ్డుపై నీళ్లు వృధా అవుతున్నాయి",
        "నీళ్లు కలుషితమయ్యాయి తాగడానికి పనికిరావు",
        "Water has not been coming to our street for three days",
        "Drinking water pipeline leakage and water supply failure",
        "Borewell motor is broken and no water in taps",
        "Water tank is empty and there is no drinking water",
        "No water from tap for two days please fix water pipeline",
        "Water supply disrupted due to pipe burst",
        "Contaminated water coming from taps, not safe to drink",
        "No water pressure, water not reaching upper floors",
    ],
    "electricity": [
        "మా వీధిలో కరెంటు లేదు స్తంభం విరిగిపోయింది",
        "ట్రాన్స్‌ఫార్మర్ కాలిపోయింది వీధి దీపాలు వెలగడం లేదు",
        "కరెంటు వైర్లు వేలాడుతున్నాయి ప్రమాదం జరిగే అవకాశం ఉంది",
        "విద్యుత్ సరఫరా నిలిచిపోయింది రెండు రోజులు అయింది",
        "వీధి దీపాలు పనిచేయడం లేదు రాత్రి చీకటిగా ఉంది",
        "కరెంటు తీగలు తెగి రోడ్డుపై పడ్డాయి",
        "లోవోల్టేజ్ వల్ల ఇంటి ఉపకరణాలు పాడవుతున్నాయి",
        "Power cut in our street and broken electric pole",
        "Transformer caught fire and streetlights not working",
        "Electric power wires are hanging dangerously on the road",
        "Low voltage and frequent power outages in village",
        "No electricity for two days transformer is damaged",
        "Streetlights not working making it unsafe at night",
        "Power line down blocking the road",
    ],
    "garbage": [
        "రోడ్డు పక్కన చెత్త కుప్పలు పేరుకుపోయాయి",
        "చెత్త బండి రావడం లేదు దుర్వాసన వస్తోంది",
        "గ్రామంలో చెత్తను శుభ్రం చేయలేదు దోమలు పెరుగుతున్నాయి",
        "చెత్త తొట్టెలు నిండిపోయి రోడ్డుపై పడుతున్నాయి",
        "పారిశుధ్యం పనులు నిలిచాయి వ్యర్థాలు తీయలేదు",
        "Garbage has not been collected for three days",
        "Waste and trash piled up on the village road causing bad smell",
        "Sanitation workers did not clean the garbage dumps",
        "Dustbins overflowing with waste and plastic",
        "Garbage collection stopped mosquitoes and flies are increasing",
        "Litter and plastic waste dumped near the school",
        "No sweeping done for a week garbage everywhere",
    ],
    "drainage": [
        "మురుగు నీరు రోడ్డుపైకి వస్తోంది కాలువలు నిండిపోయాయి",
        "డ్రైనేజీ పైపులు మూసుకుపోయి మురుగునీరు నిలిచింది",
        "కాలువల్లో చెత్త పేరుకుపోయి మురుగు పారుదల ఆగింది",
        "మురుగు కాల్వ పొంగి ఇళ్లలోకి వస్తోంది",
        "మ్యాన్‌హోల్ తెరిచి ఉంది ప్రమాదంగా ఉంది",
        "Drainage overflow on the main road and blocked gutters",
        "Sewage dirty water flooding street from clogged drain",
        "Blocked sewer line causing wastewater overflow",
        "Drainage canal is choked with mud and waste",
        "Open manhole is dangerous for pedestrians",
        "Sewage water entering homes due to blocked drainage",
        "Drainage not working stagnant dirty water on road",
    ],
}


# ---------------------------------------------------------------------------
# HELPER: cosine similarity
# ---------------------------------------------------------------------------
def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# ---------------------------------------------------------------------------
# TIER-1 exclusive phrase scorer (returns winner immediately if confident)
# ---------------------------------------------------------------------------
def _score_exclusive(text_lower: str) -> Optional[Tuple[str, float]]:
    """Return (category, confidence) if an exclusive phrase matches, else None."""
    matches: Dict[str, int] = {}
    for cat, phrases in EXCLUSIVE_PHRASES.items():
        for phrase in phrases:
            if phrase.lower() in text_lower:
                matches[cat] = matches.get(cat, 0) + 1

    if not matches:
        return None

    # If only one category matched exclusive phrases → very high confidence
    if len(matches) == 1:
        cat = next(iter(matches))
        # More matches = higher confidence (capped at 0.99)
        conf = min(0.99, 0.92 + 0.02 * matches[cat])
        return (cat, conf)

    # Multiple categories matched: pick the one with more exclusive hits
    best = max(matches, key=matches.get)
    runner_up = sorted(matches, key=matches.get, reverse=True)[1] if len(matches) > 1 else None
    if runner_up and matches[best] == matches[runner_up]:
        # tie — fall through to full scorer
        return None
    return (best, min(0.97, 0.88 + 0.03 * matches[best]))


# ---------------------------------------------------------------------------
# FULL multi-tier scorer (used when exclusive phrases don't give a clear win)
# ---------------------------------------------------------------------------
def _score_full(text_lower: str) -> Dict[str, float]:
    """Return raw scores per category from all three keyword tiers."""
    scores: Dict[str, float] = {cat: 0.0 for cat in STRONG_KEYWORDS}

    # Tier-1 exclusive phrases (weight 10)
    for cat, phrases in EXCLUSIVE_PHRASES.items():
        for phrase in phrases:
            if phrase.lower() in text_lower:
                scores[cat] += 10.0

    # Tier-2 strong keywords (weight 5 for multi-word, 3 for single-word)
    for cat, kws in STRONG_KEYWORDS.items():
        for kw in kws:
            if kw.lower() in text_lower:
                scores[cat] += 5.0 if " " in kw else 3.0

    # Tier-3 weak/contextual keywords (weight 1.5)
    for cat, kws in WEAK_KEYWORDS.items():
        for kw in kws:
            if kw.lower() in text_lower:
                scores[cat] += 1.5

    # Apply disambiguation suppression rules
    for trigger_cat, suppress_cat, factor in SUPPRESSION_RULES:
        if scores[trigger_cat] > 0:
            scores[suppress_cat] *= factor

    return scores


def _normalise_scores(scores: Dict[str, float]) -> Dict[str, float]:
    total = sum(scores.values()) or 1.0
    return {c: round(s / total, 4) for c, s in scores.items()}


# ---------------------------------------------------------------------------
# Main classifier class
# ---------------------------------------------------------------------------
class MultilingualTextClassifier:
    _instance = None

    def __init__(self):
        self.model = None
        self.model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        self.prototype_embeddings: Dict[str, List] = {}
        self.is_transformer_ready = False
        self._load_model()

    def _load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            for cat, sentences in CATEGORY_PROTOTYPES.items():
                embeddings = self.model.encode(sentences, normalize_embeddings=True)
                self.prototype_embeddings[cat] = [emb.tolist() for emb in embeddings]
            self.is_transformer_ready = True
            logger.info("SentenceTransformer loaded with expanded prototypes.")
        except Exception as e:
            logger.warning(f"SentenceTransformer not available ({e}). Using enhanced keyword classifier.")
            self.is_transformer_ready = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MultilingualTextClassifier()
        return cls._instance

    def classify(self, text: str, threshold: float = 0.35) -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                "predicted_category": None,
                "confidence": 0.0,
                "all_scores": {cat: 0.0 for cat in STRONG_KEYWORDS},
                "model_version": self.model_name,
                "requires_confirmation": True,
            }

        text_lower = text.lower().strip()

        # ── PASS 1: Exclusive phrases (fastest, highest accuracy) ────────────
        excl = _score_exclusive(text_lower)
        if excl:
            cat, conf = excl
            all_sc = {c: 0.01 for c in STRONG_KEYWORDS}
            all_sc[cat] = conf
            return {
                "predicted_category": cat,
                "confidence": conf,
                "normalized_probability": conf,
                "all_scores": all_sc,
                "all_probabilities": all_sc,
                "model_version": "exclusive-phrase-engine-v2",
                "requires_confirmation": False,
            }

        # ── PASS 2: Full multi-tier keyword scoring ──────────────────────────
        raw_scores = _score_full(text_lower)
        norm_scores = _normalise_scores(raw_scores)
        kw_best = max(norm_scores, key=norm_scores.get)
        kw_conf = norm_scores[kw_best]

        # High-confidence keyword result — skip transformer
        if kw_conf >= 0.65:
            return {
                "predicted_category": kw_best,
                "confidence": min(0.97, kw_conf + 0.08),
                "normalized_probability": kw_conf,
                "all_scores": norm_scores,
                "all_probabilities": norm_scores,
                "model_version": "enhanced-keyword-engine-v2",
                "requires_confirmation": False,
            }

        # ── PASS 3: SentenceTransformer semantic embedding ───────────────────
        if self.is_transformer_ready and self.model is not None:
            try:
                user_emb = self.model.encode(text.strip(), normalize_embeddings=True)
                cat_sims: Dict[str, float] = {}
                for cat, proto_embs in self.prototype_embeddings.items():
                    sims = [_cosine_similarity(user_emb, proto) for proto in proto_embs]
                    sims.sort(reverse=True)
                    # Average of top-3 to reduce noise
                    top_avg = sum(sims[:3]) / min(3, len(sims))
                    cat_sims[cat] = max(0.0, float(top_avg))

                # Blend: 50% keyword + 50% embedding (balanced when keywords are uncertain)
                blended: Dict[str, float] = {}
                for c in STRONG_KEYWORDS:
                    lex = norm_scores.get(c, 0.25)
                    emb = cat_sims.get(c, 0.25)
                    blended[c] = round(0.50 * lex + 0.50 * emb, 4)

                # Re-apply suppression on blended scores
                for trigger_cat, suppress_cat, factor in SUPPRESSION_RULES:
                    if blended[trigger_cat] > blended[suppress_cat]:
                        blended[suppress_cat] *= factor

                blend_norm = _normalise_scores(blended)
                best_cat = max(blend_norm, key=blend_norm.get)
                conf = blend_norm[best_cat]

                return {
                    "predicted_category": best_cat,
                    "confidence": conf,
                    "normalized_probability": conf,
                    "all_scores": blend_norm,
                    "all_probabilities": blend_norm,
                    "model_version": "hybrid-semantic-v2",
                    "requires_confirmation": conf < threshold,
                }
            except Exception as err:
                logger.error(f"Transformer inference error: {err}")

        # ── PASS 4: Keyword-only fallback ────────────────────────────────────
        if kw_conf > 0.0:
            return {
                "predicted_category": kw_best,
                "confidence": kw_conf,
                "normalized_probability": kw_conf,
                "all_scores": norm_scores,
                "all_probabilities": norm_scores,
                "model_version": "keyword-fallback-v2",
                "requires_confirmation": kw_conf < 0.45,
            }

        return {
            "predicted_category": None,
            "confidence": 0.0,
            "all_scores": norm_scores,
            "model_version": "no-match",
            "requires_confirmation": True,
        }
