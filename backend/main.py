from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
import json
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
import asyncio
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

load_dotenv()

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
    audio_b64 = bhashini_tts(req.text, req.language, req.gender)
    return {
        "text": req.text,
        "language": req.language,
        "audio_base64": audio_b64,
        "has_audio": audio_b64 is not None
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

# --- HELPER FUNCTIONS ---

_YOUTUBE_CACHE = {}

def get_youtube_video_for_query(query: str):
    if query in _YOUTUBE_CACHE:
        return _YOUTUBE_CACHE[query]
    search_url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
    try:
        request = Request(search_url, headers={"User-Agent": "Mozilla/5.0"})
        html = urlopen(request, timeout=3).read().decode("utf-8", errors="ignore")
        match = re.search(r'"videoId":"([^"]+)"', html)
        if not match:
            res = {"search_url": search_url}
            _YOUTUBE_CACHE[query] = res
            return res

        video_id = match.group(1)
        res = {
            "title": query.title(),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "embed_url": f"https://www.youtube.com/embed/{video_id}",
            "search_url": search_url,
        }
        _YOUTUBE_CACHE[query] = res
        return res
    except Exception:
        return {"search_url": search_url}


def ensure_clean_completion(text: str) -> str:
    """Ensures LLM output doesn't end with an incomplete hanging sentence or dangling list number."""
    if not text:
        return text
    text = text.strip()

    # Remove dangling list item at the end (e.g. "\n3." or "\n3" or "\n- " or "\n*")
    text = re.sub(r'(\n|\s)+\d+[\.\)]\s*$', '', text).strip()
    text = re.sub(r'(\n|\s)+[-\*•]\s*$', '', text).strip()

    # If trailing punctuation is comma, colon, semicolon, hyphen, strip it
    text = re.sub(r'[,;:\-—]\s*$', '', text).strip()

    # If it already ends with proper sentence punctuation, return it
    if text.endswith(('.', '!', '?', '।')):
        return text

    # If multi-line and the last line is a cut-off fragment, trim back to the last complete sentence
    lines = text.split('\n')
    if len(lines) > 1:
        last_line = lines[-1].strip()
        if not last_line.endswith(('.', '!', '?', '।')):
            prev_lines = [l for l in lines[:-1] if l.strip()]
            if prev_lines and any(prev_lines[-1].strip().endswith(p) for p in ('.', '!', '?', '।')):
                return '\n'.join(lines[:-1]).strip()

    return text + '.'


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
        f"Provide direct, concise, and helpful answers only (around 2 to 3 points). "
        f"Always complete every sentence and close the answer properly with appropriate punctuation. Never leave thoughts, sentences, or numbered lists incomplete. "
        f"ONLY include navigation tags (NAVIGATE:prescription, NAVIGATE:records, NAVIGATE:schemes, NAVIGATE:profile, or NAVIGATE:logout) "
        f"if the user explicitly asks to open, view, or navigate to that section. "
        f"Never include NAVIGATE tags for general healthcare advice, symptoms, or home remedies."
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
                    max_tokens=350,
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

    # Ensure response sentences are cleanly finished and closed
    reply_final = ensure_clean_completion(reply_final)

    # Fallback navigation check if not caught by LLM output
    msg_lower = msg_raw.lower()
    if not navigate_to:
        nav_intent = any(k in msg_lower for k in [
            "open", "go to", "show", "navigate", "view", "ತೆರೆ", "ಹೋಗು", "ತೋರಿಸು", "kholo", "dekho", "chalo"
        ]) or len(msg_lower.split()) <= 2

        if nav_intent:
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
        if navigate_to == "prescription":
            reply_final = "Opening your prescription scanner."
        elif navigate_to == "records":
            reply_final = "Opening your medical records."
        elif navigate_to == "schemes":
            reply_final = "Opening government health schemes."
        elif navigate_to == "profile":
            reply_final = "Opening your profile."
        elif navigate_to == "logout":
            reply_final = "Logging out."
        else:
            reply_final = f"Hello {name}, how can I help you today?"

        if target_lang not in {"en", "english"}:
            try:
                translated_reply = bhashini_translate(reply_final, target_lang=target_lang, source_lang="english")
                if translated_reply:
                    reply_final = translated_reply
            except Exception:
                pass

    # Check for YouTube remedy video intent (multilingual: Kannada, Hindi, English)
    videos = []
    video_search_url = None
    search_query = None

    cough_keywords = [
        "cough", "caugh", "cold", "sore throat", "throat", "ಗಂಟಲು",
        "ಕೆಮ್ಮು", "kemmu", "ನೆಗಡಿ", "negadi", "ಕಫ", "kapha", "khasi", "khansi"
    ]
    fever_keywords = ["fever", "bukhar", "ಜ್ವರ", "jwara", "taap"]
    headache_keywords = ["headache", "head ache", "head pain", "sir dard", "sar dard", "ತಲೆನೋವು", "thale novu", "talenovu"]
    backpain_keywords = ["back pain", "backache", "kamar dard", "ಬೆನ್ನು ನೋವು", "bennu novu"]
    stomach_keywords = ["stomach", "indigestion", "acidity", "pet dard", "ಹೊಟ್ಟೆ ನೋವು", "hotte novu"]

    if any(k in msg_lower for k in headache_keywords):
        search_query = "home remedies for headache"
    elif any(k in msg_lower for k in backpain_keywords):
        search_query = "home remedies for back pain"
    elif any(k in msg_lower for k in fever_keywords):
        search_query = "home remedies for fever"
    elif any(k in msg_lower for k in cough_keywords):
        search_query = "home remedies for cough and cold"
    elif any(k in msg_lower for k in stomach_keywords):
        search_query = "home remedies for stomach pain"

    if search_query:
        # User is seeking symptom advice or remedy video; do not redirect/navigate away
        navigate_to = None

    # Fetch YouTube remedy video and Bhashini TTS concurrently with strict timeouts
    async def _fetch_video():
        if not search_query:
            return []
        lang_search = {"kannada": "ಕನ್ನಡ", "hindi": "hindi", "english": ""}
        lang_suffix = lang_search.get(target_lang, "")
        localized_query = f"{search_query} {lang_suffix}".strip()
        try:
            video_info = await asyncio.wait_for(
                asyncio.to_thread(get_youtube_video_for_query, localized_query),
                timeout=2.2
            )
            return [video_info] if video_info else []
        except Exception:
            return []

    async def _fetch_tts():
        if not is_bhashini_available() or not reply_final:
            return None
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(bhashini_tts, reply_final, target_lang),
                timeout=2.2
            )
        except Exception:
            return None

    videos, audio_base64 = await asyncio.gather(_fetch_video(), _fetch_tts())
    video_search_url = videos[0].get("search_url") if videos else None
    bhashini_used = audio_base64 is not None

    return {
        "reply": reply_final,
        "navigate_to": navigate_to,
        "videos": videos,
        "video_search_url": video_search_url,
        "audio_base64": audio_base64,
        "bhashini_used": bhashini_used
    }


