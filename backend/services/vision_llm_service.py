import json
import os
import asyncio
import base64
from google import genai
from google.genai import types

class VisionLLMService:
    """Uses Gemini Vision to extract CNIC data directly from image bytes - no local OCR needed."""

    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model_id = "gemini-2.5-flash"

    async def extract_from_image(self, image_bytes: bytes) -> dict:
        """Send image directly to Gemini Vision for extraction."""

        prompt = """You are a CNIC data extraction system. Extract the following from this Pakistani CNIC image:
1. Name
2. Father/Husband Name
3. Identity Number (CNIC) - Format: 12345-1234567-1
4. Date of Birth
5. Gender
6. Date of Issue
7. Date of Expiry

Return STRICT JSON with keys: "name", "father_name", "cnic_number", "dob", "gender", "issue_date", "expiry_date".
If a field is not visible or unclear, set it to null.
Return ONLY the JSON object."""

        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=[prompt, image_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )

                try:
                    return json.loads(response.text)
                except json.JSONDecodeError as e:
                    print(f"Error parsing Gemini Vision JSON: {e}")
                    return {}

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "503" in error_str or "UNAVAILABLE" in error_str:
                    if attempt < max_retries - 1:
                        sleep_time = 10 * (attempt + 1)
                        print(f"Rate limit/unavailable. Retrying in {sleep_time}s...")
                        await asyncio.sleep(sleep_time)
                        continue
                print(f"Vision LLM error: {e}")
                raise e
