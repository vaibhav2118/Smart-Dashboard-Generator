import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Plot from 'react-plotly.js';
import {
    LayoutDashboard, Loader2, AlertCircle, Lock, ShieldCheck, Sun, Moon,
    LineChart, BarChart3
} from 'lucide-react';
import KpiCard from '../components/KpiCard';

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

const PublicDashboard = () => {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Password state
    const [password, setPassword] = useState('');
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Theme state
    const [theme, setTheme] = useState('dark');
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

    const fetchSharedDashboard = useCallback(async (pw = '') => {
        setLoading(true);
        setError(null);
        setPasswordError(false);
        try {
            const headers = pw ? { 'X-Share-Password': pw } : {};
            const res = await axios.get(`http://localhost:8000/api/share/${token}`, { headers });
            
            setData(res.data);
            setTheme(res.data.theme || 'dark');
            setPasswordRequired(false);
        } catch (err) {
            if (err.response?.status === 401) {
                setPasswordRequired(true);
                if (pw) setPasswordError(true);
            } else if (err.response?.status === 410) {
                setError('This shared dashboard link has expired.');
            } else {
                setError(err.response?.data?.detail || 'Failed to load shared dashboard.');
            }
        } finally {
            setLoading(false);
            setVerifying(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSharedDashboard();
    }, [fetchSharedDashboard]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (!password.trim()) return;
        setVerifying(true);
        fetchSharedDashboard(password);
    };

    if (loading && !verifying) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-100">
            <Loader2 size={48} className="text-indigo-500 animate-spin" />
            <p className="text-lg font-medium text-slate-400">Loading Shared Dashboard...</p>
        </div>
    );

    if (passwordRequired) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-4 bg-slate-800 rounded-2xl text-indigo-500 border border-slate-700">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-xl font-extrabold text-white">Password Protected</h1>
                    <p className="text-sm text-slate-400">This dashboard share link requires a password to view.</p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-white text-sm font-semibold"
                        />
                        {passwordError && (
                            <p className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                                <AlertCircle size={12} /> Incorrect password. Please try again.
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
                    >
                        {verifying && <Loader2 size={14} className="animate-spin" />}
                        Unlock Dashboard
                    </button>
                </form>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-slate-100 gap-4">
            <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-900/40 rounded-2xl text-red-400 text-sm font-semibold max-w-lg text-center">
                <AlertCircle size={20} className="shrink-0" />
                <p>{error}</p>
            </div>
            <p className="text-xs text-slate-500">Contact the dashboard owner to request a new link.</p>
        </div>
    );

    const widgets = data?.layout_json ? JSON.parse(data.layout_json) : [];

    return (
        <div className="space-y-0 min-h-screen" style={{ background: T.bg }}>
            {/* Read-Only Top Header */}
            <div className="sticky top-0 z-30 border-b py-4 px-6 bg-opacity-70 backdrop-blur-md"
                style={{ background: T.card, borderColor: T.border }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shrink-0">
                            <LayoutDashboard size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-extrabold tracking-tight truncate" style={{ color: T.text }}>
                                {data?.dashboard_name || 'Shared Dashboard'}
                            </h1>
                            <p className="text-xs font-semibold truncate" style={{ color: T.subtext }}>
                                {data?.description || 'Public Read-Only Analytics View'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Security indicators */}
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/40 rounded-xl border text-[11px] font-bold"
                            style={{ borderColor: T.border, color: T.subtext }}>
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span>Verified Share</span>
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
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                {/* KPIs Row */}
                {data?.kpis?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {data.kpis.map((kpi, idx) => (
                            <KpiCard key={idx} label={kpi.label} value={kpi.value} />
                        ))}
                    </div>
                )}

                {/* Main Widgets Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {widgets.map((widget) => {
                        if (!widget.visible) return null;
                        return (
                            <div key={widget.id} className="rounded-2xl border overflow-hidden flex flex-col"
                                style={{ background: T.card, borderColor: T.border, minHeight: '380px' }}>
                                <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: T.border }}>
                                    <h3 className="font-bold text-xs truncate" style={{ color: T.text }}>
                                        {widget.title}
                                    </h3>
                                </div>

                                <div className="flex-1 min-h-0">
                                    {widget.type === 'kpi_card' ? (
                                        <div className="h-full flex items-center justify-center p-6">
                                            <KpiCard label={widget.title} value={widget.plotData?.[0]?.y?.[0] ?? '—'} />
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
                        );
                    })}
                </div>

                {/* Time-Series Forecast Block */}
                {data?.forecast && (
                    <div className="rounded-2xl border p-6 space-y-4"
                        style={{ background: T.card, borderColor: T.border }}>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                                <h3 className="font-bold text-sm text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                                    <LineChart size={16} /> Time-Series Forecast Projections
                                </h3>
                                <p className="text-[11px]" style={{ color: T.subtext }}>
                                    Model: {data.forecast.model_used.toUpperCase()} · Horizon: {data.forecast.forecast_horizon} days · Target: {data.forecast.target_column}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-right">
                                    <span className="block text-[10px] uppercase font-semibold" style={{ color: T.subtext }}>Growth Rate</span>
                                    <span className={`block font-bold text-sm ${data.forecast.growth_rate > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {data.forecast.growth_rate > 0 ? '+' : ''}{data.forecast.growth_rate.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] uppercase font-semibold" style={{ color: T.subtext }}>Reliability</span>
                                    <span className="block font-bold text-sm text-indigo-400">
                                        {data.forecast.reliability_score}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Forecast Chart */}
                        <div className="h-80">
                            <Plot
                                data={[
                                    {
                                        x: data.forecast.actual_points.map(p => p.Date).slice(-20),
                                        y: data.forecast.actual_points.map(p => p.Value).slice(-20),
                                        type: 'scatter',
                                        mode: 'lines',
                                        name: 'Historical',
                                        line: { color: '#6366f1', width: 2 }
                                    },
                                    {
                                        x: data.forecast.forecast_points.map(p => p.Date),
                                        y: data.forecast.forecast_points.map(p => p.Value),
                                        type: 'scatter',
                                        mode: 'lines',
                                        name: 'Forecast',
                                        line: { color: '#a855f7', width: 2, dash: 'dot' }
                                    }
                                ]}
                                layout={{ ...getChartLayout("Forecast Model"), autosize: true }}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicDashboard;
