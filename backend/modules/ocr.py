import io
import os
import sys
import json
import logging
import time
import difflib
import re
from typing import List, Optional, Dict, Any

from PIL import Image
from pydantic import BaseModel, Field
import pytesseract
import cv2
import numpy as np

# Cache client instances to avoid repeated connection setups
_client_cache = {}

def get_genai_client(api_key: str):
    if api_key not in _client_cache:
        from google import genai
        _client_cache[api_key] = genai.Client(api_key=api_key)
    return _client_cache[api_key]

# Setup logger
logger = logging.getLogger("ocr_module")

# --- Pydantic Data Models (Sanjay's Prescription Reader Schema) ---

class MedicineItem(BaseModel):
    name: str = Field(
        ...,
        description="Brand or generic name of the medicine (e.g. 'Metformin', 'Glimepiride', 'Telmisartan', 'Atorvastatin', 'Ecosprin AV')."
    )
    dosage: str = Field(
        ...,
        description="Dose amount and formulation (e.g. '500 mg tablet', '75 mg capsule/tablet'). Never leave blank."
    )
    frequency: str = Field(
        ...,
        description="Daily timing schedule in plain English. CRITICAL: Interpret shorthand notation precisely: '1-0-1' is 'Twice daily (Morning & Evening)', '0-0-1' is 'Once daily at night' (NIGHT ONLY, never morning!), '1-0-0' is 'Once daily in morning', '0-1-0' is 'Once daily in afternoon', '1-1-1' is 'Three times daily (Morning, Afternoon & Night)'."
    )
    duration: str = Field(
        ...,
        description="Duration of treatment (e.g. '30 days', '7 days'). Never leave blank."
    )
    instructions: str = Field(
        ...,
        description="Exact handwritten timing and meal instructions written on the prescription (e.g. 'After food', 'At night', 'Before food', 'With meals'). Do not use generic boilerplate text if handwritten instructions exist."
    )


class PrescriptionAnalysis(BaseModel):
    is_prescription: bool = Field(
        default=True,
        description="Set to true if the uploaded photo is a valid doctor's prescription, pharmacy bill, or medical treatment slip containing medications. Set to false if the photo is NOT a medical prescription or medicine bill (e.g., photo of a vehicle, animal, food, scenery, selfie, non-medical document, or random object)."
    )
    summary: str = Field(
        ...,
        description="A plain-language, non-medical one-paragraph summary of what the prescription contains, what it is prescribed for, and how the patient should take them."
    )
    medicines: List[MedicineItem] = Field(
        default_factory=list,
        description="List of identified medications and their detailed schedules"
    )
    lifestyle_advice: Optional[str] = Field(
        default="",
        description="Handwritten diet, exercise, and lifestyle recommendations on the prescription (e.g. 'Diet: Low salt, Low Sugar', 'Exercise: 30 min daily'). Leave empty if none."
    )
    doctor_notes: Optional[str] = Field(
        default="",
        description="Additional doctor advice or follow-up instructions (e.g. 'Advice: Regular BP & Sugar checkup', 'Follow up after 1 month'). Leave empty if none."
    )
    disclaimer: str = Field(
        default="This is an AI-assisted reading aid, not medical advice. Always confirm your prescription with your doctor or pharmacist before taking any medication.",
        description="Mandatory patient safety disclaimer"
    )


