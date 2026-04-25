import json
import os
import asyncio
from google import genai
from google.genai import types

class GeminiService:
    def __init__(self):
        # The client will automatically pick up GEMINI_API_KEY from environment variables,
        # but to be completely bulletproof we will pass it explicitly:
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        self.model_id = "gemini-2.5-flash"

    async def extract_cnic_details(self, image_bytes: bytes) -> dict:
        """
        Sends the CNIC image to Gemini 2.5 Flash for data extraction.
        """
        print("Sending image to Gemini for extraction...")
        
        prompt = """
        You are an expert data extraction system.
        Extract the following details from this Pakistani CNIC card image and return them in STRICT JSON format:
        1. Name
        2. Father Name (or Husband Name)
        3. Identity Number (CNIC Number) - Format: 12345-1234567-1
        4. Date of Birth
        5. Gender
        6. Date of Issue (if visible, convert to YYYY-MM-DD or keep original)
        7. Date of Expiry (if visible, convert to YYYY-MM-DD or keep original)

        JSON Keys: "name", "father_name", "cnic_number", "dob", "gender", "issue_date", "expiry_date".
        Rule: If a field is not found, set it to null.
        Rule: Return ONLY the JSON object. No markdown formatting.
        """

        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=self.model_id,
                    contents=[image_part, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )

                print(f"Gemini processing complete.")
                
                try:
                    return json.loads(response.text)
                except json.JSONDecodeError as e:
                    print(f"Error parsing Gemini JSON: {e}")
                    print(f"Raw Gemini Output: {response.text}")
                    return {"error": "Failed to parse extraction result", "raw_content": response.text}

            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        sleep_time = 15 * (attempt + 1)
                        print(f"Rate limit hit (429). Retrying in {sleep_time} seconds (Attempt {attempt+1}/{max_retries})...")
                        await asyncio.sleep(sleep_time)
                        continue
                print(f"Unexpected error interfacing with Gemini: {e}")
                raise e
