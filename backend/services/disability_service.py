import cv2
import numpy as np
import os

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

class DisabilityService:
    def __init__(self):
        self.mode = "none"
        
        yolo_path = "wheelchair_yolov8.pt"
        template_path = "wheelchair_logo_template.png"
        
        if YOLO_AVAILABLE and os.path.exists(yolo_path):
            print("Initializing DisabilityService with YOLOv8...")
            self.yolo_model = YOLO(yolo_path)
            self.mode = "yolo"
        elif os.path.exists(template_path):
            print("Initializing DisabilityService with Template Matching (YOLO unavailable or model missing)...")
            self.template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
            self.mode = "template"
        else:
            print(f"WARNING: Neither '{yolo_path}' nor '{template_path}' found. Disability detection disabled.")
            self.mode = "none"

    def detect_wheelchair(self, cv_image: np.ndarray) -> bool:
        """
        Detects wheelchair logo using YOLOv8 if available, otherwise template matching.
        """
        if self.mode == "none":
            return False

        if self.mode == "yolo":
            try:
                # Run YOLO inference
                results = self.yolo_model(cv_image, verbose=False)
                # Check for detections (assuming the model is trained exclusively for the wheelchair logo)
                for r in results:
                    if len(r.boxes) > 0:
                        return True
                return False
            except Exception as e:
                print(f"Error in YOLO inference: {e}")
                return False

        if self.mode == "template":
            try:
                # Ensure input is grayscale for template matching
                if len(cv_image.shape) == 3:
                    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
                else:
                    gray = cv_image
                    
                # Match template
                res = cv2.matchTemplate(gray, self.template, cv2.TM_CCOEFF_NORMED)
                threshold = 0.7  # Adjust threshold based on testing
                loc = np.where(res >= threshold)
                
                # If any matches found above threshold
                if len(loc[0]) > 0:
                    return True
            except Exception as e:
                print(f"Error in template matching: {e}")
                
        return False
