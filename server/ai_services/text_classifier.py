import logging
import math
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Reference prototype examples in Telugu and English
CATEGORY_PROTOTYPES = {
    "water": [
        "మా వీధిలో మూడు రోజులుగా నీళ్లు రావడం లేదు",
        "మంచినీటి పైప్‌లైన్ పగిలి నీరు వృధాగా పోతోంది",
        "బోరు మోటారు పనిచేయడం లేదు తాగునీటి సమస్య ఉంది",
        "పంచాయతీ ట్యాంకు నుండి నీరు రావడం లేదు",
        "Water has not been coming to our street for three days",
        "Drinking water pipeline leakage and water supply failure",
        "Borewell motor is broken and no water in taps",
        "Water tank is empty and contaminated water supply",
    ],
    "electricity": [
        "మా వీధిలో కరెంటు లేదు స్తంభం విరిగిపోయింది",
        "ట్రాన్స్‌ఫార్మర్ కాలిపోయింది వీధి దీపాలు వెలగడం లేదు",
        "కరెంటు వైర్లు వేలాడుతున్నాయి ప్రమాదం జరిగే అవకాశం ఉంది",
        "విద్యుత్ సరఫరా నిలిచిపోయింది",
        "Power cut in our street and broken electric pole",
        "Transformer caught fire and streetlights not working",
        "Electric power wires are hanging dangerously",
        "Low voltage and frequent power outages in village",
    ],
    "garbage": [
        "రోడ్డు పక్కన చెత్త కుప్పలు పేరుకుపోయాయి",
        "చెత్త బండి రావడం లేదు దుర్వాసన వస్తోంది",
        "గ్రామంలో చెత్తను శుభ్రం చేయలేదు దోమలు పెరుగుతున్నాయి",
        "చెత్త తొట్టెలు నిండిపోయి రోడ్డుపై పడుతున్నాయి",
        "Garbage has not been collected for three days",
        "Waste and trash piled up on the village road causing bad smell",
        "Sanitation workers did not clean the garbage dumps",
        "Dustbins overflowing with waste and plastic",
    ],
    "drainage": [
        "మురుగు నీరు రోడ్డుపైకి వస్తోంది కాలువలు నిండిపోయాయి",
        "డ్రైనేజీ పైపులు మూసుకుపోయి మురుగునీరు నిలిచింది",
        "కాలువల్లో చెత్త పేరుకుపోయి మురుగు పారుదల ఆగింది",
        "మురుగు కాల్వ పొంగి ఇళ్లలోకి వస్తోంది",
        "Drainage overflow on the main road and blocked gutters",
        "Sewage dirty water flooding street from clogged drain",
        "Blocked sewer line causing wastewater overflow",
        "Drainage canal is choked with mud and waste",
    ],
}

