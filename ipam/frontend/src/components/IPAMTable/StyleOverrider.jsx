import { useEffect } from 'react';

/**
 * StyleOverrider component that directly manipulates DOM elements to set alignment
 * This is a last resort approach when CSS fails to apply correctly
 */
const StyleOverrider = () => {
    useEffect(() => {
        // Function to directly apply styles to headers
        const applyStyles = () => {
            // Get all table headers in the document
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

                    // Also apply to all children
                    const children = header.querySelectorAll('*');
                    children.forEach(child => {
                        if (child instanceof HTMLElement) {
                            child.style.setProperty('text-align', 'center', 'important');
                        }
                    });
                }
            });
        };

        // Apply immediately
        applyStyles();

        // Set up a MutationObserver to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    applyStyles();
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

        // Also apply on window load
        window.addEventListener('load', applyStyles);

        // Set interval to periodically check and apply styles (belt and suspenders approach)
        const interval = setInterval(applyStyles, 1000);

        // Cleanup
        return () => {
            observer.disconnect();
            window.removeEventListener('load', applyStyles);
            clearInterval(interval);
        };
    }, []);

    // This component doesn't render anything
    return null;
};

export default StyleOverrider; 