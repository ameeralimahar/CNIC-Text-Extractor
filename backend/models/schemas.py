from pydantic import BaseModel
from typing import Optional

class ExtractedCNICData(BaseModel):
    filename: str
    name: Optional[str] = None
    father_name: Optional[str] = None
    cnic_number: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    is_disabled: bool = False
    confidence_score: float = 0.0

class ExtractionResponse(BaseModel):
    results: list[ExtractedCNICData]
