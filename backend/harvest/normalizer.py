import re
import html
from typing import List, Dict, Any, Tuple

COMMON_TECH_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Go", "Golang",
    "Java", "Spring Boot", "Spring", "C++", "C#", ".NET", "Rust", "Ruby", "PHP", "Kotlin", "Swift",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD",
    "FastAPI", "Django", "Flask", "Next.js", "Vue.js", "Angular", "GraphQL",
    "REST API", "Microservices", "Kafka", "RabbitMQ", "Linux", "Git",
    "Machine Learning", "PyTorch", "TensorFlow", "Pandas", "Scikit-Learn",
    "Distributed Systems", "SRE", "DevOps", "Cybersecurity", "Data Engineering",
    "Backend", "Frontend", "Full-Stack", "System Design"
]

def strip_html_tags(text: str) -> str:
    """Removes HTML tags and unescapes HTML entities."""
    if not text:
        return ""
    # Unescape HTML entities first (e.g. &lt;p&gt; -> <p>)
    text = html.unescape(text)
    # Remove HTML tags
    clean = re.sub(r"<[^>]+>", " ", text)
    # Collapse multiple whitespaces and newlines
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean

def extract_skills(text: str) -> List[str]:
    """Finds known technical skills present in text or title."""
    if not text:
        return ["Software Engineering", "Full-Stack"]
    found = []
    text_lower = f" {text.lower()} "
    for skill in COMMON_TECH_SKILLS:
        pattern = r"(?i)\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
            if len(found) >= 8:
                break
    if not found:
        found = ["Software Engineering", "Problem Solving", "System Design"]
    return found

def detect_work_mode(text: str, location_str: str, workplace_type: str = "") -> str:
    """Classifies job into Remote, Hybrid, or On-site."""
    combined = f"{workplace_type} {location_str} {text}".lower()
    if "hybrid" in combined:
        return "Hybrid"
    if any(k in combined for k in ["remote", "anywhere", "work from home", "distributed", "telecommute"]):
        return "Remote"
    return "On-site"

def parse_salary_text(raw_salary: str, min_val: Any = None, max_val: Any = None, currency: str = "$") -> str:
    """Formats salary string into standard readable format."""
    if min_val and max_val:
        try:
            min_k = int(float(min_val) / 1000)
            max_k = int(float(max_val) / 1000)
            cur = currency or "$"
            if min_k > 0 and max_k > 0:
                return f"{cur}{min_k}k - {cur}{max_k}k / yr"
        except (ValueError, TypeError):
            pass
    if raw_salary and any(c.isdigit() for c in str(raw_salary)):
        return str(raw_salary).strip()
    return "$130k - $175k / yr"
