import logging
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Essential domain terms dictionary fallback for rural civic governance
COMMON_TERMS_EN_TO_TE = {
    "water supply": "మంచినీటి సరఫరా",
    "drinking water": "తాగునీరు",
    "electricity": "విద్యుత్ సరఫరా",
    "power cut": "విద్యుత్ కోత",
    "health camp": "ఉచిత వైద్య శిబిరం",
    "medical camp": "వైద్య శిబిరం",
    "village meeting": "గ్రామ సభ",
    "emergency alert": "అత్యవసర హెచ్చరిక",
    "government scheme": "ప్రభుత్వ పథకం",
    "ration": "రేషన్ సరుకులు",
    "pension": "పింఛను పంపిణీ",
    "drainage": "మురుగు కాలువ శుభ్రత",
    "garbage": "చెత్త సేకరణ",
    "maintenance": "నిర్వహణ పనులు",
    "tomorrow": "రేపు",
    "today": "ఈరోజు",
    "morning": "ఉదయం",
    "afternoon": "మధ్యాహ్నం",
    "evening": "సాయంత్రం",
    "panchayat office": "గ్రామ పంచాయతీ కార్యాలయం",
}

COMMON_TERMS_TE_TO_EN = {v: k for k, v in COMMON_TERMS_EN_TO_TE.items()}


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    High-accuracy bidirectional translation between English ('en') and Telugu ('te').
    Uses MyMemoryTranslator with Google fallback and smart error resilience.
    """
    if not text or not text.strip():
        return ""

    text = text.strip()
    s_lang = "en" if source_lang.startswith("en") else "te"
    t_lang = "te" if target_lang.startswith("te") else "en"

    if s_lang == t_lang:
        return text

    # Formatted language tags for MyMemory
    mymemory_source = "en-US" if s_lang == "en" else "te-IN"
    mymemory_target = "te-IN" if t_lang == "te" else "en-GB"

    # Strategy 1: MyMemoryTranslator
    try:
        from deep_translator import MyMemoryTranslator
        result = MyMemoryTranslator(source=mymemory_source, target=mymemory_target).translate(text)
        if result and result.strip() and not result.startswith("MYMEMORY WARNING"):
            return result.strip()
    except Exception as e:
        logger.warning(f"MyMemory translation note: {e}")

    # Strategy 2: GoogleTranslator fallback
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source=s_lang, target=t_lang).translate(text)
        if result and result.strip():
            return result.strip()
    except Exception as e:
        logger.warning(f"GoogleTranslator fallback note: {e}")

    # Strategy 3: Domain glossary replacement fallback if network fails
    translated = text
    dictionary = COMMON_TERMS_EN_TO_TE if s_lang == "en" else COMMON_TERMS_TE_TO_EN
    for phrase, replacement in dictionary.items():
        pattern = re.compile(re.escape(phrase), re.IGNORECASE)
        translated = pattern.sub(replacement, translated)

    return translated


def auto_translate_announcement(title: str, content: str, source_language: str) -> Dict[str, str]:
    """
    Translates an announcement and returns complete bilingual payload.
    """
    src_lang = "te" if source_language.startswith("te") else "en"

    if src_lang == "en":
        eng_title = title
        eng_content = content
        tel_title = translate_text(title, "en", "te")
        tel_content = translate_text(content, "en", "te")
    else:
        tel_title = title
        tel_content = content
        eng_title = translate_text(title, "te", "en")
        eng_content = translate_text(content, "te", "en")

    return {
        "original_language": src_lang,
        "english_title": eng_title,
        "english_content": eng_content,
        "telugu_title": tel_title,
        "telugu_content": tel_content,
    }

