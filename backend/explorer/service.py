"""
Discovery Orchestrator Service for Skill2Role Explorer.
Coordinates multi-platform discovery runs across LinkedIn, Indeed, Naukri, and Enterprise ATS boards.
Applies 3-Pillar validation (Skills + Experience + Location) and upserts discovered roles into jobs.db.
"""

import asyncio
import logging
import json
import time
from typing import List, Dict, Any, Optional

from .models import UnifiedJob, ConnectorMetadata
from .linkedin_guest import LinkedInGuestConnector
from .ats_connector import EnterpriseATSConnector
from .naukri_connector import NaukriConnector

try:
    from ..database import get_db
    from ..harvest.service import upsert_harvested_job
except (ImportError, ValueError):
    from database import get_db
    from harvest.service import upsert_harvested_job

logger = logging.getLogger("skill2role.explorer.service")

class ExplorerOrchestrator:
    def __init__(self):
        self.connectors = [
            LinkedInGuestConnector(),
            EnterpriseATSConnector(),
            NaukriConnector()
        ]

    def list_connectors(self) -> List[Dict[str, Any]]:
        """Returns metadata and health status for all registered platform connectors."""
        return [c.get_metadata().model_dump() for c in self.connectors]

    async def run_discovery(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        experience_years: Optional[float] = None,
        limit_per_platform: int = 15,
        profile_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Executes an asynchronous discovery sweep across all active platform connectors.
        Normalizes and upserts all discovered jobs into the local SQLite database.
        """
        start_time = time.time()
        
        # 1. Load active profile 3 pillars if not explicitly passed
        profile_skills: List[str] = []
        user_loc = location or "Bengaluru, Karnataka, India"
        user_exp = experience_years

        with get_db() as conn:
            cur = conn.cursor()
            p_row = cur.execute("SELECT data FROM candidate_profiles WHERE is_active = 1 LIMIT 1").fetchone()
            if not p_row:
                p_row = cur.execute("SELECT data FROM profile WHERE id = ?", (profile_id,)).fetchone()
            
            if p_row and p_row["data"]:
                try:
                    p_data = json.loads(p_row["data"])
                    prim_skills = p_data.get("primarySkills") or [p_data.get("primarySkill")] or []
                    profile_skills = [str(s).strip() for s in prim_skills if str(s).strip()]
                    if not keywords and profile_skills:
                        keywords = profile_skills[0]
                    if user_exp is None and p_data.get("experienceYears") is not None:
                        user_exp = float(p_data.get("experienceYears"))
                    if not location and p_data.get("userLocation"):
                        user_loc = p_data.get("userLocation")
                except Exception as e:
                    logger.debug(f"Profile load notice: {e}")

        search_kw = keywords or "Software Engineer"
        target_loc = user_loc or "Bengaluru, India"

        logger.info(f"Starting Explorer discovery sweep: Keywords='{search_kw}', Location='{target_loc}'")

        # 2. Concurrently execute across connectors
        tasks = []
        for connector in self.connectors:
            tasks.append(
                connector.search(
                    keywords=search_kw,
                    location=target_loc,
                    limit=limit_per_platform,
                    experience_years=user_exp
                )
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        discovered_jobs: List[UnifiedJob] = []
        for res in results:
            if isinstance(res, list):
                discovered_jobs.extend(res)
            elif isinstance(res, Exception):
                logger.warning(f"Connector task error: {res}")

        # 3. Upsert discovered jobs into SQLite database
        total_inserted = 0
        total_updated = 0
        with get_db() as conn:
            for uj in discovered_jobs:
                try:
                    job_dict = {
                        "role": uj.role,
                        "company": uj.company,
                        "location": uj.location,
                        "workMode": uj.workMode,
                        "salary": uj.salary,
                        "description": uj.description,
                        "skills": uj.skills,
                        "url": uj.url,
                        "source": uj.source,
                        "logo": uj.logo,
                        "dateTime": uj.dateTime,
                        "atsScore": uj.atsScore
                    }
                    inserted = upsert_harvested_job(conn, job_dict, profile_skills, profile_id)
                    if inserted:
                        total_inserted += 1
                    else:
                        total_updated += 1
                except Exception as up_err:
                    logger.debug(f"Job upsert notice: {up_err}")

        elapsed = round(time.time() - start_time, 2)
        logger.info(f"Discovery complete in {elapsed}s: Discovered={len(discovered_jobs)}, Inserted={total_inserted}, Updated={total_updated}")

        return {
            "success": True,
            "keywords": search_kw,
            "location": target_loc,
            "totalDiscovered": len(discovered_jobs),
            "totalInserted": total_inserted,
            "totalUpdated": total_updated,
            "durationSeconds": elapsed,
            "activeConnectors": [c.name for c in self.connectors]
        }

# Global orchestrator singleton instance
explorer_orchestrator = ExplorerOrchestrator()
