from fastapi import APIRouter, BackgroundTasks, Query, HTTPException
from typing import Optional, List
from pydantic import BaseModel

try:
    from ..harvest import sync_harvest, get_harvest_status, HARVEST_SOURCES
except (ImportError, ValueError):
    from harvest import sync_harvest, get_harvest_status, HARVEST_SOURCES

router = APIRouter(prefix="/harvest", tags=["Harvest"])

class HarvestSyncRequest(BaseModel):
    providers: Optional[List[str]] = None
    limitPerSource: Optional[int] = 20

@router.get("/status")
def harvest_status():
    """
    Returns breakdown of harvested jobs vs local database jobs,
    active ATS sources, and timestamp of the last crawl.
    """
    return get_harvest_status()

@router.get("/sources")
def harvest_sources():
    """
    Returns curated list of direct ATS providers and tech company boards.
    """
    return {
        "sources": HARVEST_SOURCES
    }

@router.post("/sync")
def trigger_sync(req: HarvestSyncRequest, background_tasks: BackgroundTasks):
    """
    Initiates direct ATS crawl for Greenhouse, Ashby, Lever, and Remote boards,
    upserting jobs with deduplication directly into SQLite database.
    """
    # For instant feedback and high concurrency, run in thread/background or execute directly
    limit = req.limitPerSource or 15
    providers = req.providers or ["greenhouse", "ashby", "remoteok", "remotive"]
    
    # Run synchronously so caller gets immediate ingestion counts
    result = sync_harvest(providers=providers, limit_per_source=limit)
    return result
