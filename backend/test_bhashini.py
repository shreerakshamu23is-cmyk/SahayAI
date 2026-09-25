import os
import sys
import json
import base64

sys.path.insert(0, os.path.dirname(__file__))

from modules.voice import (
    is_bhashini_available,
    bhashini_translate,
    bhashini_tts,
    bhashini_asr,
    normalize_lang_code
)

def run_tests():
    print("========================================")
    print("   SAHAYAI BHASHINI INTEGRATION TESTS   ")
    print("========================================")

    # 1. Status Check
    available = is_bhashini_available()
    print(f"[1] Bhashini API Configuration Status: {'SUCCESS (Available)' if available else 'FAILED (Unavailable)'}")
    assert available, "Bhashini API should be available with user credentials!"

    # 2. Translation Test
    sample_text = "Take two tablets of Paracetamol after food daily."
    print(f"\n[2] Testing Bhashini Translation (English -> Kannada)...")
    kn_translation = bhashini_translate(sample_text, target_lang="kannada", source_lang="english")
    print("Original Text:", sample_text)
    print("Kannada Text :", kn_translation.encode('ascii', 'xmlcharrefreplace').decode())
    assert len(kn_translation) > 0, "Translation result should not be empty!"

    print(f"\n[3] Testing Bhashini Translation (English -> Hindi)...")
    hi_translation = bhashini_translate(sample_text, target_lang="hindi", source_lang="english")
    print("Hindi Text   :", hi_translation.encode('ascii', 'xmlcharrefreplace').decode())
    assert len(hi_translation) > 0, "Hindi Translation result should not be empty!"

    # 3. Text-To-Speech (TTS) Test
    print(f"\n[4] Testing Bhashini TTS (Kannada)...")
    audio_b64 = bhashini_tts(kn_translation, lang="kannada")
    print(f"Base64 Audio Received: {bool(audio_b64)} (Length: {len(audio_b64) if audio_b64 else 0} bytes)")
    assert audio_b64 is not None and len(audio_b64) > 1000, "Bhashini TTS audio base64 should be generated!"

    # 4. Speech-To-Text (ASR) Test
    print(f"\n[5] Testing Bhashini ASR (Speech Recognition)...")
    transcribed = bhashini_asr(audio_b64, lang="kannada")
    print("Transcribed Text:", transcribed.encode('ascii', 'xmlcharrefreplace').decode() if transcribed else "None")
    assert transcribed is not None and len(transcribed) > 0, "Bhashini ASR should transcribe audio back to text!"

    print("\n========================================")
    print("   ALL BHASHINI TESTS PASSED CLEANLY!  ")
    print("========================================")

if __name__ == "__main__":
    run_tests()
