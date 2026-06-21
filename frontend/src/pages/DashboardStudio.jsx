import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Plot from 'react-plotly.js';
import {
    LayoutDashboard, ArrowLeft, Loader2, AlertCircle, ShieldCheck, RefreshCw,
    Brain, FileText, LineChart, Settings2, Copy, X, Download, Save,
    Sun, Moon, Monitor, Edit3, BarChart3, Check, FileDown, FileJson,
    FileSpreadsheet, Image, Share2, Globe, Calendar, Users, Key, ExternalLink, RefreshCcw
} from 'lucide-react';
import KpiCard from '../components/KpiCard';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const THEMES = {
    dark: {
        bg: '#0f172a', card: '#1e293b', border: '#334155',
        text: '#cbd5e1', subtext: '#64748b', plotBg: 'rgba(0,0,0,0)',
        paperBg: 'rgba(0,0,0,0)', fontColor: '#cbd5e1', gridColor: '#334155',
    },
    light: {
        bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0',
        text: '#1e293b', subtext: '#64748b', plotBg: 'rgba(0,0,0,0)',
        paperBg: 'rgba(0,0,0,0)', fontColor: '#334155', gridColor: '#e2e8f0',
    }
};

const WIDGET_TYPES = ['bar', 'line', 'area', 'pie', 'donut', 'scatter', 'histogram', 'kpi_card', 'table'];

