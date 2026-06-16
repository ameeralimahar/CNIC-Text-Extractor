import asyncio
import os
import aiohttp
from typing import List, Dict, Any
from services.vision_llm_service import VisionLLMService

# Semaphore to limit concurrent LLM calls (avoid rate limits)
LLM_SEMAPHORE = asyncio.Semaphore(2)

DOCS_API_URL = os.getenv("DOCS_API_URL", "http://localhost:3000")


class VerifyService:
    def __init__(self, vision_service: VisionLLMService):
        self.vision_service = vision_service

    async def verify_batch(self, applications: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        tasks = [self._verify_single(app) for app in applications]
        return await asyncio.gather(*tasks)

    async def _verify_single(self, app: Dict[str, str]) -> Dict[str, Any]:
        application_id = app["application_id"]
        image_url = app["image_url"]
        expected_cnic = app.get("expected_cnic", "")
        expected_dob = app.get("expected_dob", "")

        try:
            # Download image
            image_bytes = await self._download_image(image_url)
            if not image_bytes:
                return self._error_result(application_id, "Failed to download image")

            # Use Gemini Vision directly (with semaphore)
            async with LLM_SEMAPHORE:
                structured = await self.vision_service.extract_from_image(image_bytes)

            if not structured:
                return self._error_result(application_id, "Failed to extract data from image")

            # Compare
            extracted_cnic = structured.get("cnic_number") or ""
            extracted_dob = structured.get("dob") or ""

            cnic_match = self._normalize_cnic(extracted_cnic) == self._normalize_cnic(expected_cnic)
            dob_match = self._normalize_date(extracted_dob) == self._normalize_date(expected_dob)

            return {
                "application_id": application_id,
                "extracted": structured,
                "comparison": {
                    "cnicMatch": cnic_match,
                    "dobMatch": dob_match,
                },
            }

        except Exception as e:
            return self._error_result(application_id, str(e))

    async def _download_image(self, url: str) -> bytes | None:
        try:
            # If URL is relative, prepend the docs API base URL
            if url.startswith("/"):
                url = f"{DOCS_API_URL}{url}"
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        return await resp.read()
                    else:
                        print(f"Image download failed: status {resp.status} for {url}")
            return None
        except Exception as e:
            print(f"Image download error: {e}")
            return None

    def _normalize_cnic(self, cnic: str) -> str:
        return cnic.replace("-", "").replace(" ", "").strip()

    def _normalize_date(self, date_str: str) -> str:
        # Normalize to ddmmyyyy for comparison
        cleaned = date_str.replace("-", "").replace("/", "").replace(".", "").replace(" ", "").strip()
        return cleaned

    def _error_result(self, application_id: str, error: str) -> Dict[str, Any]:
        return {
            "application_id": application_id,
            "extracted": {
                "cnic_number": None,
                "dob": None,
                "name": None,
                "father_name": None,
                "gender": None,
                "issue_date": None,
                "expiry_date": None,
            },
            "comparison": {"cnicMatch": False, "dobMatch": False},
            "error": error,
        }
