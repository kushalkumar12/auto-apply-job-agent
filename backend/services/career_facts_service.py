"""
Career Facts Extraction Service for Skill2Role RAG System.
Extracts grounded, atomic, verifiable career assertions from parsed master resume sections.
"""

import re
import uuid
import time
from typing import List, Dict, Any, Optional

try:
    from .chunking_service import redact_pii
except (ImportError, ValueError):
    from services.chunking_service import redact_pii

# Common technical taxonomy for skill discretization
KNOWN_TECH_TOKENS = {
    "java", "python", "javascript", "typescript", "golang", "c++", "c#", "rust",
    "spring", "spring boot", "django", "fastapi", "flask", "react", "next.js", "angular", "vue",
    "nodejs", "node.js", "express", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "cassandra", "kafka", "rabbitmq", "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "helm", "ci/cd", "jenkins", "github actions", "gitlab", "graphql", "rest api", "microservices",
    "grpc", "sql", "nosql", "linux", "git", "playwright", "selenium", "pytest", "junit"
}

METRIC_REGEX = re.compile(r"(\d+(?:\.\d+)?%\s*(?:increase|reduction|improvement|growth|latency)?|\$\d+(?:\.\d+)?(?:\s*[kKmMbB])?|\b\d+\+\s*(?:years?|engineers?|clients?|microservices?|team members?)\b)", re.IGNORECASE)
DATE_TENURE_REGEX = re.compile(r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\.?\s*\b20\d\d\b\s*(?:-|–|to)\s*(?:present|current|\b20\d\d\b|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\.?\s*\b20\d\d\b))", re.IGNORECASE)
DEGREE_REGEX = re.compile(r"\b(b\.?tech|b\.?e\.?|m\.?tech|m\.?s\.?|b\.?s\.?|bca|mca|bba|mba|ph\.?d|bachelor|master|doctorate)\b", re.IGNORECASE)

def extract_career_facts(parsed_doc: Dict[str, Any], document_id: str, profile_id: str = "default") -> List[Dict[str, Any]]:
    """
    Extracts atomic career facts from parsed document sections.
    """
    facts = []
    now = int(time.time() * 1000)

    for section in parsed_doc.get("sections", []):
        sec_type = section.get("section_type", "other")
        sec_title = section.get("section_title", "")
        lines = section.get("lines", [])

        if sec_type == "skills":
            # Extract discrete technical skills
            raw_content = section.get("text", "")
            # Split by commas, bullets, pipes, newlines, colons, semicolons
            tokens = re.split(r"[,|\n•\-\/:;]+", raw_content)
            category_headers = {
                "languages", "frameworks", "libraries", "tools", "databases", "platforms",
                "cloud", "devops", "cloud & devops", "distributed systems", "methodologies",
                "core competencies", "technical skills", "skills", "technologies"
            }
            for t in tokens:
                clean = re.sub(r"^[a-zA-Z\s]+:\s*", "", t).strip()
                if clean.lower() in category_headers:
                    continue
                if clean and len(clean) >= 2 and len(clean) <= 40:
                    facts.append({
                        "id": f"fact_{uuid.uuid4().hex[:12]}",
                        "document_id": document_id,
                        "profile_id": profile_id,
                        "fact_type": "skill",
                        "fact_text": clean,
                        "normalized_value": clean.lower(),
                        "verification_status": "confirmed",
                        "source_section": sec_title,
                        "source_line": lines[0]["line_no"] if lines else 0,
                        "created_at": now
                    })

        elif sec_type == "experience":
            # Parse employment blocks and bullets
            current_role_title = None
            current_company = None

            for line_item in lines:
                text = line_item["text"]
                line_no = line_item["line_no"]

                # Check for date tenure in line (indicates employment header)
                date_match = DATE_TENURE_REGEX.search(text)
                if date_match:
                    tenure_str = date_match.group(1).strip()
                    # Likely title / company line
                    parts = [p.strip() for p in re.split(r"[-–|@,]+", text) if p.strip()]
                    facts.append({
                        "id": f"fact_{uuid.uuid4().hex[:12]}",
                        "document_id": document_id,
                        "profile_id": profile_id,
                        "fact_type": "employment",
                        "fact_text": redact_pii(text),
                        "normalized_value": tenure_str,
                        "verification_status": "confirmed",
                        "source_section": sec_title,
                        "source_line": line_no,
                        "created_at": now
                    })
                    current_role_title = parts[0] if parts else "Role"
                    continue

                # Bullet points
                if text.startswith(("-", "•", "*", "–")) or len(text) > 25:
                    clean_bullet = re.sub(r"^[\s•\-\*–]+", "", text).strip()
                    
                    # Check for metrics
                    metrics_found = METRIC_REGEX.findall(clean_bullet)
                    fact_type = "achievement" if metrics_found else "responsibility"

                    facts.append({
                        "id": f"fact_{uuid.uuid4().hex[:12]}",
                        "document_id": document_id,
                        "profile_id": profile_id,
                        "fact_type": fact_type,
                        "fact_text": redact_pii(clean_bullet),
                        "normalized_value": ", ".join(metrics_found) if metrics_found else None,
                        "verification_status": "confirmed",
                        "source_section": f"Experience: {current_role_title or sec_title}",
                        "source_line": line_no,
                        "created_at": now
                    })

                    # If metrics found, also index a standalone metric fact for strict verification
                    for m in metrics_found:
                        facts.append({
                            "id": f"fact_{uuid.uuid4().hex[:12]}",
                            "document_id": document_id,
                            "profile_id": profile_id,
                            "fact_type": "metric",
                            "fact_text": f"Metric claim: {m} in '{clean_bullet[:60]}...'",
                            "normalized_value": m.lower().strip(),
                            "verification_status": "confirmed",
                            "source_section": f"Experience: {current_role_title or sec_title}",
                            "source_line": line_no,
                            "created_at": now
                        })

        elif sec_type == "education":
            for line_item in lines:
                text = line_item["text"]
                deg_match = DEGREE_REGEX.search(text)
                facts.append({
                    "id": f"fact_{uuid.uuid4().hex[:12]}",
                    "document_id": document_id,
                    "profile_id": profile_id,
                    "fact_type": "education",
                    "fact_text": text,
                    "normalized_value": deg_match.group(0).lower() if deg_match else text[:30],
                    "verification_status": "confirmed",
                    "source_section": sec_title,
                    "source_line": line_item["line_no"],
                    "created_at": now
                })

        elif sec_type == "summary":
            summary_text = section.get("text", "").strip()
            if summary_text:
                facts.append({
                    "id": f"fact_{uuid.uuid4().hex[:12]}",
                    "document_id": document_id,
                    "profile_id": profile_id,
                    "fact_type": "summary",
                    "fact_text": redact_pii(summary_text),
                    "normalized_value": summary_text[:50],
                    "verification_status": "confirmed",
                    "source_section": sec_title,
                    "source_line": lines[0]["line_no"] if lines else 0,
                    "created_at": now
                })

    return facts