const DashboardStudio = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const dashboardRef = useRef(null);

    const [dashboardData, setDashboardData] = useState(null);
    const [kpiData, setKpiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveMsg, setSaveMsg] = useState(null);

    // Theme & metadata
    const [theme, setTheme] = useState('dark');
    const [dashboardName, setDashboardName] = useState('');
    const [description, setDescription] = useState('');
    const [editingMeta, setEditingMeta] = useState(false);

    // Sharing & Expiration States
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEnabled, setShareEnabled] = useState(false);
    const [shareType, setShareType] = useState('live');
    const [expiresOption, setExpiresOption] = useState('never');
    const [customExpiry, setCustomExpiry] = useState('');
    const [sharePassword, setSharePassword] = useState('');
    const [shareToken, setShareToken] = useState('');
    const [expiresAt, setExpiresAt] = useState(null);
    const [shareLoading, setShareLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [copyEmbedSuccess, setCopyEmbedSuccess] = useState(false);

    // Analytics States
    const [viewCount, setViewCount] = useState(0);
    const [uniqueVisitors, setUniqueVisitors] = useState(0);
    const [firstViewedAt, setFirstViewedAt] = useState(null);
    const [lastViewedAt, setLastViewedAt] = useState(null);

    // Chart widgets (from backend + additions)
    const [widgets, setWidgets] = useState([]);

    // Config panel
    const [configWidget, setConfigWidget] = useState(null); // index

    const T = THEMES[theme] || THEMES.dark;

    const getChartLayout = useCallback((title) => ({
        title: { text: '', font: { color: T.fontColor, size: 13 } },
        plot_bgcolor: T.plotBg,
        paper_bgcolor: T.paperBg,
        font: { color: T.fontColor, family: 'Inter, sans-serif', size: 11 },
        margin: { t: 32, b: 40, l: 50, r: 20 },
        xaxis: { gridcolor: T.gridColor, zerolinecolor: T.gridColor },
        yaxis: { gridcolor: T.gridColor, zerolinecolor: T.gridColor },
        legend: { font: { color: T.fontColor } },
        showlegend: true,
    }), [theme]);

    const loadDashboard = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [dashRes, kpiRes] = await Promise.all([
                axios.get(`http://localhost:8000/api/datasets/${datasetId}/dashboard`, { headers }),
                axios.get(`http://localhost:8000/api/datasets/${datasetId}/kpis`, { headers }),
            ]);
            const dash = dashRes.data;
            setDashboardData(dash);
            setDashboardName(dash.dashboard_name || '');
            setDescription(dash.description || '');
            setTheme(dash.theme || 'dark');
            setKpiData(kpiRes.data);
            
            // Populate sharing config & analytics
            setShareEnabled(dash.share_enabled || false);
            setShareToken(dash.share_token || '');
            setShareType(dash.share_type || 'live');
            setExpiresAt(dash.expires_at || null);
            setViewCount(dash.view_count || 0);
            setUniqueVisitors(dash.unique_visitors || 0);
            setFirstViewedAt(dash.first_viewed_at || null);
            setLastViewedAt(dash.last_viewed_at || null);
            // Map backend charts to widgets
            const mapped = (dash.charts || []).map((c, i) => ({
                id: c.id || `chart_${i}`,
                title: c.title || c.id,
                type: c.error ? 'error' : (c.data?.[0]?.type || 'bar'),
                plotData: c.data || [],
                error: c.error || null,
                visible: true,
            }));
            // Restore persisted layout if any
            let saved = [];
            try { saved = JSON.parse(dash.layout_json || '[]'); } catch { saved = []; }
            setWidgets(saved.length > 0 ? saved : mapped);
        } catch (err) {
            setError('Failed to load dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [datasetId]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const saveLayout = async (currentWidgets, currentTheme, currentName, currentDesc) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            // Save layout
            await axios.post(`http://localhost:8000/api/datasets/${datasetId}/dashboard/layout`, {
                layout_json: JSON.stringify(currentWidgets || widgets)
            }, { headers });
            // Save metadata
            await axios.put(`http://localhost:8000/api/datasets/${datasetId}/dashboard/metadata`, {
                dashboard_name: currentName || dashboardName,
                description: currentDesc || description,
                theme: currentTheme || theme,
            }, { headers });
            setSaveMsg('Dashboard saved!');
            setTimeout(() => setSaveMsg(null), 3000);
        } catch (e) {
            setSaveMsg('Save failed.');
            setTimeout(() => setSaveMsg(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveShareConfig = async () => {
        setShareLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const payload = {
                share_type: shareType,
                expires_option: expiresOption,
                expires_at: expiresOption === 'custom' ? customExpiry : null,
                password: sharePassword
            };
            
            const dashboardId = dashboardData?.id;
            const res = await axios.post(`http://localhost:8000/api/dashboards/${dashboardId}/share`, payload, { headers });
            
            setShareEnabled(true);
            setShareToken(res.data.token);
            setExpiresAt(res.data.expires_at);
            setShareType(res.data.share_type);
            setSaveMsg('Share Active!');
            setTimeout(() => setSaveMsg(null), 3000);
        } catch (e) {
            console.error('Failed to configure share link', e);
        } finally {
            setShareLoading(false);
        }
    };

    const handleDisableShare = async () => {
        setShareLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const dashboardId = dashboardData?.id;
            
            await axios.delete(`http://localhost:8000/api/dashboards/${dashboardId}/share`, { headers });
            
            setShareEnabled(false);
            setShareToken('');
            setExpiresAt(null);
            setSharePassword('');
        } catch (e) {
            console.error('Failed to disable share link', e);
        } finally {
            setShareLoading(false);
        }
    };

    const handleDisableAllShares = async () => {
        setShareLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            await axios.post(`http://localhost:8000/api/dashboards/share/disable-all`, {}, { headers });
            
            setShareEnabled(false);
            setShareToken('');
            setExpiresAt(null);
            setSharePassword('');
        } catch (e) {
            console.error('Failed to disable all share links', e);
        } finally {
            setShareLoading(false);
        }
    };

    const handleRegenerateShare = async () => {
        setShareLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const dashboardId = dashboardData?.id;
            
            const res = await axios.post(`http://localhost:8000/api/dashboards/${dashboardId}/share/regenerate`, {}, { headers });
            
            setShareToken(res.data.token);
            setExpiresAt(res.data.expires_at);
        } catch (e) {
            console.error('Failed to regenerate share link', e);
        } finally {
            setShareLoading(false);
        }
    };

    const handleDuplicate = (idx) => {
        const w = widgets[idx];
        const cloned = { ...w, id: `${w.id}_copy_${Date.now()}`, title: `${w.title} (Copy)` };
        const newWidgets = [...widgets.slice(0, idx + 1), cloned, ...widgets.slice(idx + 1)];
        setWidgets(newWidgets);
    };

    const handleRemove = (idx) => {
        setWidgets(prev => prev.filter((_, i) => i !== idx));
        if (configWidget === idx) setConfigWidget(null);
    };

    // Export PNG
    const exportPNG = async () => {
        if (!dashboardRef.current) return;
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: T.bg });
        const link = document.createElement('a');
        link.download = `${dashboardName || 'dashboard'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Export PDF
    const exportPDF = async () => {
        if (!dashboardRef.current) return;
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: T.bg });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`${dashboardName || 'dashboard'}.pdf`);
    };

    // Export JSON
    const exportJSON = () => {
        const data = JSON.stringify({ dashboard_name: dashboardName, description, theme, widgets, kpis: kpiData?.kpis }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `${dashboardName || 'dashboard'}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    };

    // Export CSV
    const exportCSV = () => {
        window.open(`http://localhost:8000/api/datasets/${datasetId}/export/csv?token=${localStorage.getItem('token')}`, '_blank');
        // Alternative: use axios with responseType blob and then save
        const token = localStorage.getItem('token');
        axios.get(`http://localhost:8000/api/datasets/${datasetId}/export/csv`, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'blob'
        }).then(res => {
            const url = URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${dashboardName || 'dataset'}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }).catch(() => {});
    };

    const healthScore = kpiData ? Math.min(100, kpiData.confidence_score + 8) : 95;

    if (loading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
            <Loader2 size={48} className="text-indigo-500 animate-spin" />
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">Building Dashboard Studio...</p>
            <p className="text-sm text-slate-400">Analyzing dataset and generating charts.</p>
        </div>
    );

    if (error && !dashboardData) return (
        <div className="space-y-4 p-6">
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-sm font-semibold">
                <AlertCircle size={20} /> {error}
            </div>
            <button onClick={() => navigate(-1)} className="text-sm font-semibold text-indigo-600 hover:underline">← Back</button>
        </div>
    );

    return (
        <div className="space-y-0 -mx-6 -mt-4" style={{ background: theme === 'dark' ? '#0f172a' : '#f1f5f9', minHeight: '100vh' }}>
            {/* Studio Header */}
            <div className="sticky top-0 z-30 border-b"
                style={{ background: T.card, borderColor: T.border }}>
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => navigate(`/dataset/${datasetId}`)}
                            className="p-2 rounded-xl border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0"
                            style={{ borderColor: T.border, background: T.bg }}>
                            <ArrowLeft size={18} />
                        </button>
                        {editingMeta ? (
                            <div className="flex items-center gap-2">
                                <input value={dashboardName} onChange={e => setDashboardName(e.target.value)}
                                    className="text-lg font-extrabold tracking-tight bg-transparent border-b-2 border-indigo-500 focus:outline-none"
                                    style={{ color: T.text }} />
                                <button onClick={() => { setEditingMeta(false); saveLayout(widgets, theme, dashboardName, description); }}
                                    className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition">
                                    <Check size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="min-w-0">
                                    <h1 className="text-xl font-extrabold tracking-tight truncate flex items-center gap-2" style={{ color: T.text }}>
                                        <LayoutDashboard size={20} className="text-indigo-500 shrink-0" />
                                        {dashboardName || 'Untitled Dashboard'}
                                    </h1>
                                    <p className="text-xs font-medium truncate" style={{ color: T.subtext }}>
                                        {dashboardData?.dataset_category}
                                    </p>
                                </div>
                                <button onClick={() => setEditingMeta(true)}
                                    className="p-1.5 rounded-lg transition shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    style={{ color: T.subtext }}>
                                    <Edit3 size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Status + Theme + Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Score badges */}
                        <div className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold"
                            style={{ borderColor: T.border, background: T.bg, color: T.subtext }}>
                            <span className="text-indigo-500">{kpiData?.confidence_score}%</span>
                            <span>conf</span>
                            <span className="mx-1 opacity-30">|</span>
                            <span className="text-emerald-500">{healthScore}%</span>
                            <ShieldCheck size={12} className="text-emerald-500" />
                        </div>

                        {/* Theme Toggle */}
                        <div className="flex items-center rounded-xl border p-1 gap-1"
                            style={{ borderColor: T.border, background: T.bg }}>
                            {[{ v: 'light', Icon: Sun }, { v: 'dark', Icon: Moon }].map(({ v, Icon }) => (
                                <button key={v} onClick={() => setTheme(v)}
                                    className={`p-1.5 rounded-lg transition ${theme === v ? 'bg-indigo-600 text-white' : ''}`}
                                    style={{ color: theme === v ? 'white' : T.subtext }}>
                                    <Icon size={14} />
                                </button>
                            ))}
                        </div>

                        {/* Share */}
                        <button onClick={() => setShowShareModal(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition">
                            <Share2 size={14} />
                            Share
                        </button>

                        {/* Save */}
                        <button onClick={() => saveLayout()} disabled={saving}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saveMsg || 'Save'}
                        </button>

                        {/* Refresh */}
                        <button onClick={loadDashboard}
                            className="p-2 rounded-xl border text-slate-500 hover:text-indigo-600 transition"
                            style={{ borderColor: T.border, background: T.bg }}>
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2 px-6 py-2 border-t text-xs"
                    style={{ borderColor: T.border }}>
                    {/* Export Menu */}
                    <div className="flex items-center gap-1">
                        <span className="font-bold mr-1" style={{ color: T.subtext }}>Export:</span>
                        {[
                            { label: 'PNG', Icon: Image, action: exportPNG },
                            { label: 'PDF', Icon: FileDown, action: exportPDF },
                            { label: 'JSON', Icon: FileJson, action: exportJSON },
                            { label: 'CSV', Icon: FileSpreadsheet, action: exportCSV },
                        ].map(({ label, Icon, action }) => (
                            <button key={label} onClick={action}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                style={{ color: T.subtext, background: T.bg }}>
                                <Icon size={12} /> {label}
                            </button>
                        ))}
                    </div>

                    <div className="h-4 w-px mx-2" style={{ background: T.border }}></div>

                    {/* Disabled future actions */}
                    {[
                        { label: 'Generate AI Insights', Icon: Brain },
                        { label: 'Forecast Dataset', Icon: LineChart },
                    ].map(({ label, Icon }) => (
                        <button key={label} title="Coming Soon"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold opacity-40 cursor-not-allowed"
                            style={{ color: T.subtext }}>
                            <Icon size={12} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dashboard Canvas */}
            <div ref={dashboardRef} className="p-6 space-y-6">
                {/* KPI Row */}
                {kpiData?.kpis?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {kpiData.kpis.map((kpi, idx) => (
                            <KpiCard key={idx} label={kpi.label} value={kpi.value} />
                        ))}
                    </div>
                )}

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {widgets.map((widget, idx) => (
                        <div key={widget.id} className="rounded-2xl border overflow-hidden flex flex-col"
                            style={{ background: T.card, borderColor: T.border, minHeight: '380px' }}>
                            {/* Widget Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                                style={{ borderColor: T.border }}>
                                <h3 className="font-bold text-sm truncate" style={{ color: T.text }}>
                                    {widget.title}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setConfigWidget(configWidget === idx ? null : idx)}
                                        className={`p-1.5 rounded-lg transition ${configWidget === idx ? 'bg-indigo-600 text-white' : ''}`}
                                        style={{ color: configWidget === idx ? 'white' : T.subtext }}
                                        title="Configure">
                                        <Settings2 size={14} />
                                    </button>
                                    <button onClick={() => handleDuplicate(idx)}
                                        className="p-1.5 rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                        style={{ color: T.subtext }} title="Duplicate">
                                        <Copy size={14} />
                                    </button>
                                    <button onClick={() => handleRemove(idx)}
                                        className="p-1.5 rounded-lg transition hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500"
                                        style={{ color: T.subtext }} title="Remove">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Config Panel (slide-in) */}
                            {configWidget === idx && (
                                <div className="px-4 py-3 border-b text-xs space-y-2"
                                    style={{ background: T.bg, borderColor: T.border }}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold" style={{ color: T.subtext }}>Chart Type:</span>
                                        <select value={widget.type}
                                            onChange={e => setWidgets(prev => prev.map((w, i) => i === idx ? { ...w, type: e.target.value } : w))}
                                            className="px-2 py-1 rounded-lg border text-xs font-semibold focus:outline-none"
                                            style={{ background: T.card, borderColor: T.border, color: T.text }}>
                                            {WIDGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-slate-400 italic">Chart axis configuration coming in next update.</p>
                                </div>
                            )}

                            {/* Chart Body */}
                            <div className="flex-1 min-h-0">
                                {widget.error ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                                        <div className="p-4 rounded-2xl" style={{ background: T.bg }}>
                                            <AlertCircle size={32} className="text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm mb-1" style={{ color: T.text }}>Visualization Unavailable</p>
                                            <p className="text-xs" style={{ color: T.subtext }}>{widget.error}</p>
                                        </div>
                                    </div>
                                ) : widget.type === 'kpi_card' ? (
                                    <div className="h-full flex items-center justify-center p-6">
                                        <KpiCard label={widget.title} value={widget.plotData?.[0]?.y?.[0] ?? '—'} />
                                    </div>
                                ) : widget.type === 'table' ? (
                                    <div className="overflow-auto h-full p-2">
                                        <p className="text-xs text-slate-400 italic p-4">Table widget: connect to dataset preview.</p>
                                    </div>
                                ) : (
                                    <Plot
                                        data={widget.plotData.map(trace => {
                                            const t = { ...trace };
                                            if (widget.type === 'area') { t.type = 'scatter'; t.fill = 'tozeroy'; t.mode = 'lines'; }
                                            else if (widget.type === 'donut') { t.type = 'pie'; t.hole = 0.5; }
                                            else if (widget.type === 'histogram') { t.type = 'histogram'; }
                                            else if (widget.type === 'scatter') { t.type = 'scatter'; t.mode = 'markers'; }
                                            else if (widget.type === 'pie') { t.type = 'pie'; t.hole = 0; }
                                            else if (widget.type === 'bar') { t.type = 'bar'; }
                                            else if (widget.type === 'line') { t.type = 'scatter'; t.mode = 'lines'; }
                                            return t;
                                        })}
                                        layout={{ ...getChartLayout(widget.title), autosize: true }}
                                        useResizeHandler={true}
                                        style={{ width: '100%', height: '100%' }}
                                        config={{ displayModeBar: false, responsive: true }}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {widgets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                        <BarChart3 size={48} style={{ color: T.subtext }} />
                        <p className="font-bold" style={{ color: T.text }}>No widgets on this dashboard</p>
                        <p className="text-sm" style={{ color: T.subtext }}>Refresh to regenerate charts or upload a dataset with more business columns.</p>
                    </div>
                )}
            </div>

            {/* Share Settings Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            <div className="flex items-center gap-2">
                                <Globe className="text-indigo-500" size={18} />
                                <h2 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Dashboard Share Settings</h2>
                            </div>
                            <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                                <X size={18} />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 dark:text-slate-300">
                            {/* Toggle & Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Side Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase text-slate-400">Enable Sharing</span>
                                        <button 
                                            onClick={() => {
                                                if (shareEnabled) handleDisableShare();
                                                else handleSaveShareConfig();
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${shareEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shareEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Share Mode</span>
                                        <div className="flex gap-2">
                                            {['live', 'snapshot'].map(type => (
                                                <button 
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setShareType(type)}
                                                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition ${shareType === type ? 'border-indigo-500 bg-indigo-50/20 text-indigo-500' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                >
                                                    {type.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Expiration</span>
                                        <select 
                                            value={expiresOption}
                                            onChange={e => setExpiresOption(e.target.value)}
                                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="never">Never Expire</option>
                                            <option value="24h">24 Hours</option>
                                            <option value="7d">7 Days</option>
                                            <option value="30d">30 Days</option>
                                            <option value="custom">Custom Date/Time</option>
                                        </select>
                                        
                                        {expiresOption === 'custom' && (
                                            <input 
                                                type="datetime-local"
                                                value={customExpiry}
                                                onChange={e => setCustomExpiry(e.target.value)}
                                                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 mt-2 text-slate-700 dark:text-slate-350"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                            <Key size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-bold uppercase text-slate-400">Password Protection (Optional)</span>
                                        </div>
                                        <input 
                                            type="password"
                                            value={sharePassword}
                                            onChange={e => setSharePassword(e.target.value)}
                                            placeholder="Enter passcode to protect link..."
                                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    
                                    <div className="pt-2 flex flex-col gap-2">
                                        <button 
                                            type="button"
                                            onClick={handleSaveShareConfig}
                                            disabled={shareLoading}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                                        >
                                            {shareEnabled ? 'Update Share Settings' : 'Generate Share Link'}
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleDisableAllShares}
                                            disabled={shareLoading}
                                            className="w-full py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
                                        >
                                            Disable All Active Links
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Right Side Analytics & Actions */}
                                <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="text-slate-400" size={14} />
                                        <span className="text-xs font-bold uppercase text-slate-400">Share Analytics</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                            <span className="block text-[10px] uppercase font-semibold text-slate-400">Total Views</span>
                                            <span className="block font-extrabold text-lg text-indigo-500 mt-1">{viewCount}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                            <span className="block text-[10px] uppercase font-semibold text-slate-400">Unique Visitors</span>
                                            <span className="block font-extrabold text-lg text-emerald-500 mt-1">{uniqueVisitors}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5 text-xs text-slate-450">
                                        <div className="flex justify-between">
                                            <span>First Viewed:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-350">
                                                {firstViewedAt ? new Date(firstViewedAt).toLocaleDateString() : 'Never'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Viewed:</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-350">
                                                {lastViewedAt ? new Date(lastViewedAt).toLocaleDateString() : 'Never'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Expiration:</span>
                                            <span className="font-semibold text-indigo-400">
                                                {expiresAt ? new Date(expiresAt).toLocaleString() : 'Never'}
                                            </span>
                                        </div>
                                    </div>

                                    {shareEnabled && shareToken && (
                                        <div className="space-y-4 pt-2">
                                            {/* Link Display */}
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Public Link</span>
                                                <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                                    <input 
                                                        readOnly 
                                                        value={`http://localhost:5173/share/${shareToken}`}
                                                        className="flex-1 bg-transparent text-xs text-indigo-500 font-semibold focus:outline-none truncate"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`http://localhost:5173/share/${shareToken}`);
                                                            setCopySuccess(true);
                                                            setTimeout(() => setCopySuccess(false), 2000);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-450 hover:text-indigo-500 transition"
                                                        title="Copy Link"
                                                    >
                                                        {copySuccess ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </button>
                                                    <a 
                                                        href={`http://localhost:5173/share/${shareToken}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-455 hover:text-indigo-500 transition"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Embed Iframe Display */}
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Embed iframe Code</span>
                                                <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                                    <input 
                                                        readOnly 
                                                        value={`<iframe src="http://localhost:5173/share/${shareToken}" width="100%" height="600" style="border:none;"></iframe>`}
                                                        className="flex-1 bg-transparent text-xs text-slate-550 font-mono focus:outline-none truncate"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`<iframe src="http://localhost:5173/share/${shareToken}" width="100%" height="600" style="border:none;"></iframe>`);
                                                            setCopyEmbedSuccess(true);
                                                            setTimeout(() => setCopyEmbedSuccess(false), 2000);
                                                        }}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-455 hover:text-indigo-500 transition"
                                                        title="Copy Embed Code"
                                                    >
                                                        {copyEmbedSuccess ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Regenerate Trigger */}
                                            <button 
                                                type="button"
                                                onClick={handleRegenerateShare}
                                                disabled={shareLoading}
                                                className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[11px] transition"
                                            >
                                                <RefreshCcw size={12} /> Regenerate Share Link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardStudio;
