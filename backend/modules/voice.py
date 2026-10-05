import os
import requests
import json
import base64
from dotenv import load_dotenv

# Load environment variables (supports root and backend directory)
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
load_dotenv()

BHASHINI_PIPELINE_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

LANG_MAP = {
    "kannada": "kn",
    "kn": "kn",
    "hindi": "hi",
    "hi": "hi",
    "tamil": "ta",
    "ta": "ta",
    "telugu": "te",
    "te": "te",
    "bengali": "bn",
    "bn": "bn",
    "marathi": "mr",
    "mr": "mr",
    "english": "en",
    "en": "en",
    "gujarati": "gu",
    "gu": "gu",
    "malayalam": "ml",
    "ml": "ml",
    "punjabi": "pa",
    "pa": "pa",
    "odia": "or",
    "or": "or"
}

def normalize_lang_code(lang_str: str) -> str:
    if not lang_str:
        return "kn"
    clean = str(lang_str).strip().lower()
    return LANG_MAP.get(clean, "kn")

def get_bhashini_headers():
    user_id = os.getenv("BHASHINI_USER_ID", "").strip()
    udyat_key = os.getenv("BHASHINI_UDYAT_KEY", "").strip()
    inf_key = os.getenv("BHASHINI_INFERENCE_KEY", "").strip()

    if not user_id or not inf_key:
        return None

    headers = {
        "userID": user_id,
        "Authorization": inf_key,
        "Content-Type": "application/json"
    }
    if udyat_key:
        headers["ulcaApiKey"] = udyat_key

    return headers

def is_bhashini_available() -> bool:
    headers = get_bhashini_headers()
    return headers is not None

def bhashini_translate(text: str, target_lang: str, source_lang: str = "en") -> str:
    """Translates text into target Indian language using Bhashini NMT."""
    if not text or not text.strip():
        return text

    headers = get_bhashini_headers()
    if not headers:
        return text

    src = normalize_lang_code(source_lang)
    tgt = normalize_lang_code(target_lang)

    if src == tgt:
        return text

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": src,
                        "targetLanguage": tgt
                    }
                }
            }
        ],
        "inputData": {
            "input": [{"source": text.strip()}]
        }
    }

    try:
        response = requests.post(BHASHINI_PIPELINE_URL, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            res_data = response.json()
            pipeline_res = res_data.get("pipelineResponse", [])
            if pipeline_res and "output" in pipeline_res[0]:
                outputs = pipeline_res[0]["output"]
                if outputs and "target" in outputs[0]:
                    return outputs[0]["target"]
    except Exception as e:
        print(f"[Bhashini Translate Error]: {e}")

    return text

def bhashini_tts(text: str, lang: str = "kn", gender: str = "female") -> str:
    """Converts text to speech audio using Bhashini TTS. Returns Base64 WAV string or None."""
    if not text or not text.strip():
        return None

    headers = get_bhashini_headers()
    if not headers:
        return None

    target_lang = normalize_lang_code(lang)

    # If text is in English but target language is non-English, translate first so TTS speaks local language
    if target_lang != "en" and any(c.isascii() and c.isalpha() for c in text[:30]):
        try:
            text = bhashini_translate(text, target_lang=target_lang, source_lang="en")
        except Exception:
            pass

    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {
                        "sourceLanguage": target_lang
                    },
                    "gender": gender
                }
            }
        ],
        "inputData": {
            "input": [{"source": text.strip()}]
        }
    }

    try:
        response = requests.post(BHASHINI_PIPELINE_URL, json=payload, headers=headers, timeout=12)
        if response.status_code == 200:
            res_data = response.json()
            pipeline_res = res_data.get("pipelineResponse", [])
            if pipeline_res and "audio" in pipeline_res[0]:
                audio_list = pipeline_res[0]["audio"]
                if audio_list and "audioContent" in audio_list[0]:
                    return audio_list[0]["audioContent"]
    except Exception as e:
        print(f"[Bhashini TTS Error]: {e}")

    return None

def bhashini_asr(audio_b64: str, lang: str = "kn") -> str:
    """Converts Base64 audio into text using Bhashini ASR. Returns transcribed text or None."""
    if not audio_b64:
        return None

    headers = get_bhashini_headers()
    if not headers:
        return None

    target_lang = normalize_lang_code(lang)

    # Clean header prefix if present (e.g., "data:audio/wav;base64,")
    if "," in audio_b64:
        audio_b64 = audio_b64.split(",")[-1]

    payload = {
        "pipelineTasks": [
            {
                "taskType": "asr",
                "config": {
                    "language": {
                        "sourceLanguage": target_lang
                    }
                }
            }
        ],
        "inputData": {
            "audio": [{"audioContent": audio_b64}]
        }
    }

    try:
        response = requests.post(BHASHINI_PIPELINE_URL, json=payload, headers=headers, timeout=12)
        if response.status_code == 200:
            res_data = response.json()
            pipeline_res = res_data.get("pipelineResponse", [])
            if pipeline_res and "output" in pipeline_res[0]:
                outputs = pipeline_res[0]["output"]
                if outputs and "source" in outputs[0]:
                    return outputs[0]["source"]
    except Exception as e:
        print(f"[Bhashini ASR Error]: {e}")

    return None
