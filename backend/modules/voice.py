import os
import requests
import json
import base64
import logging
import time
from dotenv import load_dotenv
from gtts import gTTS
from io import BytesIO

logger = logging.getLogger("sahayai.tts")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())
logger.propagate = False

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
        response = requests.post(BHASHINI_PIPELINE_URL, json=payload, headers=headers, timeout=3)
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
    """
    Converts text to speech using Bhashini.
    Kannada -> kn
    Hindi   -> hi
    English -> en

    Returns Base64 audio data or None.
    """

    if not text or not text.strip():
        return None

    started_at = time.perf_counter()

    # ---------------------------------------------------------
    # 1. NORMALIZE LANGUAGE
    # ---------------------------------------------------------
    raw_lang = str(lang or "").strip().lower()

    if raw_lang in ("kannada", "kn", "kn-in", "kn_in"):
        target_lang = "kn"
    elif raw_lang in ("hindi", "hi", "hi-in", "hi_in"):
        target_lang = "hi"
    elif raw_lang in ("english", "en", "en-in", "en-us", "en_us"):
        target_lang = "en"
    else:
        target_lang = normalize_lang_code(raw_lang)

    original_text = text.strip()

    logger.info(
        "[TTS] Requested language=%s -> Bhashini language=%s",
        raw_lang,
        target_lang
    )

    # ---------------------------------------------------------
    # 2. TRY BHASHINI
    # ---------------------------------------------------------
    headers = get_bhashini_headers()

    if headers:

        # -----------------------------------------------------
        # Translate only when required.
        #
        # If Kannada text is already present, DO NOT translate
        # it to English.
        # -----------------------------------------------------
        if target_lang == "kn":

            has_kannada = any(
                "\u0C80" <= char <= "\u0CFF"
                for char in original_text
            )

            if has_kannada:
                text_for_tts = original_text

            else:
                # Text is probably English/Latin.
                # Translate English -> Kannada first.
                try:
                    translation_started = time.perf_counter()

                    translated_text = bhashini_translate(
                        original_text,
                        target_lang="kn",
                        source_lang="en"
                    )

                    translation_ms = (
                        time.perf_counter() - translation_started
                    ) * 1000

                    logger.info(
                        "[TTS] Kannada translation: %.0f ms",
                        translation_ms
                    )

                    text_for_tts = translated_text or original_text

                except Exception as e:
                    logger.warning(
                        "[TTS] Kannada translation failed: %s",
                        e
                    )
                    text_for_tts = original_text

        elif target_lang == "hi":

            has_hindi = any(
                "\u0900" <= char <= "\u097F"
                for char in original_text
            )

            if has_hindi:
                text_for_tts = original_text

            else:
                try:
                    translated_text = bhashini_translate(
                        original_text,
                        target_lang="hi",
                        source_lang="en"
                    )

                    text_for_tts = translated_text or original_text

                except Exception:
                    text_for_tts = original_text

        else:
            text_for_tts = original_text

        # -----------------------------------------------------
        # 3. BHASHINI TTS PAYLOAD
        # -----------------------------------------------------
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
                "input": [
                    {
                        "source": text_for_tts
                    }
                ]
            }
        }

        logger.info(
            "[TTS] Sending to Bhashini: language=%s text=%s",
            target_lang,
            text_for_tts[:100]
        )

        try:
            response = requests.post(
                BHASHINI_PIPELINE_URL,
                json=payload,
                headers=headers,
                timeout=5
            )

            logger.info(
                "[TTS] Bhashini response status=%s",
                response.status_code
            )

            if response.status_code == 200:

                res_data = response.json()

                pipeline_res = res_data.get(
                    "pipelineResponse",
                    []
                )

                if pipeline_res and "audio" in pipeline_res[0]:

                    audio_list = pipeline_res[0]["audio"]

                    if audio_list and "audioContent" in audio_list[0]:

                        logger.info(
                            "[TTS] SUCCESS provider=bhashini language=%s generation=%.0f ms",
                            target_lang,
                            (time.perf_counter() - started_at) * 1000
                        )

                        return audio_list[0]["audioContent"]

            else:
                logger.warning(
                    "[TTS] Bhashini failed status=%s response=%s",
                    response.status_code,
                    response.text[:500]
                )

        except Exception as e:
            logger.warning(
                "[Bhashini TTS Error] %s",
                e
            )

    # ---------------------------------------------------------
    # 4. gTTS FALLBACK
    # ---------------------------------------------------------
    #
    # IMPORTANT:
    # Kannada MUST use "kn".
    # Hindi MUST use "hi".
    #
    # Never fall back to English for Kannada/Hindi.
    # ---------------------------------------------------------

    try:

        gtts_lang = {
            "kn": "kn",
            "hi": "hi",
            "en": "en"
        }.get(target_lang, target_lang)

        logger.info(
            "[TTS] gTTS fallback language=%s",
            gtts_lang
        )

        audio_buffer = BytesIO()

        tts = gTTS(
            text=(
                text_for_tts
                if "text_for_tts" in locals()
                else original_text
            ),
            lang=gtts_lang,
            timeout=(3, 6)
        )

        tts.write_to_fp(audio_buffer)

        audio_base64 = base64.b64encode(
            audio_buffer.getvalue()
        ).decode("utf-8")

        logger.info(
            "[TTS] SUCCESS provider=gtts language=%s generation=%.0f ms",
            target_lang,
            (time.perf_counter() - started_at) * 1000
        )

        return f"data:audio/mpeg;base64,{audio_base64}"

    except Exception as e:

        logger.error(
            "[gTTS Error] language=%s error=%s",
            target_lang,
            e
        )

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
