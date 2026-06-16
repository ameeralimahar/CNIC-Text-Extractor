from paddleocr import PaddleOCR
import numpy as np
import os

class OCRService:
    def __init__(self):
        # Initialize PaddleOCR
        # lang='ur' handles both Urdu and basic English chars effectively in PaddleOCR
        # Check environment variable for GPU usage
        use_gpu = os.getenv("USE_GPU", "false").lower() == "true"
        print(f"Initializing PaddleOCR (GPU enabled: {use_gpu})... Note: PaddleOCR now manages GPU automatically or via paddle installation.")
        self.ocr = PaddleOCR(use_angle_cls=True, lang='ur')

    def extract_text(self, cv_image: np.ndarray) -> tuple[list[str], float]:
        """
        Runs PaddleOCR on the image.
        Returns a tuple of (extracted_lines, average_confidence)
        """
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
