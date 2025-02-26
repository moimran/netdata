from typing import Any, Optional, Type, Union
from ipaddress import IPv4Network, IPv6Network, ip_network
from sqlalchemy import TypeDecorator
from sqlalchemy.dialects.postgresql import CIDR
from netaddr import IPNetwork, AddrFormatError
from sqlmodel import Field
import re

# BGP ASN bounds
BGP_ASN_MIN = 1
BGP_ASN_MAX = 2**32 - 1

class IPNetworkType(TypeDecorator):
    """Custom type for storing IP networks using PostgreSQL's CIDR type."""
    
    impl = CIDR
    cache_ok = True

    def process_bind_param(self, value: Optional[Union[str, IPv4Network, IPv6Network]], dialect: Any) -> Optional[str]:
        """Convert Python value to database value."""
        if value is None:
            return None
        if isinstance(value, (IPv4Network, IPv6Network)):
            return str(value)
        return str(ip_network(value))

    def process_result_value(self, value: Optional[str], dialect: Any) -> Optional[Union[IPv4Network, IPv6Network]]:
        """Convert database value to Python value."""
        if value is None:
            return None
        return ip_network(value)

class CIDRField:
    """Field type for IP networks using CIDR notation"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v: Any) -> IPNetwork:
        if isinstance(v, IPNetwork):
            return v
        try:
            return IPNetwork(str(v))
        except (AddrFormatError, ValueError) as e:
            raise ValueError(f"Invalid CIDR notation: {v}") from e

    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        _schema: Any,
        _handler: Any,
    ) -> Any:
        return {
            "type": "string",
            "format": "cidr"
        }

def IPNetworkField(
    *,
    default: Any = None,
    nullable: bool = False,
    index: bool = False,
    sa_type: Any = IPNetworkType,
    **kwargs: Any,
) -> Any:
    """Create a Field for storing IP networks"""
    if default is not None:
        default = IPNetwork(str(default))
    
    return Field(
        default=default,
        nullable=nullable,
        index=index,
        sa_type=sa_type,
        **kwargs,
    )

class ASNField:
    """Field type for ASN numbers"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v: Any) -> int:
        try:
            v = int(v)
        except (TypeError, ValueError):
            raise ValueError("ASN must be an integer")
        
        if not BGP_ASN_MIN <= v <= BGP_ASN_MAX:
            raise ValueError(f"ASN must be between {BGP_ASN_MIN} and {BGP_ASN_MAX}")
        
        return v
    
    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        _schema: Any,
        _handler: Any,
    ) -> Any:
        return {
            "type": "integer",
            "minimum": BGP_ASN_MIN,
            "maximum": BGP_ASN_MAX
        }

def ASNNumberField(
    *,
    default: Any = None,
    nullable: bool = False,
    index: bool = False,
    **kwargs: Any,
) -> Any:
    """Create a Field for storing ASN numbers"""
    return Field(
        default=default,
        nullable=nullable,
        index=index,
        sa_type=Any,
        **kwargs,
    )

class DNSNameStr(str):
    """Custom string type for DNS names with validation"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
        
    @classmethod
    def validate(cls, v: str) -> str:
        if not v:
            return v
            
        if len(v) > 255:
            raise ValueError("DNS name cannot exceed 255 characters")
            
        allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.")
        if not all(c in allowed for c in v):
            raise ValueError("DNS name contains invalid characters")
            
        if v[0] == "." or v[-1] == ".":
            raise ValueError("DNS name cannot start or end with a dot")
            
        if ".." in v:
            raise ValueError("DNS name cannot contain consecutive dots")
            
        # Check DNS name format using regex
        pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$"
        if not re.match(pattern, v):
            raise ValueError("Invalid DNS name format")
            
        return v.lower()
    
    @classmethod
    def __get_pydantic_json_schema__(
        cls,
        _schema: Any,
        _handler: Any,
    ) -> Any:
        return {
            "type": "string",
            "format": "dns-name",
            "pattern": "^[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*$",
            "maxLength": 255
        }

def DNSNameField(
    *,
    default: Any = None,
    nullable: bool = False,
    **kwargs: Any,
) -> Any:
    """Create a Field for storing DNS names"""
    return Field(
        default=default,
        nullable=nullable,
        sa_type=Any,
        **kwargs,
    )
