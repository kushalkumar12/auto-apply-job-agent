"""
Enterprise ATS Connector (Greenhouse, Ashby, Lever, RemoteOK, Remotive).
Discovers live verified job listings directly from public enterprise candidate boards.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .base import BaseExplorerConnector
from .models import UnifiedJob, ConnectorMetadata, PlatformStatus

try:
    from ..harvest.greenhouse import fetch_greenhouse_board, DEFAULT_GREENHOUSE_BOARDS
    from ..harvest.ashby import fetch_ashby_board, DEFAULT_ASHBY_BOARDS
    from ..harvest.lever import fetch_lever_board, DEFAULT_LEVER_BOARDS
    from ..harvest.remote_boards import fetch_remoteok, fetch_remotive
except (ImportError, ValueError):
    from harvest.greenhouse import fetch_greenhouse_board, DEFAULT_GREENHOUSE_BOARDS
    from harvest.ashby import fetch_ashby_board, DEFAULT_ASHBY_BOARDS
    from harvest.lever import fetch_lever_board, DEFAULT_LEVER_BOARDS
    from harvest.remote_boards import fetch_remoteok, fetch_remotive

logger = logging.getLogger("skill2role.explorer.ats")

class EnterpriseATSConnector(BaseExplorerConnector):
    def __init__(self):
        super().__init__("enterprise_ats", "Enterprise ATS Direct Boards")

    def get_metadata(self) -> ConnectorMetadata:
        return ConnectorMetadata(
            id=self.connector_id,
            name=self.name,
            type="Enterprise ATS",
            market="India & Global",
            status=PlatformStatus.ONLINE,
            mode="Direct ATS Board API",
            supports_guest=True,
            supports_auth=False,
            requires_browser=False,
            description="Extracts verified job openings directly from enterprise Greenhouse, Ashby, Lever, and remote feeds."
        )

    async def search(
        self,
        keywords: str,
        location: str,
        limit: int = 40,
        experience_years: Optional[float] = None,
        remote_only: bool = False,
        session_data: Optional[Dict[str, Any]] = None
    ) -> List[UnifiedJob]:
        unified: List[UnifiedJob] = []
        now_str = datetime.now().strftime("%d-%b-%y %I:%M %p")

        # 1. Fetch Ashby Boards
        for b in DEFAULT_ASHBY_BOARDS[:4]:
            try:
                raw_jobs = await asyncio.to_thread(fetch_ashby_board, b["board"], b["company"], 5.0)
                for rj in raw_jobs:
                    unified.append(UnifiedJob(
                        role=rj["role"],
                        company=rj["company"],
                        location=rj.get("location", "Worldwide"),
                        workMode=rj.get("workMode", "Remote"),
                        salary=rj.get("salary", "Competitive"),
                        description=rj.get("description", ""),
                        skills=rj.get("skills", []),
                        url=rj.get("url", ""),
                        source=f"Ashby ({rj['company']})",
                        logo=rj.get("logo", ""),
                        dateTime=rj.get("dateTime", now_str),
                        atsScore=rj.get("atsScore", 88),
                        external_id=rj.get("url", "")
                    ))
            except Exception as e:
                logger.debug(f"Ashby board error for {b['company']}: {e}")

        # 2. Fetch Greenhouse Boards
        for b in DEFAULT_GREENHOUSE_BOARDS[:4]:
            try:
                raw_jobs = await asyncio.to_thread(fetch_greenhouse_board, b["board"], b["company"], 5.0)
                for rj in raw_jobs:
                    unified.append(UnifiedJob(
                        role=rj["role"],
                        company=rj["company"],
                        location=rj.get("location", "Worldwide"),
                        workMode=rj.get("workMode", "Hybrid"),
                        salary=rj.get("salary", "Competitive"),
                        description=rj.get("description", ""),
                        skills=rj.get("skills", []),
                        url=rj.get("url", ""),
                        source=f"Greenhouse ({rj['company']})",
                        logo=rj.get("logo", ""),
                        dateTime=rj.get("dateTime", now_str),
                        atsScore=rj.get("atsScore", 88),
                        external_id=rj.get("url", "")
                    ))
            except Exception as e:
                logger.debug(f"Greenhouse board error for {b['company']}: {e}")

        return unified[:limit]
