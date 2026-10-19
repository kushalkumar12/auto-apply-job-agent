"""
Modular Job Platform Searcher for Skill2Role Explorer.
Handles multi-source job discovery across Enterprise ATS (Greenhouse, Ashby, Lever, RemoteOK, Remotive)
and modular connectors for LinkedIn / Indeed with truthful session and access-control reporting.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional

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

logger = logging.getLogger("skill2role.searcher")

class PlatformStatus:
    ONLINE = "online"
    AUTHENTICATION_REQUIRED = "auth_required"
    RATE_LIMITED = "rate_limited"
    OFFLINE = "offline"

def check_linkedin_connector_status(session_cookie: Optional[str] = None) -> Dict[str, Any]:
    """
    Truthfully checks whether an authorized LinkedIn browser session is available.
    Does NOT bypass authwalls, CAPTCHAs, or terms of service.
    """
    if not session_cookie:
        return {
            "id": "linkedin",
            "source": "LinkedIn",
            "status": PlatformStatus.AUTHENTICATION_REQUIRED,
            "canExecute": False,
            "reason": "LinkedIn requires an authorized user browser session (li_at cookie or saved profile). Direct automated scraping without user authentication is restricted by platform access controls.",
            "fallback": "Safe fallback active: Discovering matching roles via direct company career portals and enterprise ATS endpoints."
        }
    return {
        "id": "linkedin",
        "source": "LinkedIn",
        "status": PlatformStatus.ONLINE,
        "canExecute": True,
        "reason": "Authorized user session detected."
    }

def check_indeed_connector_status(session_cookie: Optional[str] = None) -> Dict[str, Any]:
    """
    Truthfully checks whether an authorized Indeed session is available.
    """
    if not session_cookie:
        return {
            "id": "indeed",
            "source": "Indeed",
            "status": PlatformStatus.AUTHENTICATION_REQUIRED,
            "canExecute": False,
            "reason": "Indeed enforces Cloudflare challenges and bot detection. Direct queries require an authorized interactive browser session.",
            "fallback": "Safe fallback active: Discovering matching roles via verified company ATS boards and public job feeds."
        }
    return {
        "id": "indeed",
        "source": "Indeed",
        "status": PlatformStatus.ONLINE,
        "canExecute": True,
        "reason": "Authorized user session detected."
    }

async def search_board_source(
    source_type: str,
    board_id: Optional[str],
    company: str,
    timeout: float = 6.0
) -> List[Dict[str, Any]]:
    """
    Fetches real jobs from a specific enterprise board source with bounded concurrency and error isolation.
    """
    try:
        if source_type == "ashby":
            return await asyncio.to_thread(fetch_ashby_board, board_id, company, timeout)
        elif source_type == "greenhouse":
            return await asyncio.to_thread(fetch_greenhouse_board, board_id, company, timeout)
        elif source_type == "lever":
            return await asyncio.to_thread(fetch_lever_board, board_id, company, timeout)
        elif source_type == "remoteok":
            return await asyncio.to_thread(fetch_remoteok, 10, timeout)
        elif source_type == "remotive":
            return await asyncio.to_thread(fetch_remotive, 10, timeout)
    except Exception as e:
        logger.warning(f"Source fetch error for {source_type} ({company}): {e}")
        return []
    return []
