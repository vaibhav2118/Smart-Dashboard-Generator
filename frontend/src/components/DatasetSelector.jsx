import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDataset } from '../context/DatasetContext';
import { ChevronDown, Database, Layers, Check } from 'lucide-react';

/**
 * DatasetSelector — compact inline dropdown for switching the active dataset
 * within any AI module.
 *
 * Props:
 *   currentId   : string  — the currently displayed dataset id (from useParams)
 *   moduleBase  : string  — URL prefix of the current module, e.g. 'insights'
 *   onSelect    : fn(dataset) — optional extra callback after selection
 *   variant     : 'default' | 'dark'  — styling context
 */
const DatasetSelector = ({ currentId, moduleBase, onSelect, variant = 'default' }) => {
    const { allDatasets, setActiveDataset, refreshDatasets } = useDataset();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [localDatasets, setLocalDatasets] = useState([]);
    const ref = useRef(null);

    // Combine context datasets with demo entries
    const DEMO_DATASETS = [
        { id: 'demo-sales',   filename: 'Demo: Sales_Performance_Q2.csv',   isDemo: true },
        { id: 'demo-finance', filename: 'Demo: Finance_Ledger_2026.xlsx',   isDemo: true },
        { id: 'demo-hr',      filename: 'Demo: HR_Retention_Profile.csv',   isDemo: true },
    ];

    useEffect(() => {
        const merged = [...DEMO_DATASETS, ...allDatasets];
        setLocalDatasets(merged);
    }, [allDatasets]);

    // If context list is empty, fetch once
    useEffect(() => {
        if (allDatasets.length === 0) {
            setLoading(true);
            refreshDatasets().finally(() => setLoading(false));
        }
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const currentDataset = localDatasets.find(d => String(d.id) === String(currentId));

    const handleSelect = (ds) => {
        setOpen(false);
        setActiveDataset(ds);
        if (onSelect) onSelect(ds);
        if (moduleBase) {
            navigate(`/${moduleBase}/${ds.id}`);
        }
    };

    // Styling variants
    const isDark = variant === 'dark';
    const containerCls = isDark
        ? 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600';
    const dropdownCls = isDark
        ? 'bg-slate-900 border-slate-700'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-xs font-semibold transition min-w-0 max-w-[220px] ${containerCls}`}
                title="Switch active dataset"
            >
                <Layers size={12} className="text-indigo-400 shrink-0" />
                <span className="truncate flex-1 text-left">
                    {loading ? 'Loading...' : (currentDataset?.filename?.replace('Demo: ', '') || 'Select dataset')}
                </span>
                <ChevronDown size={12} className={`shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className={`absolute left-0 mt-1.5 w-72 border rounded-2xl shadow-xl py-1.5 z-50 ${dropdownCls}`}
                    style={{ top: '100%' }}>
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <Database size={13} className="text-indigo-500" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Switch Dataset
                        </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1">
                        {localDatasets.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-slate-500">
                                No datasets found. Upload one first.
                            </div>
                        ) : localDatasets.map(ds => {
                            const isActive = String(ds.id) === String(currentId);
                            return (
                                <button
                                    key={ds.id}
                                    onClick={() => handleSelect(ds)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition text-left
                                        ${isActive
                                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold truncate">
                                            {ds.filename?.replace('Demo: ', '') || ds.id}
                                        </p>
                                        {ds.isDemo && (
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500 mt-0.5">Demo</p>
                                        )}
                                        {!ds.isDemo && ds.row_count && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">{ds.row_count?.toLocaleString()} rows</p>
                                        )}
                                    </div>
                                    {isActive && <Check size={13} className="text-indigo-500 shrink-0 ml-2" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatasetSelector;
