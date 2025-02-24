from typing import Optional, List, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer
import ipaddress

class Region(SQLModel, table=True):
    __tablename__ = "ipam_region"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="ipam_region.id")
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    children: List["Region"] = Relationship(back_populates="parent")
    parent: Optional["Region"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": lambda: [Region.__table__.c.id]}
    )
    sites: List["Site"] = Relationship(back_populates="region")

class SiteGroup(SQLModel, table=True):
    __tablename__ = "ipam_sitegroup"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="ipam_sitegroup.id")
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    children: List["SiteGroup"] = Relationship(back_populates="parent")
    parent: Optional["SiteGroup"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": lambda: [SiteGroup.__table__.c.id]}
    )
    sites: List["Site"] = Relationship(back_populates="site_group")

class Site(SQLModel, table=True):
    __tablename__ = "ipam_site"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    status: str = Field(index=True)  # active, planned, staging, decommissioning, retired
    region_id: Optional[int] = Field(default=None, foreign_key="ipam_region.id")
    site_group_id: Optional[int] = Field(default=None, foreign_key="ipam_sitegroup.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    region: Optional[Region] = Relationship(back_populates="sites")
    site_group: Optional[SiteGroup] = Relationship(back_populates="sites")
    locations: List["Location"] = Relationship(back_populates="site")
    prefixes: List["Prefix"] = Relationship(back_populates="site")

class Location(SQLModel, table=True):
    __tablename__ = "ipam_location"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    slug: str = Field(index=True, unique=True)
    site_id: int = Field(foreign_key="ipam_site.id")
    parent_id: Optional[int] = Field(default=None, foreign_key="ipam_location.id")
    status: str = Field(index=True)  # active, planned, staging, decommissioning, retired
    tenant_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    site: Site = Relationship(back_populates="locations")
    children: List["Location"] = Relationship(back_populates="parent")
    parent: Optional["Location"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": lambda: [Location.__table__.c.id]}
    )

class VRF(SQLModel, table=True):
    __tablename__ = "vrfs"
    
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    rd: str = Field(unique=True, description="Route Distinguisher")
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    prefixes: List["Prefix"] = Relationship(back_populates="vrf")
    subnets: List["Subnet"] = Relationship(back_populates="vrf")
    ip_ranges: List["IPRange"] = Relationship(back_populates="vrf")

class VLAN(SQLModel, table=True):
    __tablename__ = "vlans"
    
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    vid: int = Field(index=True, description="VLAN ID (1-4094)")
    name: str
    status: str = Field(default="active")
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    subnets: List["Subnet"] = Relationship(back_populates="vlan")

class Subnet(SQLModel, table=True):
    __tablename__ = "subnets"
    
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    network: str = Field(index=True)
    prefix_length: int = Field(index=True)
    description: Optional[str] = None
    vlan_id: Optional[int] = Field(default=None, foreign_key="vlans.id")
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    status: str = Field(default="active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    vrf: Optional[VRF] = Relationship(back_populates="subnets")
    vlan: Optional[VLAN] = Relationship(back_populates="subnets")
    ip_addresses: List["IPAddress"] = Relationship(back_populates="subnet")

class RIR(SQLModel, table=True):
    __tablename__ = "ipam_rir"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    slug: str = Field(index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
        
    # Relationships
    aggregates: List["Aggregate"] = Relationship(back_populates="rir")

class Aggregate(SQLModel, table=True):
    __tablename__ = "ipam_aggregate"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    prefix: str = Field(index=True)  # CIDR notation
    rir_id: int = Field(foreign_key="ipam_rir.id")
    date_added: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None
    
    # Relationships
    rir: RIR = Relationship(back_populates="aggregates")
    prefixes: List["Prefix"] = Relationship(back_populates="aggregate")

class Role(SQLModel, table=True):
    __tablename__ = "ipam_role"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    name: str = Field(index=True)
    slug: str = Field(index=True)
    description: Optional[str] = None
        
    # Relationships
    prefixes: List["Prefix"] = Relationship(back_populates="role")

class Prefix(SQLModel, table=True):
    __tablename__ = "ipam_prefix"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    prefix: str = Field(index=True)  # CIDR notation
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    aggregate_id: Optional[int] = Field(default=None, foreign_key="ipam_aggregate.id")
    role_id: Optional[int] = Field(default=None, foreign_key="ipam_role.id")
    site_id: Optional[int] = Field(default=None, foreign_key="ipam_site.id")
    status: str = Field(index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    vrf: Optional[VRF] = Relationship(back_populates="prefixes")
    aggregate: Optional[Aggregate] = Relationship(back_populates="prefixes")
    role: Optional[Role] = Relationship(back_populates="prefixes")
    site: Optional[Site] = Relationship(back_populates="prefixes")
    ip_addresses: List["IPAddress"] = Relationship(back_populates="prefix")
    ip_ranges: List["IPRange"] = Relationship(back_populates="prefix")

class IPAddress(SQLModel, table=True):
    __tablename__ = "ip_addresses"
    
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    address: str = Field(index=True)
    subnet_id: int = Field(foreign_key="subnets.id")
    prefix_id: Optional[int] = Field(default=None, foreign_key="ipam_prefix.id")
    status: str = Field(default="active")
    description: Optional[str] = None
    dns_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    subnet: Subnet = Relationship(back_populates="ip_addresses")
    prefix: Optional[Prefix] = Relationship(back_populates="ip_addresses")

class IPRange(SQLModel, table=True):
    __tablename__ = "ipam_ip_range"
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    start_address: str = Field(index=True)
    end_address: str = Field(index=True)
    prefix_id: int = Field(foreign_key="ipam_prefix.id")
    vrf_id: Optional[int] = Field(default=None, foreign_key="vrfs.id")
    status: str = Field(index=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    prefix: Prefix = Relationship(back_populates="ip_ranges")
    vrf: Optional[VRF] = Relationship(back_populates="ip_ranges")

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    
    id: Optional[int] = Field(sa_column=Column(Integer, primary_key=True, autoincrement=True))
    action: str  # CREATE, UPDATE, DELETE
    table_name: str
    record_id: int
    changes: str  # JSON string of changes
    user: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
