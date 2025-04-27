from typing import Optional, List
from uuid import UUID
from sqlmodel import SQLModel
from pydantic import Field

class InterfaceBase(SQLModel):
    interface_name: str = Field(..., description="Name of the interface")
    hardware_type: str = Field(..., description="Hardware type of the interface")
    mac_address: str = Field(..., description="MAC address of the interface")
    bia: str = Field(..., description="Burned-in MAC address")
    
    # Status and Protocol
    interface_status: Optional[str] = Field(default=None, description="Status of the interface")
    protocol_status: Optional[str] = Field(default=None, description="Protocol status of the interface")
    operational_mode: Optional[str] = Field(default=None, description="Operational mode of the interface")
    administrative_mode: Optional[str] = Field(default=None, description="Administrative mode of the interface")
    
    # Hardware and Physical
    media_type: Optional[str] = Field(default=None, description="Media type of the interface")
    
    # IP Addressing
    ipv4_address: Optional[str] = Field(default=None, description="IPv4 address of the interface")
    subnet_mask: Optional[str] = Field(default=None, description="Subnet mask of the interface")
    ipv6_address: Optional[str] = Field(default=None, description="IPv6 address of the interface")
    virtual_ipv4_address: Optional[str] = Field(default=None, description="Virtual IPv4 address of the interface")
    
    # Interface Properties
    mtu: Optional[str] = Field(default=None, description="MTU of the interface")
    duplex: Optional[str] = Field(default=None, description="Duplex mode of the interface")
    speed: Optional[str] = Field(default=None, description="Speed of the interface")
    bandwidth: Optional[str] = Field(default=None, description="Bandwidth of the interface")
    
    # Port Channel
    net_port_channel_id: Optional[int] = Field(default=None, description="Port channel ID")
    group_number: Optional[str] = Field(default=None, description="Group number")
    group_name: Optional[str] = Field(default=None, description="Group name")
    
    # VLAN Configuration
    native_vlan: Optional[str] = Field(default=None, description="Native VLAN")
    access_vlan: Optional[str] = Field(default=None, description="Access VLAN")
    voice_vlan: Optional[str] = Field(default=None, description="Voice VLAN")
    switchport: Optional[str] = Field(default=None, description="Switchport mode")
    switchport_monitor: Optional[str] = Field(default=None, description="Switchport monitor mode")
    trunking_vlans: Optional[str] = Field(default=None, description="Trunking VLANs")
    
    # HSRP Configuration
    version: Optional[str] = Field(default=None, description="HSRP version")
    preempt: Optional[str] = Field(default=None, description="HSRP preempt")
    active_router: Optional[str] = Field(default=None, description="HSRP active router")
    active_virtual_mac: Optional[str] = Field(default=None, description="HSRP active virtual MAC")
    hsrp_router_state: Optional[str] = Field(default=None, description="HSRP router state")
    configured_priority: Optional[str] = Field(default=None, description="HSRP configured priority")
    priority: Optional[str] = Field(default=None, description="HSRP priority")
    standby_router: Optional[str] = Field(default=None, description="HSRP standby router")
    standby_router_priority: Optional[str] = Field(default=None, description="HSRP standby router priority")
    num_state_changes: Optional[str] = Field(default=None, description="HSRP number of state changes")
    last_state_change: Optional[str] = Field(default=None, description="HSRP last state change")
    
    # Security and Routing
    interface_zone: Optional[str] = Field(default=None, description="Interface security zone")
    
    # Foreign Keys
    vrf_id: Optional[UUID] = Field(default=None, description="VRF ID")
    device_id: UUID = Field(..., description="Device ID")
    parent_id: Optional[int] = Field(default=None, description="Parent interface ID")
    untagged_vlan_id: Optional[int] = Field(default=None, description="Untagged VLAN ID")

class InterfaceCreate(InterfaceBase):
    pass

class InterfaceUpdate(SQLModel):
    interface_name: Optional[str] = None
    hardware_type: Optional[str] = None
    mac_address: Optional[str] = None
    bia: Optional[str] = None
    interface_status: Optional[str] = None
    protocol_status: Optional[str] = None
    operational_mode: Optional[str] = None
    administrative_mode: Optional[str] = None
    media_type: Optional[str] = None
    ipv4_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    ipv6_address: Optional[str] = None
    virtual_ipv4_address: Optional[str] = None
    mtu: Optional[str] = None
    duplex: Optional[str] = None
    speed: Optional[str] = None
    bandwidth: Optional[str] = None
    net_port_channel_id: Optional[int] = None
    group_number: Optional[str] = None
    group_name: Optional[str] = None
    native_vlan: Optional[str] = None
    access_vlan: Optional[str] = None
    voice_vlan: Optional[str] = None
    switchport: Optional[str] = None
    switchport_monitor: Optional[str] = None
    trunking_vlans: Optional[str] = None
    version: Optional[str] = None
    preempt: Optional[str] = None
    active_router: Optional[str] = None
    active_virtual_mac: Optional[str] = None
    hsrp_router_state: Optional[str] = None
    configured_priority: Optional[str] = None
    priority: Optional[str] = None
    standby_router: Optional[str] = None
    standby_router_priority: Optional[str] = None
    num_state_changes: Optional[str] = None
    last_state_change: Optional[str] = None
    interface_zone: Optional[str] = None
    vrf_id: Optional[UUID] = None
    device_id: Optional[UUID] = None
    parent_id: Optional[int] = None
    untagged_vlan_id: Optional[int] = None

class InterfaceRead(InterfaceBase):
    id: int
