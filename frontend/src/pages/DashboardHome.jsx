import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
    Database, 
    Brain, 
    LineChart, 
    FileText, 
    Plus, 
    ArrowRight, 
    Clock, 
    Loader2,
    BarChart3,
    Trash2,
    Edit2
} from 'lucide-react';

const DashboardHome = () => {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:8000/api/datasets/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDatasets(response.data);
        } catch (err) {
            console.error("Failed to load datasets", err);
            setError("Could not load datasets. Please check your connection or log in again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if(!window.confirm("Are you sure you want to delete this dataset?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:8000/api/datasets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDatasets();
        } catch (err) {
            console.error(err);
            alert("Failed to delete dataset");
        }
    };

    const handleRename = async (e, id, currentName) => {
        e.stopPropagation();
        const newName = window.prompt("Enter new dataset name:", currentName);
        if(!newName || newName === currentName) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:8000/api/datasets/${id}/rename`, { name: newName }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchDatasets();
        } catch (err) {
            console.error(err);
            alert("Failed to rename dataset");
        }
    };

    const totalDatasets = datasets.length;
    const insightsCount = 0;
    const forecastModels = 0;
    const reportsCount = 0;

    // Build chronological activity feed from real datasets
    const activityFeed = datasets.map((d, i) => ({
        id: d.id,
        text: `${d.filename} uploaded`,
        type: 'upload',
        time: new Date(d.upload_date).toLocaleString(),
        icon: Database
    })).slice(0, 10); // Show top 10

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-405">Loading overview data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
                    <p className="text-slate-500 dark:text-slate-450 mt-1">
                        Track, analyze, and forecast key performance indicators.
                    </p>
                </div>
                <Link
                    to="/upload"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-750 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition w-fit"
                >
                    <Plus size={16} /> New Analysis
                </Link>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Datasets Uploaded</p>
                            <p className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-2">{totalDatasets}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
                            <Database size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Insights Generated</p>
                            <p className="text-xl font-extrabold text-slate-400 mt-2">N/A</p>
                        </div>
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                            <Brain size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Forecast Models</p>
                            <p className="text-xl font-extrabold text-slate-400 mt-2">N/A</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <LineChart size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reports Generated</p>
                            <p className="text-xl font-extrabold text-slate-400 mt-2">N/A</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <FileText size={20} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link
                        to="/upload"
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition"
                    >
                        <div className="flex items-center gap-3">
                            <Plus size={18} className="text-indigo-500" />
                            <span className="text-sm font-semibold">New Analysis</span>
                        </div>
                        <ArrowRight size={16} className="text-slate-400" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800 dark:text-slate-200">Recent Datasets</h2>
                            <Link to="/datasets" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                View All
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-850">
                            {datasets.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">No datasets uploaded yet.</div>
                            ) : datasets.map((item) => (
                                <div 
                                    key={item.id}
                                    onClick={() => navigate(`/dataset/${item.id}`)}
                                    className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-950/20 cursor-pointer transition gap-4"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                            <Database size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.filename}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {item.row_count?.toLocaleString() || 0} Rows • {item.column_count || 0} Cols
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                            {item.status || "Uploaded"}
                                        </span>
                                        <button onClick={(e) => {e.stopPropagation(); navigate(`/analysis/${item.id}`);}} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Analyze"><BarChart3 size={16} /></button>
                                        <button onClick={(e) => handleRename(e, item.id, item.filename)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Rename"><Edit2 size={16} /></button>
                                        <button onClick={(e) => handleDelete(e, item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-fit">
                    <h2 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-indigo-550" /> Recent Activity
                    </h2>
                    {activityFeed.length === 0 ? (
                        <p className="text-sm text-slate-500">No recent activity.</p>
                    ) : (
                        <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-6">
                            {activityFeed.map((act) => {
                                const ActIcon = act.icon;
                                return (
                                    <div key={act.id} className="relative group">
                                        <div className="absolute -left-[25px] top-1.5 w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center shrink-0 z-10">
                                            <ActIcon size={10} className="text-indigo-650" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-305 leading-relaxed">{act.text}</p>
                                            <span className="text-[10px] text-slate-400 font-semibold">{act.time}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
