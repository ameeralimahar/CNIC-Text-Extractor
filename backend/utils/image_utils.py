import cv2
import numpy as np

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Decodes the image bytes, converts to grayscale, applies Gaussian blur,
    and performs contrast enhancement (CLAHE).
    Includes a basic rotation check for landscape orientation.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        raise ValueError("Failed to decode image bytes")

    # Deskew / Auto-rotation (basic logic: CNICs are landscape)
    h, w = image.shape[:2]
    if h > w:
        image = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)

    # Convert to Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Noise Reduction
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Contrast Enhancement (CLAHE - Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(blurred)
    
    # Sharpening (Unsharp Masking) to make text pop
    gaussian_3 = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
    enhanced = cv2.addWeighted(enhanced, 1.5, gaussian_3, -0.5, 0)

    # Optional: Resize if too large to speed up OCR
    h, w = enhanced.shape[:2]
    max_dim = 1600
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        enhanced = cv2.resize(enhanced, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    return enhanced