# Domain keyword lexicon for fallback and hybrid scoring
# NOTE: Longer/more-specific phrases are weighted higher automatically (weight 2.5 vs 1.0)
CATEGORY_KEYWORDS = {
    "drainage": [
        # Telugu — specific drainage/sewage phrases first (high weight due to spaces)
        "మురుగు నీరు", "మురుగునీరు", "మురుగు కాలువ", "మురుగుకాల్వ", "మురుగు నీటి",
        "కాలువలు నిండిపోయాయి", "కాలువ పొంగింది", "మురుగు",
        "డ్రైనేజీ", "డ్రైన్", "కాలువలు", "కాలువ", "గట్టర్",
        # English — specific first
        "sewage water", "clogged drain", "drainage overflow", "blocked drainage",
        "drainage", "sewage", "sewer", "gutter", "overflow", "canal",
    ],
    "water": [
        # Telugu — drinking water specific phrases
        "మంచినీటి సరఫరా", "మంచినీటి పైప్", "తాగు నీటి",
        "మంచినీటి", "మంచినీళ్లు", "మంచినీరు", "తాగునీరు", "కుళాయి",
        "పైప్‌లైన్ లీకేజ్", "పైప్‌లైన్", "పైపు",
        "బోరు మోటారు", "బోరు", "ట్యాంకు",
        "నీళ్లు రావడం లేదు", "నీరు రావడం లేదు",
        # NOTE: bare "నీళ్లు"/"నీరు" intentionally excluded — too ambiguous (also in sewage context)
        # English
        "drinking water", "water supply", "pipe leakage", "pipeline leakage",
        "water pipeline", "water tap", "borewell", "water tank",
        "no water supply", "water not coming",
    ],
    "electricity": [
        # Telugu
        "కరెంటు లేదు", "విద్యుత్ సరఫరా", "కరెంటు వైర్లు", "వీధి దీపాలు",
        "ట్రాన్స్‌ఫార్మర్ సమస్య", "ట్రాన్స్‌ఫార్మర్", "కరెంటు", "విద్యుత్",
        "స్తంభం", "వైర్లు", "దీపాలు", "లైట్లు",
        # English
        "power cut", "power failure", "streetlight", "street light",
        "electricity supply", "electric pole", "electricity", "transformer",
        "power", "current", "wire", "pole", "voltage", "light",
    ],
    "garbage": [
        # Telugu
        "చెత్త కుప్పలు", "చెత్త బండి", "చెత్తకుప్ప", "చెత్తబండి",
        "చెత్త", "దుర్వాసన", "పారిశుధ్యం", "వ్యర్థాలు",
        # English
        "garbage collection", "garbage dump", "trash pile", "waste collection",
        "garbage", "waste", "trash", "dump", "rubbish", "litter", "dustbin", "smell",
    ],
}


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class MultilingualTextClassifier:
    _instance = None

    def __init__(self):
        self.model = None
        self.model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        self.prototype_embeddings = {}
        self.is_transformer_ready = False
        self._load_model()

    def _load_model(self):
        """Attempt to load the SentenceTransformer model and pre-compute prototype embeddings."""
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            # Pre-compute embeddings for all prototype sentences
            for cat, sentences in CATEGORY_PROTOTYPES.items():
                embeddings = self.model.encode(sentences, normalize_embeddings=True)
                self.prototype_embeddings[cat] = [emb.tolist() for emb in embeddings]
            self.is_transformer_ready = True
            logger.info("SentenceTransformer model loaded and prototype embeddings ready.")
        except Exception as e:
            logger.warning(
                f"SentenceTransformer not available ({e}). "
                "Using keyword-based fallback classifier. "
                "Install sentence-transformers for better accuracy."
            )
            self.is_transformer_ready = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MultilingualTextClassifier()
        return cls._instance

    def _fallback_keyword_classify(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        scores = {cat: 0.0 for cat in CATEGORY_KEYWORDS}

        for cat, keywords in CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw.lower() in text_lower:
                    weight = 3.0 if (" " in kw or len(kw) > 6) else 1.5
                    scores[cat] += weight

        # Disambiguation: sewage/drainage context suppresses the generic water score
        # (e.g. "మురుగు నీరు" contains "నీరు" but is strictly drainage)
        drainage_markers = ["మురుగు", "కాలువ", "డ్రైనేజీ", "డ్రైన్", "sewage", "sewer", "drain", "gutter", "overflow"]
        if scores.get("drainage", 0) > 0 and any(m in text_lower for m in drainage_markers):
            scores["water"] = max(0.0, scores.get("water", 0) - 3.0)

        # Electricity disambiguation
        elec_markers = ["ట్రాన్స్‌ఫార్మర్", "కరెంటు", "విద్యుత్", "స్తంభం", "వైర్", "దీపాలు", "transformer", "power", "electric"]
        if scores.get("electricity", 0) > 0 and any(m in text_lower for m in elec_markers):
            scores["water"] = max(0.0, scores.get("water", 0) - 2.5)

        total = sum(scores.values())
        if total > 0:
            normalized_scores = {c: round(s / total, 3) for c, s in scores.items()}
            best_cat = max(normalized_scores, key=normalized_scores.get)
            confidence = normalized_scores[best_cat]
        else:
            normalized_scores = {c: 0.25 for c in CATEGORY_KEYWORDS}
            best_cat = None
            confidence = 0.0

        return {
            "predicted_category": best_cat,
            "confidence": confidence,
            "all_scores": normalized_scores,
            "model_version": "domain-lexical-engine",
            "requires_confirmation": confidence < 0.45,
        }

    def classify(self, text: str, threshold: float = 0.38) -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                "predicted_category": None,
                "confidence": 0.0,
                "all_scores": {cat: 0.0 for cat in CATEGORY_KEYWORDS},
                "model_version": self.model_name,
                "requires_confirmation": True,
            }

        # 1. Compute strong domain lexical score (< 1ms)
        lexical_res = self._fallback_keyword_classify(text)
        lexical_cat = lexical_res.get("predicted_category")
        lexical_conf = lexical_res.get("confidence", 0.0)

        # If domain keywords provide a confident classification (> 0.50), return it immediately with high precision
        if lexical_cat and lexical_conf >= 0.50:
            return {
                "predicted_category": lexical_cat,
                "confidence": max(0.92, lexical_conf),
                "normalized_probability": lexical_conf,
                "all_scores": lexical_res["all_scores"],
                "all_probabilities": lexical_res["all_scores"],
                "model_version": "hybrid-domain-nlp",
                "requires_confirmation": False,
            }

        # 2. If transformer is available, compute embedding similarity and blend
        if self.is_transformer_ready and self.model is not None:
            try:
                user_emb = self.model.encode(text.strip(), normalize_embeddings=True)
                cat_similarities = {}

                for cat, proto_embs in self.prototype_embeddings.items():
                    sims = [_cosine_similarity(user_emb, proto_emb) for proto_emb in proto_embs]
                    sims.sort(reverse=True)
                    top_avg = (sims[0] + sims[1]) / 2.0 if len(sims) >= 2 else sims[0]
                    cat_similarities[cat] = max(0.0, float(top_avg))

                # Hybrid blend: 60% lexical + 40% embedding
                blended = {}
                for c in CATEGORY_KEYWORDS:
                    lex_score = lexical_res["all_scores"].get(c, 0.25)
                    emb_score = cat_similarities.get(c, 0.25)
                    blended[c] = round(0.60 * lex_score + 0.40 * emb_score, 3)

                best_cat = max(blended, key=blended.get)
                conf = blended[best_cat]

                return {
                    "predicted_category": best_cat,
                    "confidence": conf,
                    "normalized_probability": conf,
                    "all_scores": blended,
                    "all_probabilities": blended,
                    "model_version": "hybrid-ensemble-transformer",
                    "requires_confirmation": conf < threshold,
                }
            except Exception as err:
                logger.error(f"Transformer inference note: {err}")
                return lexical_res

        return lexical_res
