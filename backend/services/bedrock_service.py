import boto3
import json
import base64
import os
from botocore.exceptions import ClientError

class BedrockService:
    def __init__(self, region_name="us-east-1"):
        # Use credentials from environment or default profile
        self.bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=region_name
        )
        self.textract_client = boto3.client(
            service_name="textract",
            region_name=region_name
        )
        # Using Haiku for fast text processing, or Sonnet if preferred
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0" 

    def extract_cnic_details(self, image_bytes: bytes) -> dict:
        """
        1. Sends image to AWS Textract for OCR.
        2. Sends raw text to Bedrock Claude 3 model for parsing.
        """
        try:
            # Step 1: Textract OCR
            print("Sending image to Textract...")
            response = self.textract_client.detect_document_text(
                Document={'Bytes': image_bytes}
            )
            
            raw_text = ""
            for item in response.get("Blocks", []):
                if item["BlockType"] == "LINE":
                    raw_text += item["Text"] + "\n"
            
            print(f"Textract completed. Extracted {len(raw_text)} characters.")
            
            if not raw_text.strip():
                return {"error": "Textract failed to extract any text from the image."}

            # Step 2: Bedrock Parsing
            prompt = f"""
            You are an expert data extraction system.
            Here is the raw text extracted from a Pakistani CNIC card (using OCR):
            
            <raw_text>
            {raw_text}
            </raw_text>

            Extract the following details and return them in strict JSON format:
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

            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt,
                            }
                        ],
                    }
                ],
            })

            print("Sending text to Bedrock...")
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                body=body
            )
            response_body = json.loads(response.get("body").read())
            content_text = response_body["content"][0]["text"]
            
            # Parse JSON
            json_str = content_text.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()
                
            return json.loads(json_str)

        except ClientError as e:
            print(f"AWS Service Error: {e}")
            raise e
        except json.JSONDecodeError as e:
            print(f"Error parsing Bedrock JSON: {e}")
            print(f"Raw Bedrock Output: {content_text}")
            return {"error": "Failed to parse extraction result", "raw_content": content_text}
        except Exception as e:
            print(f"Unexpected error: {e}")
            raise e
