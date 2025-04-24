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
            default=self.custom_encoder,
        ).encode("utf-8")
    
    def custom_encoder(self, obj):
        # Handle IPv4Network/IPv6Network objects
        if isinstance(obj, (IPv4Network, IPv6Network)):
            return str(obj)
        
        # Handle objects with __dict__ attribute (like SQLModel instances)
        if hasattr(obj, "__dict__"):
            obj_dict = obj.__dict__.copy()
            # Handle nested IPv4Network/IPv6Network objects
            for key, value in obj_dict.items():
                if isinstance(value, (IPv4Network, IPv6Network)):
                    obj_dict[key] = str(value)
            return obj_dict
        
        # Default case for other types
        return str(obj)
