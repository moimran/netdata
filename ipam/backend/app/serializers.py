from ipaddress import IPv4Network, IPv6Network
from typing import Any, Dict, List, Optional, Union
import json
from sqlmodel import SQLModel

class IPNetworkJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that can handle IPv4Network and IPv6Network objects."""
    
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (IPv4Network, IPv6Network)):
            return str(obj)
        return super().default(obj)

def jsonable_encoder(
    obj: Any,
    include: Optional[Union[List[str], Dict[str, Any]]] = None,
    exclude: Optional[Union[List[str], Dict[str, Any]]] = None,
    by_alias: bool = True,
    exclude_unset: bool = False,
    exclude_defaults: bool = False,
    exclude_none: bool = False,
    custom_encoder: Optional[Dict[Any, Any]] = None,
    sqlalchemy_safe: bool = True,
) -> Any:
    """
    A replacement for FastAPI's jsonable_encoder that can handle IPv4Network and IPv6Network objects.
    """
    if custom_encoder is None:
        custom_encoder = {}
    
    # Add our custom encoders
    if IPv4Network not in custom_encoder:
        custom_encoder[IPv4Network] = lambda v: str(v)
    if IPv6Network not in custom_encoder:
        custom_encoder[IPv6Network] = lambda v: str(v)
    
    # Import here to avoid circular imports
    from fastapi.encoders import jsonable_encoder as fastapi_jsonable_encoder
    
    return fastapi_jsonable_encoder(
        obj,
        include=include,
        exclude=exclude,
        by_alias=by_alias,
        exclude_unset=exclude_unset,
        exclude_defaults=exclude_defaults,
        exclude_none=exclude_none,
        custom_encoder=custom_encoder,
        sqlalchemy_safe=sqlalchemy_safe,
    )

def model_to_dict(obj: Any) -> Dict[str, Any]:
    """
    Convert a SQLModel object or list of objects to a dictionary or list of dictionaries.
    Handles special types like IPv4Network and IPv6Network by converting them to strings.
    """
    if obj is None:
        return None
    
    if isinstance(obj, list):
        return [model_to_dict(item) for item in obj]
    
    if isinstance(obj, SQLModel):
        result = {}
        for key, value in obj.__dict__.items():
            if key.startswith("_"):
                continue
            
            if isinstance(value, (IPv4Network, IPv6Network)):
                result[key] = str(value)
            elif isinstance(value, SQLModel):
                result[key] = model_to_dict(value)
            elif isinstance(value, list) and value and isinstance(value[0], SQLModel):
                result[key] = [model_to_dict(item) for item in value]
            else:
                result[key] = value
        return result
    
    if isinstance(obj, (IPv4Network, IPv6Network)):
        return str(obj)
    
    return obj
