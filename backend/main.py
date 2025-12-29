from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List
from services.bedrock_service import BedrockService

# Load environment variables
load_dotenv()

app = FastAPI(title="CNIC Extractor API")

# Initialize Services
bedrock_service = BedrockService()

# Enable CORS for Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
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

@app.post("/extract")
async def extract_cnic_details(
    files: List[UploadFile] = File(...)
):
    """
    1. Uploads multiple CNIC images.
    2. Extracts text using Bedrock for each.
    """
    try:
        results = []
        for file in files:
            # Read image file
            image_bytes = await file.read()
            
            # 1. Extract Details
            extracted_data = bedrock_service.extract_cnic_details(image_bytes)
            
            # Append result (include filename for reference if needed, or just data)
            results.append({
                "filename": file.filename,
                "data": extracted_data
            })
            
            print(f"DEBUG: Extracted Data for {file.filename}: {extracted_data}")

        return {
            "results": results
        }

    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

