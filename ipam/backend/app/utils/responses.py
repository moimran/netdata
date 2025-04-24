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
            
        # Handle dictionaries (including response with 'items' list)
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                if isinstance(value, (IPv4Network, IPv6Network)):
                    result[key] = str(value)
                elif isinstance(value, list):
                    # Handle lists of objects
                    result[key] = [self.custom_encoder(item) for item in value]
                else:
                    result[key] = value
            return result
            
        # Handle lists directly
        if isinstance(obj, list):
            return [self.custom_encoder(item) for item in obj]
        
        # Handle objects with __dict__ attribute (like SQLModel instances)
        if hasattr(obj, "__dict__"):
            obj_dict = obj.__dict__.copy()
            # Handle nested IPv4Network/IPv6Network objects
            for key, value in obj_dict.items():
                if isinstance(value, (IPv4Network, IPv6Network)):
                    obj_dict[key] = str(value)
                elif isinstance(value, list):
                    # Handle lists of objects
                    obj_dict[key] = [self.custom_encoder(item) for item in value]
            return obj_dict
        
        # Default case for other types
        return str(obj)
