import { VlanIdRangeResult, ReferenceItem } from '../types';

/**
 * Validates if a VLAN ID is within the ranges of a VLAN group
 */
export const validateVlanIdAgainstGroup = (
  vlanId: number, 
  vlanGroup: any
): { isValid: boolean; errorMessage?: string } => {
  if (!vlanId || !vlanGroup) return { isValid: true };
  
  // Get the VLAN ID ranges from the group
  let ranges = vlanGroup.vlan_id_ranges;
  
  // If no ranges are defined, use min_vid and max_vid
  if (!ranges && vlanGroup.min_vid && vlanGroup.max_vid) {
    ranges = `${vlanGroup.min_vid}-${vlanGroup.max_vid}`;
  }
  
  if (!ranges) return { isValid: true }; // No ranges to validate against
  
  // Check if the VLAN ID is within any of the ranges
  const rangeArray = ranges.split(',').map((r: string) => r.trim());
  let isInRange = false;
  
  for (const range of rangeArray) {
    if (range.includes('-')) {
      // It's a range like "1-5"
      const [start, end] = range.split('-').map((n: string) => parseInt(n.trim()));
      if (vlanId >= start && vlanId <= end) {
        isInRange = true;
        break;
      }
    } else {
      // It's a single number like "10"
      const num = parseInt(range);
      if (vlanId === num) {
        isInRange = true;
        break;
      }
    }
  }
  
  if (!isInRange) {
    return {
      isValid: false,
      errorMessage: `VLAN ID ${vlanId} is not within the allowed ranges (${ranges}) for the selected VLAN group`
    };
  }
  
  return { isValid: true };
};

/**
 * Parse VLAN ID ranges (e.g., "1-5,20-30") into min_vid and max_vid
 */
export const parseVlanIdRanges = (rangesStr: string): VlanIdRangeResult | null => {
  try {
    // Split by commas to get individual ranges
    const ranges = rangesStr.split(',').map(r => r.trim());
    
    // Extract all numbers from the ranges
    const allNumbers: number[] = [];
    
    for (const range of ranges) {
      if (range.includes('-')) {
        // It's a range like "1-5"
        const [start, end] = range.split('-').map(n => parseInt(n.trim()));
        if (isNaN(start) || isNaN(end) || start < 1 || end > 4094 || start > end) {
          throw new Error(`Invalid range: ${range}`);
        }
        allNumbers.push(start, end);
      } else {
        // It's a single number like "10"
        const num = parseInt(range);
        if (isNaN(num) || num < 1 || num > 4094) {
          throw new Error(`Invalid number: ${range}`);
        }
        allNumbers.push(num);
      }
    }
    
    if (allNumbers.length === 0) {
      throw new Error('No valid numbers found');
    }
    
    // Find min and max
    return {
      min_vid: Math.min(...allNumbers),
      max_vid: Math.max(...allNumbers)
    };
  } catch (error) {
    console.error('Error parsing VLAN ID ranges:', error);
    return null;
  }
};
