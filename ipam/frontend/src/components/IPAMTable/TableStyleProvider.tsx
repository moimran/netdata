import { useEffect } from 'react';
import './unified-table-styles.css';

/**
 * TableStyleProvider component
 * 
 * This component serves as a central style provider for all tables in the application.
 * It imports the unified table styles and ensures they are properly applied.
 * It can be used as a wrapper around table components or imported at the application root.
 */
const TableStyleProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Apply any dynamic styles or class manipulations if needed
    const applyConsistentStyles = () => {
      // Find all table headers
      const headers = document.querySelectorAll('th');
      
      headers.forEach((header) => {
        // Check if it's a description header
        const isDescription = 
          header.textContent?.includes('DESCRIPTION') ||
          header.getAttribute('data-column-id') === 'description' ||
          header.classList.contains('ipam-header-description');
          
        if (isDescription) {
          header.style.setProperty('text-align', 'left', 'important');
        } else {
          header.style.setProperty('text-align', 'center', 'important');
        }
      });
    };
    
    // Apply immediately
    applyConsistentStyles();
    
    // Set up a MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          applyConsistentStyles();
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return <>{children}</>;
};

export default TableStyleProvider;