PRESCRIPTION_PROMPT = """
You are an expert clinical pharmacist and advanced medical transcription specialist.
Analyze this image (handwritten prescription, printed medical slip, or pharmacy bill).

IMAGE VALIDATION (IMPORTANT):
1. Check if the uploaded image is actually a doctor's prescription, pharmacy invoice/bill, or medical treatment document containing medications.
2. If the photo is NOT a medical prescription or medicine bill (e.g. photo of a car, animal, person/selfie, food, landscape, non-medical receipt, or random object), set 'is_prescription': false, leave 'medicines' empty, and provide a polite warning summary: "This photo does not appear to be a medical prescription or medicine bill. Please upload a clear photo of a valid doctor's prescription."

TIMING & DOSAGE RULES (CRITICAL):
- If dosage schedule, timing, or frequency IS NOT written on the document (for example, on a pharmacy purchase bill or invoice where only item names and quantities are listed), DO NOT make up or guess arbitrary times like Morning or Night!
  In this case, set frequency to "Take as per doctor's suggestion" and instructions to "Take medicine as per doctor's suggestion / prescription".
- If medical timing notation IS written:
  - '1-0-1' means Morning (1 tab) and Evening/Night (1 tab) -> frequency: "Twice daily (Morning & Evening)".
  - '0-0-1' means NIGHT ONLY (0 morning, 0 afternoon, 1 night/bedtime) -> frequency: "Once daily at night". NEVER classify '0-0-1' as Morning!
  - '1-0-0' means MORNING ONLY -> frequency: "Once daily in morning".
  - '0-1-0' means AFTERNOON ONLY -> frequency: "Once daily in afternoon".
  - '1-1-1' means Three times daily (Morning, Afternoon & Night).

CRITICAL INSTRUCTIONS:
1. INTELLIGENT CLINICAL ANALYSIS:
   - Decipher all medicine brand or generic names carefully (e.g. "Acetech-P", "Montnac LC", "Strength Me L Plus", "Metformin").
   - Extract strength/dosage if present. If timing is missing, set frequency/instructions to "Take as per doctor's suggestion".

2. FOR EACH PRESCRIBED / BILLED MEDICATION, EXTRACT:
   - name: Brand or generic name.
   - dosage: Strength & form if visible (e.g. "Tablet").
   - frequency: Exact schedule if written. If NOT written, set to "Take as per doctor's suggestion".
   - duration: Duration if written. If NOT written, set to "As per doctor's advice".
   - instructions: Meal & timing directions if written. If NOT written, set to "Take medicine as per doctor's suggestion".

3. LIFESTYLE & FOLLOW-UP ADVICE:
   - Extract any Diet, Exercise, Advice, or Follow Up notes if present. Put these into 'lifestyle_advice' and 'doctor_notes'.

4. STRUCTURED OUTPUT:
   - Return strictly valid JSON adhering to the specified schema with 'is_prescription', 'summary', 'medicines', 'lifestyle_advice', 'doctor_notes', and 'disclaimer'.
"""


class TabletIdentification(BaseModel):
    found: bool = Field(..., description="True if a medicine brand or generic name can be identified in the image, False otherwise.")
    medicine: str = Field(..., description="Exact brand or generic name of the medicine (e.g. 'Zincovit', 'Dolo 650', 'Amoxicillin'). Keep it short and clean (just the drug/supplement name).")
    description: str = Field(..., description="Concise 1-2 sentence patient-friendly explanation of what this medicine/supplement is used for.")


TABLET_PROMPT = """
You are an expert clinical pharmacist and medical packaging analyst.
Examine this medicine photo (tablet strip, packaging box, bottle, or container).

CRITICAL INSTRUCTIONS:
1. IDENTIFY MEDICINE NAME:
   - Identify the primary brand name or generic medicine/supplement name (e.g., "Zincovit", "Dolo 650", "Pantocid 40", "Crocin", "Betaloc").
   - Keep the 'medicine' field clean and concise — ONLY the brand or drug name itself (e.g., "Zincovit" or "Amoxicillin 500mg"). Do NOT include the whole ingredient table or noisy text.
2. DESCRIPTION:
   - Provide a clear, patient-friendly 1-2 sentence description explaining what the medicine/supplement is used for and its main health benefit (e.g., "Zincovit is a multivitamin and multimineral supplement with Grape Seed Extract, used to boost immunity, support energy levels, and overcome nutritional deficiencies.").
3. OUTPUT FORMAT:
   - Return strictly valid JSON adhering to the specified schema with 'found', 'medicine', and 'description'.
   - If no medicine packaging or name can be identified, set 'found': false, 'medicine': '', 'description': ''.
"""


def prepare_prescription_image(image_bytes: bytes) -> tuple[bytes, str]:
    """
    Fast image validation & preprocessing based on Sanjay's implementation.
    Verifies file integrity, handles color modes (RGB/RGBA/P/CMYK),
    and optimizes resolution to max 1600px for accurate handwriting deciphering.
    """
    with Image.open(io.BytesIO(image_bytes)) as pil_img:
        if pil_img.width > 1600 or pil_img.height > 1600:
            pil_img.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=85, optimize=True)
        return buf.getvalue(), "image/jpeg"


