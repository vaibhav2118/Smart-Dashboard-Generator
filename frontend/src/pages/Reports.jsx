import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useDataset } from '../context/DatasetContext';
import { 
    FileText, 
    Plus, 
    Eye, 
    Download, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Database, 
    ArrowRight,
    Search,
    Clock,
    FileSpreadsheet
} from 'lucide-react';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [selectedDatasetId, setSelectedDatasetId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { setActiveDataset } = useDataset();

    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch reports history
                const reportsRes = await axios.get('http://localhost:8000/api/reports/', { headers });
                setReports(reportsRes.data);

                // 2. Fetch active datasets to select
                const datasetsRes = await axios.get('http://localhost:8000/api/datasets/', { headers });
                setDatasets(datasetsRes.data);

                // Pre-select activeDatasetId if present
                const activeId = localStorage.getItem('activeDatasetId');
                if (activeId && datasetsRes.data.some(d => d.id === activeId)) {
                    setSelectedDatasetId(activeId);
                } else if (datasetsRes.data.length > 0) {
                    setSelectedDatasetId(datasetsRes.data[0].id);
                }
            } catch (err) {
                console.error("Failed to load page data:", err);
                setError("Could not load reports or datasets. Verify that the backend server is running.");
            } finally {
                setLoading(false);
            }
        };

        loadPageData();
    }, []);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete the report "${name}"?`)) {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };
                await axios.delete(`http://localhost:8000/api/reports/${id}`, { headers });
                
                setReports(prev => prev.filter(r => r.id !== id));
                
                // Dispatch event for sidebar/navbar indicator updates
                window.dispatchEvent(new Event('storage'));
                
                setSuccessMsg(`Report "${name}" deleted successfully.`);
                setTimeout(() => setSuccessMsg(null), 4000);
            } catch (err) {
                console.error("Error deleting report:", err);
                alert("Failed to delete report from the database and disk storage.");
            }
        }
    };

    const handleDownload = async (id, name) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.get(`http://localhost:8000/api/reports/download/${id}`, {
                headers,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', name);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Error downloading report:", error);
            alert("Failed to download PDF report file.");
        }
    };

    const handleView = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.get(`http://localhost:8000/api/reports/download/${id}`, {
                headers,
                responseType: 'blob'
            });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        } catch (error) {
            console.error("Error viewing report:", error);
            alert("Failed to open inline PDF preview. Secure browser blockers may prevent opening new tabs.");
        }
    };

    const handleBuildReport = () => {
        if (!selectedDatasetId) return;
        // Update global context instead of raw localStorage write
        const ds = datasets.find(d => String(d.id) === String(selectedDatasetId));
        if (ds) setActiveDataset(ds);
        navigate(`/report-builder/${selectedDatasetId}`);
    };

    const filteredReports = reports.filter(report => 
        report.report_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your Business Intelligence workspace...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 select-none text-left">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Report Exporter Studio</h1>
                    <p className="text-slate-500 dark:text-slate-450 mt-1">
                        Select an analyzed dataset, customize your metrics compile checklist, and download clean, executive-ready PDF assets.
                    </p>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-450 text-sm font-medium">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Success toast */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Main setup layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Dataset selector panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <h2 className="font-extrabold text-base mb-4 flex items-center gap-2">
                            <Database size={18} className="text-indigo-550" /> 1. Pick Dataset for Compilation
                        </h2>
                        
                        {datasets.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
                                <FileSpreadsheet size={32} className="mx-auto text-slate-400" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-750 dark:text-slate-300">No Datasets Available</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-450">You need to upload and profile a dataset before generating PDF documents.</p>
                                </div>
                                <Link
                                    to="/upload"
                                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
                                >
                                    Upload Data <ArrowRight size={14} />
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-500">Available Datasets</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {datasets.map(dataset => (
                                        <div
                                            key={dataset.id}
                                            onClick={() => setSelectedDatasetId(dataset.id)}
                                            className={`p-4 rounded-xl border-2 text-left cursor-pointer transition select-none flex flex-col justify-between min-h-[90px] ${
                                                selectedDatasetId === dataset.id
                                                    ? 'border-indigo-650 bg-indigo-50/15 dark:bg-indigo-950/10'
                                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div>
                                                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-250 truncate">{dataset.filename}</h3>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1">Status: {dataset.status || 'Active'}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 text-[9px] text-slate-400 font-semibold uppercase">
                                                <span>Rows: {dataset.row_count || 'N/A'}</span>
                                                <span>Cols: {dataset.column_count || 'N/A'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Compilation action panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[220px]">
                    <div>
                        <h2 className="font-extrabold text-base mb-2 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-550" /> 2. Workspace Status
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3">
                            The report generator compiles cached statistics, outliers, KPIs, AI models insight text, and forecasts projections in under 10 seconds.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-850 p-3 rounded-xl mt-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                            <p>• Output Location: <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded">uploads/reports/</span></p>
                            <p>• Size Constraint: standard letter size layout</p>
                        </div>
                    </div>
                    <button
                        onClick={handleBuildReport}
                        disabled={!selectedDatasetId}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition shadow-md mt-6"
                    >
                        Configure in Report Builder Studio <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* Generated Reports Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-extrabold text-slate-800 dark:text-slate-200">Generated Reports</h2>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mt-0.5">Compiled business outputs</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Filter report list..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-4 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-slate-750 dark:text-slate-350"
                            />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-250 dark:border-slate-850">
                            {filteredReports.length} Reports Total
                        </span>
                    </div>
                </div>

                {filteredReports.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 dark:text-slate-450 text-sm space-y-2">
                        <FileText size={36} className="mx-auto text-slate-350" />
                        <p className="font-semibold">No Compiled Reports Found</p>
                        <p className="text-xs">Compile a template from the dataset selector to initialize your report history logs.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold">
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Report Name</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Template Type</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Created Date</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-250 flex items-center gap-2 truncate max-w-[280px]">
                                            <FileText size={16} className="text-red-500 shrink-0" />
                                            <span className="truncate">{report.report_name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-350 capitalize font-medium">{report.report_type} Report</td>
                                        <td className="px-6 py-4 text-slate-605 dark:text-slate-400 font-medium">
                                            {new Date(report.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleView(report.id)}
                                                    className="p-1.5 text-slate-550 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="View Report (opens new tab)"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(report.id, report.report_name)}
                                                    className="p-1.5 text-slate-550 hover:text-indigo-650 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Download PDF File"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(report.id, report.report_name)}
                                                    className="p-1.5 text-slate-550 hover:text-red-650 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Delete PDF & Logs"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
