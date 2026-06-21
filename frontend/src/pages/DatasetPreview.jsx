import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getDataset } from '../utils/demoData';
import { useDataset } from '../context/DatasetContext';
import { 
    Database, 
    ArrowRight, 
    BarChart3, 
    Brain, 
    LineChart, 
    Calendar, 
    AlertCircle, 
    Loader2,
    FileText,
    CheckCircle2,
    PieChart,
    BarChart,
    LayoutDashboard
} from 'lucide-react';
import KpiCard from '../components/KpiCard';

const DatasetPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setActiveDataset } = useDataset();
    const [dataset, setDataset] = useState(null);
    const [preview, setPreview] = useState(null);
    const [kpiData, setKpiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadDatasetDetails = async () => {
            setLoading(true);
            setError(null);
            
            // NOTE: Do NOT use raw localStorage.setItem here.
            // setActiveDataset updates both context and localStorage cleanly.

            if (id && String(id).startsWith('demo-')) {
                const demoData = getDataset(id);
                if (demoData) {
                    setDataset(demoData);
                    // Sync to global context (demo object)
                    setActiveDataset({ id, filename: demoData.filename, isDemo: true });
                    setPreview({
                        columns: demoData.columns,
                        rows: demoData.rows
                    });
                    
                    let mockKpi = {
                        dataset_category: 'Sales Data',
                        confidence_score: demoData.health_score || 95,
                        detected_columns: { date: 'Date', category: 'Category', amount: 'Revenue' },
                        suggested_charts: ['Revenue by Region', 'Profit Margin by Category', 'Sales Trend'],
                        kpis: [
                            { label: 'Total Revenue', value: '$15,420' },
                            { label: 'Total Profit', value: '$3,825' },
                            { label: 'Health Score', value: `${demoData.health_score}%` }
                        ]
                    };
                    if (id === 'demo-finance') {
                        mockKpi = {
                            dataset_category: 'Financial Ledger',
                            confidence_score: demoData.health_score || 95,
                            detected_columns: { date: 'Date', category: 'Category', amount: 'Amount' },
                            suggested_charts: ['Expenses by Department', 'Budget vs Actual', 'Spend Category Distribution'],
                            kpis: [
                                { label: 'Total Outlay', value: '$16,900' },
                                { label: 'Total Budget', value: '$16,450' },
                                { label: 'Health Score', value: `${demoData.health_score}%` }
                            ]
                        };
                    } else if (id === 'demo-hr') {
                        mockKpi = {
                            dataset_category: 'HR Retention Profile',
                            confidence_score: demoData.health_score || 95,
                            detected_columns: { category: 'Department', amount: 'Salary' },
                            suggested_charts: ['Salary Distribution', 'Tenure vs Performance', 'Attrition by Department'],
                            kpis: [
                                { label: 'Average Salary', value: '$88,800' },
                                { label: 'Max Rating', value: '4.9' },
                                { label: 'Health Score', value: `${demoData.health_score}%` }
                            ]
                        };
                    }
                    setKpiData(mockKpi);
                    setLoading(false);
                    return;
                }
            }

            try {
                const token = localStorage.getItem('token');
                
                const metaRes = await axios.get(`http://localhost:8000/api/datasets/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setDataset(metaRes.data);
                setActiveDataset(metaRes.data); // sync global context

                const previewRes = await axios.get(`http://localhost:8000/api/datasets/${id}/preview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPreview(previewRes.data);
                
                try {
                    const kpiRes = await axios.get(`http://localhost:8000/api/datasets/${id}/kpis`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setKpiData(kpiRes.data);
                } catch (kpiErr) {
                    console.warn("Could not load KPIs", kpiErr);
                }
                
            } catch (err) {
                console.error("Error loading preview details", err);
                setError("Failed to load dataset metadata details.");
            } finally {
                setLoading(false);
            }
        };

        loadDatasetDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading dataset preview...</p>
            </div>
        );
    }

    if (error || !dataset) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-750 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-medium">{error || "Dataset could not be found."}</span>
                </div>
                <Link to="/dashboard" className="text-sm font-semibold text-indigo-600 hover:underline">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate max-w-xl">{dataset.filename}</h1>
                    <p className="text-slate-500 dark:text-slate-450 mt-1 flex items-center gap-2">
                        <Calendar size={14} /> Registered: {dataset.upload_date ? new Date(dataset.upload_date).toLocaleDateString() : 'N/A'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/dashboard"
                        className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Dataset Format</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 mt-1.5">
                        {dataset.dataset_type || 'Unknown'}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Status</p>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 mt-1.5">
                        {dataset.status || 'Uploaded'}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Total Rows</p>
                    <p className="text-xl font-bold text-slate-850 dark:text-slate-100 mt-1">{dataset.row_count?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">Total Columns</p>
                    <p className="text-xl font-bold text-slate-850 dark:text-slate-100 mt-1">{dataset.column_count || 0}</p>
                </div>
            </div>

            {/* Smart Dataset Detection & KPIs */}
            {kpiData && (
                <div className="space-y-6">
                    {/* Detection Banner */}
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm shrink-0">
                                <Brain size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    SmartDG detected this as a <span className="text-indigo-700 dark:text-indigo-400">{kpiData.dataset_category}</span>
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                                    Confidence Score: <span className="text-slate-800 dark:text-slate-200 font-bold">{kpiData.confidence_score}%</span>
                                </p>
                                
                                {Object.keys(kpiData.detected_columns || {}).length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {Object.entries(kpiData.detected_columns).map(([key, val]) => (
                                            <span key={key} className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-indigo-700 dark:text-indigo-300">
                                                {key.charAt(0).toUpperCase() + key.slice(1)} → {val}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {kpiData.suggested_charts && kpiData.suggested_charts.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 w-full md:w-auto shrink-0 shadow-sm">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                    <PieChart size={14} /> Recommended Charts
                                </p>
                                <ul className="space-y-1.5">
                                    {kpiData.suggested_charts.map((chart, idx) => (
                                        <li key={idx} className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <BarChart size={14} className="text-slate-400" /> {chart}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* KPI Cards */}
                    {kpiData.kpis && kpiData.kpis.length > 0 && (
                        <div>
                            <h3 className="font-bold text-base mb-4 text-slate-800 dark:text-slate-200">Extracted Key Performance Indicators</h3>
                            <div className="flex flex-wrap gap-4">
                                {kpiData.kpis.map((kpi, idx) => (
                                    <KpiCard key={idx} label={kpi.label} value={kpi.value} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="font-bold text-base mb-4 flex items-center gap-2"><ArrowRight size={18} className="text-indigo-500" /> Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to={`/dataset/${dataset.id}/prepare`}
                        className="flex flex-col gap-2 p-5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-850 rounded-xl transition"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm text-violet-750 dark:text-violet-400">
                            <Database size={18} />
                            <span>Prepare Dataset</span>
                        </div>
                        <p className="text-xs text-violet-650/70 dark:text-violet-400/70 leading-relaxed">
                            Clean missing cells, filter records, sort fields, and pivot values.
                        </p>
                    </Link>

                    <Link
                        to={`/analysis/${dataset.id}`}
                        className="flex flex-col gap-2 p-5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl transition"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm text-indigo-700 dark:text-indigo-400">
                            <BarChart3 size={18} />
                            <span>Analyze Dataset</span>
                        </div>
                        <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 leading-relaxed">
                            Profile this dataset and generate structural insights.
                        </p>
                    </Link>

                    <Link
                        to={`/dashboard/${dataset.id}`}
                        className="flex flex-col gap-2 p-5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl transition"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            <LayoutDashboard size={18} />
                            <span>Generate Dashboard</span>
                        </div>
                        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 leading-relaxed">
                            Automatically build a BI dashboard for this dataset.
                        </p>
                    </Link>

                    <Link
                        to={`/forecast/${dataset.id}`}
                        className="flex flex-col gap-2 p-5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl transition"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
                            <LineChart size={18} />
                            <span>Forecast Dataset</span>
                        </div>
                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 leading-relaxed">
                            Run ARIMA, Prophet, or Linear Regression forecasting models.
                        </p>
                    </Link>
                    
                    <Link
                        to={`/report-builder/${dataset.id}`}
                        className="flex flex-col gap-2 p-5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl transition"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-400">
                            <FileText size={18} />
                            <span>Generate Report</span>
                        </div>
                        <p className="text-xs text-blue-600/70 dark:text-blue-400/70 leading-relaxed">
                            Build a professional PDF report with insights, KPIs, and forecasts.
                        </p>
                    </Link>
                </div>
            </div>

            {preview && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">First Rows Preview</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                            Showing top {preview.rows?.length || 0} rows
                        </span>
                    </div>
                    
                    {!preview.rows || preview.rows.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                            No preview data rows found. Check your dataset file formatting.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                                        {preview.columns.map((col, idx) => (
                                            <th key={idx} className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 tracking-wider whitespace-nowrap">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                                    {preview.rows.map((row, rowIdx) => (
                                        <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition">
                                            {preview.columns.map((col, colIdx) => (
                                                <td key={colIdx} className="px-6 py-3 text-slate-700 dark:text-slate-350 whitespace-nowrap font-medium">
                                                    {row[col] === null ? <span className="text-slate-400 italic">null</span> : String(row[col])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DatasetPreview;