def analyze_prescription(image_bytes: bytes) -> Dict[str, Any]:
    """
    Primary prescription reading entry point.
    Uses Sanjay's Gemini Multimodal Vision implementation.
    Falls back to Tesseract / local heuristics if GEMINI_API_KEY is not set or fails.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    
    if api_key:
        try:
            return analyze_prescription_with_gemini(image_bytes, api_key)
        except Exception as e:
            logger.warning(f"Gemini prescription analysis failed, using fallback: {e}")

    # Fallback to local OCR pipeline if Gemini fails or API key is not configured
    raw_text = extract_text_from_image(image_bytes)
    if not raw_text:
        return {"error": "Could not read text from image. Please try a clearer photo."}

    if is_non_tablet_prescription(raw_text):
        return {
            "raw_text": raw_text,
            "medicines": [],
            "note": "This prescription looks like IV/fluids/ORS instructions, not tablet medicines."
        }

    medicines = extract_medicines_locally(raw_text) or []
    note = "Parsed using local medical OCR engine." if medicines else "No tablet medicines found. Please verify your prescription photo."
    return {
        "raw_text": raw_text,
        "medicines": medicines,
        "note": note
    }


def analyze_prescription_with_gemini(image_bytes: bytes, api_key: str) -> Dict[str, Any]:
    """
    Sanjay's multimodal AI prescription analyzer using google-genai.
    """
    processed_bytes, content_type = prepare_prescription_image(image_bytes)

    from google.genai import types
    import asyncio

    client = get_genai_client(api_key)

    candidate_models = [
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ]

    parsed_json = None
    last_err = None

    for attempt in range(2):
        for model_name in candidate_models:
            try:
                logger.info(f"Attempting prescription analysis with model: {model_name} (pass {attempt + 1})")
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=processed_bytes, mime_type=content_type),
                        PRESCRIPTION_PROMPT
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=PrescriptionAnalysis,
                        temperature=0.1,
                        max_output_tokens=2048
                    )
                )
                if response and response.text:
                    raw_resp = response.text.strip()
                    if raw_resp.startswith("```json"):
                        raw_resp = raw_resp[7:]
                    elif raw_resp.startswith("```"):
                        raw_resp = raw_resp[3:]
                    if raw_resp.endswith("```"):
                        raw_resp = raw_resp[:-3]
                    
                    parsed_json = json.loads(raw_resp.strip())
                    logger.info(f"Successfully analyzed prescription using {model_name}")
                    break
            except Exception as m_err:
                last_err = m_err
                logger.warning(f"Model {model_name} error: {m_err}")
                continue

        if parsed_json:
            break
        if attempt == 0:
            time.sleep(2)

    if not parsed_json:
        raise last_err or RuntimeError("Gemini model analysis failed.")

    is_rx = parsed_json.get("is_prescription", True)
    summary = parsed_json.get("summary", "")
    med_items = parsed_json.get("medicines", [])
    lifestyle_advice = parsed_json.get("lifestyle_advice", "")
    doctor_notes = parsed_json.get("doctor_notes", "")
    disclaimer = parsed_json.get("disclaimer", "")

    if not is_rx:
        return {
            "error": "⚠️ This photo does not appear to be a medical prescription or medicine bill. Please upload a clear photo of a valid prescription or medicine bill.",
            "is_prescription": False
        }

    # Map schema to SahayAI frontend expectation ({medicine, dose, frequency, duration, instructions})
    medicines = []
    for item in med_items:
        medicines.append({
            "medicine": item.get("name", ""),
            "dose": item.get("dosage", ""),
            "frequency": item.get("frequency", ""),
            "duration": item.get("duration", ""),
            "instructions": item.get("instructions", "")
        })

    raw_text = summary
    if lifestyle_advice:
        raw_text += f"\n\nLifestyle Advice: {lifestyle_advice}"
    if doctor_notes:
        raw_text += f"\n\nDoctor Notes: {doctor_notes}"
    if disclaimer:
        raw_text += f"\n\nDisclaimer: {disclaimer}"

    return {
        "raw_text": raw_text,
        "medicines": medicines,
        "lifestyle_advice": lifestyle_advice,
        "doctor_notes": doctor_notes
    }


def identify_tablet_image(image_bytes: bytes) -> Dict[str, Any]:
    """
    Multimodal AI Tablet Identifier.
    Inspects tablet strip / packaging box / bottle images to identify the exact medicine name and usage description.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    if api_key:
        try:
            processed_bytes, content_type = prepare_prescription_image(image_bytes)
            from google.genai import types
            client = get_genai_client(api_key)

            candidate_models = [
                "gemini-flash-lite-latest",
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite-preview",
                "gemini-3-flash-preview",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash"
            ]

            for model_name in candidate_models:
                try:
                    logger.info(f"Attempting tablet identification with model: {model_name}")
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=processed_bytes, mime_type=content_type),
                            TABLET_PROMPT
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=TabletIdentification,
                            temperature=0.1,
                            max_output_tokens=1024
                        )
                    )
                    if response and response.text:
                        raw_resp = response.text.strip()
                        if raw_resp.startswith("```json"):
                            raw_resp = raw_resp[7:]
                        elif raw_resp.startswith("```"):
                            raw_resp = raw_resp[3:]
                        if raw_resp.endswith("```"):
                            raw_resp = raw_resp[:-3]
                        
                        parsed = json.loads(raw_resp.strip())
                        if parsed.get("found") and parsed.get("medicine"):
                            med_name = parsed.get("medicine").strip()
                            med_desc = parsed.get("description", f"{med_name} is used as prescribed by doctor.")
                            logger.info(f"Successfully identified tablet: {med_name}")
                            return {
                                "found": True,
                                "medicine": med_name,
                                "description": med_desc,
                                "note": "Identified using Gemini Multimodal Vision AI."
                            }
                except Exception as m_err:
                    logger.warning(f"Tablet model {model_name} error: {m_err}")
                    continue
        except Exception as e:
            logger.warning(f"Gemini tablet identification failed, using fallback: {e}")

    # Fallback to OCR heuristics if Gemini is unavailable or not set
    ocr_text = extract_text_from_image(image_bytes)
    if not ocr_text:
        return {"found": False, "medicine": "", "description": "", "note": "Could not read text from tablet photo."}

    lines = [l.strip() for l in ocr_text.splitlines() if l.strip()]
    best_name = ""
    for line in lines:
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', line).strip()
        words = [w for w in cleaned.split() if len(w) >= 3 and w.lower() not in ["tablets", "capsules", "approx", "values", "serving", "number", "daily"]]
        if words:
            norm = normalize_medicine_name(words[0])
            if norm:
                best_name = norm
                break

    if not best_name and lines:
        best_name = lines[0][:30]

    if best_name:
        return {
            "found": True,
            "medicine": best_name,
            "description": f"{best_name} is commonly used for health management as prescribed by your doctor.",
            "note": "Identified using local OCR."
        }

    return {"found": False, "medicine": "", "description": "", "note": "Could not identify tablet name."}


