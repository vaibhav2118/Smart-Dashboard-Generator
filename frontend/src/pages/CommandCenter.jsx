import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDataset } from '../context/DatasetContext';
import {
    Activity, LayoutDashboard, Brain, LineChart, FileText, MessageSquare,
    CheckCircle, AlertCircle, RefreshCw, ChevronRight, Share2, FileDown, Database, Loader2
} from 'lucide-react';

const CommandCenter = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const { activeDataset, setActiveDataset } = useDataset();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [datasetProfile, setDatasetProfile] = useState(null);
    const [moduleStatus, setModuleStatus] = useState({
        analysis: { status: 'Not Generated', lastUpdated: null },
        dashboard: { status: 'Not Generated', lastUpdated: null, id: null },
        insights: { status: 'Not Generated', lastUpdated: null },
        forecasting: { status: 'Not Generated', lastUpdated: null },
        reports: { status: 'Not Generated', lastUpdated: null },
        copilot: { status: 'Not Generated', lastUpdated: null }
    });

    const isDemo = String(datasetId).startsWith('demo-');

    useEffect(() => {
        const fetchStatus = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch Profile (Analysis) + basic dataset info
                let dsProfile = null;
                if (!isDemo) {
                    try {
                        const profRes = await axios.get(`http://localhost:8000/api/datasets/${datasetId}/profile`, { headers });
                        dsProfile = profRes.data;
                        setDatasetProfile(dsProfile);
                        // Also update context if not already set
                        if (!activeDataset || String(activeDataset.id) !== String(datasetId)) {
                            const dsRes = await axios.get(`http://localhost:8000/api/datasets/${datasetId}`, { headers });
                            setActiveDataset(dsRes.data);
                        }
                    } catch (e) {
                        console.warn("Profile not generated", e);
                    }
                }

                if (isDemo) {
                    // Mock data for demo datasets
                    setModuleStatus({
                        analysis: { status: 'Generated', lastUpdated: new Date().toISOString() },
                        dashboard: { status: 'Generated', lastUpdated: new Date().toISOString(), id: 'demo' },
                        insights: { status: 'Generated', lastUpdated: new Date().toISOString() },
                        forecasting: { status: 'Generated', lastUpdated: new Date().toISOString() },
                        reports: { status: 'Not Generated', lastUpdated: null },
                        copilot: { status: 'Not Generated', lastUpdated: null }
                    });
                    setLoading(false);
                    return;
                }

                const newStatus = { ...moduleStatus };
                if (dsProfile) {
                    newStatus.analysis = { status: 'Generated', lastUpdated: dsProfile.updated_at || new Date().toISOString() };
                }

                // 2. Fetch Dashboard
                try {
                    const dashRes = await axios.get(`http://localhost:8000/api/datasets/${datasetId}/dashboard`, { headers });
                    if (dashRes.data && dashRes.data.layout_json) {
                        newStatus.dashboard = { status: 'Generated', lastUpdated: dashRes.data.updated_at, id: dashRes.data.id };
                    }
                } catch (e) { }

                // 3. Fetch Insights
                try {
                    const insRes = await axios.get(`http://localhost:8000/api/insights/${datasetId}`, { headers });
                    if (insRes.data && insRes.data.insight_data) {
                        newStatus.insights = { status: 'Generated', lastUpdated: insRes.data.updated_at };
                    }
                } catch (e) { }

                // 4. Fetch Forecast
                try {
                    const forRes = await axios.get(`http://localhost:8000/api/forecast/${datasetId}`, { headers });
                    if (forRes.data && forRes.data.forecast_data) {
                        newStatus.forecasting = { status: 'Generated', lastUpdated: forRes.data.updated_at };
                    }
                } catch (e) { }

                // 5. Fetch Reports
                try {
                    const repRes = await axios.get(`http://localhost:8000/api/reports/`, { headers });
                    const dsReports = repRes.data.filter(r => String(r.dataset_id) === String(datasetId));
                    if (dsReports.length > 0) {
                        // Get most recent
                        const mostRecent = dsReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                        newStatus.reports = { status: 'Generated', lastUpdated: mostRecent.created_at };
                    }
                } catch (e) { }

                // 6. Fetch Copilot sessions
                try {
                    const chatRes = await axios.get(`http://localhost:8000/api/chat/sessions/${datasetId}`, { headers });
                    if (chatRes.data && chatRes.data.length > 0) {
                        newStatus.copilot = { status: 'Active', lastUpdated: chatRes.data[0].updated_at };
                    }
                } catch (e) { }

                setModuleStatus(newStatus);
            } catch (err) {
                console.error("Failed to load command center data", err);
                setError("Failed to load module statuses.");
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [datasetId, isDemo]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Command Center...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-750">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
            </div>
        );
    }

    // Health Score Math
    let healthScore = 0;
    let missingCount = 0;
    let duplicateCount = 0;
    let rowCount = activeDataset?.row_count || 0;
    let colCount = activeDataset?.column_count || 0;
    
    if (datasetProfile) {
        rowCount = datasetProfile.total_rows || rowCount;
        colCount = datasetProfile.total_columns || colCount;
        missingCount = datasetProfile.missing_values_count || 0;
        duplicateCount = datasetProfile.duplicate_records_count || 0;
        
        const totalCells = rowCount * colCount;
        const missingPct = totalCells > 0 ? (missingCount / totalCells) * 100 : 0;
        const duplicatePct = rowCount > 0 ? (duplicateCount / rowCount) * 100 : 0;
        const missingPenalty = Math.min(40, missingPct * 2);
        const duplicatePenalty = Math.min(30, duplicatePct * 1.5);
        healthScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty));
    }

    const renderStatusBadge = (status) => {
        if (status === 'Generated' || status === 'Active') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"><CheckCircle size={12} /> {status}</span>;
        } else if (status === 'Outdated') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40"><RefreshCw size={12} /> Outdated</span>;
        }
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"><AlertCircle size={12} /> {status}</span>;
    };

    const modules = [
        { key: 'analysis', title: 'Analysis', icon: Activity, path: `/analysis/${datasetId}`, action: moduleStatus.analysis.status === 'Generated' ? 'Open Analysis' : 'Run Profile' },
        { key: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, path: `/dashboard/${datasetId}`, action: moduleStatus.dashboard.status === 'Generated' ? 'Open Studio' : 'Generate Dashboard' },
        { key: 'insights', title: 'AI Insights', icon: Brain, path: `/insights/${datasetId}`, action: moduleStatus.insights.status === 'Generated' ? 'View Insights' : 'Generate Insights' },
        { key: 'forecasting', title: 'Forecasting', icon: LineChart, path: `/forecast/${datasetId}`, action: moduleStatus.forecasting.status === 'Generated' ? 'View Forecasts' : 'Run Forecast Models' },
        { key: 'reports', title: 'Reports', icon: FileText, path: `/report-builder/${datasetId}`, action: moduleStatus.reports.status === 'Generated' ? 'View Reports' : 'Build Report' },
        { key: 'copilot', title: 'AI Copilot', icon: MessageSquare, path: `/chat/${datasetId}`, action: moduleStatus.copilot.status === 'Active' ? 'Open Copilot' : 'Start Chat' },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate flex items-center gap-3">
                        <Database className="text-indigo-600" />
                        Command Center
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Central operational hub for <span className="font-semibold text-slate-700 dark:text-slate-300">{activeDataset?.filename || datasetId}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    {moduleStatus.dashboard.status === 'Generated' && moduleStatus.dashboard.id && (
                        <button
                            onClick={() => {/* Implement Sharing Modals or link to Dashboard Studio which has sharing */ navigate(`/dashboard/${datasetId}`) }}
                            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition flex items-center gap-2"
                        >
                            <Share2 size={16} /> Share Dashboard
                        </button>
                    )}
                    <Link
                        to={`/executive-brief/${datasetId}`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md flex items-center gap-2"
                    >
                        <FileDown size={16} /> Generate Executive Brief
                    </Link>
                </div>
            </div>

            {/* Health Summary Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Activity size={20} className="text-indigo-500" /> Dataset Health Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                        <p className="text-xs font-semibold text-slate-500">Health Score</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{healthScore}%</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                        <p className="text-xs font-semibold text-slate-500">Row Count</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">{rowCount}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                        <p className="text-xs font-semibold text-slate-500">Column Count</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">{colCount}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                        <p className="text-xs font-semibold text-slate-500">Missing Values</p>
                        <p className={`text-xl font-bold mt-1 ${missingCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{missingCount}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                        <p className="text-xs font-semibold text-slate-500">Duplicate Records</p>
                        <p className={`text-xl font-bold mt-1 ${duplicateCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{duplicateCount}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-center">
                        <p className="text-xs font-semibold text-slate-500">Outlier Count</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                            {datasetProfile?.outliers_by_column ? Object.values(datasetProfile.outliers_by_column).reduce((a, b) => a + b, 0) : 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod) => {
                    const statusData = moduleStatus[mod.key];
                    const Icon = mod.icon;
                    return (
                        <div key={mod.key} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <Icon size={24} />
                                    </div>
                                    {renderStatusBadge(statusData.status)}
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{mod.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    {statusData.lastUpdated ? `Last Updated: ${new Date(statusData.lastUpdated).toLocaleString()}` : 'Never generated'}
                                </p>
                            </div>
                            <Link
                                to={mod.path}
                                className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
                                    statusData.status === 'Generated' || statusData.status === 'Active'
                                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                                }`}
                            >
                                {mod.action} <ChevronRight size={16} />
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CommandCenter;
