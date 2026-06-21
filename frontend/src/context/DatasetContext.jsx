import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── Context definition ───────────────────────────────────────────────────────
export const DatasetContext = createContext(null);

/**
 * DatasetProvider — wraps the entire app and supplies:
 *   activeDataset   : full dataset object { id, filename, columns, ... } | null
 *   setActiveDataset: fn(dataset) — sets both React state and localStorage
 *   clearActiveDataset: fn() — clears both
 *   refreshDatasets : fn() — re-fetches user's dataset list from the API
 *   allDatasets     : all datasets belonging to the current user
 */
export const DatasetProvider = ({ children }) => {
    const [activeDataset, setActiveDatasetState] = useState(null);
    const [allDatasets, setAllDatasets] = useState([]);

    // ── Load user datasets from backend ────────────────────────────────────
    const refreshDatasets = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('http://localhost:8000/api/datasets/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAllDatasets(res.data || []);
        } catch {
            // Silently fail — not critical for context to work
        }
    }, []);

    // ── Hydrate from localStorage on first mount ───────────────────────────
    useEffect(() => {
        const storedId = localStorage.getItem('activeDatasetId');
        if (!storedId) return;

        // If it's a demo ID we can't resolve from API — store a lightweight object
        if (storedId.startsWith('demo-')) {
            const demoNames = {
                'demo-sales':   'Sales_Performance_Q2.csv',
                'demo-finance': 'Finance_Ledger_2026.xlsx',
                'demo-hr':      'HR_Retention_Profile.csv',
            };
            setActiveDatasetState({
                id: storedId,
                filename: demoNames[storedId] || storedId,
                isDemo: true,
            });
            return;
        }

        // Real dataset — fetch the list and resolve
        const hydrate = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await axios.get('http://localhost:8000/api/datasets/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const datasets = res.data || [];
                setAllDatasets(datasets);
                const found = datasets.find(d => String(d.id) === storedId);
                if (found) setActiveDatasetState(found);
            } catch {
                // Network unavailable — leave context as null
            }
        };
        hydrate();
    }, []);

    // ── Listen for legacy localStorage writes from other components ────────
    // This ensures Sidebar updates even when some page still writes directly.
    useEffect(() => {
        const onStorage = () => {
            const storedId = localStorage.getItem('activeDatasetId');
            if (!storedId) {
                setActiveDatasetState(null);
                return;
            }
            // Already matches current context — no-op
            if (activeDataset && String(activeDataset.id) === storedId) return;

            if (storedId.startsWith('demo-')) {
                const demoNames = {
                    'demo-sales':   'Sales_Performance_Q2.csv',
                    'demo-finance': 'Finance_Ledger_2026.xlsx',
                    'demo-hr':      'HR_Retention_Profile.csv',
                };
                setActiveDatasetState({
                    id: storedId,
                    filename: demoNames[storedId] || storedId,
                    isDemo: true,
                });
                return;
            }

            // Find in already-loaded list first
            const found = allDatasets.find(d => String(d.id) === storedId);
            if (found) {
                setActiveDatasetState(found);
            }
        };

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [activeDataset, allDatasets]);

    // ── Public setter — updates context AND localStorage ──────────────────
    const setActiveDataset = useCallback((dataset) => {
        setActiveDatasetState(dataset);
        if (dataset) {
            localStorage.setItem('activeDatasetId', String(dataset.id));
            // Notify any other components still listening to storage events
            window.dispatchEvent(new Event('storage'));
        } else {
            localStorage.removeItem('activeDatasetId');
            window.dispatchEvent(new Event('storage'));
        }
    }, []);

    // ── Convenience clear ─────────────────────────────────────────────────
    const clearActiveDataset = useCallback(() => {
        setActiveDatasetState(null);
        localStorage.removeItem('activeDatasetId');
        window.dispatchEvent(new Event('storage'));
    }, []);

    return (
        <DatasetContext.Provider value={{
            activeDataset,
            setActiveDataset,
            clearActiveDataset,
            refreshDatasets,
            allDatasets,
        }}>
            {children}
        </DatasetContext.Provider>
    );
};

/** Convenience hook */
export const useDataset = () => {
    const ctx = useContext(DatasetContext);
    if (!ctx) throw new Error('useDataset must be used inside <DatasetProvider>');
    return ctx;
};
