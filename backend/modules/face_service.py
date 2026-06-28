import face_recognition
import numpy as np
import pickle
from PIL import Image
import io

def encode_face_from_bytes(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(image)
        
        encodings = face_recognition.face_encodings(img_array)
        
        if len(encodings) == 0:
            return None
        
        return encodings[0]
        
    except Exception as e:
        print(f"Face encoding error: {e}")
        return None

def encoding_to_bytes(encoding):
    return pickle.dumps(encoding)

def bytes_to_encoding(encoding_bytes):
    return pickle.loads(encoding_bytes)

def compare_faces(stored_bytes, live_encoding, threshold=0.5):
    stored_encoding = bytes_to_encoding(stored_bytes)
    distance = face_recognition.face_distance(
        [stored_encoding], live_encoding
    )[0]
    match = distance < threshold
    confidence = round((1 - distance) * 100, 1)
    return match, confidence