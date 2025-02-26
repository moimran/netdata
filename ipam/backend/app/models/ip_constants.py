from enum import Enum

class IPAddressStatusEnum(str, Enum):
    ACTIVE = "active"
    RESERVED = "reserved"
    DEPRECATED = "deprecated"
    DHCP = "dhcp"
    SLAAC = "slaac"

class IPAddressRoleEnum(str, Enum):
    LOOPBACK = "loopback"
    SECONDARY = "secondary"
    VIP = "vip"
    VRRP = "vrrp"
    HSRP = "hsrp"
    GLBP = "glbp"
    ANYCAST = "anycast"

class IPRangeStatusEnum(str, Enum):
    ACTIVE = "active"
    RESERVED = "reserved"
    DEPRECATED = "deprecated"

class PrefixStatusEnum(str, Enum):
    CONTAINER = "container"
    ACTIVE = "active"
    RESERVED = "reserved"
    DEPRECATED = "deprecated"

# Constants for validation
VLAN_VID_MIN = 1
VLAN_VID_MAX = 4094

# IPv4 and IPv6 validation constants
IPV4_MASK_MIN = 1
IPV4_MASK_MAX = 32
IPV6_MASK_MIN = 1
IPV6_MASK_MAX = 128
