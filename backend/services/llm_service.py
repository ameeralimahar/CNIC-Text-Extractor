import json
import os
import asyncio
from google import genai
from google.genai import types

class LLMService:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model_id = "gemini-2.5-flash"

    async def structure_data(self, cleaned_ocr_text: str) -> dict:
        """
        Sends only OCR text to Gemini for structuring into JSON.
        """
        print("Sending OCR text to Gemini for structuring...")
        
        prompt = f"""
        You are an expert data structuring system.
        I will provide you with OCR text extracted from a Pakistani CNIC.
        Extract the following details and return them in STRICT JSON format:
        1. Name
        2. Father Name (or Husband Name)
        3. Identity Number (CNIC Number) - Format: 12345-1234567-1
        4. Date of Birth
        5. Gender
        6. Date of Issue
        7. Date of Expiry

        JSON Keys: "name", "father_name", "cnic_number", "dob", "gender", "issue_date", "expiry_date".
        Rule: If a field is not found or is unclear, set it to null.
        Rule: Return ONLY the JSON object. No markdown formatting.

        OCR TEXT:
        {cleaned_ocr_text}
        """

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )

                try:
                    return json.loads(response.text)
                except json.JSONDecodeError as e:
                    print(f"Error parsing Gemini JSON: {e}")
                    return {"error": "Failed to parse extraction result"}

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        sleep_time = 15 * (attempt + 1)
                        print(f"Rate limit hit. Retrying in {sleep_time}s...")
                        await asyncio.sleep(sleep_time)
                        continue
                print(f"Unexpected error: {e}")
                raise e
