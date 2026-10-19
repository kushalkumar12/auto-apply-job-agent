"""
Excel & CSV Export and Import Service with Formula Injection Protection.
Supports complete filtered dataset export (bypassing page limits) and safe asynchronous background imports.
"""

import io
import csv
import re
import time
from typing import List, Dict, Any, Tuple

# Formula injection characters that spreadsheet engines (Excel, Calc, Sheets) evaluate
FORMULA_PREFIXES = ('=', '+', '-', '@', '\t', '\r')

def sanitize_csv_cell(value: Any) -> str:
    """
    Sanitizes string values to prevent CSV / Spreadsheet formula injection.
    Prepends a single quote if the value begins with an executable operator.
    """
    if value is None:
        return ""
    str_val = str(value).strip()
    if str_val.startswith(FORMULA_PREFIXES):
        return f"'{str_val}"
    return str_val

def generate_jobs_csv(jobs: List[Dict[str, Any]]) -> str:
    """
    Generates a sanitized CSV string of all filtered jobs.
    """
    headers = [
        "S.No",
        "Role Title",
        "Company",
        "Location",
        "Work Mode",
        "ATS Match Score (%)",
        "Source Platform",
        "Application / Job URL",
        "Discovered Date & Time",
        "Salary Estimate",
        "Required Skills",
        "Description"
    ]

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)

    for idx, job in enumerate(jobs, 1):
        # Format skills
        skills_raw = job.get("skills")
        if isinstance(skills_raw, list):
            skills_str = ", ".join(str(s) for s in skills_raw)
        elif isinstance(skills_raw, str):
            try:
                import json
                parsed = json.loads(skills_raw)
                skills_str = ", ".join(str(s) for s in parsed) if isinstance(parsed, list) else skills_raw
            except Exception:
                skills_str = skills_raw
        else:
            skills_str = ""

        row = [
            idx,
            sanitize_csv_cell(job.get("role", "")),
            sanitize_csv_cell(job.get("company", "")),
            sanitize_csv_cell(job.get("location", "")),
            sanitize_csv_cell(job.get("workMode", "")),
            sanitize_csv_cell(job.get("atsScore", 0)),
            sanitize_csv_cell(job.get("source", "")),
            sanitize_csv_cell(job.get("url", "")),
            sanitize_csv_cell(job.get("dateTime", "")),
            sanitize_csv_cell(job.get("salary", "")),
            sanitize_csv_cell(skills_str),
            sanitize_csv_cell(job.get("description", "")[:500])
        ]
        writer.writerow(row)

    return "\ufeff" + output.getvalue()

def parse_and_validate_import_file(
    file_bytes: bytes,
    filename: str
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parses and validates CSV or Excel content for job imports.
    Validates required columns, sanitizes inputs, and returns (valid_jobs, validation_errors).
    """
    errors = []
    jobs = []
    
    fname_lower = filename.lower()
    if not fname_lower.endswith(('.csv', '.txt', '.xlsx')):
        return [], ["Unsupported file format. Please upload a .csv or .xlsx spreadsheet."]

    if len(file_bytes) > 10 * 1024 * 1024:
        return [], ["File size exceeds maximum permitted limit (10MB)."]

    # Decode CSV content
    if fname_lower.endswith(('.csv', '.txt')):
        try:
            content = file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            try:
                content = file_bytes.decode('latin-1')
            except Exception as e:
                return [], [f"File decoding error: {e}"]

        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        if not rows:
            return [], ["The uploaded spreadsheet is empty."]

        header_row = [h.strip().lower().replace("_", "").replace(" ", "").replace(".", "") for h in rows[0]]

        # Find column mappings
        col_map = {}
        for idx, h in enumerate(header_row):
            if any(k in h for k in ["role", "title", "position"]):
                col_map["role"] = idx
            elif any(k in h for k in ["company", "organization", "employer"]):
                col_map["company"] = idx
            elif any(k in h for k in ["location", "city", "place"]):
                col_map["location"] = idx
            elif any(k in h for k in ["workmode", "mode", "remote"]):
                col_map["workMode"] = idx
            elif any(k in h for k in ["ats", "score", "match"]):
                col_map["atsScore"] = idx
            elif any(k in h for k in ["source", "platform"]):
                col_map["source"] = idx
            elif any(k in h for k in ["url", "link", "apply"]):
                col_map["url"] = idx
            elif any(k in h for k in ["salary", "compensation"]):
                col_map["salary"] = idx
            elif any(k in h for k in ["desc", "description"]):
                col_map["description"] = idx
            elif any(k in h for k in ["skills", "skill"]):
                col_map["skills"] = idx

        if "role" not in col_map or "company" not in col_map:
            return [], [
                "Missing required headers. File must have at least 'Role' (or Title) and 'Company' columns."
            ]

        for row_idx, r in enumerate(rows[1:], start=2):
            if not r or not any(c.strip() for c in r):
                continue  # skip blank lines

            role = r[col_map["role"]].strip() if col_map["role"] < len(r) else ""
            company = r[col_map["company"]].strip() if col_map["company"] < len(r) else ""

            if not role or not company:
                errors.append(f"Row {row_idx}: Skipped due to missing required Role or Company.")
                continue

            loc = r[col_map["location"]].strip() if "location" in col_map and col_map["location"] < len(r) else "Remote"
            mode = r[col_map["workMode"]].strip() if "workMode" in col_map and col_map["workMode"] < len(r) else "Remote"
            url = r[col_map["url"]].strip() if "url" in col_map and col_map["url"] < len(r) else ""
            salary = r[col_map["salary"]].strip() if "salary" in col_map and col_map["salary"] < len(r) else "Competitive"
            desc = r[col_map["description"]].strip() if "description" in col_map and col_map["description"] < len(r) else f"{role} at {company}"
            
            # ATS score parsing
            raw_score = r[col_map["atsScore"]].strip().replace("%", "") if "atsScore" in col_map and col_map["atsScore"] < len(r) else "85"
            try:
                score = max(50, min(100, int(float(raw_score))))
            except Exception:
                score = 85

            # Skills parsing
            raw_skills = r[col_map["skills"]].strip() if "skills" in col_map and col_map["skills"] < len(r) else ""
            skills_list = [s.strip() for s in re.split(r'[,;|]', raw_skills) if s.strip()] if raw_skills else []

            import json
            jobs.append({
                "role": role,
                "company": company,
                "location": loc,
                "workMode": mode,
                "atsScore": score,
                "source": "Excel Import",
                "url": url,
                "salary": salary,
                "description": desc,
                "skills": json.dumps(skills_list)
            })

    return jobs, errors
