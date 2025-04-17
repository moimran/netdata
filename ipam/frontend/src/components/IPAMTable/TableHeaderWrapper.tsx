import React, { useEffect, useRef } from 'react';

/**
 * TableHeaderWrapper applies direct inline styles to ensure header alignment
 * This component wraps table containers and finds their headers to style them directly
 */
export const TableHeaderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Function to directly set inline styles on table headers
    const applyHeaderStyles = () => {
        if (!containerRef.current) return;

        // Find all table headers in this container
        const headers = containerRef.current.querySelectorAll('th');

        headers.forEach((header, index) => {
            // Set inline styles directly based on index
            if (index === 0 || // ID column
                index === 1 || // PREFIX column
                index === 2 || // RIR ID column
                index === 4) { // ACTIONS column

                header.style.textAlign = 'center';
                header.style.display = 'table-cell';

                // Also center any children elements
                Array.from(header.children).forEach(child => {
                    if (child instanceof HTMLElement) {
                        child.style.textAlign = 'center';

                        // Get even deeper if needed
                        Array.from(child.children).forEach(innerChild => {
                            if (innerChild instanceof HTMLElement) {
                                innerChild.style.textAlign = 'center';
                            }
                        });
                    }
                });
            }

            // Keep description columns left-aligned (index 3)
            if (index === 3) {
                header.style.textAlign = 'left';

                // Also align any children elements
                Array.from(header.children).forEach(child => {
                    if (child instanceof HTMLElement) {
                        child.style.textAlign = 'left';
                    }
                });
            }
        });
    };

    // Apply styles on mount and when container changes
    useEffect(() => {
        applyHeaderStyles();

        // Create a MutationObserver to watch for changes and reapply styles
        const observer = new MutationObserver(() => {
            applyHeaderStyles();
        });

        // Start observing
        if (containerRef.current) {
            observer.observe(containerRef.current, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }

        // Clean up observer on unmount
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="table-header-wrapper">
            {children}
        </div>
    );
};

export default TableHeaderWrapper; 