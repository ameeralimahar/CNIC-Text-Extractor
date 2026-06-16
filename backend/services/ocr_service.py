import numpy as np

try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
except ImportError:
    PADDLE_AVAILABLE = False


class OCRService:
    def __init__(self):
        if PADDLE_AVAILABLE:
            print("Initializing PaddleOCR...")
            self.ocr = PaddleOCR(use_angle_cls=True, lang='ur')
        else:
            print("WARNING: PaddleOCR not available. OCR disabled, using Vision LLM fallback.")
            self.ocr = None

    def extract_text(self, cv_image: np.ndarray) -> tuple[list[str], float]:
        if not self.ocr:
            return [], 0.0

        result = self.ocr.ocr(cv_image)

        extracted_lines = []
        confidences = []

        if not result or not result[0]:
            return [], 0.0

        for idx in range(len(result[0])):
            res = result[0][idx]
            text = res[1][0]
            confidence = res[1][1]
            extracted_lines.append(text)
            confidences.append(confidence)

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return extracted_lines, avg_confidence
