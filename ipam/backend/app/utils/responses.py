from fastapi.responses import JSONResponse
import json
from ipaddress import IPv4Network, IPv6Network
from pydantic import BaseModel
from typing import List, Any

# Define a generic paginated response model
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int

# Override FastAPI's default JSONResponse to use our custom encoder
class CustomJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
            cls=json.JSONEncoder,
            default=lambda o: str(o) if isinstance(o, (IPv4Network, IPv6Network)) else None,
        ).encode("utf-8")
