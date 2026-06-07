import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

const Plot = ({ data, layout, config, style, useResizeHandler, className }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Draw initial plot or update
        Plotly.react(container, data || [], layout || {}, config || { displayModeBar: false, responsive: true });

        const handleResize = () => {
            if (useResizeHandler && container) {
                Plotly.Plots.resize(container);
            }
        };

        if (useResizeHandler) {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (useResizeHandler) {
                window.removeEventListener('resize', handleResize);
            }
            // Purge when component unmounts to prevent memory leaks
            try {
                Plotly.purge(container);
            } catch (err) {
                // Ignore error during unmount if container is already cleaned
            }
        };
    }, [data, layout, config, useResizeHandler]);

    return (
        <div 
            ref={containerRef} 
            style={style || { width: '100%', height: '100%' }} 
            className={className} 
        />
    );
};

export default Plot;
