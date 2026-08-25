import importlib


def test_ocr_uses_limited_variants_and_configs():
    ocr = importlib.import_module("modules.ocr")

    variants = ocr.build_ocr_variants_for_testing()

    assert len(variants) <= 3, f"expected a small OCR pipeline, got {len(variants)} variants"
    assert len(ocr.OCR_CONFIGS) <= 2, f"expected a minimal config list, got {ocr.OCR_CONFIGS}"
