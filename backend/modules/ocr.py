import pytesseract
import cv2
import numpy as np
from PIL import Image
import io
import json
import difflib
import groq as groq_module

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

OCR_CONFIGS = ['--oem 3 --psm 6', '--oem 3 --psm 11']


def build_ocr_variants_for_testing():
    """Small, deterministic list used for regression tests."""
    return ['gray_up', 'base', 'closed']


def build_ocr_variants(image_bytes):
    """Create a minimal, fast OCR pipeline. The previous version ran 18 Tesseract passes per image."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_np = np.array(image)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # Limit processing to a single safe upscale; avoid re-running expensive transforms.
    max_dim = 1800
    if max(gray.shape) > max_dim:
        scale = max_dim / float(max(gray.shape))
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    base = preprocess_image(image_bytes)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    equalized = clahe.apply(gray)
    bilateral = cv2.bilateralFilter(equalized, d=7, sigmaColor=35, sigmaSpace=35)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(bilateral, cv2.MORPH_CLOSE, kernel)
    return [gray, base, closed]


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
            if not text:
                return -999.0
            words = [w for w in text.split() if w]
            if not words:
                return -999.0
            single_noise = sum(1 for w in words if len(w) == 1 and not w.isdigit() and w.lower() not in ['a','i'])
            med_keywords = ['mg','ml','mcg','tab','tablet','cap','capsule','syrup','bid','tid','qd','prn','take','once','twice']
            med_score = sum(3.0 for w in words if any(k in w.lower() for k in med_keywords))
            alpha_words = sum(1.0 for w in words if any(c.isalpha() for c in w))
            score = (len(words) * 1.0) + med_score + (alpha_words * 0.5) - (single_noise * 4.0)
            return score

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
        # Truncate extremely long prescription text to avoid API request size errors
        if len(raw_text) > 3000:
            raw_text = raw_text[:3000] + "\n...[truncated]"
        # try a short fallback list of models if the preferred model is unavailable
        models = [
            "llama-3.3-70b-versatile",
            "llama-3.2-11b-vision-preview",
            "llama-3.2-90b-vision-preview",
            "groq/compound",
            "qwen/qwen3.6-27b",
            "openai/gpt-oss-120b"
        ]
        response = None
        last_err = None
        for model in models:
            try:
                response = groq_client.chat.completions.create(
                    model=model,
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
                break
            except Exception as e:
                print(f"Medicine extraction Groq model {model} failed:", e)
                last_err = e
                if isinstance(e, groq_module.NotFoundError) or "model_not_found" in str(e):
                    continue
                else:
                    break
        if response is None:
            if last_err:
                raise last_err
            return []
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


def extract_medicines_locally(raw_text):
    """Conservative local extractor to be used when AI is unavailable.
    Returns a list of dicts with keys: medicine, dose, frequency, duration.
    This is intentionally simple and avoids network calls or new packages.
    """
    import re
    if not raw_text:
        return []

    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    meds = []
    for line in lines:
        low = line.lower()
        # consider lines with tablet words or numbers/doses
        if not any(k in low for k in ["tab", "tablet", "cap", "capsule", "mg", "ml", "mcg"]) and not re.search(r'\d', low):
            continue

        # basic normalization common OCR artifacts
        norm = re.sub(r'[^\x00-\x7F]', ' ', line)
        norm = re.sub(r'\s{2,}', ' ', norm)
        norm = norm.strip(' .,-')

        # collapse runs of single-letter tokens (e.g. 'B e t a 1 0 e' -> 'Beta10e')
        parts = norm.split()
        merged = []
        i = 0
        while i < len(parts):
            if len(parts[i]) == 1 and parts[i].isalnum():
                buf = [parts[i]]
                j = i + 1
                while j < len(parts) and len(parts[j]) == 1 and parts[j].isalnum():
                    buf.append(parts[j])
                    j += 1
                if len(buf) >= 3:
                    merged.append(''.join(buf))
                    i = j
                    continue
            merged.append(parts[i])
            i += 1
        norm = ' '.join(merged)

        # try to find dose like 100mg or 10 mg
        m = re.search(r'(\d{1,4}\s*(?:mg|ml|mcg|g|iu))', norm, re.IGNORECASE)
        dose = m.group(1).replace(' ', '') if m else ''

        # frequency hints
        freq = ''
        if re.search(r'\b(bid|twice|bd)\b', low):
            freq = 'twice daily'
        elif re.search(r'\b(tid|three|tds)\b', low):
            freq = 'three times daily'
        elif re.search(r'\b(qid|four)\b', low):
            freq = 'four times daily'
        elif re.search(r'\b(qd|once|od)\b', low):
            freq = 'once daily'
        elif re.search(r'\b(prn|as needed|sos)\b', low):
            freq = 'as needed'

        # extract name: take initial token run before dose or comma
        name = norm
        if dose:
            name = norm.split(dose)[0].strip(' -,:;')
        else:
            name = re.split(r'[,:\-\(\)]', norm)[0].strip()

        # ignore trivial noise
        if len(name) < 2:
            continue

        meds.append({
            'raw_name': name,
            'medicine': name,
            'dose': dose,
            'frequency': freq,
            'duration': ''
        })

    # dedupe by lowercase name
    out = []
    seen = set()
    for m in meds:
        k = m['medicine'].lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(m)

    # try to normalize medicine names using local mapping and fuzzy matching
    try:
        for m in out:
            raw = m.get('raw_name') or m.get('medicine') or ''
            norm = normalize_medicine_name(raw)
            m['medicine_normalized'] = norm
            # replace medicine with normalized form for downstream use
            if norm and norm.lower() != raw.lower():
                m['medicine'] = norm
                m['normalized'] = True
            else:
                m['normalized'] = False
    except Exception:
        pass

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


# Small local drug list and normalization map to correct common OCR artifacts
DRUG_LIST = [
    "Betaloc",
    "Dorzolamide",
    "Cimetidine",
    "Oxprenolol",
    "Paracetamol",
    "Calpol",
    "Amoxicillin",
    "Ciprofloxacin",
    "Cetirizine",
    "Ibuprofen",
    "Omeprazole",
    "Metformin",
    "Amlodipine",
    "Atorvastatin",
]

NORMALIZATION_MAP = {
    "beta10e": "Betaloc",
    "betaloe": "Betaloc",
    "betaloc": "Betaloc",
    "dorzolamidua": "Dorzolamide",
    "dorzolamidu": "Dorzolamide",
    "dorzolamidum": "Dorzolamide",
    "oxpre10l": "Oxprenolol",
    "oxprelol": "Oxprenolol",
    "calpol": "Calpol",
}

def normalize_medicine_name(raw_name, min_ratio=0.6):
    """Return a normalized canonical medicine name for a raw OCR name.
    Uses a small normalization map then difflib fuzzy matching against DRUG_LIST.
    If no good match found, returns the original raw_name."""
    if not raw_name:
        return raw_name
    key = re.sub(r'[^a-z0-9]', '', raw_name.lower())
    if key in NORMALIZATION_MAP:
        return NORMALIZATION_MAP[key]

    # try direct title-case lookup
    cand = raw_name.strip()
    # exact case-insensitive match
    for d in DRUG_LIST:
        if cand.lower() == d.lower():
            return d

    # fuzzy match
    matches = difflib.get_close_matches(cand, DRUG_LIST, n=1, cutoff=min_ratio)
    if matches:
        return matches[0]

    return raw_name