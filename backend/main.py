from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
import json
import logging
from modules.ocr import (
    analyze_prescription,
    identify_tablet_image,
    extract_text_from_image,
    extract_medicines_locally,
    medicines_to_speech,
    is_non_tablet_prescription,
    normalize_medicine_name,
)
from modules.voice import (
    is_bhashini_available,
    bhashini_translate,
    bhashini_tts,
    bhashini_asr,
)
import os
from PIL import Image
import io as _io
import traceback
import re
import time
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from database import engine, SessionLocal, Base
from modules.face_auth import User, Prescription, MedicalDocument
from modules.blockchain import (
    create_blockchain_block,
    verify_blockchain_integrity,
    get_user_blockchain_records
)
import shutil
import uuid
from modules.face_service import encode_face_from_bytes, encoding_to_bytes, compare_faces

from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

load_dotenv()
logger = logging.getLogger("sahayai.api")
logger.setLevel(logging.INFO)
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())
logger.propagate = False

Base.metadata.create_all(bind=engine)

def _ensure_schema_migrations():
    import sqlite3
    try:
        db_path = os.path.join(os.path.dirname(__file__), "sahayai.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            for table in ["medical_documents", "prescriptions"]:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN block_hash TEXT;")
                except Exception:
                    pass
            try:
                cursor.execute("ALTER TABLE prescriptions ADD COLUMN image_path TEXT;")
            except Exception:
                pass
            conn.commit()
            conn.close()
    except Exception as e:
        print("Schema migration info:", e)

_ensure_schema_migrations()

os.makedirs("uploads", exist_ok=True)

app = FastAPI()
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    app_name = os.getenv("APP_NAME", "SahayAI")
    return {
        "message": f"{app_name} backend is alive!",
        "bhashini_available": is_bhashini_available()
    }


# --- BHASHINI API REST ENDPOINTS ---

class BhashiniTranslateRequest(BaseModel):
    text: str
    target_lang: str = "kannada"
    source_lang: str = "english"

class BhashiniTTSRequest(BaseModel):
    text: str
    language: str = "kannada"
    gender: str = "female"

class BhashiniASRRequest(BaseModel):
    audio_base64: str
    language: str = "kannada"

class PrescriptionTranslateRequest(BaseModel):
    language: str
    source: dict

@app.get("/api/bhashini/status")
def get_bhashini_status():
    return {
        "bhashini_available": is_bhashini_available()
    }

@app.post("/api/bhashini/translate")
def api_bhashini_translate(req: BhashiniTranslateRequest):
    translated = bhashini_translate(req.text, req.target_lang, req.source_lang)
    return {
        "original_text": req.text,
        "translated_text": translated,
        "target_lang": req.target_lang
    }

@app.post("/api/bhashini/tts")
def api_bhashini_tts(req: BhashiniTTSRequest):
    tts_started = time.perf_counter()
    audio_b64 = bhashini_tts(req.text, req.language, req.gender)
    generation_ms = round((time.perf_counter() - tts_started) * 1000)
    logger.info("[TTS] Generation: %d ms language=%s", generation_ms, req.language)
    return {
        "text": req.text,
        "language": req.language,
        "audio_base64": audio_b64,
        "has_audio": audio_b64 is not None,
        "generation_ms": generation_ms,
    }

@app.post("/api/bhashini/asr")
def api_bhashini_asr(req: BhashiniASRRequest):
    transcribed = bhashini_asr(req.audio_base64, req.language)
    return {
        "transcribed_text": transcribed,
        "language": req.language
    }


# --- FACE AUTHENTICATION ENDPOINTS ---

@app.post("/register")
def register_user(name: str, phone: str, language: str, db: DBSession = Depends(get_db)):
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        return {"error": "Phone number already registered"}

    user = User(name=name, phone=phone, language=language)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully", "user_id": user.id}

@app.post("/register-face/{user_id}")
async def register_face(
    user_id: int,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    image_bytes = await file.read()
    encoding = encode_face_from_bytes(image_bytes)

    if encoding is None:
        return {"error": "No face detected in image. Please try again with clear lighting."}

    existing_users = db.query(User).filter(User.id != user_id, User.face_encoding != None).all()
    for existing in existing_users:
        match, _ = compare_faces(existing.face_encoding, encoding)
        if match:
            return {"error": f"Face already registered under name '{existing.name}'."}

    user.face_encoding = encoding_to_bytes(encoding)
    db.commit()

    return {"message": f"Face template enrolled successfully for {user.name}"}

@app.post("/login-face")
async def login_face(
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db)
):
    image_bytes = await file.read()
    live_encoding = encode_face_from_bytes(image_bytes)

    if live_encoding is None:
        return {"error": "No face detected. Please try again."}

    users = db.query(User).filter(User.face_encoding != None).all()

    if len(users) == 0:
        return {"error": "No registered faces found"}

    for user in users:
        match, confidence = compare_faces(user.face_encoding, live_encoding)
        if match:
            return {
                "success": True,
                "message": f"Welcome back, {user.name}!",
                "user_id": user.id,
                "name": user.name,
                "language": user.language,
                "confidence": confidence
            }

    return {"success": False, "error": "Face not recognised. Please register first."}

