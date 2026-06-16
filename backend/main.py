import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List

from pydantic import BaseModel
from models.schemas import ExtractionResponse, ExtractedCNICData
from utils.image_utils import preprocess_image
from utils.text_utils import clean_ocr_text
from services.cache_service import CacheService
from services.disability_service import DisabilityService
from services.ocr_service import OCRService
from services.llm_service import LLMService
from services.vision_llm_service import VisionLLMService
from services.verify_service import VerifyService

load_dotenv()

app = FastAPI(title="CNIC Extractor API")

# Initialize services
cache_service = CacheService()
disability_service = DisabilityService()
ocr_service = OCRService()
llm_service = LLMService()
vision_service = VisionLLMService()
verify_service = VerifyService(vision_service)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:4200",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CNIC Extractor API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

async def process_single_image(file: UploadFile) -> ExtractedCNICData:
    image_bytes = await file.read()
    
    # 1. Cache Check
    image_hash = cache_service.generate_hash(image_bytes)
    cached_data = cache_service.get_cached_result(image_hash)
    if cached_data:
        cached_data['filename'] = file.filename
        return ExtractedCNICData(**cached_data)

    # 2. Preprocessing & Disability Detection (CPU Bound)
    try:
        cv_image = await asyncio.to_thread(preprocess_image, image_bytes)
        is_disabled = await asyncio.to_thread(disability_service.detect_wheelchair, cv_image)
    except Exception as e:
        print(f"Preprocessing error for {file.filename}: {e}")
        return ExtractedCNICData(filename=file.filename)

    # 3. OCR (CPU Bound)
    try:
        raw_lines, confidence = await asyncio.to_thread(ocr_service.extract_text, cv_image)
        print(f"DEBUG OCR for {file.filename}: {len(raw_lines)} lines, confidence={confidence:.2f}")
        if raw_lines:
            print(f"DEBUG OCR text: {raw_lines[:5]}")
    except Exception as e:
        print(f"OCR error for {file.filename}: {e}, falling back to Vision LLM")
        # Fallback to Vision LLM
        try:
            structured_data = await vision_service.extract_from_image(image_bytes)
            result_dict = {
                "filename": file.filename,
                "name": structured_data.get("name"),
                "father_name": structured_data.get("father_name"),
                "cnic_number": structured_data.get("cnic_number"),
                "dob": structured_data.get("dob"),
                "gender": structured_data.get("gender"),
                "issue_date": structured_data.get("issue_date"),
                "expiry_date": structured_data.get("expiry_date"),
                "is_disabled": is_disabled,
                "confidence_score": 0.9
            }
            return ExtractedCNICData(**result_dict)
        except Exception as ve:
            print(f"Vision LLM fallback error: {ve}")
            return ExtractedCNICData(filename=file.filename, is_disabled=is_disabled)

    if not raw_lines:
        print(f"DEBUG: OCR returned empty for {file.filename}, falling back to Vision LLM")
        try:
            structured_data = await vision_service.extract_from_image(image_bytes)
            result_dict = {
                "filename": file.filename,
                "name": structured_data.get("name"),
                "father_name": structured_data.get("father_name"),
                "cnic_number": structured_data.get("cnic_number"),
                "dob": structured_data.get("dob"),
                "gender": structured_data.get("gender"),
                "issue_date": structured_data.get("issue_date"),
                "expiry_date": structured_data.get("expiry_date"),
                "is_disabled": is_disabled,
                "confidence_score": 0.9
            }
            return ExtractedCNICData(**result_dict)
        except Exception as ve:
            print(f"Vision LLM fallback error: {ve}")
            return ExtractedCNICData(filename=file.filename, is_disabled=is_disabled, confidence_score=0.0)

    # 4. Post-processing
    cleaned_text = clean_ocr_text(raw_lines)
    print(f"DEBUG cleaned text: {cleaned_text[:200]}")
    
    # 5. LLM Structuring
    try:
        structured_data = await llm_service.structure_data(cleaned_text)
    except Exception as e:
        print(f"LLM error for {file.filename}: {e}")
        structured_data = {}

    # Assemble result
    result_dict = {
        "filename": file.filename,
        "name": structured_data.get("name"),
        "father_name": structured_data.get("father_name"),
        "cnic_number": structured_data.get("cnic_number"),
        "dob": structured_data.get("dob"),
        "gender": structured_data.get("gender"),
        "issue_date": structured_data.get("issue_date"),
        "expiry_date": structured_data.get("expiry_date"),
        "is_disabled": is_disabled,
        "confidence_score": confidence
    }
    
    # 6. Cache Store
    store_dict = result_dict.copy()
    store_dict.pop("filename")
    cache_service.set_cached_result(image_hash, store_dict)

    return ExtractedCNICData(**result_dict)

class VerifyApplication(BaseModel):
    application_id: str
    image_url: str
    expected_cnic: str
    expected_dob: str

class VerifyBatchRequest(BaseModel):
    applications: List[VerifyApplication]

@app.post("/verify-batch")
async def verify_batch(request: VerifyBatchRequest):
    """Batch verify CNIC images against expected data."""
    try:
        apps = [app.model_dump() for app in request.applications]
        results = await verify_service.verify_batch(apps)
        return {"results": results}
    except Exception as e:
        print(f"Verify batch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract", response_model=ExtractionResponse)
async def extract_cnic_details(files: List[UploadFile] = File(...)):
    """
    1. Uploads multiple CNIC images.
    2. Processes them with local OCR + Text-only LLM structuring.
    """
    try:
        tasks = [process_single_image(file) for file in files]
        results = await asyncio.gather(*tasks)
        return ExtractionResponse(results=results)
    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))