# --- PRESCRIPTION OCR ENDPOINTS ---

@app.post("/scan-prescription/{user_id}")
async def scan_prescription(
    user_id: int,
    file: UploadFile = File(...),
    language: str = "english",
    db: DBSession = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}

    image_bytes = await file.read()
    if not image_bytes:
        return {"error": "Empty file uploaded."}

    # Call Sanjay's multimodal prescription analyzer via ocr module
    try:
        result = analyze_prescription(image_bytes)
        if "error" in result:
            return {"error": result["error"]}
    except Exception as e:
        print("scan_prescription error:", e)
        traceback.print_exc()
        return {"error": "Server error while processing prescription image."}

    raw_text = result.get("raw_text", "")
    medicines = result.get("medicines", [])
    note = result.get("note")

    speech_text = medicines_to_speech(medicines, language)

    # Translate speech_text to target language using Bhashini NMT
    target_lang = (language or "english").lower()
    if target_lang not in {"en", "english"}:
        try:
            translated_speech = bhashini_translate(speech_text, target_lang=target_lang, source_lang="english")
            if translated_speech:
                speech_text = translated_speech
        except Exception as e:
            print("Scan prescription Bhashini translate error:", e)

    audio_base64 = None
    bhashini_used = False
    if is_bhashini_available():
        try:
            audio_base64 = bhashini_tts(speech_text, lang=target_lang)
            bhashini_used = True
        except Exception as e:
            print("Scan prescription Bhashini TTS error:", e)

    # Save prescription image file to uploads
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

    return {
        "prescription_id": prescription_id,
        "raw_text": raw_text,
        "medicines": medicines,
        "speech_text": speech_text,
        "audio_base64": audio_base64,
        "bhashini_used": bhashini_used,
        "note": note,
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

    # Compute binary SHA-256 checksum of the uploaded file/PDF
    with open(file_path, "rb") as f:
        file_sha256 = hashlib.sha256(f.read()).hexdigest()

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
                "file_path": file_path,
                "file_sha256": file_sha256
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
        "verified": verification.get("is_valid", verification.get("verified", False)),
        "message": verification.get("message", ""),
        "total_blocks": len(records),
        "blocks": records
    }

@app.get("/api/blockchain/verify/{user_id}")
def verify_blockchain(user_id: int, db: DBSession = Depends(get_db)):
    verification = verify_blockchain_integrity(db, user_id)
    verification["verified"] = verification.get("is_valid", verification.get("verified", False))
    return verification

@app.get("/medicine-info")
async def get_medicine_info(medicine: str, language: str = "english"):
    normalized = normalize_medicine_name(medicine)
    description = f"{normalized} is commonly used as prescribed by doctor for health condition management."
    
    target_lang = (language or "english").lower()
    if target_lang not in {"en", "english"}:
        try:
            translated_desc = bhashini_translate(description, target_lang=target_lang, source_lang="english")
            if translated_desc:
                description = translated_desc
        except Exception:
            pass

    audio_base64 = None
    if is_bhashini_available():
        try:
            audio_base64 = bhashini_tts(description, lang=target_lang)
        except Exception:
            pass

    return {"description": description, "audio_base64": audio_base64}

@app.post("/identify-tablet")
async def identify_tablet(
    file: UploadFile = File(...),
    language: str = "english"
):
    image_bytes = await file.read()
    if not image_bytes:
        return {"found": False, "medicine": "", "description": "", "note": "Empty file uploaded."}

    res = identify_tablet_image(image_bytes)
    if res.get("found") and res.get("description"):
        target_lang = (language or "english").lower()
        original_desc = res["description"]
        if target_lang not in {"en", "english"}:
            try:
                translated_desc = bhashini_translate(original_desc, target_lang=target_lang, source_lang="english")
                if translated_desc:
                    res["description"] = translated_desc
            except Exception as e:
                print("Identify tablet Bhashini translate error:", e)

        speech_text = f"{res.get('medicine')}. {res.get('description')}"
        res["speech_text"] = speech_text

        if is_bhashini_available():
            try:
                res["audio_base64"] = bhashini_tts(speech_text, lang=target_lang)
            except Exception as e:
                print("Identify tablet Bhashini TTS error:", e)

    return res