@app.get("/users")
def get_all_users(db: DBSession = Depends(get_db)):
    users = db.query(User).all()
    return {"total": len(users), "users": [
        {"id": u.id, "name": u.name, "phone": u.phone, "language": u.language}
        for u in users
    ]}


# --- HELPER FUNCTIONS ---

def get_youtube_video_for_query(query: str):
    search_url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
    try:
        request = Request(search_url, headers={"User-Agent": "Mozilla/5.0"})
        html = urlopen(request, timeout=10).read().decode("utf-8", errors="ignore")
        match = re.search(r'"videoId":"([^"]+)"', html)
        if not match:
            return {"search_url": search_url}

        video_id = match.group(1)
        return {
            "title": query.title(),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "embed_url": f"https://www.youtube.com/embed/{video_id}",
            "search_url": search_url,
        }
    except Exception:
        return {"search_url": search_url}


try:
    from groq import Groq
    groq_api_key = os.getenv("GROQ_API_KEY")
    groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
except Exception:
    groq_client = None


# --- VOICE ASSISTANT (LLM & BHASHINI POWERED) ---

@app.post("/voice-assistant")
async def voice_assistant(
    message: str,
    language: str,
    name: str
):
    msg_raw = message.strip()
    target_lang = (language or "english").lower()

    system_prompt = (
        f"You are SahayAI, a direct healthcare voice assistant for {name}. "
        f"You MUST strictly reply in the user's preferred language: {language}. "
        f"Provide direct answers only, with no filler words. "
        f"If the user asks to navigate or open prescriptions, medical records, government health schemes, user profile, or logout, "
        f"include NAVIGATE:prescription, NAVIGATE:records, NAVIGATE:schemes, NAVIGATE:profile, or NAVIGATE:logout in your reply."
    )

    reply_final = ""
    navigate_to = None

    if groq_client:
        models = [
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b"
        ]
        for model in models:
            try:
                response = groq_client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": msg_raw}
                    ],
                    max_tokens=80,
                    temperature=0
                )
                if response and response.choices:
                    reply_final = response.choices[0].message.content.strip()
                    break
            except Exception as e:
                print(f"[Voice Assistant Groq error with {model}]:", e)

    # Process NAVIGATE flags in LLM output
    if "NAVIGATE:prescription" in reply_final:
        navigate_to = "prescription"
        reply_final = reply_final.replace("NAVIGATE:prescription", "").strip()
    elif "NAVIGATE:records" in reply_final:
        navigate_to = "records"
        reply_final = reply_final.replace("NAVIGATE:records", "").strip()
    elif "NAVIGATE:schemes" in reply_final:
        navigate_to = "schemes"
        reply_final = reply_final.replace("NAVIGATE:schemes", "").strip()
    elif "NAVIGATE:profile" in reply_final:
        navigate_to = "profile"
        reply_final = reply_final.replace("NAVIGATE:profile", "").strip()
    elif "NAVIGATE:logout" in reply_final:
        navigate_to = "logout"
        reply_final = reply_final.replace("NAVIGATE:logout", "").strip()

    # Fallback navigation check if not caught by LLM output
    msg_lower = msg_raw.lower()
    if not navigate_to:
        if any(k in msg_lower for k in ["prescription", "tablet", "medicine", "dawai", "aushadh", "mathre"]):
            navigate_to = "prescription"
        elif any(k in msg_lower for k in ["record", "report", "history", "dakhalegalu", "dastavez", "file"]):
            navigate_to = "records"
        elif any(k in msg_lower for k in ["scheme", "yojana", "yojane", "jan aushadhi", "ayushman", "government"]):
            navigate_to = "schemes"
        elif any(k in msg_lower for k in ["profile", "account", "details", "khata"]):
            navigate_to = "profile"
        elif any(k in msg_lower for k in ["logout", "exit", "bye"]):
            navigate_to = "logout"

    # Fallback reply generation if LLM is unavailable or returned empty string
    if not reply_final:
        fallback_key = navigate_to or "greeting"
        fallback_replies = {
            "english": {
                "prescription": "Opening your prescription scanner.",
                "records": "Opening your medical records.",
                "schemes": "Opening government health schemes.",
                "profile": "Opening your profile.",
                "logout": "Logging out.",
                "greeting": f"Hello {name}, how can I help you today?",
            },
            "kannada": {
                "prescription": "ನಿಮ್ಮ ಔಷಧಿ ಚೀಟಿ ಸ್ಕ್ಯಾನರ್ ತೆರೆಯುತ್ತಿದೆ.",
                "records": "ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ತೆರೆಯುತ್ತಿದೆ.",
                "schemes": "ಸರ್ಕಾರಿ ಆರೋಗ್ಯ ಯೋಜನೆಗಳನ್ನು ತೆರೆಯುತ್ತಿದೆ.",
                "profile": "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ತೆರೆಯುತ್ತಿದೆ.",
                "logout": "ಲಾಗ್‌ಔಟ್ ಆಗುತ್ತಿದೆ.",
                "greeting": f"ನಮಸ್ಕಾರ {name}, ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
            },
            "hindi": {
                "prescription": "आपका पर्चा स्कैनर खोला जा रहा है।",
                "records": "आपके मेडिकल रिकॉर्ड खोले जा रहे हैं।",
                "schemes": "सरकारी स्वास्थ्य योजनाएं खोली जा रही हैं।",
                "profile": "आपकी प्रोफाइल खोली जा रही है।",
                "logout": "लॉगआउट हो रहा है।",
                "greeting": f"नमस्ते {name}, आज मैं आपकी कैसे सहायता कर सकता हूँ?",
            },
        }
        reply_english = fallback_replies["english"][fallback_key]
        reply_final = reply_english

        if target_lang not in {"en", "english"}:
            try:
                translated_reply = bhashini_translate(reply_final, target_lang=target_lang, source_lang="english")
                if translated_reply and translated_reply != reply_english:
                    reply_final = translated_reply
            except Exception:
                pass
            if reply_final == reply_english:
                reply_final = fallback_replies.get(target_lang, fallback_replies["english"])[fallback_key]

    # Check for YouTube remedy video intent
    videos = []
    video_search_url = None
    search_query = None
    if any(k in msg_lower for k in ["headache", "head ache", "head pain", "sir dard"]):
        search_query = "home remedies for headache"
    elif any(k in msg_lower for k in ["back pain", "backache", "kamar dard"]):
        search_query = "home remedies for back pain"
    elif any(k in msg_lower for k in ["fever", "bukhar"]):
        search_query = "home remedies for fever"
    elif any(k in msg_lower for k in ["cough", "cold", "sore throat"]):
        search_query = "home remedies for cough and cold"
    elif any(k in msg_lower for k in ["stomach", "indigestion", "acidity"]):
        search_query = "home remedies for stomach pain"

    if search_query:
        lang_search = {"kannada": "ಕನ್ನಡ", "hindi": "hindi", "english": ""}
        lang_suffix = lang_search.get(target_lang, "")
        localized_query = f"{search_query} {lang_suffix}".strip()
        video_info = get_youtube_video_for_query(localized_query)
        if video_info:
            videos = [video_info]
            video_search_url = video_info.get("search_url")

    # Generate TTS asynchronously in the client after returning the response.
    # This prevents network TTS/gTTS latency from delaying the chatbot text.
    audio_base64 = None
    bhashini_used = False
    return {
        "reply": reply_final,
        "navigate_to": navigate_to,
        "videos": videos,
        "video_search_url": video_search_url,
        "audio_base64": audio_base64,
        "bhashini_used": bhashini_used
    }


