import pytesseract
import cv2
import numpy as np
from PIL import Image
import io
import json

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    gray = cv2.resize(gray, None, fx=3, fy=3,
                      interpolation=cv2.INTER_CUBIC)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    _, thresh = cv2.threshold(
        sharpened, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) > 0:
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = 90 + angle
        if abs(angle) > 0.5:
            (h, w) = thresh.shape
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            thresh = cv2.warpAffine(
                thresh, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
    return thresh

def extract_text_from_image(image_bytes):
    try:
        processed = preprocess_image(image_bytes)
        text = pytesseract.image_to_string(
            processed,
            config='--psm 6'
        )
        text = fix_medical_abbreviations(text)
        return text.strip()
    except Exception as e:
        print(f"OCR error: {e}")
        return None
def fix_medical_abbreviations(text):
    import re
    replacements = {
        r'\bBID\b': 'twice daily',
        r'\bbid\b': 'twice daily',
        r'\bbd\b': 'twice daily',
        r'\bBD\b': 'twice daily',
        r'\bTID\b': 'three times daily',
        r'\btid\b': 'three times daily',
        r'\bTDD\b': 'three times daily',
        r'\bQD\b': 'once daily',
        r'\bqd\b': 'once daily',
        r'\bOD\b': 'once daily',
        r'\bod\b': 'once daily',
        r'\bQID\b': 'four times daily',
        r'\bqid\b': 'four times daily',
        r'\bPRN\b': 'as needed',
        r'\bprn\b': 'as needed',
        r'\bSOS\b': 'as needed',
        r'\bstat\b': 'immediately',
        r'\btab\b': 'tablet',
        r'\bTAB\b': 'tablet',
        r'\bcap\b': 'capsule',
        r'\bCAP\b': 'capsule',
    }
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
    return text

def extract_medicines_with_ai(raw_text, groq_client):
    if not raw_text or len(raw_text.strip()) < 3:
        return None

    prompt = f"""You are a precise medical prescription parser.
Your ONLY job is to extract medicine data from prescription text.

FREQUENCY RULES — follow STRICTLY:
- "twice daily" or "BID" or "bd" = exactly 2 times per day
- "three times daily" or "TID" or "tid" = exactly 3 times per day  
- "once daily" or "QD" or "od" or "OD" = exactly 1 time per day
- "four times daily" or "QID" = exactly 4 times per day
- "as needed" or "PRN" = as needed

NAME RULES:
- Copy medicine names EXACTLY as they appear
- Do NOT correct spelling
- Do NOT add or remove letters

Prescription text to parse:
{raw_text}

Return ONLY a JSON array. No explanation, no markdown:
[
  {{
    "medicine": "name exactly as written",
    "dose": "number + unit e.g. 100mg",
    "frequency": "plain English frequency",
    "duration": "duration or empty string"
  }}
]"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a medical data parser. Return only valid JSON arrays. Never explain, never add text outside the JSON array."
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0
        )
        result = response.choices[0].message.content.strip()
        result = result.replace("```json", "").replace("```", "").strip()

        import json
        start = result.find("[")
        end = result.rfind("]") + 1
        if start != -1 and end > start:
            result = result[start:end]

        medicines = json.loads(result)
        return medicines
    except Exception as e:
        print(f"Medicine extraction error: {e}")
        return []

def medicines_to_speech(medicines, language="english"):
    if not medicines:
        return "No medicines found in the prescription."

    speech_parts = []

    for med in medicines:
        name = med.get("medicine", "Unknown medicine")
        dose = med.get("dose", "")
        frequency = med.get("frequency", "")
        duration = med.get("duration", "")

        if language == "hindi":
            text = f"{name} {dose} lein, {frequency}"
            if duration:
                text += f", {duration} tak"
        elif language == "kannada":
            text = f"{name} {dose} tegédukoli, {frequency}"
            if duration:
                text += f", {duration} varegu"
        else:
            text = f"Take {name} {dose}, {frequency}"
            if duration:
                text += f", for {duration}"

        speech_parts.append(text)

    return ". Next medicine: ".join(speech_parts)