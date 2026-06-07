import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getDataset } from '../utils/demoData';
import { 
    Brain, 
    Sparkles, 
    TrendingUp, 
    ArrowRight, 
    AlertTriangle, 
    Lightbulb, 
    HelpCircle, 
    AlertCircle, 
    Loader2 
} from 'lucide-react';

const AIInsights = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadInsights = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                let dbList = [];
                try {
                    const response = await axios.get('http://localhost:8000/api/datasets/', {
                        headers: { 'Authorization': 'Bearer ${token}' }
                    });
                    dbList = response.data;
                } catch (e) {
                    console.warn("Could not query DB list, parsing demo structures");
                }

                const resolved = getDataset(id, dbList);
                if (!resolved) {
                    setError("Dataset not found.");
                    setLoading(false);
                    return;
                }
                setDataset(resolved);
            } catch (err) {
                console.error("Error loading insights dataset", err);
                setError("Failed to load insights details.");
            } finally {
                setLoading(false);
            }
        };

        loadInsights();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-405">Analyzing parameters and generating AI summaries...</p>
            </div>
        );
    }

    if (error || !dataset) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-755 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-medium">{error || "Dataset could not be loaded."}</span>
                </div>
                <Link to="/datasets" className="text-sm font-semibold text-indigo-600 hover:underline">
                    Back to Dataset Center
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 select-none">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-605 dark:text-indigo-400 rounded-md border border-indigo-150 dark:border-indigo-900/40">
                            <Sparkles size={12} className="animate-spin duration-3000" /> Flagship AI Engine
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate mt-2">AI Insights Generator</h1>
                </div>
                <button
                    onClick={() => navigate(`/forecast/${dataset.id}`)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-755 text-white font-semibold px-5 py-2.8 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition w-fit shrink-0"
                >
                    Run Forecasting <ArrowRight size={16} />
                </button>
            </div>

            {/* AI Executive Summary Card with neon highlights */}
            <div className="relative group overflow-hidden rounded-3xl border border-indigo-500/35 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 md:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-550/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20 text-indigo-400 shrink-0">
                        <Brain size={28} className="text-indigo-300" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold text-white">Executive Business Summary</h2>
                            <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-white/10 rounded border border-white/20 tracking-wider">AI Generated</span>
                        </div>
                        <p className="text-slate-200 leading-relaxed text-sm md:text-base font-medium max-w-4xl">
                            {dataset.insights.summary}
                        </p>
                    </div>
                </div>
            </div>

            {/* Primary KPI insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dataset.insights.cards.map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.title}</span>
                            <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400">{card.change}</span>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{card.value}</p>
                        <p className="text-xs text-slate-550 dark:text-slate-405 mt-2 leading-relaxed">{card.desc}</p>
                    </div>
                ))}
            </div>

            {/* Detailed Parameters split: Summary stats + Action recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Metric metrics */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-500" /> Top Identified Metric Anomalies
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs font-semibold text-slate-405 uppercase tracking-wider">Top Revenue Segment</span>
                                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-1">{dataset.insights.top_revenue_region}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-405 uppercase tracking-wider">Highest Performing Entity</span>
                                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-1">{dataset.insights.best_product}</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs font-semibold text-slate-405 uppercase tracking-wider">Lowest Performing Entity</span>
                                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-1">{dataset.insights.worst_product}</span>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-slate-405 uppercase tracking-wider">Net Growth Rate</span>
                                <span className="block font-bold text-slate-800 dark:text-slate-200 mt-1">{dataset.insights.growth_rate}</span>
                            </div>
                        </div>
                    </div>
                    {/* Anomalies alert */}
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Structural Anomaly Flagged</p>
                            <p className="text-xs text-amber-700 dark:text-amber-450 mt-1 leading-relaxed">{dataset.insights.anomalies}</p>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 mb-4">
                        <Lightbulb size={18} className="text-yellow-500" /> Strategic Recommendations
                    </h3>
                    <ul className="space-y-4 text-xs text-slate-655 dark:text-slate-400">
                        {dataset.insights.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex gap-2.5 leading-relaxed">
                                <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                </span>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AIInsights;
