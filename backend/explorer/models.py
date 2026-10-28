"""
Unified Data Models for Skill2Role Explorer Connectors.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PlatformStatus:
    ONLINE = "online"
    AUTHENTICATION_REQUIRED = "auth_required"
    GUEST_ACTIVE = "guest_active"
    RATE_LIMITED = "rate_limited"
    OFFLINE = "offline"

class ConnectorMetadata(BaseModel):
    id: str
    name: str
    type: str  # "Platform Aggregator" | "Curated Tech" | "Enterprise ATS" | "Startup Ecosystem"
    market: str  # "India & Global" | "India Only" | "Global"
    status: str
    mode: str
    supports_guest: bool = True
    supports_auth: bool = False
    requires_browser: bool = False
    description: str

class UnifiedJob(BaseModel):
    role: str
    company: str
    location: str
    workMode: str = "Hybrid"  # "Hybrid" | "Remote" | "On-site"
    salary: str = "Competitive"
    description: str = ""
    skills: List[str] = Field(default_factory=list)
    url: str = ""
    source: str  # e.g. "LinkedIn (India)", "Instahyre", "Indeed", "Wellfound", "Naukri", "Greenhouse"
    logo: str = ""
    dateTime: str = ""
    atsScore: int = 85
    external_id: str = ""
