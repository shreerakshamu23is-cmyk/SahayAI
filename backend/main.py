from fastapi import FastAPI, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session as DBSession
from groq import Groq
from modules.ocr import extract_text_from_image, extract_medicines_with_ai, medicines_to_speech, is_non_tablet_prescription
import os
import re
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from database import engine, SessionLocal, Base
from modules.face_auth import User, Prescription, MedicalDocument
import shutil
import uuid
from modules.face_service import encode_face_from_bytes, encoding_to_bytes, compare_faces

load_dotenv()

Base.metadata.create_all(bind=engine)


def get_home_remedy_response(message: str, language: str = "english"):
    text = message.lower()
    lang = (language or "english").lower()

    if any(keyword in text for keyword in ["headache", "head ache", "head pain", "sir dard", "sir pain"]):
        if lang in {"hi", "hindi"}:
            return (
                "मild headache के लिए पानी पिएं, आराम करें और सिर पर ठंडा कपड़ा रखें। अगर दर्द बहुत तेज हो या लगातार रहे, तो डॉक्टर से मिलें। "
                "होम रेमेडी देखें: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"kn", "kannada"}:
            return (
                "ಸಣ್ಣ ತಲೆನೋವಿಗೆ पानी ಕುಡಿಯಿರಿ, ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ ಮತ್ತು ತಲೆಯ ಮೇಲೆ ತಣ್ಣನೆಯ ಬಟ್ಟೆ ಇಡಿರಿ। ನೋವು ಕಠಿಣವಾಗಿದ್ದರೆ ಅಥವಾ ಮುಂದುವರಿದರೆ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ. "
                "ಹೋಮ್ ರೇಮಿಡೀಸ್ ನೋಡೋಣ: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"ta", "tamil"}:
            return (
                "லேசான தலைவலிக்கு தண்ணீர் குடியுங்கள், ஓய்வெடுங்கள் மற்றும் தலையில் குளிர்ந்த துணியை வையுங்கள். வலி கடுமையாக இருந்தால் அல்லது தொடர்ந்தால் மருத்துவரை அணுகவும். "
                "வீட்டு வைத்தியங்களை பார்க்கவும்: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"te", "telugu"}:
            return (
                "లేత తలనొప్పికి నీరు త్రాగండి, విశ్రాంతి తీసుకోండి మరియు తలపై చల్లని cloth పెట్టండి. నొప్పి తీవ్రంగా ఉంటే లేదా కొనసాగితే డాక్టర్ కలవండి. "
                "హోమ్ రిమిడీస్ చూడండి: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"mr", "marathi"}:
            return (
                "लहान डोकेदुखीसाठी पाणी प्या, विश्रांती घ्या आणि डोक्यावर थंड कपडा ठेवा. वेदना तीव्र झाल्यास किंवा चालू राहिल्यास डॉक्टरांना भेटा. "
                "हোম रेमेडीज पाहा: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"bn", "bengali"}:
            return (
                "হালকা মাথাব্যথার জন্য পানি পান করুন, বিশ্রাম নিন এবং forehead-এ ঠান্ডা কাপড় রাখুন। ব্যথা তীব্র হলে বা দীর্ঘস্থায়ী হলে চিকিৎসকের পরামর্শ নিন। "
                "হোম রিমিডি দেখুন: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"gu", "gujarati"}:
            return (
                "હળવી માથા દુખીને માટે પાણી પીઓ, આરામ કરો અને માથા પર ઠંડું કપડું મૂકો. દુખો તીવ્ર હોય અથવા ચાલુ રહે તો ડૉક્ટરને બતાવો. "
                "હોમ રેમિડીઝ જુઓ: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        if lang in {"pa", "punjabi"}:
            return (
                "ਹਲਕੇ ਸਿਰਦੌਰ ਲਈ ਪਾਣੀ ਪਿਓ, ਆਰਾਮ ਕਰੋ ਅਤੇ ਸਿਰ ਤੇ ਠੰਡਾ ਕੱਪੜਾ ਰੱਖੋ। ਦਰਦ ਬਹੁਤ ਤੇਜ਼ ਹੋਵੇ ਜਾਂ ਜਾਰੀ ਰਹੇ ਤਾਂ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ। "
                "ਹੋਮ ਰੈਮਿਡੀਜ਼ ਵੇਖੋ: https://www.youtube.com/results?search_query=home+remedies+for+headache"
            )
        return (
            "For a mild headache, try drinking water, resting, and placing a cool cloth on your forehead. If it is severe or keeps coming back, please consult a doctor. "
            "You can check home remedies here: https://www.youtube.com/results?search_query=home+remedies+for+headache"
        )

    if any(keyword in text for keyword in ["back pain", "backpain", "backache", "lower back pain", "pain in back"]):
        if lang in {"hi", "hindi"}:
            return (
                "कमर दर्द के लिए हल्का आराम करें, गर्म पानी की बोतल या गर्म कपड़ा लगाएं और धीरे-धीरे 이동 करें। अगर दर्द बहुत तेज हो या चलने में मुश्किल हो, तो डॉक्टर से मिलें। "
                "होम रेमेडी देखें: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        if lang in {"kn", "kannada"}:
            return (
                "ಕಾಲಿನ/ಮೆದುಳಿನ ಬೆನ್ನಿನ ನೋವಿಗೆ ಹಗುರವಾದ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ, ಬೆನ್ನಿಗೆ उष್ಣ ಕಚ್ಚಾ ರ disparate?"
            )
        if lang in {"ta", "tamil"}:
            return (
                "முதுகுவலிக்கு லேசான ஓய்வு பெறுங்கள், சூடான நீர் பாட்டில் அல்லது சூடான துணியை வையுங்கள், மெதுவாக நகருங்கள். வலி கடுமையாக இருந்தால் மருத்துவரை அணுகவும். "
                "வீட்டு வைத்தியங்களை பார்க்கவும்: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        if lang in {"te", "telugu"}:
            return (
                "వెనుక నొప్పికి हल्का విశ్రాంతి తీసుకోండి, వేడినీటి బాటిల్ లేదా వేడిగడ్డలను వుంచండి మరియు నెమ్మదిగా కదలండి. నొప్పి తీవ్రంగా ఉంటే డాక్టర్‌ను సంప్రదించండి. "
                "హోమ్ రిమిడీస్ చూడండి: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        if lang in {"mr", "marathi"}:
            return (
                "मागील वरील/खालील दुख्यासाठी हलका आराम करा, गरम पाण्याची बाटली किंवा गरम कपडा लावा आणि हळू हळू हालचाल करा. वेदना तीव्र झाल्यास डॉक्टरांना भेटा. "
                "हোম रेमेडीज पाहा: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        if lang in {"bn", "bengali"}:
            return (
                "পিঠে ব্যথার জন্য হালকা বিশ্রাম নিন, গরম পানি ভর্তি বোতল বা গরম কাপড় দিন এবং ধীরে ধীরে চলাফেরা করুন। ব্যথা তীব্র হলে চিকিৎসকের পরামর্শ নিন। "
                "হোম রিমিডি দেখুন: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        if lang in {"gu", "gujarati"}:
            return (
                "પીઠનો દુખો માટે હળવા આરામ કરો, ગરમ પાણીની બોટલ અથવા ગરમ કપડા વાપરો અને હળવેથી આગળ-પાછળ હિલો. દુખો તીવ્ર હોય તો ડૉક્ટરને બતાવો. "
                "હોમ રેમિડીઝ જુઓ: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        if lang in {"pa", "punjabi"}:
            return (
                "ਪਿੱਠ ਦਰਦ ਲਈ ਹਲਕਾ ਆਰਾਮ ਕਰੋ, ਗਰਮ ਪਾਣੀ ਦੀ ਬੋਟਲ ਜਾਂ ਗਰਮ ਕੱਪੜਾ ਲਗਾਓ ਅਤੇ ਹਲਕਾ-ਭਰਾ ਹਿਲੋ। ਦਰਦ ਬਹੁਤ ਤੇਜ਼ ਹੋਵੇ ਤਾਂ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ। "
                "ਹੋਮ ਰੈਮਿਡੀਜ਼ ਵੇਖੋ: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
            )
        return (
            "For back pain, try light rest, a warm water bottle or warm cloth on the area, and gentle movement. If it is severe or you cannot move well, please consult a doctor. "
            "You can check home remedies here: https://www.youtube.com/results?search_query=home+remedies+for+back+pain"
        )

    return None


def get_home_remedy_response_v2(message: str, language: str = "english"):
    text = message.lower()
    lang = (language or "english").lower()

    if any(keyword in text for keyword in ["headache", "head ache", "head pain", "sir dard", "sir pain"]):
        if lang in {"hi", "hindi"}:
            return {
                "reply": "मild headache के लिए पानी पिएं, आराम करें और सिर पर ठंडा कपड़ा रखें। अगर दर्द बहुत तेज हो या लगातार रहे, तो डॉक्टर से मिलें।",
                "search_query": "home remedies for headache"
            }
        if lang in {"kn", "kannada"}:
            return {
                "reply": "ಸಣ್ಣ ತಲೆನೋವಿಗೆ পানি ಕುಡಿಯಿರಿ, ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ ಮತ್ತು ತಲೆಯ ಮೇಲೆ ತಣ್ಣನೆಯ ಬಟ್ಟೆ ಇಡಿರಿ. ನೋವು ಕಠಿಣವಾಗಿದ್ದರೆ ಅಥವಾ ಮುಂದುವರಿದರೆ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.",
                "search_query": "home remedies for headache"
            }
        if lang in {"ta", "tamil"}:
            return {
                "reply": "லேசான தலைவலிக்கு தண்ணீர் குடியுங்கள், ஓய்வெடுங்கள் மற்றும் தலையில் குளிர்ந்த துணியை வையுங்கள். வலி கடுமையாக இருந்தால் அல்லது தொடர்ந்தால் மருத்துவரை அணுகவும்.",
                "search_query": "home remedies for headache"
            }
        if lang in {"te", "telugu"}:
            return {
                "reply": "లేత తలనొప్పికి నీరు త్రాగండి, విశ్రాంతి తీసుకోండి మరియు తలపై చల్లని బట్ట పెట్టండి. నొప్పి తీవ్రంగా ఉంటే లేదా కొనసాగితే డాక్టర్ కలవండి.",
                "search_query": "home remedies for headache"
            }
        if lang in {"mr", "marathi"}:
            return {
                "reply": "लहान डोकेदुखीसाठी पाणी प्या, विश्रांती घ्या आणि डोक्यावर थंड कपडा ठेवा. वेदना तीव्र झाल्यास किंवा चालू राहिल्यास डॉक्टरांना भेटा.",
                "search_query": "home remedies for headache"
            }
        if lang in {"bn", "bengali"}:
            return {
                "reply": "হালকা মাথাব্যথার জন্য পানি পান করুন, বিশ্রাম নিন এবং কপালে ঠান্ডা কাপড় রাখুন। ব্যথা তীব্র হলে ডাক্তারের পরামর্শ নিন.",
                "search_query": "home remedies for headache"
            }
        if lang in {"gu", "gujarati"}:
            return {
                "reply": "હળવી માથા દુખીને માટે પાણી પીઓ, આરામ કરો અને માથા પર ઠંડું કપડું મૂકો. દુખો વધારેમાં વધે તો ડૉક્ટરને જુઓ.",
                "search_query": "home remedies for headache"
            }
        if lang in {"pa", "punjabi"}:
            return {
                "reply": "ਹਲਕੇ ਸਿਰਦਰਦ ਲਈ ਪਾਣੀ ਪੀਓ, ਆਰਾਮ ਕਰੋ ਅਤੇ ਸਿਰ ਤੇ ਠੰਡਾ ਕੱਪੜਾ ਰੱਖੋ। ਦਰਦ ਵੱਧੇ ਤਾਂ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ.",
                "search_query": "home remedies for headache"
            }
        return {
            "reply": "For a mild headache, try drinking water, resting, and placing a cool cloth on your forehead. If it is severe or keeps coming back, please consult a doctor.",
            "search_query": "home remedies for headache"
        }

    if any(keyword in text for keyword in ["back pain", "backpain", "backache", "lower back pain", "pain in back"]):
        if lang in {"hi", "hindi"}:
            return {
                "reply": "कमर दर्द के लिए हल्का आराम करें, गर्म पानी की बोतल या गर्म कपड़ा लगाएं और धीरे-धीरे चलें। अगर दर्द बहुत तेज हो या चलने में मुश्किल हो, तो डॉक्टर से मिलें।",
                "search_query": "home remedies for back pain"
            }
        if lang in {"kn", "kannada"}:
            return {
                "reply": "ಬೆನ್ನಿನ ನೋವಿಗೆ ಹಗುರವಾದ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ, ಬೆನ್ನಿಗೆ ಬಿಸಿ ನೀರಿನ ಬಾಟಲ್ ಅಥವಾ ಬಿಸಿಯಾದ ಬಟ್ಟೆ ಇಡಿ, ಮತ್ತು ನಿಧಾನವಾಗಿ ಚಲಿಸಿ. ನೋವು ತೀವ್ರವಾಗಿದ್ದರೆ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                "search_query": "home remedies for back pain"
            }
        if lang in {"ta", "tamil"}:
            return {
                "reply": "முதுகுவலிக்கு லேசான ஓய்வு பெறுங்கள், சூடான நீர் பாட்டில் அல்லது சூடான துணியை வையுங்கள், மெதுவாக நகருங்கள். வலி கடுமையாக இருந்தால் மருத்துவரை அணுகவும்.",
                "search_query": "home remedies for back pain"
            }
        if lang in {"te", "telugu"}:
            return {
                "reply": "వెనుక నొప్పికి ఆరాధ్యమైన విశ్రాంతి తీసుకోండి, వేడినీటి బాటిల్ లేదా వేడిగడ్డ ఉంచండి మరియు నెమ్మదిగా కదలండి. నొప్పి తీవ్రంగా ఉంటే డాక్టర్‌ను సంప్రదించండి.",
                "search_query": "home remedies for back pain"
            }
        if lang in {"mr", "marathi"}:
            return {
                "reply": "मागील दुख्यांसाठी हलका आराम करा, गरम पाण्याची बाटली किंवा गरम कपडा लावा आणि हळू हळू हालचाल करा. वेदना तीव्र झाल्यास डॉक्टरांना भेटा.",
                "search_query": "home remedies for back pain"
            }
        if lang in {"bn", "bengali"}:
            return {
                "reply": "পিঠে ব্যথার জন্য হালকা বিশ্রাম নিন, গরম পানি ভর্তি বোতল বা গরম কাপড় দিন এবং ধীরে ধীরে চলাফেরা করুন। ব্যথা তীব্র হলে চিকিৎসকের পরামর্শ নিন.",
                "search_query": "home remedies for back pain"
            }
        if lang in {"gu", "gujarati"}:
            return {
                "reply": "પીઠના દુઃખાવા માટે હળવો આરામ કરો, ગરમ પાણીની બોટલ અથવા ગરમ કપડા વાપરો અને ધીમેથી હલાવો. દુઃખાવો વધારે હોય તો ડૉક્ટરને બતાવો.",
                "search_query": "home remedies for back pain"
            }
        if lang in {"pa", "punjabi"}:
            return {
                "reply": "ਪਿੱਠ ਦਰਦ ਲਈ ਹਲਕਾ ਆਰਾਮ ਕਰੋ, ਗਰਮ ਪਾਣੀ ਦੀ ਬੋਤਲ ਜਾਂ ਗਰਮ ਕੱਪੜਾ ਲਗਾਓ ਅਤੇ ਹੌਲੀ-ਹੌਲੀ ਹਿਲੋ। ਦਰਦ ਬਹੁਤ ਤੇਜ਼ ਹੋਵੇ ਤਾਂ ਡਾਕਟਰ ਨੂੰ ਮਿਲੋ.",
                "search_query": "home remedies for back pain"
            }
        return {
            "reply": "For back pain, try light rest, a warm water bottle or warm cloth on the area, and gentle movement. If it is severe or you cannot move well, please consult a doctor.",
            "search_query": "home remedies for back pain"
        }

    return None


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
    remedy_result = get_home_remedy_response_v2(message, language)
    if remedy_result:
        lang_search = {
            "kannada": "ಕನ್ನಡ",
            "hindi": "hindi",
            "tamil": "tamil",
            "telugu": "telugu",
            "marathi": "marathi",
            "bengali": "bengali",
            "gujarati": "gujarati",
            "punjabi": "punjabi",
            "english": ""
        }
        lang_suffix = lang_search.get(language, "")
        localized_query = f"{remedy_result['search_query']} {lang_suffix}".strip()
        video_info = get_youtube_video_for_query(localized_query)
        return {
            "reply": remedy_result["reply"],
            "navigate_to": None,
            "videos": [video_info] if video_info else [],
            "video_search_url": video_info.get("search_url")
        }

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    health_check_prompt = f"""The user said: "{message}"

Is this message about a health problem, illness, pain, symptom, or medical condition?
If YES, respond with JSON only:
{{"is_health": true, "condition": "the health condition in English", "search_query": "home remedies for [condition]"}}

If NO (general conversation, navigation request, greeting etc), respond with JSON only:
{{"is_health": false}}

Respond ONLY with JSON. No explanation."""

    health_check = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": health_check_prompt}],
        max_tokens=100,
        temperature=0
    )

    import json as json_lib
    try:
        health_data_raw = health_check.choices[0].message.content.strip()
        health_data_raw = health_data_raw.replace("```json","").replace("```","").strip()
        health_data = json_lib.loads(health_data_raw)
    except Exception:
        health_data = {"is_health": False}

    if health_data.get("is_health"):
        condition = health_data.get("condition", "health issue")
        search_query = health_data.get("search_query", f"home remedies for {condition}")

        remedy_prompt = f"""The user {name} who speaks {language} said: "{message}"
They seem to have: {condition}

Give a helpful home remedy response in {language} language.
Rules:
1. Be warm and caring
2. Give 2-3 simple home remedy suggestions
3. Always end with: "If it gets worse, please see a doctor"
4. Keep it SHORT — max 3 sentences
5. Use simple words a non-literate rural person can understand
6. Write in {language} language

Reply now:"""

        remedy_response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": remedy_prompt}],
            max_tokens=200,
            temperature=0.3
        )

        remedy_reply = remedy_response.choices[0].message.content.strip()
        lang_search = {
            "kannada": "ಕನ್ನಡ",
            "hindi": "hindi",
            "tamil": "tamil",
            "telugu": "telugu",
            "marathi": "marathi",
            "bengali": "bengali",
            "gujarati": "gujarati",
            "punjabi": "punjabi",
            "english": ""
        }
        lang_suffix = lang_search.get(language, "")
        localized_query = f"{search_query} {lang_suffix}".strip()
        video_info = get_youtube_video_for_query(localized_query)

        return {
            "reply": remedy_reply,
            "navigate_to": None,
            "videos": [video_info] if video_info else [],
            "video_search_url": video_info.get("search_url") if video_info else None
        }

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
        "navigate_to": navigate_to,
        "videos": [],
        "video_search_url": None
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
    note = None
    medicines = []

    if is_non_tablet_prescription(raw_text):
        note = "This prescription looks like IV/fluids/ORS instructions, not tablet medicines."
    else:
        medicines = extract_medicines_with_ai(raw_text, groq_client) or []
        if not medicines:
            note = "No tablet medicines found. Please verify your prescription."

    speech_text = medicines_to_speech(medicines, language)

    return {
        "raw_text": raw_text,
        "medicines": medicines,
        "speech_text": speech_text,
        "note": note
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

@app.get("/medicine-info")
async def get_medicine_info(medicine: str, language: str = "english"):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    prompt = f"""You are a careful medical assistant.
You are given a medicine name exactly as extracted from a prescription.
If the medicine is known, explain what it is used for in one simple sentence.
If the medicine is not known or you are not sure, respond only with: Unknown medicine.
Write in {language} language. Keep it very simple for a non-literate rural person to understand when read aloud.
Do not include any medical jargon. Max 15 words."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=50,
        temperature=0
    )

    description = response.choices[0].message.content.strip()
    if "unknown" in description.lower():
        description = ""

    return {"description": description}
@app.post("/identify-tablet")
async def identify_tablet(file: UploadFile = File(...)):
    import base64
    image_bytes = await file.read()
    image_b64 = base64.b64encode(image_bytes).decode()

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    ocr_text = extract_text_from_image(image_bytes)
    if ocr_text:
        ocr_text = ocr_text.replace("\n", " ").strip()

    prompt_text = """Look at this medicine/tablet image and the extracted text from it.
If the medicine name is visible on the packaging or tablet, identify it.
If the extracted text contains the medicine name, use that.
Return JSON only: {"medicine": "name", "description": "what it is used for in simple words", "found": true/false}"""

    if ocr_text:
        prompt_text += f"\n\nOCR text: {ocr_text}"

    try:
        if not ocr_text:
            return {"error": "Could not read any tablet text from the image. Please try a clearer photo or enter the medicine name manually."}

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "user",
                "content": prompt_text
            }],
            max_tokens=150,
            temperature=0
        )

        import json
        result = response.choices[0].message.content.strip()
        result = result.replace("```json", "").replace("```", "").strip()
        return json.loads(result)
    except Exception as e:
        import traceback
        print("Tablet identify error:", e)
        traceback.print_exc()
        return {
            "error": f"Tablet identification failed on the server: {e}",
            "debug": traceback.format_exc()
        }
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