# --- LOCAL OCR & PREPROCESSING HELPERS (RETAINED FOR FALLBACK & IDENTIFY-TABLET) ---

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
OCR_CONFIGS = ['--oem 3 --psm 6', '--oem 3 --psm 11']


def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    _, thresh = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh


def extract_text_from_image(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(image)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

        if max(gray.shape) > 1800:
            scale = 1800 / float(max(gray.shape))
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        base = preprocess_image(image_bytes)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        equalized = clahe.apply(gray)
        bilateral = cv2.bilateralFilter(equalized, d=7, sigmaColor=35, sigmaSpace=35)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(bilateral, cv2.MORPH_CLOSE, kernel)

        variants = [gray, base, closed]

        def score_ocr_text(text):
            if not text: return -999.0
            words = [w for w in text.split() if w]
            if not words: return -999.0
            single_noise = sum(1 for w in words if len(w) == 1 and not w.isdigit() and w.lower() not in ['a','i'])
            med_keywords = ['mg','ml','mcg','tab','tablet','cap','capsule','syrup','bid','tid','qd','prn','take','once','twice']
            med_score = sum(3.0 for w in words if any(k in w.lower() for k in med_keywords))
            alpha_words = sum(1.0 for w in words if any(c.isalpha() for c in w))
            return (len(words) * 1.0) + med_score + (alpha_words * 0.5) - (single_noise * 4.0)

        best_text = ''
        best_score = -9999.0
        for var in variants:
            for cfg in OCR_CONFIGS:
                try:
                    text = pytesseract.image_to_string(var, lang='eng', config=cfg)
                except Exception:
                    continue
                text = text.replace('\x0c', ' ').strip()
                text = fix_medical_abbreviations(text)
                sc = score_ocr_text(text)
                if sc > best_score:
                    best_score = sc
                    best_text = text

        if not best_text:
            text = pytesseract.image_to_string(gray, lang='eng', config=OCR_CONFIGS[0])
            best_text = fix_medical_abbreviations(text.replace('\x0c',' ').strip())

        return best_text.strip() if best_text else None
    except Exception as e:
        print(f"OCR error: {e}")
        return None


def fix_medical_abbreviations(text):
    replacements = {
        r'\bBID\b': 'twice daily', r'\bbid\b': 'twice daily', r'\bbd\b': 'twice daily', r'\bBD\b': 'twice daily',
        r'\bTID\b': 'three times daily', r'\btid\b': 'three times daily', r'\bTDS\b': 'three times daily', r'\btds\b': 'three times daily',
        r'\bQD\b': 'once daily', r'\bqd\b': 'once daily', r'\bOD\b': 'once daily', r'\bod\b': 'once daily',
        r'\bQID\b': 'four times daily', r'\bqid\b': 'four times daily',
        r'\bPRN\b': 'as needed', r'\bprn\b': 'as needed', r'\bSOS\b': 'as needed',
        r'\btab\b': 'tablet', r'\bTAB\b': 'tablet', r'\bcap\b': 'capsule', r'\bCAP\b': 'capsule',
    }
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
    return text


def is_non_tablet_prescription(raw_text):
    if not raw_text: return False
    text = raw_text.lower()
    patterns = [r'\b10%\s*dextrose\b', r'\bdextrose\b', r'\biv\b', r'\bintravenous\b', r'\bfluid[s]?\b', r'\bors\b', r'\bsachet[s]?\b']
    return any(re.search(p, text) for p in patterns)


def extract_medicines_locally(raw_text):
    if not raw_text: return []
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    meds = []
    for line in lines:
        low = line.lower()
        if not any(k in low for k in ["tab", "tablet", "cap", "capsule", "mg", "ml", "mcg"]) and not re.search(r'\d', low):
            continue
        m = re.search(r'(\d{1,4}\s*(?:mg|ml|mcg|g|iu))', line, re.IGNORECASE)
        dose = m.group(1).replace(' ', '') if m else ''
        freq = ''
        if re.search(r'\b(bid|twice|bd)\b', low): freq = 'twice daily'
        elif re.search(r'\b(tid|three|tds)\b', low): freq = 'three times daily'
        elif re.search(r'\b(qid|four)\b', low): freq = 'four times daily'
        elif re.search(r'\b(qd|once|od)\b', low): freq = 'once daily'
        elif re.search(r'\b(prn|as needed|sos)\b', low): freq = 'as needed'

        name = line.split(dose)[0].strip(' -,:;') if dose else re.split(r'[,:\-\(\)]', line)[0].strip()
        if len(name) >= 2:
            meds.append({
                'medicine': name,
                'dose': dose,
                'frequency': freq,
                'duration': ''
            })

    out = []
    seen = set()
    for m in meds:
        k = m['medicine'].lower()
        if k not in seen:
            seen.add(k)
            out.append(m)
    return out


def medicines_to_speech(medicines, language="english"):
    if not medicines:
        return "No medicines found in the prescription."

    speech_parts = []
    for med in medicines:
        name = med.get("medicine", "Unknown medicine")
        dose = med.get("dose", "")
        frequency = med.get("frequency", "")
        duration = med.get("duration", "")
        instructions = med.get("instructions", "")

        if language == "hindi":
            text = f"{name} {dose} lein, {frequency}"
            if instructions: text += f", {instructions}"
            if duration: text += f", {duration} tak"
        elif language == "kannada":
            text = f"{name} {dose} tegédukoli, {frequency}"
            if instructions: text += f", {instructions}"
            if duration: text += f", {duration} varegu"
        else:
            text = f"Take {name} {dose}, {frequency}"
            if instructions: text += f", {instructions}"
            if duration: text += f", for {duration}"

        speech_parts.append(text)

    return ". Next medicine: ".join(speech_parts)


DRUG_LIST = [
    "Betaloc", "Dorzolamide", "Cimetidine", "Oxprenolol", "Paracetamol",
    "Calpol", "Amoxicillin", "Ciprofloxacin", "Cetirizine", "Ibuprofen",
    "Omeprazole", "Metformin", "Amlodipine", "Atorvastatin"
]

NORMALIZATION_MAP = {
    "beta10e": "Betaloc", "betaloe": "Betaloc", "betaloc": "Betaloc",
    "dorzolamidua": "Dorzolamide", "dorzolamidu": "Dorzolamide", "dorzolamidum": "Dorzolamide",
    "oxpre10l": "Oxprenolol", "oxprelol": "Oxprenolol", "calpol": "Calpol"
}

def normalize_medicine_name(raw_name, min_ratio=0.6):
    if not raw_name: return raw_name
    key = re.sub(r'[^a-z0-9]', '', raw_name.lower())
    if key in NORMALIZATION_MAP:
        return NORMALIZATION_MAP[key]
    cand = raw_name.strip()
    for d in DRUG_LIST:
        if cand.lower() == d.lower():
            return d
    matches = difflib.get_close_matches(cand, DRUG_LIST, n=1, cutoff=min_ratio)
    return matches[0] if matches else raw_name