# --- PRESCRIPTION OCR ENDPOINTS ---
def localize_prescription_text(text, language, allow_remote=True):
    if not text:
        return text

    lang = (language or "english").lower()
    lang = {"kn": "kannada", "hi": "hindi", "en": "english"}.get(lang, lang)
    
    if lang in {"en", "english"}:
        return text

    translations = {
        "kannada": {
            "This is an AI-assisted reading aid, not medical advice. Always confirm your prescription with your doctor or pharmacist before taking any medication.": "ಇದು AI ಸಹಾಯದ ಓದುವ ಸಾಧನ ಮಾತ್ರ, ವೈದ್ಯಕೀಯ ಸಲಹೆಯಲ್ಲ. ಯಾವುದೇ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುವ ಮೊದಲು ನಿಮ್ಮ ವೈದ್ಯರು ಅಥವಾ ಔಷಧಿಕಾರರೊಂದಿಗೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
            "This photo does not appear to be a medical prescription or medicine bill. Please upload a clear photo of a valid doctor's prescription.": "ಈ ಚಿತ್ರವು ವೈದ್ಯಕೀಯ ಔಷಧಿ ಚೀಟಿ ಅಥವಾ ಔಷಧಿ ಬಿಲ್‌ನಂತೆ ಕಾಣುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ವೈದ್ಯರ ಔಷಧಿ ಚೀಟಿಯ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ.",
            "is commonly used as prescribed by doctor for health condition management.": "ಆರೋಗ್ಯ ಸಮಸ್ಯೆಗಳ ನಿರ್ವಹಣೆಗೆ ವೈದ್ಯರ ಸೂಚನೆಯಂತೆ ಸಾಮಾನ್ಯವಾಗಿ ಬಳಸಲಾಗುತ್ತದೆ.",
            "Diet:": "ಆಹಾರ:", "Exercise:": "ವ್ಯಾಯಾಮ:", "Advice:": "ಸಲಹೆ:",
            "Doctor Notes:": "ವೈದ್ಯರ ಟಿಪ್ಪಣಿಗಳು:", "Lifestyle Advice:": "ಜೀವನಶೈಲಿ ಸಲಹೆ:",
            "Disclaimer:": "ಹಕ್ಕುತ್ಯಾಗ:", "Follow up after": "ನಂತರ ಮರುಪರಿಶೀಲನೆ ಮಾಡಿ",
            "regular": "ನಿಯಮಿತವಾಗಿ", "daily": "ದಿನನಿತ್ಯ", "min": "ನಿಮಿಷ",
            "please follow a low salt diet and walk daily.": "ದಯವಿಟ್ಟು ಕಡಿಮೆ ಉಪ್ಪಿನ ಆಹಾರವನ್ನು ಸೇವಿಸಿ ಮತ್ತು ಪ್ರತಿದಿನ ನಡೆಯಿರಿ.",
            "follow a low-salt diet and exercise regularly.": "ಕಡಿಮೆ ಉಪ್ಪಿನ ಆಹಾರ ಸೇವಿಸಿ ಮತ್ತು ನಿಯಮಿತವಾಗಿ ವ್ಯಾಯಾಮ ಮಾಡಿ.",
            "drink plenty of water and get enough rest.": "ಹೆಚ್ಚು ನೀರು ಕುಡಿಯಿರಿ ಮತ್ತು ಸಾಕಷ್ಟು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.",
            "monitor blood pressure and blood sugar regularly.": "ರಕ್ತದೊತ್ತಡ ಮತ್ತು ರಕ್ತದಲ್ಲಿನ ಸಕ್ಕರೆಯನ್ನು ನಿಯಮಿತವಾಗಿ ಪರಿಶೀಲಿಸಿ.",
            "Please": "ದಯವಿಟ್ಟು", "follow": "ಪಾಲಿಸಿ", "salt": "ಉಪ್ಪು", "diet": "ಆಹಾರ",
            "exercise": "ವ್ಯಾಯಾಮ", "walk": "ನಡೆಯಿರಿ", "walking": "ನಡೆಯುವುದು", "daily": "ಪ್ರತಿದಿನ",
            "drink": "ಕುಡಿಯಿರಿ", "water": "ನೀರು", "rest": "ವಿಶ್ರಾಂತಿ", "avoid": "ತಪ್ಪಿಸಿ",
            "consult": "ಸಂಪರ್ಕಿಸಿ", "doctor": "ವೈದ್ಯರು", "medicine": "ಔಷಧಿ", "medicines": "ಔಷಧಿಗಳು",
            "prescription": "ಔಷಧಿ ಚೀಟಿ", "take": "ತೆಗೆದುಕೊಳ್ಳಿ", "after": "ನಂತರ", "before": "ಮೊದಲು",
            "food": "ಆಹಾರ", "meals": "ಊಟ", "with": "ಜೊತೆಗೆ", "for": "ಗಾಗಿ", "regularly": "ನಿಯಮಿತವಾಗಿ",
            "and": "ಮತ್ತು", "blood pressure": "ರಕ್ತದೊತ್ತಡ", "blood sugar": "ರಕ್ತದಲ್ಲಿನ ಸಕ್ಕರೆ",
            "Twice daily (Morning & Evening)": "ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ (ಬೆಳಿಗ್ಗೆ ಮತ್ತು ಸಂಜೆ)",
            "Three times daily (Morning, Afternoon & Night)": "ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ (ಬೆಳಿಗ್ಗೆ, ಮಧ್ಯಾಹ್ನ ಮತ್ತು ರಾತ್ರಿ)",
            "Once daily at night": "ದಿನಕ್ಕೆ ಒಮ್ಮೆ ರಾತ್ರಿ",
            "Once daily in morning": "ದಿನಕ್ಕೆ ಒಮ್ಮೆ ಬೆಳಿಗ್ಗೆ",
            "Once daily in afternoon": "ದಿನಕ್ಕೆ ಒಮ್ಮೆ ಮಧ್ಯಾಹ್ನ",
            "Twice daily": "ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ", "Three times daily": "ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ",
            "Once daily": "ದಿನಕ್ಕೆ ಒಂದು ಬಾರಿ", "Four times daily": "ದಿನಕ್ಕೆ ನಾಲ್ಕು ಬಾರಿ",
            "As per doctor's advice": "ವೈದ್ಯರ ಸಲಹೆಯಂತೆ",
            "Take as per doctor's suggestion / prescription": "ವೈದ್ಯರ ಸಲಹೆ ಅಥವಾ ಔಷಧಿ ಚೀಟಿಯಂತೆ ತೆಗೆದುಕೊಳ್ಳಿ",
            "Take as per doctor's suggestion": "ವೈದ್ಯರ ಸಲಹೆಯಂತೆ ತೆಗೆದುಕೊಳ್ಳಿ",
            "As needed": "ಅಗತ್ಯವಿದ್ದಾಗ", "After food": "ಊಟದ ನಂತರ", "Before food": "ಊಟದ ಮೊದಲು",
            "With meals": "ಊಟದೊಂದಿಗೆ", "At night": "ರಾತ್ರಿ", "Low salt": "ಕಡಿಮೆ ಉಪ್ಪು",
            "Low sugar": "ಕಡಿಮೆ ಸಕ್ಕರೆ", "Drink plenty of water": "ಹೆಚ್ಚು ನೀರು ಕುಡಿಯಿರಿ",
            "Take rest": "ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ", "days": "ದಿನಗಳು", "day": "ದಿನ",
            "weeks": "ವಾರಗಳು", "week": "ವಾರ", "months": "ತಿಂಗಳುಗಳು", "month": "ತಿಂಗಳು",
            "tablet": "ಮಾತ್ರೆ", "tablets": "ಮಾತ್ರೆಗಳು", "capsule": "ಕ್ಯಾಪ್ಸುಲ್",
            "capsules": "ಕ್ಯಾಪ್ಸುಲ್‌ಗಳು", "mg": "ಮಿಗ್ರಾಂ", "ml": "ಮಿಲಿ",
        },
        "hindi": {
            "This is an AI-assisted reading aid, not medical advice. Always confirm your prescription with your doctor or pharmacist before taking any medication.": "यह AI-सहायता प्राप्त पढ़ने का साधन है, चिकित्सा सलाह नहीं। कोई भी दवा लेने से पहले अपने डॉक्टर या फार्मासिस्ट से पुष्टि करें।",
            "This photo does not appear to be a medical prescription or medicine bill. Please upload a clear photo of a valid doctor's prescription.": "यह तस्वीर मेडिकल पर्चा या दवा का बिल नहीं लगती। कृपया मान्य डॉक्टर के पर्चे की स्पष्ट तस्वीर अपलोड करें।",
            "is commonly used as prescribed by doctor for health condition management.": "का उपयोग स्वास्थ्य स्थिति के प्रबंधन के लिए डॉक्टर के निर्देशानुसार किया जाता है।",
            "Diet:": "आहार:", "Exercise:": "व्यायाम:", "Advice:": "सलाह:",
            "Doctor Notes:": "डॉक्टर के नोट:", "Lifestyle Advice:": "जीवनशैली संबंधी सलाह:",
            "Disclaimer:": "अस्वीकरण:", "Follow up after": "के बाद जांच कराएं",
            "regular": "नियमित", "daily": "प्रतिदिन", "min": "मिनट",
            "please follow a low salt diet and walk daily.": "कृपया कम नमक वाला भोजन लें और प्रतिदिन टहलें।",
            "follow a low-salt diet and exercise regularly.": "कम नमक वाला भोजन करें और नियमित रूप से व्यायाम करें।",
            "drink plenty of water and get enough rest.": "खूब पानी पिएं और पर्याप्त आराम करें।",
            "monitor blood pressure and blood sugar regularly.": "रक्तचाप और रक्त शर्करा की नियमित जांच करें।",
            "Please": "कृपया", "follow": "पालन करें", "salt": "नमक", "diet": "आहार",
            "exercise": "व्यायाम", "walk": "टहलें", "walking": "चलना", "daily": "प्रतिदिन",
            "drink": "पिएं", "water": "पानी", "rest": "आराम", "avoid": "बचें",
            "consult": "परामर्श करें", "doctor": "डॉक्टर", "medicine": "दवा", "medicines": "दवाइयां",
            "prescription": "पर्चा", "take": "लें", "after": "बाद", "before": "पहले",
            "food": "भोजन", "meals": "खाना", "with": "के साथ", "for": "के लिए", "regularly": "नियमित रूप से",
            "and": "और", "blood pressure": "रक्तचाप", "blood sugar": "रक्त शर्करा",
            "Twice daily (Morning & Evening)": "दिन में दो बार (सुबह और शाम)",
            "Three times daily (Morning, Afternoon & Night)": "दिन में तीन बार (सुबह, दोपहर और रात)",
            "Once daily at night": "रात में दिन में एक बार",
            "Once daily in morning": "सुबह दिन में एक बार",
            "Once daily in afternoon": "दोपहर में दिन में एक बार",
            "Twice daily": "दिन में दो बार", "Three times daily": "दिन में तीन बार",
            "Once daily": "दिन में एक बार", "Four times daily": "दिन में चार बार",
            "As per doctor's advice": "डॉक्टर की सलाह के अनुसार",
            "Take as per doctor's suggestion / prescription": "डॉक्टर की सलाह या पर्चे के अनुसार लें",
            "Take as per doctor's suggestion": "डॉक्टर की सलाह के अनुसार लें",
            "As needed": "आवश्यकतानुसार", "After food": "खाने के बाद", "Before food": "खाने से पहले",
            "With meals": "भोजन के साथ", "At night": "रात में", "Low salt": "कम नमक",
            "Low sugar": "कम चीनी", "Drink plenty of water": "खूब पानी पिएं",
            "Take rest": "आराम करें", "days": "दिन", "day": "दिन", "weeks": "सप्ताह",
            "week": "सप्ताह", "months": "महीने", "month": "महीना", "tablet": "गोली",
            "tablets": "गोलियां", "capsule": "कैप्सूल", "capsules": "कैप्सूल",
            "mg": "मि.ग्रा.", "ml": "मि.ली.",
        }
    }

    localized = str(text)
    for source, translated in sorted(translations.get(lang, {}).items(), key=lambda item: -len(item[0])):
        pattern = re.escape(source)
        if re.fullmatch(r"[A-Za-z]+", source):
            pattern = rf"(?<![A-Za-z]){pattern}(?![A-Za-z])"
        localized = re.sub(pattern, translated, localized, flags=re.IGNORECASE)

    # Avoid network calls for common fields already fully covered locally.
    if not re.search(r"[A-Za-z]{2,}", localized):
        return localized
    if not allow_remote:
        return localized

    # Prefer Bhashini when configured. In clean clones, use the same Gemini
    # key as OCR for free-form summaries/advice; local phrase translations
    # above remain the bounded fallback when either service is unavailable.
    if is_bhashini_available():
        try:
            translated = bhashini_translate(text, target_lang=lang, source_lang="english")
            if translated and translated != text:
                return translated
        except Exception as e:
            print("Prescription Bhashini translate error:", e)

    api_key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    if api_key:
        try:
            from google import genai
            from google.genai import types

            protected_names = re.findall(
                r"\b(?:Betaloc|Cimetidine|Dorzolamidum|Oxprelol)\b", str(text), re.IGNORECASE
            )
            translatable_text = str(text)
            for index, medicine_name in enumerate(protected_names):
                translatable_text = re.sub(
                    re.escape(medicine_name), f"__KEEP_MEDICINE_{index}__",
                    translatable_text, count=1, flags=re.IGNORECASE
                )
            target_name = "Kannada" if lang == "kannada" else "Hindi"
            prompt = (
                f"Translate the text into natural {target_name}. Return only the translation. "
                "Preserve medicine/brand placeholders, numbers, units, and medical meaning exactly. "
                f"Text: {translatable_text}"
            )
            client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(timeout=10000)
            )
            response = client.models.generate_content(model="gemini-3.8-flash", contents=prompt)
            translated = (response.text or "").strip()
            for index, medicine_name in enumerate(protected_names):
                translated = translated.replace(f"__KEEP_MEDICINE_{index}__", medicine_name)
            if translated:
                return translated
        except Exception as e:
            print("Prescription Gemini translate error:", e)
    return localized


