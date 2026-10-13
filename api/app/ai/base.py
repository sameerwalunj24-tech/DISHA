from abc import ABC, abstractmethod
from typing import Dict, Any
from api.app.ai.schemas import StructuredProfile

class BaseLLMAdapter(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    async def extract_profile(self, answers: Dict[str, Any]) -> StructuredProfile:
        """
        Converts raw question answers into a validated StructuredProfile.
        """
        pass
