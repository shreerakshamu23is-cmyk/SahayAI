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
        inverted = cv2.bitwise_not(processed)
        configs = [
            '--oem 1 --psm 6',
            '--oem 1 --psm 11',
            '--oem 1 --psm 3',
            '--oem 1 --psm 4'
        ]

        best_text = ""
        images = [processed, inverted]

        for img in images:
            for cfg in configs:
                text = pytesseract.image_to_string(img, lang='eng', config=cfg)
                text = text.replace('\x0c', ' ').strip()
                text = fix_medical_abbreviations(text)
                if len(text.split()) > len(best_text.split()):
                    best_text = text

        if not best_text:
            text = pytesseract.image_to_string(processed, lang='eng')
            best_text = fix_medical_abbreviations(text.replace('\x0c', ' ').strip())

        return best_text.strip() if best_text else None
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
        r'\bTDS\b': 'three times daily',
        r'\btds\b': 'three times daily',
        r'\bTDD\b': 'three times daily',
        r'\bQD\b': 'once daily',
        r'\bqd\b': 'once daily',
        r'\bOD\b': 'once daily',
        r'\bod\b': 'once daily',
        r'\bQID\b': 'four times daily',
        r'\bqid\b': 'four times daily',
        r'\bQ6H\b': 'four times daily',
        r'\bq6h\b': 'four times daily',
        r'\bQ4H\b': 'six times daily',
        r'\bq4h\b': 'six times daily',
        r'\bQHS\b': 'once daily',
        r'\bqhs\b': 'once daily',
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

def is_non_tablet_prescription(raw_text):
    import re
    text = raw_text.lower()
    patterns = [
        r'\b10%\s*dextrose\b',
        r'\bdextrose\b',
        r'\biv\b',
        r'\bintravenous\b',
        r'\bfluid[s]?\b',
        r'\bintake\b',
        r'\bors\b',
        r'\bsachet[s]?\b',
        r'\bstat\b',
        r'\bdrip\b',
        r'\bbolus\b'
    ]
    return any(re.search(p, text) for p in patterns)

def extract_medicines_with_ai(raw_text, groq_client):
    if not raw_text or len(raw_text.strip()) < 3:
        return None

    prompt = f"""You are a precise medical prescription parser.
Your ONLY job is to extract medicine data from prescription text.

FREQUENCY RULES — follow STRICTLY:
- "twice daily" or "BID" or "bd" = exactly 2 times per day
- "three times daily" or "TID" or "tid" or "TDS" or "TOS" = exactly 3 times per day
- "once daily" or "QD" or "od" or "OD" = exactly 1 time per day
- "four times daily" or "QID" or "Q6H" = exactly 4 times per day
- "as needed" or "PRN" or "SOS" = as needed

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