def translate_prescription_fields(source, language):
    medicines = [dict(medicine) for medicine in source.get("medicines", [])]
    for medicine in medicines:
        for field in ("dose", "frequency", "duration", "instructions"):
            medicine[field] = localize_prescription_text(medicine.get(field), language)
    return {
        "raw_text": localize_prescription_text(source.get("raw_text"), language),
        "note": localize_prescription_text(source.get("note"), language),
        "lifestyle_advice": localize_prescription_text(source.get("lifestyle_advice"), language),
        "doctor_notes": localize_prescription_text(source.get("doctor_notes"), language),
        "medicines": medicines,
    }


@app.post("/translate-prescription")
async def translate_prescription(req: PrescriptionTranslateRequest):
    # This enhancement request is separate from the scan response so remote
    # translation cannot delay initial result rendering or narration start.
    return await run_in_threadpool(translate_prescription_fields, req.source, req.language)

@app.post("/scan-prescription/{user_id}")
async def scan_prescription(
    user_id: int,
    file: UploadFile = File(...),
    language: str = "english",
    defer_translation: bool = False,
    db: DBSession = Depends(get_db)
):
    request_started = time.perf_counter()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    image_read_started = time.perf_counter()
    image_bytes = await file.read()
    image_read_seconds = time.perf_counter() - image_read_started
    if not image_bytes:
        return {"error": "Empty file uploaded."}

    # Call Sanjay's multimodal prescription analyzer via ocr module
    analysis_started = time.perf_counter()
    try:
        result = await run_in_threadpool(analyze_prescription, image_bytes)
        if "error" in result:
            return {"error": result["error"]}
    except Exception as e:
        print("scan_prescription error:", e)
        traceback.print_exc()
        return {"error": "Server error while processing prescription image."}
    analysis_seconds = time.perf_counter() - analysis_started

    text_processing_started = time.perf_counter()
    raw_text = result.get("raw_text", "")
    medicines = result.get("medicines", [])
    translation_source = {
        "raw_text": raw_text,
        "note": result.get("note"),
        "lifestyle_advice": result.get("lifestyle_advice"),
        "doctor_notes": result.get("doctor_notes"),
        "medicines": [dict(medicine) for medicine in medicines],
    } if defer_translation and language.lower() not in {"en", "english"} else None
    translation_started = time.perf_counter()
    allow_remote_translation = not defer_translation
    for med in medicines:
        med["dose"] = localize_prescription_text(med.get("dose"), language, allow_remote_translation)
        med["frequency"] = localize_prescription_text(med.get("frequency"), language, allow_remote_translation)
        med["duration"] = localize_prescription_text(med.get("duration"), language, allow_remote_translation)
        med["instructions"] = localize_prescription_text(med.get("instructions"), language, allow_remote_translation)
    raw_text = localize_prescription_text(raw_text, language, allow_remote_translation)
    note = localize_prescription_text(result.get("note"), language, allow_remote_translation)
    lifestyle_advice = localize_prescription_text(result.get("lifestyle_advice"), language, allow_remote_translation)
    doctor_notes = localize_prescription_text(result.get("doctor_notes"), language, allow_remote_translation)
    translation_seconds = time.perf_counter() - translation_started

    speech_text = medicines_to_speech(medicines, language)
    text_processing_seconds = time.perf_counter() - text_processing_started

    # Audio is requested by the existing frontend speech helper after the scan
    # response renders, so synthesis cannot hold the OCR result hostage.
    audio_base64 = None
    bhashini_used = False

    # Save prescription image file to uploads
    persistence_started = time.perf_counter()
    rx_file_path = None
    try:
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        rx_filename = f"rx_{uuid.uuid4().hex[:12]}.jpg"
        rx_file_path = os.path.join(upload_dir, rx_filename)
        with open(rx_file_path, "wb") as f:
            f.write(image_bytes)
    except Exception as save_err:
        print("Save prescription image error:", save_err)

    # Save prescription to SQLite Database & Generate Blockchain SHA-256 Ledger Record
    block_hash = None
    try:
        new_prescription = Prescription(
            user_id=user_id,
            raw_text=raw_text,
            medicines_json=json.dumps(medicines),
            speech_text=speech_text,
            image_path=rx_file_path,
        )
        db.add(new_prescription)
        db.commit()
        db.refresh(new_prescription)
        prescription_id = new_prescription.id

        # Generate cryptographic blockchain block
        block = create_blockchain_block(
            db=db,
            user_id=user_id,
            record_type="prescription",
            record_id=new_prescription.id,
            payload={
                "prescription_id": new_prescription.id,
                "medicines": medicines,
                "raw_text": raw_text[:100] if raw_text else ""
            }
        )
        new_prescription.block_hash = block.block_hash
        db.commit()
        block_hash = block.block_hash
    except Exception as db_err:
        print("Database/Blockchain save error:", db_err)
        prescription_id = None
    persistence_seconds = time.perf_counter() - persistence_started

    logger.info("[Prescription] Image read: %.0f ms", image_read_seconds * 1000)
    logger.info("[Prescription] Analysis: %.0f ms", analysis_seconds * 1000)
    logger.info("[Prescription] Translation: %.0f ms", translation_seconds * 1000)
    logger.info("[Prescription] Text processing: %.0f ms", text_processing_seconds * 1000)
    logger.info("[Prescription] Persistence: %.0f ms", persistence_seconds * 1000)
    logger.info(
        "[Prescription] Server total: %.0f ms (TTS deferred)",
        (time.perf_counter() - request_started) * 1000,
    )

    return {
        "prescription_id": prescription_id,
        "raw_text": raw_text,
        "medicines": medicines,
        "speech_text": speech_text,
        "audio_base64": audio_base64,
        "bhashini_used": bhashini_used,
        "note": note,
        "lifestyle_advice": lifestyle_advice,
        "doctor_notes": doctor_notes,
        "translation_source": translation_source,
        "image_path": rx_file_path,
        "block_hash": block_hash
    }

