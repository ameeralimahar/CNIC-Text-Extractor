import re

def clean_ocr_text(raw_lines: list[str]) -> str:
    """
    Cleans OCR output by removing excessive whitespace, merging broken lines,
    and isolating potential CNIC numbers or dates.
    """
    cleaned_lines = []
    for line in raw_lines:
        # Remove multiple spaces
        line = re.sub(r'\s+', ' ', line).strip()
        if not line:
            continue
        
        # Basic cleanup: if it matches a CNIC format loosely, enforce it
        cnic_match = re.search(r'(\d{5})[\s-]*(\d{7})[\s-]*(\d{1})', line)
        if cnic_match:
            line = f"{cnic_match.group(1)}-{cnic_match.group(2)}-{cnic_match.group(3)}"
            
        # Basic cleanup: if it matches a Date format (DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY)
        date_match = re.search(r'(\d{2})[./-](\d{2})[./-](\d{4})', line)
        if date_match:
            # We don't overwrite the whole line as there might be labels like "Date of Birth: 01.01.1990"
            # But we can normalize the date format
            formatted_date = f"{date_match.group(1)}.{date_match.group(2)}.{date_match.group(3)}"
            line = re.sub(r'(\d{2})[./-](\d{2})[./-](\d{4})', formatted_date, line)

        cleaned_lines.append(line)
        
    return "\n".join(cleaned_lines)
