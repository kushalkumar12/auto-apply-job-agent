"""
LinkedIn Guest Search Connector for Skill2Role Explorer.
Discovers live verified job listings via LinkedIn's public guest search endpoint
without requiring interactive user authentication, bypassing authwalls and protecting candidate accounts.
"""

import asyncio
import logging
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional
from datetime import datetime
from bs4 import BeautifulSoup

from .base import BaseExplorerConnector
from .models import UnifiedJob, ConnectorMetadata, PlatformStatus

logger = logging.getLogger("skill2role.explorer.linkedin")

class LinkedInGuestConnector(BaseExplorerConnector):
    def __init__(self):
        super().__init__("linkedin", "LinkedIn India & Global")
        self.base_url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }

    def get_metadata(self) -> ConnectorMetadata:
        return ConnectorMetadata(
            id=self.connector_id,
            name=self.name,
            type="Platform Aggregator",
            market="India & Global",
            status=PlatformStatus.ONLINE,
            mode="Live Guest Search Stream",
            supports_guest=True,
            supports_auth=True,
            requires_browser=False,
            description="Searches live LinkedIn job postings without authwalls or account restriction risks."
        )

    def _sync_fetch(self, keywords: str, location: str, start: int = 0) -> List[UnifiedJob]:
        params = {
            "keywords": keywords,
            "location": location,
            "start": str(start)
        }
        query_url = f"{self.base_url}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(query_url, headers=self.headers)
        
        jobs: List[UnifiedJob] = []
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status != 200:
                    logger.warning(f"LinkedIn Guest search returned HTTP {resp.status}")
                    return []
                html = resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            logger.warning(f"LinkedIn Guest search request failed for '{keywords}' in '{location}': {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        cards = soup.find_all("li")
        now_str = datetime.now().strftime("%d-%b-%y %I:%M %p")

        for card in cards:
            try:
                title_el = card.find("h3", class_="base-search-card__title")
                comp_el = card.find("h4", class_="base-search-card__subtitle")
                loc_el = card.find("span", class_="job-search-card__location")
                link_el = card.find("a", class_="base-card__full-link")
                time_el = card.find("time")

                if not title_el or not comp_el:
                    continue

                role = title_el.get_text(strip=True)
                company = comp_el.get_text(strip=True)
                loc_text = loc_el.get_text(strip=True) if loc_el else location

                # Clean raw URL
                raw_url = link_el.get("href", "") if link_el else ""
                clean_url = raw_url.split("?")[0] if raw_url else ""

                date_val = time_el.get_text(strip=True) if time_el else now_str

                # Determine Work Mode
                work_mode = "Hybrid"
                lower_title = role.lower()
                lower_loc = loc_text.lower()
                if "remote" in lower_title or "remote" in lower_loc:
                    work_mode = "Remote"
                elif "on-site" in lower_title or "onsite" in lower_title:
                    work_mode = "On-site"

                # Extract basic skills from title
                detected_skills = []
                for s in ["Java", "Spring Boot", "React", "Python", "SQL", "AWS", "Node.js", "Kubernetes", "Docker", "DevOps"]:
                    if s.lower() in lower_title:
                        detected_skills.append(s)

                jobs.append(UnifiedJob(
                    role=role,
                    company=company,
                    location=loc_text,
                    workMode=work_mode,
                    salary="Competitive",
                    description=f"{role} position at {company} in {loc_text}. Sourced directly via live LinkedIn Discovery.",
                    skills=detected_skills,
                    url=clean_url,
                    source="LinkedIn (India)" if any(it in lower_loc for it in ["india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "delhi", "gurgaon", "noida"]) else "LinkedIn",
                    dateTime=now_str,
                    atsScore=90,
                    external_id=clean_url
                ))
            except Exception as parse_err:
                logger.debug(f"Card parse notice: {parse_err}")
                continue

        return jobs

    async def search(
        self,
        keywords: str,
        location: str,
        limit: int = 20,
        experience_years: Optional[float] = None,
        remote_only: bool = False,
        session_data: Optional[Dict[str, Any]] = None
    ) -> List[UnifiedJob]:
        all_jobs: List[UnifiedJob] = []
        # Fetch batches of 10
        pages = max(1, min(limit // 10, 3))
        for p in range(pages):
            start = p * 10
            batch = await asyncio.to_thread(self._sync_fetch, keywords, location, start)
            if not batch:
                break
            all_jobs.extend(batch)
            if len(all_jobs) >= limit:
                break
        return all_jobs[:limit]
