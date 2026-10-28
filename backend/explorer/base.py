"""
Base Connector Interface for Skill2Role Job Explorer.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from .models import UnifiedJob, ConnectorMetadata

class BaseExplorerConnector(ABC):
    """
    Abstract Base Class for all Explorer Job Platform Connectors.
    Supports asynchronous extraction, health/status checking, and session handling.
    """

    def __init__(self, connector_id: str, name: str):
        self.connector_id = connector_id
        self.name = name

    @abstractmethod
    def get_metadata(self) -> ConnectorMetadata:
        """Returns metadata about the connector capabilities and authentication status."""
        pass

    @abstractmethod
    async def search(
        self,
        keywords: str,
        location: str,
        limit: int = 20,
        experience_years: Optional[float] = None,
        remote_only: bool = False,
        session_data: Optional[Dict[str, Any]] = None
    ) -> List[UnifiedJob]:
        """
        Executes a job discovery query on the platform and returns a standardized list of UnifiedJob.
        """
        pass