@app.post("/upload-document/{user_id}")
async def upload_document(
    user_id: int,
    file: UploadFile = File(...),
    title: str = "Medical Document",
    description: str = "",
    document_type: str = "other",
    db: DBSession = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_doc = MedicalDocument(
        user_id=user_id,
        title=title,
        description=description,
        document_type=document_type,
        file_path=file_path
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Generate cryptographic blockchain block
    block_hash = None
    try:
        block = create_blockchain_block(
            db=db,
            user_id=user_id,
            record_type="medical_document",
            record_id=new_doc.id,
            payload={
                "document_id": new_doc.id,
                "title": title,
                "document_type": document_type,
                "file_path": file_path
            }
        )
        new_doc.block_hash = block.block_hash
        db.commit()
        block_hash = block.block_hash
    except Exception as bc_err:
        print("Blockchain record error:", bc_err)

    return {
        "message": "Document uploaded successfully",
        "document_id": new_doc.id,
        "title": new_doc.title,
        "block_hash": block_hash
    }

@app.get("/prescriptions/{user_id}")
def get_prescriptions(user_id: int, db: DBSession = Depends(get_db)):
    prescriptions = db.query(Prescription).filter(
        Prescription.user_id == user_id
    ).order_by(Prescription.scanned_at.desc()).all()
    return {"prescriptions": [
        {
            "id": p.id,
            "scanned_at": p.scanned_at.strftime("%d %b %Y, %I:%M %p") if p.scanned_at else "Recently",
            "raw_text": p.raw_text,
            "medicines": json.loads(p.medicines_json) if p.medicines_json else [],
            "speech_text": p.speech_text,
            "image_path": getattr(p, "image_path", None),
            "block_hash": p.block_hash
        }
        for p in prescriptions
    ]}

@app.get("/documents/{user_id}")
def get_documents(user_id: int, db: DBSession = Depends(get_db)):
    documents = db.query(MedicalDocument).filter(
        MedicalDocument.user_id == user_id
    ).order_by(MedicalDocument.uploaded_at.desc()).all()
    return {"documents": [
        {
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "document_type": d.document_type,
            "file_path": d.file_path,
            "uploaded_at": d.uploaded_at.strftime("%d %b %Y, %I:%M %p") if d.uploaded_at else "Recently",
            "block_hash": d.block_hash
        }
        for d in documents
    ]}

# --- BLOCKCHAIN SECURITY VAULT ENDPOINTS ---

@app.get("/api/blockchain/records/{user_id}")
def get_blockchain_records(user_id: int, db: DBSession = Depends(get_db)):
    records = get_user_blockchain_records(db, user_id)
    verification = verify_blockchain_integrity(db, user_id)
    return {
        "verified": verification.get("verified", False),
        "message": verification.get("message", ""),
        "total_blocks": len(records),
        "blocks": records
    }

@app.get("/api/blockchain/verify/{user_id}")
def verify_blockchain(user_id: int, db: DBSession = Depends(get_db)):
    return verify_blockchain_integrity(db, user_id)

@app.get("/medicine-info")
def get_medicine_info(medicine: str, language: str = "english", include_audio: bool = True):
    normalized = normalize_medicine_name(medicine)
    description = f"{normalized} is commonly used as prescribed by doctor for health condition management."
    description = localize_prescription_text(description, language)

    audio_base64 = None
    if include_audio:
        try:
            audio_base64 = bhashini_tts(description, lang=language)
        except Exception:
            pass

    return {"description": description, "audio_base64": audio_base64}

@app.post("/identify-tablet")
async def identify_tablet(
    file: UploadFile = File(...),
    language: str = "english",
    include_audio: bool = True,
):
    image_bytes = await file.read()
    if not image_bytes:
        return {"found": False, "medicine": "", "description": "", "note": "Empty file uploaded."}

    res = identify_tablet_image(image_bytes)
    if res.get("found") and res.get("description"):
        res["description"] = localize_prescription_text(res["description"], language)

        speech_text = f"{res.get('medicine')}. {res.get('description')}"
        res["speech_text"] = speech_text

        if include_audio:
            try:
                res["audio_base64"] = bhashini_tts(speech_text, lang=language)
            except Exception as e:
                print("Identify tablet TTS error:", e)

    return res