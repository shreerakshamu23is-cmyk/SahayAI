from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session as DBSession
from groq import Groq
from modules.ocr import extract_text_from_image, extract_medicines_with_ai, medicines_to_speech
import os

from database import engine, SessionLocal, Base
from modules.face_auth import User, Prescription, MedicalDocument
import shutil
import uuid
from modules.face_service import encode_face_from_bytes, encoding_to_bytes, compare_faces

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI()

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
    app_name = os.getenv("APP_NAME")
    return {"message": f"{app_name} backend is alive!"}

@app.post("/register")
def register_user(name: str, phone: str, language: str, db: DBSession = Depends(get_db)):
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        return {"error": "Phone number already registered"}
    new_user = User(name=name, phone=phone, language=language)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "message": f"Welcome to SahayAI, {name}!",
        "user_id": new_user.id,
        "language": new_user.language
    }
@app.post("/register-face/{user_id}")
async def register_face(user_id: int, file: UploadFile = File(...), db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
    
    image_bytes = await file.read()
    encoding = encode_face_from_bytes(image_bytes)
    
    if encoding is None:
        return {"error": "No face detected. Please try again."}
    
    existing_users = db.query(User).filter(
        User.face_encoding != None,
        User.id != user_id
    ).all()
    
    for existing in existing_users:
        match, confidence = compare_faces(
            existing.face_encoding, encoding
        )
        if match:
            return {
                "error": f"This face is already registered under another account. Confidence: {confidence}%"
            }
    
    user.face_encoding = encoding_to_bytes(encoding)
    db.commit()
    
    return {"message": f"Face registered for {user.name}!"}

@app.post("/login-face")
async def login_face(file: UploadFile = File(...), db: DBSession = Depends(get_db)):
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
@app.post("/voice-assistant")
async def voice_assistant(
    message: str,
    language: str,
    name: str
):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    system_prompt = f"""You are SahayAI, a helpful health companion 
for rural users in India. You are talking to {name} who speaks {language}.

Rules:
1. Reply in simple, warm, friendly language
2. If user speaks in {language}, reply in {language}
3. Keep replies SHORT — max 2 sentences
4. Never use medical jargon
5. Always be encouraging and warm

NAVIGATION RULES — only add these if user CLEARLY asks:
- User asks about medicine/prescription/tablet/dawai → add NAVIGATE:prescription
- User asks about medical records/reports/history → add NAVIGATE:records  
- User asks about their profile/account/details → add NAVIGATE:profile
- User says bye/logout/exit → add NAVIGATE:logout
- General conversation like hello/how are you/what did you eat → NO navigation

IMPORTANT: "khana" means food, NOT medical records. Only navigate if medical intent is clear.

User said: {message}"""

    response = client.chat.completions.create(
      model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ],
        max_tokens=150
    )

    reply = response.choices[0].message.content.strip()

    navigate_to = None
    if "NAVIGATE:prescription" in reply:
        navigate_to = "prescription"
        reply = reply.replace("NAVIGATE:prescription", "").strip()
    elif "NAVIGATE:records" in reply:
        navigate_to = "records"
        reply = reply.replace("NAVIGATE:records", "").strip()
    elif "NAVIGATE:profile" in reply:
        navigate_to = "profile"
        reply = reply.replace("NAVIGATE:profile", "").strip()
    elif "NAVIGATE:logout" in reply:
        navigate_to = "logout"
        reply = reply.replace("NAVIGATE:logout", "").strip()

    return {
        "reply": reply,
        "navigate_to": navigate_to
    }
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
    raw_text = extract_text_from_image(image_bytes)

    if not raw_text:
        return {"error": "Could not read text from image. Please try a clearer photo."}

    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    medicines = extract_medicines_with_ai(raw_text, groq_client)
    speech_text = medicines_to_speech(medicines, language)

    return {
        "raw_text": raw_text,
        "medicines": medicines,
        "speech_text": speech_text
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

    return {
        "message": "Document uploaded successfully",
        "document_id": new_doc.id,
        "title": new_doc.title
    }

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
            "uploaded_at": d.uploaded_at.strftime("%d %b %Y, %I:%M %p")
        }
        for d in documents
    ]}