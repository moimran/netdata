import React from 'react';
import { Badge } from '@mantine/core';

// Format status badges based on status value
export const formatStatus = (status: string) => {
    let color;
    let displayText;

    // Handle null/undefined status
    if (!status) {
        return { color: 'gray', displayText: 'Unknown' };
    }

    // Normalize status value
    const normalizedStatus = status.toLowerCase().trim();

    // Determine color based on status
    switch (normalizedStatus) {
        case 'active':
            color = 'teal';
            displayText = 'Active';
            break;
        case 'container':
            color = 'indigo';
            displayText = 'Container';
            break;
        case 'reserved':
            color = 'violet';
            displayText = 'Reserved';
            break;
        case 'deprecated':
            color = 'gray';
            displayText = 'Deprecated';
            break;
        case 'inactive':
            color = 'gray';
            displayText = 'Inactive';
            break;
        case 'offline':
            color = 'gray';
            displayText = 'Offline';
            break;
        case 'planned':
            color = 'yellow';
            displayText = 'Planned';
            break;
        case 'staged':
            color = 'orange';
            displayText = 'Staged';
            break;
        case 'failed':
            color = 'red';
            displayText = 'Failed';
            break;
        case 'dhcp':
            color = 'cyan';
            displayText = 'DHCP';
            break;
        case 'slaac':
            color = 'blue';
            displayText = 'SLAAC';
            break;
        default:
            color = 'gray';
            // Format the display text (capitalize first letter)
            displayText = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    return { color, displayText };
};

// Enhanced status badge component
export function EnhancedStatusBadge({ status }: { status: string }) {
    const { color, displayText } = formatStatus(status);

    return (
        <Badge
            color={color}
            className="ipam-status-badge"
            variant="filled"
            radius="sm"
            size="md"
            styles={{
                root: {
                    backgroundColor: getStatusColor(color),
                    color: 'white',
                    padding: '6px 12px',
                    textTransform: 'capitalize',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    width: '100px',
                    textAlign: 'center',
                    display: 'inline-block',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    border: 'none',
                    boxShadow: 'none'
                },
                label: {
                    padding: 0
                }
            }}
        >
            {displayText}
        </Badge>
    );
}

// Helper function to get the exact color for status badges
function getStatusColor(color: string): string {
    switch (color) {
        case 'teal': return '#14b8a6';
        case 'indigo': return '#4f46e5';
        case 'violet': return '#8b5cf6';
        case 'gray': return '#6b7280';
        case 'yellow': return '#eab308';
        case 'orange': return '#f97316';
        case 'red': return '#ef4444';
        case 'cyan': return '#06b6d4';
        case 'blue': return '#3b82f6';
        default: return '#6b7280';
    }
} 