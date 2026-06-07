import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Wrench, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Trash2, Plus,
    Filter, CheckSquare, Square, RotateCcw, Sparkles, Lock, Eye,
    ArrowUpDown, Layers, Type, AlignLeft, Undo2, History, Save,
    ChevronDown, ChevronRight, X
} from 'lucide-react';

const TABS = ['Columns', 'Clean', 'Types', 'Filter', 'Sort', 'Aggregate'];
const TYPE_OPTIONS = ['default', 'int', 'float', 'str', 'date', 'bool', 'currency'];
const MISSING_OPTIONS = ['keep', 'drop', 'mean', 'median', 'mode', 'value:0', 'value:N/A', 'value:Unknown'];
const FILTER_OPS = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'between'];
const AGG_FUNCS = ['sum', 'mean', 'count', 'min', 'max'];

const badge = (label, color = 'indigo') => (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-${color}-100 dark:bg-${color}-950/40 text-${color}-700 dark:text-${color}-400 border border-${color}-200 dark:border-${color}-900/50`}>{label}</span>
);

const DataPreparation = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [dataset, setDataset] = useState(null);
    const [columns, setColumns] = useState([]);
    const [previewRows, setPreviewRows] = useState([]);
    const [previewCols, setPreviewCols] = useState([]);
    const [previewStats, setPreviewStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [activeTab, setActiveTab] = useState('Columns');

    // Transform states
    const [selectedCols, setSelectedCols] = useState({});
    const [renames, setRenames] = useState({});  // {col: newName}
    const [removeDuplicates, setRemoveDuplicates] = useState(false);
    const [removeEmptyRows, setRemoveEmptyRows] = useState(false);
    const [missingActions, setMissingActions] = useState({});
    const [typeConversions, setTypeConversions] = useState({});
    const [filters, setFilters] = useState([]);
    const [sortRules, setSortRules] = useState([]);
    const [enableGroupBy, setEnableGroupBy] = useState(false);
    const [groupByCols, setGroupByCols] = useState({});
    const [aggColumn, setAggColumn] = useState('');
    const [aggFunc, setAggFunc] = useState('sum');

    // History stack
    const [history, setHistory] = useState([]);

    const addHistory = useCallback((description) => {
        setHistory(prev => [...prev, { ts: new Date().toLocaleTimeString(), description }]);
    }, []);

    const buildPayload = useCallback(() => {
        const colsToKeep = Object.keys(selectedCols).filter(c => selectedCols[c]);
        const activeRenames = Object.fromEntries(
            Object.entries(renames).filter(([k, v]) => v && v.trim() && v.trim() !== k)
        );
        const typeConvs = Object.fromEntries(Object.entries(typeConversions).filter(([, v]) => v !== 'default'));
        const missActions = Object.fromEntries(Object.entries(missingActions).filter(([, v]) => v !== 'keep'));
        const activeGroupByCols = Object.keys(groupByCols).filter(c => groupByCols[c]);

        return {
            columns: colsToKeep.length === columns.length ? [] : colsToKeep,
            rename_columns: activeRenames,
            filters: filters.filter(f => f.value.trim() !== ''),
            sort_rules: sortRules.filter(r => r.column),
            missing_value_actions: missActions,
            remove_duplicates: removeDuplicates,
            remove_empty_rows: removeEmptyRows,
            type_conversions: typeConvs,
            group_by: (enableGroupBy && activeGroupByCols.length > 0 && aggColumn) ? {
                by_columns: activeGroupByCols, agg_column: aggColumn, agg_func: aggFunc
            } : null
        };
    }, [selectedCols, renames, typeConversions, missingActions, filters, sortRules,
        removeDuplicates, removeEmptyRows, enableGroupBy, groupByCols, aggColumn, aggFunc, columns]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };
                const metaRes = await axios.get(`http://localhost:8000/api/datasets/${id}`, { headers });
                setDataset(metaRes.data);
                const previewRes = await axios.get(`http://localhost:8000/api/datasets/${id}/preview`, { headers });
                const cols = previewRes.data.columns || [];
                setColumns(cols);
                setPreviewCols(cols);
                setPreviewRows(previewRes.data.rows || []);
                const initCols = {}; cols.forEach(c => initCols[c] = true); setSelectedCols(initCols);
                const initGrp = {}; cols.forEach(c => initGrp[c] = false); setGroupByCols(initGrp);
                const initRenames = {}; cols.forEach(c => initRenames[c] = ''); setRenames(initRenames);
            } catch (err) {
                setError('Failed to load dataset details.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleLivePreview = async () => {
        setPreviewing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `http://localhost:8000/api/datasets/${id}/prepare/preview`,
                buildPayload(),
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setPreviewCols(res.data.columns || []);
            setPreviewRows(res.data.rows || []);
            setPreviewStats({ total_rows: res.data.total_rows, total_columns: res.data.total_columns });
        } catch (err) {
            setError(err.response?.data?.detail || 'Preview failed.');
        } finally {
            setPreviewing(false);
        }
    };

    const handleApply = async () => {
        setApplying(true); setError(null); setSuccessMsg(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `http://localhost:8000/api/datasets/${id}/prepare`,
                buildPayload(),
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            addHistory(`Applied transforms → ${res.data.rows} rows, ${res.data.columns} cols`);
            setSuccessMsg(`Transformation complete! ${res.data.rows} rows · ${res.data.columns} columns`);
            if (res.data.preview) {
                setPreviewCols(res.data.preview.columns || []);
                setPreviewRows(res.data.preview.rows || []);
            }
            setTimeout(() => navigate(`/dataset/${id}`), 2500);
        } catch (err) {
            setError(err.response?.data?.detail || 'Transformation failed.');
        } finally {
            setApplying(false);
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading dataset...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden gap-0">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/dataset/${id}`)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={10} className="animate-pulse" /> Data Preparation Studio
                        </span>
                        <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                            {dataset?.filename}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleLivePreview} disabled={previewing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50">
                        {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                        Live Preview
                    </button>
                    <button onClick={handleApply} disabled={applying}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 shadow-md">
                        {applying ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Apply & Save
                    </button>
                </div>
            </div>

            {/* Messages */}
            {(successMsg || error) && (
                <div className={`mx-6 mt-3 flex items-center gap-3 p-3 rounded-xl text-sm font-semibold shrink-0 ${successMsg ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-emerald-800 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-800 dark:text-red-400'}`}>
                    {successMsg ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {successMsg || error}
                    <button className="ml-auto" onClick={() => { setSuccessMsg(null); setError(null); }}><X size={14} /></button>
                </div>
            )}

            {/* 3-Panel Layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: Operations Panel */}
                <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto">
                    {/* Tab Nav */}
                    <div className="flex flex-wrap gap-1 p-3 border-b border-slate-200 dark:border-slate-800">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 space-y-4">
                        {/* COLUMNS TAB */}
                        {activeTab === 'Columns' && (
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Toggle Visibility</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {columns.map(col => (
                                        <div key={col} className="flex items-center gap-2">
                                            <button onClick={() => setSelectedCols(prev => ({ ...prev, [col]: !prev[col] }))}
                                                className={`flex items-center gap-2 flex-1 p-2.5 rounded-lg border text-xs font-semibold transition ${selectedCols[col] ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-800 text-slate-400'}`}>
                                                {selectedCols[col] ? <CheckSquare size={13} /> : <Square size={13} />}
                                                <span className="truncate">{col}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase pt-2">Rename Columns</p>
                                {columns.map(col => (
                                    <div key={col} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 w-24 truncate shrink-0">{col}</span>
                                        <input
                                            value={renames[col] || ''}
                                            onChange={e => setRenames(prev => ({ ...prev, [col]: e.target.value }))}
                                            placeholder="New name..."
                                            className="flex-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* CLEAN TAB */}
                        {activeTab === 'Clean' && (
                            <div className="space-y-4">
                                {[
                                    { label: 'Remove duplicate records', checked: removeDuplicates, onChange: setRemoveDuplicates, desc: 'Drops rows that appear more than once.' },
                                    { label: 'Remove completely empty rows', checked: removeEmptyRows, onChange: setRemoveEmptyRows, desc: 'Drops rows where all cells are null/NaN.' },
                                ].map(opt => (
                                    <label key={opt.label} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 transition">
                                        <input type="checkbox" checked={opt.checked}
                                            onChange={e => opt.onChange(e.target.checked)}
                                            className="mt-0.5 accent-indigo-600 rounded" />
                                        <div>
                                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{opt.label}</span>
                                            <span className="block text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* TYPES TAB */}
                        {activeTab === 'Types' && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Type Conversion</p>
                                {columns.map(col => (
                                    <div key={col} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate shrink-0">{col}</span>
                                        <select value={typeConversions[col] || 'default'}
                                            onChange={e => setTypeConversions(prev => ({ ...prev, [col]: e.target.value }))}
                                            className="flex-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                            <option value="default">Original</option>
                                            <option value="int">Integer</option>
                                            <option value="float">Float</option>
                                            <option value="str">Text</option>
                                            <option value="date">Date</option>
                                            <option value="bool">Boolean</option>
                                            <option value="currency">Currency ($)</option>
                                        </select>
                                    </div>
                                ))}
                                <p className="text-[10px] font-bold text-slate-400 uppercase pt-2">Null Value Strategy</p>
                                {columns.map(col => (
                                    <div key={col} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate shrink-0">{col}</span>
                                        <select value={missingActions[col] || 'keep'}
                                            onChange={e => setMissingActions(prev => ({ ...prev, [col]: e.target.value }))}
                                            className="flex-1 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                            <option value="keep">Keep Nulls</option>
                                            <option value="drop">Drop Rows</option>
                                            <option value="mean">Fill Mean</option>
                                            <option value="median">Fill Median</option>
                                            <option value="mode">Fill Mode</option>
                                            <option value="value:0">Fill 0</option>
                                            <option value="value:N/A">Fill "N/A"</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* FILTER TAB */}
                        {activeTab === 'Filter' && (
                            <div className="space-y-3">
                                <button onClick={() => setFilters(prev => [...prev, { column: columns[0] || '', operator: '==', value: '' }])}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition">
                                    <Plus size={13} /> Add Filter Rule
                                </button>
                                {filters.map((f, idx) => (
                                    <div key={idx} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Rule {idx + 1}</span>
                                            <button onClick={() => setFilters(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-slate-400 hover:text-red-500 transition"><X size={13} /></button>
                                        </div>
                                        <select value={f.column} onChange={e => setFilters(prev => prev.map((x, i) => i === idx ? { ...x, column: e.target.value } : x))}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select value={f.operator} onChange={e => setFilters(prev => prev.map((x, i) => i === idx ? { ...x, operator: e.target.value } : x))}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                            {FILTER_OPS.map(op => <option key={op} value={op}>{op}</option>)}
                                        </select>
                                        <input value={f.value} onChange={e => setFilters(prev => prev.map((x, i) => i === idx ? { ...x, value: e.target.value } : x))}
                                            placeholder={f.operator === 'between' ? "low,high (e.g. 100,500)" : "Value..."}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* SORT TAB */}
                        {activeTab === 'Sort' && (
                            <div className="space-y-3">
                                <button onClick={() => setSortRules(prev => [...prev, { column: columns[0] || '', ascending: true }])}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition">
                                    <Plus size={13} /> Add Sort Rule
                                </button>
                                {sortRules.map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <span className="text-[10px] font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                                        <select value={s.column} onChange={e => setSortRules(prev => prev.map((x, i) => i === idx ? { ...x, column: e.target.value } : x))}
                                            className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select value={s.ascending ? 'asc' : 'desc'} onChange={e => setSortRules(prev => prev.map((x, i) => i === idx ? { ...x, ascending: e.target.value === 'asc' } : x))}
                                            className="px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                            <option value="asc">↑ Asc</option>
                                            <option value="desc">↓ Desc</option>
                                        </select>
                                        <button onClick={() => setSortRules(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-slate-400 hover:text-red-500 transition"><X size={13} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AGGREGATE TAB */}
                        {activeTab === 'Aggregate' && (
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={enableGroupBy} onChange={e => setEnableGroupBy(e.target.checked)} className="mt-1 accent-indigo-600" />
                                    <div>
                                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Enable Group By Aggregation</span>
                                        <span className="block text-[10px] text-slate-400 mt-0.5">Collapses dataset into aggregated summary groups.</span>
                                    </div>
                                </label>
                                {enableGroupBy && (
                                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Group By Columns</p>
                                        <div className="flex flex-wrap gap-2">
                                            {columns.map(col => (
                                                <button key={col} onClick={() => setGroupByCols(prev => ({ ...prev, [col]: !prev[col] }))}
                                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${groupByCols[col] ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                                                    {col}
                                                </button>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aggregate Column</p>
                                            <select value={aggColumn} onChange={e => setAggColumn(e.target.value)}
                                                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                                <option value="">Select column...</option>
                                                {columns.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Function</p>
                                            <select value={aggFunc} onChange={e => setAggFunc(e.target.value)}
                                                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none">
                                                {AGG_FUNCS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER: Live Preview Table */}
                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Eye size={14} className="text-indigo-500" /> Live Data Preview
                                {previewStats && (
                                    <span className="text-xs font-medium text-slate-400">
                                        ({previewStats.total_rows.toLocaleString()} rows · {previewStats.total_columns} columns after transforms)
                                    </span>
                                )}
                            </h2>
                            <span className="text-[10px] text-slate-400">Showing top 20 rows</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-auto shadow-sm">
                            {previewRows.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    Click <span className="font-bold text-indigo-500">Live Preview</span> to see how your transforms will affect the data.
                                </div>
                            ) : (
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                                            {previewCols.map((col, i) => (
                                                <th key={i} className="px-4 py-2.5 font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {previewRows.map((row, ri) => (
                                            <tr key={ri} className="hover:bg-slate-50/60 dark:hover:bg-slate-950/30 transition">
                                                {previewCols.map((col, ci) => (
                                                    <td key={ci} className="px-4 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        {row[col] === null || row[col] === undefined
                                                            ? <span className="text-slate-400 italic text-[10px]">null</span>
                                                            : String(row[col])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: History Sidebar */}
                <div className="w-64 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto">
                    <div className="p-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                            <History size={12} /> Transformation History
                        </h3>
                        {history.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No transformations applied yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {[...history].reverse().map((h, i) => (
                                    <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                        <p className="text-[10px] text-slate-400">{h.ts}</p>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{h.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Active Config</h3>
                        <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="flex justify-between"><span>Filters</span><span className="font-bold text-indigo-600">{filters.filter(f => f.value).length}</span></div>
                            <div className="flex justify-between"><span>Sort Rules</span><span className="font-bold text-indigo-600">{sortRules.length}</span></div>
                            <div className="flex justify-between"><span>Type Casts</span><span className="font-bold text-indigo-600">{Object.values(typeConversions).filter(v => v !== 'default').length}</span></div>
                            <div className="flex justify-between"><span>Remove Dupes</span><span className={`font-bold ${removeDuplicates ? 'text-emerald-600' : 'text-slate-400'}`}>{removeDuplicates ? 'ON' : 'OFF'}</span></div>
                            <div className="flex justify-between"><span>Remove Empty</span><span className={`font-bold ${removeEmptyRows ? 'text-emerald-600' : 'text-slate-400'}`}>{removeEmptyRows ? 'ON' : 'OFF'}</span></div>
                            <div className="flex justify-between"><span>Group By</span><span className={`font-bold ${enableGroupBy ? 'text-emerald-600' : 'text-slate-400'}`}>{enableGroupBy ? 'ON' : 'OFF'}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataPreparation;
