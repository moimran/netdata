from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlmodel import Session
from ..database import engine
from ..models import VRF, Site, VLANGroup
import logging
import re

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors and log them in detail
    """
    # Log the error details
    error_details = exc.errors()
    logger.error(f"Validation error: {str(exc)}")
    logger.error(f"Validation error details: {error_details}")
    
    # Create a more user-friendly error message
    user_friendly_errors = []
    for error in error_details:
        loc = " -> ".join([str(l) for l in error.get("loc", [])])
        msg = error.get("msg", "")
        typ = error.get("type", "")
        user_friendly_errors.append(f"Location: {loc}, Message: {msg}, Type: {typ}")
    
    # Log the request details
    logger.error(f"Request URL: {request.url}")
    logger.error(f"Request method: {request.method}")
    logger.error(f"Request query params: {request.query_params}")
    logger.error(f"Request headers: {dict(request.headers)}")
    
    # Try to get the request body without consuming the stream
    try:
        body = "Could not read body"
        if request.method in ["POST", "PUT"]:
            body = "Request has a body (not shown to avoid consuming stream)"
    except Exception as e:
        body = f"Error reading body: {str(e)}"
    
    logger.error(f"Request body: {body}")
    
    return JSONResponse(
        status_code=422,
        content={"detail": user_friendly_errors},
    )

async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle all other exceptions and provide user-friendly error messages
    """
    # Log the error
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # Check for specific database errors
    error_message = str(exc)
    status_code = 500
    
    # Handle unique constraint violations
    if "UniqueViolation" in error_message or "duplicate key" in error_message:
        status_code = 409  # Conflict
        
        try:
            # Extract the DETAIL section which contains the values
            if "DETAIL:" in error_message:
                detail_match = error_message.split("DETAIL:")[1].strip()
                
                # Handle prefix and VRF uniqueness constraint
                if "Key (prefix, vrf_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get prefix and VRF ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            prefix_value = values_content[0].strip()
                            vrf_id = values_content[1].strip()
                            
                            # Get VRF name if possible
                            vrf_name = "Unknown VRF"
                            try:
                                with Session(engine) as session:
                                    vrf = session.get(VRF, int(vrf_id))
                                    if vrf:
                                        vrf_name = vrf.name
                            except Exception as e:
                                logger.error(f"Error getting VRF name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"The prefix {prefix_value} already exists in {vrf_name}. Please use a different prefix or VRF.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_prefix_vrf",
                                    "prefix": prefix_value,
                                    "vrf_id": vrf_id,
                                    "vrf_name": vrf_name
                                }
                            )
                
                # Handle IP address and VRF uniqueness constraint
                elif "Key (address, vrf_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get address and VRF ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            address_value = values_content[0].strip()
                            vrf_id = values_content[1].strip()
                            
                            # Get VRF name if possible
                            vrf_name = "Unknown VRF"
                            try:
                                with Session(engine) as session:
                                    vrf = session.get(VRF, int(vrf_id))
                                    if vrf:
                                        vrf_name = vrf.name
                            except Exception as e:
                                logger.error(f"Error getting VRF name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"The IP address {address_value} already exists in {vrf_name}. Please use a different IP address or VRF.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_ipaddress_vrf",
                                    "address": address_value,
                                    "vrf_id": vrf_id,
                                    "vrf_name": vrf_name
                                }
                            )
                
                # Handle VLAN VID and site uniqueness constraint
                elif "Key (vid, site_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get VID and site ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            vid_value = values_content[0].strip()
                            site_id = values_content[1].strip()
                            
                            # Get site name if possible
                            site_name = "Unknown Site"
                            try:
                                with Session(engine) as session:
                                    site = session.get(Site, int(site_id))
                                    if site:
                                        site_name = site.name
                            except Exception as e:
                                logger.error(f"Error getting Site name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with VID {vid_value} already exists at site {site_name}. Please use a different VID or site.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_vid_site",
                                    "vid": vid_value,
                                    "site_id": site_id,
                                    "site_name": site_name
                                }
                            )
                
                # Handle VLAN VID and group uniqueness constraint
                elif "Key (vid, group_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get VID and group ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            vid_value = values_content[0].strip()
                            group_id = values_content[1].strip()
                            
                            # Get group name if possible
                            group_name = "Unknown Group"
                            try:
                                with Session(engine) as session:
                                    group = session.get(VLANGroup, int(group_id))
                                    if group:
                                        group_name = group.name
                            except Exception as e:
                                logger.error(f"Error getting VLAN Group name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with VID {vid_value} already exists in group {group_name}. Please use a different VID or group.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_vid_group",
                                    "vid": vid_value,
                                    "group_id": group_id,
                                    "group_name": group_name
                                }
                            )
                
                # Handle VLAN name and site uniqueness constraint
                elif "Key (name, site_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get name and site ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            name_value = values_content[0].strip()
                            site_id = values_content[1].strip()
                            
                            # Get site name if possible
                            site_name = "Unknown Site"
                            try:
                                with Session(engine) as session:
                                    site = session.get(Site, int(site_id))
                                    if site:
                                        site_name = site.name
                            except Exception as e:
                                logger.error(f"Error getting Site name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with name '{name_value}' already exists at site {site_name}. Please use a different name or site.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_name_site",
                                    "name": name_value,
                                    "site_id": site_id,
                                    "site_name": site_name
                                }
                            )
                
                # Handle VLAN name and group uniqueness constraint
                elif "Key (name, group_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get name and group ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            name_value = values_content[0].strip()
                            group_id = values_content[1].strip()
                            
                            # Get group name if possible
                            group_name = "Unknown Group"
                            try:
                                with Session(engine) as session:
                                    group = session.get(VLANGroup, int(group_id))
                                    if group:
                                        group_name = group.name
                            except Exception as e:
                                logger.error(f"Error getting VLAN Group name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"VLAN with name '{name_value}' already exists in group {group_name}. Please use a different name or group.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_vlan_name_group",
                                    "name": name_value,
                                    "group_id": group_id,
                                    "group_name": group_name
                                }
                            )
                
                # Handle ASN uniqueness constraint
                elif "Key (asn)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    asn_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"ASN {asn_value} already exists. Please use a different ASN.",
                            "error_type": "unique_violation",
                            "constraint": "asn_asn_key",
                            "asn": asn_value
                        }
                    )
                
                # Handle VRF name uniqueness constraint
                elif "Key (name)" in detail_match and "=" in detail_match and "vrf_name_key" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    name_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"VRF with name '{name_value}' already exists. Please use a different name.",
                            "error_type": "unique_violation",
                            "constraint": "vrf_name_key",
                            "name": name_value
                        }
                    )
                
                # Handle VRF RD uniqueness constraint
                elif "Key (rd)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    rd_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"VRF with Route Distinguisher '{rd_value}' already exists. Please use a different RD.",
                            "error_type": "unique_violation",
                            "constraint": "vrf_rd_key",
                            "rd": rd_value
                        }
                    )
                
                # Handle IP Range uniqueness constraint
                elif "Key (start_address, end_address, vrf_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get start_address, end_address and VRF ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 3:
                            start_address = values_content[0].strip()
                            end_address = values_content[1].strip()
                            vrf_id = values_content[2].strip()
                            
                            # Get VRF name if possible
                            vrf_name = "Unknown VRF"
                            try:
                                with Session(engine) as session:
                                    vrf = session.get(VRF, int(vrf_id))
                                    if vrf:
                                        vrf_name = vrf.name
                            except Exception as e:
                                logger.error(f"Error getting VRF name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"IP Range {start_address}-{end_address} already exists in {vrf_name}. Please use a different range or VRF.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_iprange_vrf",
                                    "start_address": start_address,
                                    "end_address": end_address,
                                    "vrf_id": vrf_id,
                                    "vrf_name": vrf_name
                                }
                            )
                
                # Handle ASN Range uniqueness constraint
                elif "Key (start, end, rir_id)" in detail_match and "=" in detail_match:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get start, end and RIR ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 3:
                            start_value = values_content[0].strip()
                            end_value = values_content[1].strip()
                            rir_id = values_content[2].strip()
                            
                            # Get RIR name if possible
                            rir_name = "Unknown RIR"
                            try:
                                with Session(engine) as session:
                                    rir = session.get(RIR, int(rir_id))
                                    if rir:
                                        rir_name = rir.name
                            except Exception as e:
                                logger.error(f"Error getting RIR name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"ASN Range {start_value}-{end_value} already exists in {rir_name}. Please use a different range or RIR.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_asnrange_rir",
                                    "start": start_value,
                                    "end": end_value,
                                    "rir_id": rir_id,
                                    "rir_name": rir_name
                                }
                            )
                
                # Handle Region name uniqueness constraint
                elif "Key (name)" in detail_match and "=" in detail_match and "uq_region_name" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    name_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"Region with name '{name_value}' already exists. Please use a different name.",
                            "error_type": "unique_violation",
                            "constraint": "uq_region_name",
                            "name": name_value
                        }
                    )
                
                # Handle Device name uniqueness constraint
                elif "Key (name)" in detail_match and "=" in detail_match and "uq_device_name" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    name_value = values_match.strip()
                    
                    return JSONResponse(
                        status_code=status_code,
                        content={
                            "detail": f"Device with name '{name_value}' already exists. Please use a different name.",
                            "error_type": "unique_violation",
                            "constraint": "uq_device_name",
                            "name": name_value
                        }
                    )
                
                # Handle Interface name uniqueness constraint
                elif "Key (name, device_id)" in detail_match and "=" in detail_match and "uq_interface_name_device" in error_message:
                    values_match = detail_match.split("=")[1].strip()
                    
                    # Parse the values to get name and device ID
                    if "(" in values_match and ")" in values_match:
                        values_content = values_match.strip("()").split(",")
                        if len(values_content) >= 2:
                            name_value = values_content[0].strip()
                            device_id = values_content[1].strip()
                            
                            # Get device name if possible
                            device_name = "Unknown Device"
                            try:
                                with Session(engine) as session:
                                    device = session.get(Device, int(device_id))
                                    if device:
                                        device_name = device.name
                            except Exception as e:
                                logger.error(f"Error getting Device name: {str(e)}")
                            
                            return JSONResponse(
                                status_code=status_code,
                                content={
                                    "detail": f"Interface with name '{name_value}' already exists on device {device_name}. Please use a different name.",
                                    "error_type": "unique_violation",
                                    "constraint": "uq_interface_name_device",
                                    "name": name_value,
                                    "device_id": device_id,
                                    "device_name": device_name
                                }
                            )
        except Exception as parse_error:
            logger.error(f"Error parsing UniqueViolation details: {str(parse_error)}")
        
        # Extract constraint name if available
        constraint_name = None
        if "constraint" in error_message:
            try:
                constraint_match = re.search(r'constraint "([^"]+)"', error_message)
                if constraint_match:
                    constraint_name = constraint_match.group(1)
            except Exception as e:
                logger.error(f"Error extracting constraint name: {str(e)}")
        
        # Generic unique constraint error with constraint name if available
        response_content = {
            "detail": "This record already exists in the database.",
            "error_type": "unique_violation"
        }
        
        if constraint_name:
            response_content["constraint"] = constraint_name
            
        return JSONResponse(
            status_code=status_code,
            content=response_content
        )
    
    # Handle foreign key violations
    if "ForeignKeyViolation" in error_message:
        status_code = 400  # Bad Request
        return JSONResponse(
            status_code=status_code,
            content={"detail": "Referenced record does not exist."}
        )
    
    # Handle check constraint violations
    if "CheckViolation" in error_message:
        status_code = 400  # Bad Request
        return JSONResponse(
            status_code=status_code,
            content={"detail": "Data validation failed."}
        )
    
    # Default error response
    return JSONResponse(
        status_code=status_code,
        content={"detail": "An error occurred while processing your request."}
    )
