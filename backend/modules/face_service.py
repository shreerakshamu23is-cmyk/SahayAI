import face_recognition
import numpy as np
import pickle
from PIL import Image
import io

def encode_face_from_bytes(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # downscale large images to speed up face detection/encoding
        max_dim = 800
        w, h = image.size
        if max(w, h) > max_dim:
            scale = max_dim / float(max(w, h))
            new_size = (int(w * scale), int(h * scale))
            image = image.resize(new_size, Image.LANCZOS)

        img_array = np.array(image)

        # use HOG model for faster CPU-based detection; get face locations first
        locations = face_recognition.face_locations(img_array, model='hog')
        if not locations:
            return None

        # compute encodings for found locations (num_jitters kept low for speed)
        encodings = face_recognition.face_encodings(img_array, known_face_locations=locations, num_jitters=1)
        
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