from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
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
    file: UploadFile = File(...)
):
    """
    1. Uploads CNIC image.
    2. Extracts text using Bedrock.
    """
    try:
        # Read image file
        image_bytes = await file.read()
        
        # 1. Extract Details
        extracted_data = bedrock_service.extract_cnic_details(image_bytes)
        
        print(f"DEBUG: Extracted Data: {extracted_data}") # Debug Log

        if "error" in extracted_data:
             raise HTTPException(status_code=400, detail=extracted_data["error"])
        
        return {
            "extracted_data": extracted_data
        }

    except Exception as e:
        print(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

