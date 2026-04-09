from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class UsageSnapshot:
    provider: str
    credits_used: Optional[float]
    credits_remaining: Optional[float]
    cost_usd: Optional[float]
    raw_response: dict


class BaseAdapter(ABC):
    @abstractmethod
    async def fetch_usage(self) -> UsageSnapshot:
        ...
