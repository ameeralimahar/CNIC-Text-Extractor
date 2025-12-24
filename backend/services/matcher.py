from difflib import SequenceMatcher
import re
from datetime import datetime

class MatcherService:
    @staticmethod
    def normalize_cnic(cnic: str) -> str:
        if not cnic:
            return ""
        return re.sub(r'[^0-9]', '', cnic)

    @staticmethod
    def normalize_name(name: str) -> str:
        if not name:
            return ""
        return " ".join(name.lower().split())

    @staticmethod
    def calculate_similarity(a: str, b: str) -> float:
        return SequenceMatcher(None, a, b).ratio()

    def match_candidate(self, extracted: dict, candidate: dict) -> dict:
        """
        Compare extracted CNIC data against a candidate record.
        Expected keys in extracted: cnic_number, name, dob
        Expected keys in candidate: cnic, name, dob
        """
        results = {
            "overall_match": False,
            "details": {}
        }

        # 1. CNIC Match (High Priority, Exact Match preferred)
        ext_cnic = self.normalize_cnic(extracted.get("cnic_number"))
        cand_cnic = self.normalize_cnic(candidate.get("cnic"))
        
        cnic_match = ext_cnic == cand_cnic
        results["details"]["cnic"] = {
            "match": cnic_match,
            "extracted": ext_cnic,
            "candidate": cand_cnic
        }

        # 2. Name Match (Fuzzy)
        ext_name = self.normalize_name(extracted.get("name"))
        cand_name = self.normalize_name(candidate.get("name"))
        name_score = self.calculate_similarity(ext_name, cand_name)
        
        # Threshold for name matching (e.g., 0.8)
        name_match = name_score >= 0.8
        results["details"]["name"] = {
            "match": name_match,
            "score": round(name_score, 2),
            "extracted": ext_name,
            "candidate": cand_name
        }

        # 3. DOB Match
        # Flexible format handling could be added here
        ext_dob = extracted.get("dob")
        cand_dob = candidate.get("dob")
        dob_match = ext_dob == cand_dob
        results["details"]["dob"] = {
            "match": dob_match,
            "extracted": ext_dob,
            "candidate": cand_dob
        }

        # Overall logic: CNIC must match OR (Name + DOB match highly)
        # For security, usually CNIC match is strict.
        if cnic_match and name_match:
            results["overall_match"] = True
            results["status"] = "VERIFIED"
        elif cnic_match and not name_match:
            results["overall_match"] = False
            results["status"] = "NAME_MISMATCH"
        elif not cnic_match:
            results["overall_match"] = False
            results["status"] = "CNIC_MISMATCH"
            
        return results
