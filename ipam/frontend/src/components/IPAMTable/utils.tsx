import React, { ReactNode } from 'react';
import { Progress, Box, Text, Group, MantineColor } from '@mantine/core';
import { StatusBadge } from '../TableStyles';
import { Column } from './schemas';
import type { TableName } from '../../types';

// Helper function to calculate IP prefix or range utilization
export const calculateUtilization = (ipData: string, isRange: boolean = false): { percentage: number; used: number; total: number } => {
  // This is a simplified calculation for demonstration purposes
  // In a real implementation, you would fetch actual IP address usage data
  
  if (isRange) {
    // For IP ranges, we need to calculate the total number of IPs in the range
    // In a real app, you'd calculate based on actual IP usage within the range
    
    // For demonstration, we'll generate a random number of used IPs
    // In a real app, you'd query the database for actual usage
    const total = 100; // Placeholder for demo
    const used = Math.floor(Math.random() * total * 0.8); // Random usage up to 80%
    const percentage = (used / total) * 100;
    
    return { percentage, used, total };
  } else {
    // For prefixes, calculate based on the network mask
    // Extract the network mask from the prefix (e.g., "192.168.1.0/24" -> 24)
    const maskMatch = ipData.match(/\/(\d+)$/);
    if (!maskMatch) return { percentage: 0, used: 0, total: 0 };
    
    const mask = parseInt(maskMatch[1], 10);
    
    let total = 0;
    if (ipData.includes(':')) {
      // IPv6 - simplified calculation for demonstration
      // In a real app, you'd calculate the actual number of addresses
      total = Math.pow(2, 128 - mask);
      if (total > 1000000) total = 1000000; // Cap for display purposes
    } else {
      // IPv4
      // Calculate total IPs in the network (2^(32-mask))
      // For /31 and /32, special handling is needed
      if (mask >= 31) {
        total = mask === 32 ? 1 : 2;
      } else {
        total = Math.pow(2, 32 - mask);
      }
    }
    
    // Generate a random number of used IPs for demonstration
    // In a real app, you'd query the database for actual usage
    const baseUtilizationPercentage = ipData.includes(':') 
      ? Math.max(0, 100 - (128 - mask) * 2) 
      : Math.max(0, 100 - (32 - mask) * 8);
    
    const utilizationPercentage = Math.min(100, baseUtilizationPercentage + Math.random() * 30);
    const used = Math.floor(total * (utilizationPercentage / 100));
    
    return { percentage: utilizationPercentage, used, total };
  }
};

// Helper function to render the utilization progress bar
export const renderUtilizationBar = (ipData: string, isRange: boolean = false): React.ReactElement => {
  const { percentage, used, total } = calculateUtilization(ipData, isRange);
  const roundedPercentage = Math.round(percentage);
  
  // Determine color based on utilization percentage
  let color: MantineColor = 'green';
  if (percentage > 80) {
    color = 'red';
  } else if (percentage > 60) {
    color = 'orange';
  } else if (percentage > 40) {
    color = 'blue';
  }
  
  // Format the display text
  // For very large numbers (like in IPv6), use abbreviated format
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };
  
  return (
    <Box>
      <Group justify="apart" mb={5}>
        <Text size="xs" fw={500}>{formatNumber(used)}/{formatNumber(total)}</Text>
      </Group>
      <Progress 
        value={roundedPercentage} 
        color={color} 
        size="sm" 
        radius="xl"
        striped={percentage > 80}
        animated={percentage > 90}
      />
    </Box>
  );
};

// Helper function to format cell values for display
export const formatCellValue = (
  column: Column, 
  value: any, 
  referenceData: Record<string, any[]>, 
  item?: any, 
  tableName?: TableName
): ReactNode => {
  if (value === null || value === undefined) return '-';
  
  if (column.name === 'status') {
    return <StatusBadge status={value} />;
  }
  
  if (column.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Special handling for VLAN ID ranges
  if (column.name === 'vlan_id_ranges') {
    // If we have a stored vlan_id_ranges value, use it
    if (value) {
      return value;
    }
    // Otherwise, fall back to min_vid-max_vid if available
    if (item?.min_vid && item?.max_vid) {
      return `${item.min_vid}-${item.max_vid}`;
    }
    return '-';
  }
  
  // Handle reference fields (foreign keys)
  if (column.reference && value !== null && value !== undefined) {
    const referenceTable = column.reference;
    
    // Special handling for VLAN group_id to make the relationship more visible
    if (tableName === 'vlans' && column.name === 'group_id') {
      const vlanGroupItems = referenceData['vlan_groups'] || [];
      if (Array.isArray(vlanGroupItems) && vlanGroupItems.length > 0) {
        const vlanGroup = vlanGroupItems.find((item: any) => String(item.id) === String(value));
        if (vlanGroup) {
          return vlanGroup.name || String(value);
        }
      }
    }
    
    const referenceItems = referenceData[referenceTable] || [];
    
    // Ensure referenceItems is an array before using find
    if (Array.isArray(referenceItems) && referenceItems.length > 0) {
      // Convert both IDs to strings for comparison to avoid type mismatches
      const referencedItem = referenceItems.find((item: any) => String(item.id) === String(value));
      
      if (referencedItem) {
        // Return the most appropriate field from the referenced item
        return referencedItem.name || 
               referencedItem.prefix || 
               referencedItem.address || 
               referencedItem.rd || 
               referencedItem.slug || 
               String(value);
      }
    }
    
    // If we couldn't find a reference item, return a placeholder
    // This is more user-friendly than showing the raw ID
    return `${referenceTable.charAt(0).toUpperCase() + referenceTable.slice(1)} #${value}`;
  }
  
  return String(value);
};
