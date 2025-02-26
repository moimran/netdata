from typing import List, Optional, Tuple, Union
import ipaddress
import re
from .ip_constants import IPV4_MASK_MAX, IPV4_MASK_MIN, IPV6_MASK_MAX, IPV6_MASK_MIN

def validate_ip_address(address: str) -> Tuple[bool, Optional[str]]:
    """
    Validate an IP address string.
    Returns (is_valid, error_message).
    """
    try:
        # Split address and mask
        if '/' in address:
            addr, mask = address.split('/')
            mask = int(mask)
        else:
            addr = address
            mask = None
        
        # Try parsing the address
        ip = ipaddress.ip_address(addr)
        
        # Validate mask if provided
        if mask is not None:
            if isinstance(ip, ipaddress.IPv4Address):
                if not (IPV4_MASK_MIN <= mask <= IPV4_MASK_MAX):
                    return False, f"IPv4 mask must be between {IPV4_MASK_MIN} and {IPV4_MASK_MAX}"
            else:
                if not (IPV6_MASK_MIN <= mask <= IPV6_MASK_MAX):
                    return False, f"IPv6 mask must be between {IPV6_MASK_MIN} and {IPV6_MASK_MAX}"
        
        return True, None
    except ValueError as e:
        return False, str(e)

def validate_ip_network(prefix: str) -> Tuple[bool, Optional[str]]:
    """
    Validate an IP network prefix.
    Returns (is_valid, error_message).
    """
    try:
        network = ipaddress.ip_network(prefix, strict=True)
        return True, None
    except ValueError as e:
        return False, str(e)

def validate_dns_name(name: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a DNS name.
    Returns (is_valid, error_message).
    """
    if not name:
        return True, None
        
    # DNS name validation pattern
    pattern = r'^(?![0-9]+$)(?!-)[a-zA-Z0-9-]{,63}(?<!-)$'
    
    # Split into labels and validate each
    labels = name.lower().split('.')
    
    if len(name) > 255:
        return False, "DNS name cannot exceed 255 characters"
        
    for label in labels:
        if not re.match(pattern, label):
            return False, f"Invalid DNS label: {label}"
    
    return True, None

def calculate_ip_range_size(start: str, end: str) -> Tuple[int, Optional[str]]:
    """
    Calculate the size of an IP range.
    Returns (size, error_message).
    """
    try:
        start_ip = ipaddress.ip_address(start)
        end_ip = ipaddress.ip_address(end)
        
        # Ensure same IP version
        if start_ip.version != end_ip.version:
            return 0, "Start and end addresses must be of the same IP version"
            
        # Ensure start <= end
        if start_ip > end_ip:
            return 0, "Start address must be less than or equal to end address"
            
        # Calculate size
        if isinstance(start_ip, ipaddress.IPv4Address):
            size = int(end_ip) - int(start_ip) + 1
        else:
            size = int(end_ip) - int(start_ip) + 1
            
        return size, None
    except ValueError as e:
        return 0, str(e)

def get_available_ips(network: str, used_ips: List[str] = None) -> List[str]:
    """
    Get list of available IPs in a network, excluding used IPs.
    """
    try:
        net = ipaddress.ip_network(network)
        used = {ipaddress.ip_address(ip.split('/')[0]) for ip in (used_ips or [])}
        
        # For IPv4, exclude network and broadcast addresses
        if net.version == 4 and net.prefixlen < 31:
            used.add(net.network_address)
            used.add(net.broadcast_address)
        
        available = []
        for ip in net.hosts():
            if ip not in used:
                available.append(str(ip))
        
        return available
    except ValueError:
        return []

def get_first_available_ip(network: str, used_ips: List[str] = None) -> Optional[str]:
    """Get the first available IP in a network."""
    available = get_available_ips(network, used_ips)
    return available[0] if available else None

def calculate_prefix_utilization(prefix: str, child_prefixes: List[str] = None, 
                               used_ips: List[str] = None) -> float:
    """
    Calculate the utilization percentage of a prefix.
    """
    try:
        network = ipaddress.ip_network(prefix)
        total_addresses = network.num_addresses
        
        # Count addresses in child prefixes
        child_addresses = 0
        if child_prefixes:
            for child in child_prefixes:
                try:
                    child_net = ipaddress.ip_network(child)
                    child_addresses += child_net.num_addresses
                except ValueError:
                    continue
        
        # Count individual IP addresses
        ip_count = len(used_ips) if used_ips else 0
        
        # Calculate utilization
        utilized = max(child_addresses, ip_count)
        return (utilized / total_addresses) * 100
    except ValueError:
        return 0.0

def get_ip_version(address: str) -> Optional[int]:
    """Get IP version (4 or 6) from address string."""
    try:
        ip = ipaddress.ip_interface(address)
        return ip.version
    except ValueError:
        return None

def get_mask_length(address: str) -> Optional[int]:
    """Get mask length from an IP address string."""
    try:
        ip = ipaddress.ip_interface(address)
        return ip.network.prefixlen
    except ValueError:
        return None
