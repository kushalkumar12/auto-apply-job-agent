"""
Semantic Chunking Service for Skill2Role RAG System.
Divides parsed resume sections into semantically cohesive, context-anchored units.
"""

import re
import hashlib
import uuid
import time
from typing import List, Dict, Any

def redact_pii(text: str) -> str:
    """Redacts emails, phone numbers, addresses, and LinkedIn profile URLs for data minimization."""
    if not text:
        return ""
    # Redact LinkedIn URLs
    text = re.sub(r"https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+", "[LINKEDIN_REDACTED]", text, flags=re.IGNORECASE)
    # Redact Emails
    text = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL_REDACTED]", text)
    # Redact Phone numbers
    text = re.sub(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+91[\s-]?\d{10}|\b\d{10}\b", "[PHONE_REDACTED]", text)
    # Redact Street addresses
    text = re.sub(r"\b\d{1,5}\s+[A-Za-z0-9\s.,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Terrace|Way|Suite|Ste|Floor|Fl)\b[^\n,]*", "[ADDRESS_REDACTED]", text, flags=re.IGNORECASE)
    return text

def chunk_document(parsed_doc: Dict[str, Any], document_id: str, profile_id: str = "default") -> List[Dict[str, Any]]:
    """
    Chunks a parsed document into contextual units.
    Excludes personal contact headers and redacts PII for cloud data minimization.
    """
    chunks = []
    chunk_index = 0
    now = int(time.time() * 1000)

    for section in parsed_doc.get("sections", []):
        sec_type = section.get("section_type", "general")
        sec_title = section.get("section_title", "General")
        lines = section.get("lines", [])

        # Data Minimization: Contact info must NEVER be chunked or sent for external vector embedding
        if sec_type in ("header", "contact", "contacts", "personal_info"):
            continue

        if sec_type == "experience":
            # Group by role/company blocks
            current_anchor = f"Experience: {sec_title}"
            current_bullet_group = []

            for line_item in lines:
                text = line_item["text"].strip()
                if not text:
                    continue

                # If this is a company/role title header line (usually contains dates or company)
                if any(k in text.lower() for k in ["present", "201", "202", "engineer", "lead", "developer", "architect", "manager"]):
                    # If we had prior bullets, flush them
                    if current_bullet_group:
                        raw_chunk = f"[{current_anchor}]\n" + "\n".join(current_bullet_group)
                        chunk_text = redact_pii(raw_chunk)
                        c_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
                        chunks.append({
                            "id": f"chk_{uuid.uuid4().hex[:12]}",
                            "document_id": document_id,
                            "profile_id": profile_id,
                            "section_type": sec_type,
                            "section_title": current_anchor,
                            "chunk_text": chunk_text,
                            "chunk_index": chunk_index,
                            "chunk_hash": c_hash,
                            "created_at": now
                        })
                        chunk_index += 1
                        current_bullet_group = []
                    current_anchor = f"Experience: {text}"
                else:
                    current_bullet_group.append(text)
                    # Keep chunk size reasonable (4-6 bullets max)
                    if len(current_bullet_group) >= 5:
                        raw_chunk = f"[{current_anchor}]\n" + "\n".join(current_bullet_group)
                        chunk_text = redact_pii(raw_chunk)
                        c_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
                        chunks.append({
                            "id": f"chk_{uuid.uuid4().hex[:12]}",
                            "document_id": document_id,
                            "profile_id": profile_id,
                            "section_type": sec_type,
                            "section_title": current_anchor,
                            "chunk_text": chunk_text,
                            "chunk_index": chunk_index,
                            "chunk_hash": c_hash,
                            "created_at": now
                        })
                        chunk_index += 1
                        current_bullet_group = []

            if current_bullet_group:
                raw_chunk = f"[{current_anchor}]\n" + "\n".join(current_bullet_group)
                chunk_text = redact_pii(raw_chunk)
                c_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
                chunks.append({
                    "id": f"chk_{uuid.uuid4().hex[:12]}",
                    "document_id": document_id,
                    "profile_id": profile_id,
                    "section_type": sec_type,
                    "section_title": current_anchor,
                    "chunk_text": chunk_text,
                    "chunk_index": chunk_index,
                    "chunk_hash": c_hash,
                    "created_at": now
                })
                chunk_index += 1

        else:
            # Summary, Skills, Education, Projects
            full_section_text = section.get("text", "").strip()
            if full_section_text:
                raw_chunk = f"[{sec_title}]\n{full_section_text}"
                chunk_text = redact_pii(raw_chunk)
                c_hash = hashlib.sha256(chunk_text.encode("utf-8")).hexdigest()
                chunks.append({
                    "id": f"chk_{uuid.uuid4().hex[:12]}",
                    "document_id": document_id,
                    "profile_id": profile_id,
                    "section_type": sec_type,
                    "section_title": sec_title,
                    "chunk_text": chunk_text,
                    "chunk_index": chunk_index,
                    "chunk_hash": c_hash,
                    "created_at": now
                })
                chunk_index += 1

    return chunks
