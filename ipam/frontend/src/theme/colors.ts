// Theme color palette for the IPAM application
// This file centralizes all color definitions for easy theming

// Main colors
export const PRIMARY = '#065535'; // Violet
export const PRIMARY_LIGHT = '#66cdaa'; // Light violet
export const PRIMARY_DARK = '#7e22ce'; // Dark violet
export const SECONDARY = '#14b8a6'; // Teal
export const SECONDARY_LIGHT = '#5eead4'; // Light teal
export const SECONDARY_DARK = '#0f766e'; // Dark teal

// Dark theme background colors
export const DARK_BG = '#1A1B1E'; // Main background
export const DARK_CARD_BG = '#25262B'; // Card background
export const DARK_HOVER = '#373A40'; // Hover background
export const DARK_BORDER = '#373A40'; // Border color

// Text colors
export const TEXT_PRIMARY = '#FFFFFF'; // White text
export const TEXT_SECONDARY = '#C1C2C5'; // Light gray text
export const TEXT_MUTED = '#909296'; // Muted text
export const TEXT_BRIGHT = '#66cdaa'; // Bright accent text (violet)

// Status colors
export const STATUS_ACTIVE = 'teal';
export const STATUS_RESERVED = 'violet';
export const STATUS_DEPRECATED = 'gray';
export const STATUS_CONTAINER = 'indigo';
export const STATUS_DHCP = 'cyan';
export const STATUS_SLAAC = 'blue';

// Icon colors
export const ICON_ACTIVE = '#66cdaa'; // Active icon color
export const ICON_INACTIVE = '#a6a7ab'; // Inactive icon color

// Utility function to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  // Check if color is a hex value
  if (color.startsWith('#')) {
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // If it's already an rgba or named color, return as is
  return color;
};
