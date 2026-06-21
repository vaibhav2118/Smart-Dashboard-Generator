import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getDataset } from '../utils/demoData';
import { useDataset } from '../context/DatasetContext';
import DatasetSelector from '../components/DatasetSelector';
import { 
    Brain, 
    Sparkles, 
    ArrowRight, 
    AlertTriangle, 
    Lightbulb, 
    AlertCircle, 
    Loader2,
    CheckCircle,
    TrendingUp,
    ShieldAlert,
    RefreshCw
} from 'lucide-react';

const AIInsights = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setActiveDataset } = useDataset();
    const [dataset, setDataset] = useState(null);
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [viewState, setViewState] = useState('EMPTY'); // EMPTY, LOADING, SUCCESS, OUTDATED
    
    // Generator selectors
    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
    const [selectedType, setSelectedType] = useState('executive');

    const loadDatasetAndInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check if it's a demo dataset first
            if (id.startsWith('demo-')) {
                const resolved = getDataset(id, []);
                if (!resolved) {
                    setError("Dataset not found.");
                    setViewState('EMPTY');
                    setLoading(false);
                    return;
                }
                setDataset(resolved);
                // Map demo insights structure
                setInsight({
                    executive_summary: resolved.insights.summary,
                    key_findings: resolved.insights.cards.map(c => `${c.title}: ${c.value} - ${c.desc}`),
                    risks: [
                        "Furniture category profit margins are slipping due to elevated freight/shipping returns.",
                        "Stagnant stocks detected in standing lamp lines with minimal transaction counts."
                    ],
                    opportunities: [
                        "West region exhibits high conversion potential for consumer cyber hardware.",
                        "Bulk purchasing segments represent opportunities for customized invoice structures."
                    ],
                    recommendations: resolved.insights.recommendations,
                    management_priorities: [
                        "Allocate additional marketing spend to North region electronics.",
                        "Re-price standing desk products to defend gross profit margin levels."
                    ],
                    model_used: "Demo Template Engine",
                    confidence_score: resolved.health_score,
                    created_at: resolved.upload_date
                });
                setViewState('SUCCESS');
                setLoading(false);
                return;
            }

            // Real dataset path
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // Query dataset info
            let dbList = [];
            try {
                const response = await axios.get('http://localhost:8000/api/datasets/', { headers });
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
            setActiveDataset(resolved); // sync global context

            // Fetch cached insights from backend
            try {
                const response = await axios.get(`http://localhost:8000/api/insights/${id}`, { headers });
                setInsight(response.data);
                setViewState('SUCCESS');
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    // Outdated cache
                    setInsight(e.response.data);
                    setViewState('OUTDATED');
                } else if (e.response && e.response.status === 404) {
                    setViewState('EMPTY');
                } else {
                    setError("Failed to communicate with insights engine.");
                }
            }
        } catch (err) {
            console.error("Error loading insights dataset", err);
            setError("Failed to load insights details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDatasetAndInsights();
    }, [id]);

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const response = await axios.post(`http://localhost:8000/api/insights/${id}`, {
                model: selectedModel,
                insight_type: selectedType
            }, { headers });
            
            setInsight(response.data);
            setViewState('SUCCESS');
        } catch (e) {
            console.error("Failed generating insights", e);
            const msg = e.response && e.response.data && e.response.data.detail 
                ? e.response.data.detail 
                : "OpenAI generation failed. Verify API key configuration.";
            setError(msg);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading dataset insights configurations...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 select-none">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-150 dark:border-indigo-900/40">
                            <Sparkles size={12} className="animate-spin duration-3000" /> Flagship AI Engine
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate mt-2">AI Insights Generator</h1>
                    {/* Dataset switcher */}
                    <div className="mt-2">
                        <DatasetSelector currentId={id} moduleBase="insights" />
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/forecast/${dataset?.id || id}`)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition w-fit shrink-0"
                >
                    Run Forecasting <ArrowRight size={16} />
                </button>
            </div>

            {/* Error notifications */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Outdated warning banner */}
            {viewState === 'OUTDATED' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-800 dark:text-amber-400">
                    <div className="flex items-start gap-3">
                        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold">Insights Outdated</p>
                            <p className="text-xs text-amber-700 dark:text-amber-450 mt-0.5">The dataset changed since these insights were generated. Outdated cache values are displayed below.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow transition shrink-0 w-fit"
                    >
                        <RefreshCw size={14} className={generating ? "animate-spin" : ""} /> Regenerate Insights
                    </button>
                </div>
            )}

            {/* View State Logic */}
            {generating ? (
                <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                    <Loader2 size={40} className="text-indigo-600 animate-spin" />
                    <div className="text-center space-y-1">
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100">Running LLM Context Analysis...</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                            Dataset summary, correlation limits, missing items percentages, and KPI aggregates are being structured and analyzed via OpenAI.
                        </p>
                    </div>
                </div>
            ) : viewState === 'EMPTY' ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center space-y-6">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                        <Brain size={32} />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">No Insights Compiled Yet</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                            Generate structured business summaries, correlations evaluations, and prioritized actions using OpenAI AI Models.
                        </p>
                    </div>

                    <div className="max-w-xl mx-auto border-t border-slate-100 dark:border-slate-800 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-550 dark:text-slate-400">Select AI Analyst Model</label>
                            <select 
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                            >
                                <option value="gpt-4o-mini">GPT-4o-mini (Cost-Efficient)</option>
                                <option value="gpt-4o">GPT-4o (Deep Analysis)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-550 dark:text-slate-400">Analysis Intent type</label>
                            <select 
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                            >
                                <option value="executive">Executive General Summary</option>
                                <option value="sales">Sales Performance Analysis</option>
                                <option value="finance">Finance and Profit Review</option>
                                <option value="hr">Human Resources & Retention</option>
                                <option value="inventory">Inventory & Logistical stock</option>
                                <option value="operations">Operational efficiency</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition"
                    >
                        Generate AI Insights
                    </button>
                </div>
            ) : (
                /* Success View */
                <div className="space-y-8">
                    {/* Executive Summary Card */}
                    <div className="relative group overflow-hidden rounded-3xl border border-indigo-500/35 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 md:p-8 shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-550/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/10 backdrop-blur rounded-2xl border border-white/20 text-indigo-400 shrink-0">
                                <Brain size={28} className="text-indigo-300" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-extrabold text-white">Executive Summary</h2>
                                    <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-white/10 rounded border border-white/20 tracking-wider">AI Generated</span>
                                </div>
                                <p className="text-slate-200 leading-relaxed text-sm md:text-base font-medium max-w-4xl">
                                    {insight.executive_summary}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reliability Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Insight Reliability</span>
                            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1.5">
                                <CheckCircle size={22} className="text-emerald-500" /> {insight.confidence_score}%
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model Used</span>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">{insight.model_used}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Generated Date</span>
                            <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">
                                {new Date(insight.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Findings & Risks Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Key Findings */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="font-extrabold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <TrendingUp size={18} className="text-indigo-500" /> Key Findings
                            </h3>
                            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-350 list-disc list-inside leading-relaxed">
                                {insight.key_findings && (typeof insight.key_findings === 'string' ? JSON.parse(insight.key_findings) : insight.key_findings).map((f, idx) => (
                                    <li key={idx} className="marker:text-indigo-500">{f}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Risks Analysis */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="font-extrabold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <AlertTriangle size={18} className="text-amber-500" /> Key Risks Flagged
                            </h3>
                            <ul className="space-y-3 text-xs text-slate-650 dark:text-slate-350 list-disc list-inside leading-relaxed">
                                {insight.risks && (typeof insight.risks === 'string' ? JSON.parse(insight.risks) : insight.risks).map((r, idx) => (
                                    <li key={idx} className="marker:text-amber-500">{r}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Opportunities & Priorities Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Opportunities */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1">
                            <h3 className="font-extrabold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Lightbulb size={18} className="text-emerald-500" /> Opportunities
                            </h3>
                            <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350 list-disc list-inside leading-relaxed">
                                {insight.opportunities && (typeof insight.opportunities === 'string' ? JSON.parse(insight.opportunities) : insight.opportunities).map((o, idx) => (
                                    <li key={idx} className="marker:text-emerald-500">{o}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Recommendations */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1">
                            <h3 className="font-extrabold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <CheckCircle size={18} className="text-blue-500" /> Recommended Actions
                            </h3>
                            <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350 list-none leading-relaxed">
                                {insight.recommendations && (typeof insight.recommendations === 'string' ? JSON.parse(insight.recommendations) : insight.recommendations).map((rec, idx) => (
                                    <li key={idx} className="flex gap-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-650 dark:text-blue-400 font-bold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="mt-0.5">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Management Priorities */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-1">
                            <h3 className="font-extrabold text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Sparkles size={18} className="text-purple-500" /> Management Priorities
                            </h3>
                            <ul className="space-y-3.5 text-xs text-slate-650 dark:text-slate-350 list-none leading-relaxed">
                                {insight.management_priorities && (typeof insight.management_priorities === 'string' ? JSON.parse(insight.management_priorities) : insight.management_priorities).map((p, idx) => (
                                    <li key={idx} className="flex gap-2">
                                        <span className="w-5 h-5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 font-bold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="mt-0.5">{p}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Regenerator block for real datasets */}
                    {!id.startsWith('demo-') && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-left space-y-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Re-run Analysis Model</h4>
                                <p className="text-xs text-slate-500">Regenerate current observations using selected intent parameters.</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4">
                                <select 
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                                >
                                    <option value="gpt-4o-mini">GPT-4o-mini</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                </select>
                                <select 
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                                >
                                    <option value="executive">Executive</option>
                                    <option value="sales">Sales</option>
                                    <option value="finance">Finance</option>
                                    <option value="hr">HR</option>
                                    <option value="inventory">Inventory</option>
                                    <option value="operations">Operations</option>
                                </select>
                                <button
                                    onClick={handleGenerate}
                                    className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-705 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-sm w-fit"
                                >
                                    <RefreshCw size={14} /> Regenerate Insights
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIInsights;
