import { Link, useNavigate } from 'react-router-dom';
import { 
    UploadCloud, 
    BarChart3, 
    Brain, 
    Key, 
    LineChart, 
    FileText, 
    ArrowRight, 
    Check, 
    X, 
    User,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import heroImage from '../assets/hero.png';

const Landing = () => {
    const navigate = useNavigate();

    // Trigger instant demo dataset review by setting mock guest token
    const launchDemo = (datasetId) => {
        localStorage.setItem('token', 'mock-jwt-token');
        localStorage.setItem('activeDatasetId', datasetId);
        // Force state update by navigating
        navigate(`/dataset/${datasetId}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-indigo-605 rounded-lg flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/30">
                            S
                        </div>
                        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                            SmartDG
                        </span>
                    </div>
                    <nav className="flex items-center gap-6">
                        <Link to="/login" className="text-sm font-semibold hover:text-indigo-650 transition">
                            Login
                        </Link>
                        <Link 
                            to="/register" 
                            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-750 text-white px-4 py-2 rounded-lg shadow-md hover:-translate-y-0.5 transition"
                        >
                            Get Started
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-16 pb-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-450 border border-indigo-100 dark:border-indigo-900/40 mb-6 animate-pulse">
                        ⚡ Flagship AI Business Intelligence Platform
                    </span>
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
                        Smart Dashboard <span className="bg-gradient-to-r from-indigo-605 via-violet-505 to-purple-500 bg-clip-text text-transparent">Generator</span>
                    </h1>
                    <p className="mt-6 text-base sm:text-lg text-slate-655 dark:text-slate-400 max-w-2xl leading-relaxed">
                        Upload CSV and Excel files and instantly generate AI-powered dashboards, KPIs, insights, forecasts, and reports.
                    </p>

                    {/* Quick Demo Selector */}
                    <div className="mt-8 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2">
                            Quick Start Demo:
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => launchDemo('demo-sales')}
                                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-750 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-lg transition"
                            >
                                Sales Performance
                            </button>
                            <button
                                onClick={() => launchDemo('demo-finance')}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-750 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-lg transition"
                            >
                                Finance Ledger
                            </button>
                            <button
                                onClick={() => launchDemo('demo-hr')}
                                className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-750 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 rounded-lg transition"
                            >
                                HR Retention
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4 justify-center">
                        <Link 
                            to="/register" 
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-705 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition"
                        >
                            Get Started Free <ArrowRight size={18} />
                        </Link>
                    </div>

                    {/* Interactive CSS Mockup Preview representing actual product widgets */}
                    <div className="mt-16 w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 p-3 bg-white/40 dark:bg-slate-955/40 backdrop-blur shadow-2xl">
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            {/* Window Header */}
                            <div className="h-10 bg-slate-100 dark:bg-slate-900 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                                <div className="flex gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-red-400" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <span className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <span className="text-xs text-slate-500 font-semibold font-mono">https://smartdg.ai/dashboard</span>
                                <div className="w-10" />
                            </div>
                            
                            {/* Window Body Mocking actual UI layout elements */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left bg-slate-50 dark:bg-slate-950">
                                {/* Left column: KPIs */}
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-905 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Datasets Uploaded</p>
                                            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">14 Total</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-905 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm">
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">AI Insights Generated</p>
                                            <p className="text-xl font-extrabold text-indigo-650 dark:text-indigo-400 mt-1">56 Cards</p>
                                        </div>
                                    </div>
                                    {/* Simulated Forecast Graph mockup */}
                                    <div className="bg-white dark:bg-slate-905 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm h-48 flex flex-col justify-between">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold flex items-center gap-1.5"><TrendingUp size={14} className="text-indigo-500" /> Time-Series Revenue Forecast</span>
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">Accuracy 94.8%</span>
                                        </div>
                                        {/* Simulated chart bars/lines */}
                                        <div className="h-28 flex items-end justify-between gap-2 pt-4 px-2">
                                            <div className="bg-slate-200 dark:bg-slate-800 w-full h-[30%] rounded-t" />
                                            <div className="bg-slate-200 dark:bg-slate-800 w-full h-[45%] rounded-t" />
                                            <div className="bg-slate-200 dark:bg-slate-800 w-full h-[60%] rounded-t" />
                                            <div className="bg-indigo-600 dark:bg-indigo-550 w-full h-[75%] rounded-t relative">
                                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1 rounded">Actual</span>
                                            </div>
                                            <div className="bg-indigo-455 w-full h-[85%] rounded-t border-t-2 border-dashed border-indigo-400" />
                                            <div className="bg-indigo-400/50 w-full h-[95%] rounded-t border-t-2 border-dashed border-indigo-300" />
                                        </div>
                                    </div>
                                </div>
                                {/* Right column: AI Summary mockup */}
                                <div className="bg-white dark:bg-slate-905 p-4 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm flex flex-col gap-3">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-500" /> Executive AI Insight</span>
                                    <div className="space-y-2.5">
                                        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-350">🚀 Growth Surge</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Revenue increased 18%. North region leads 42% share.</p>
                                        </div>
                                        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-350">📦 Category Performance</p>
                                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Electronics remains core driver with high Quantum Laptop sales.</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto border-t border-slate-100 dark:border-slate-900 pt-3">
                                        <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">View Full Insights <ArrowRight size={10} /></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="py-20 bg-white dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">SmartDG vs Excel</h2>
                        <p className="text-slate-655 dark:text-slate-400 mt-2 text-sm">Compare primary features for data modeling and summaries.</p>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 font-bold">
                                    <th className="px-6 py-4 text-slate-700 dark:text-slate-300">Feature</th>
                                    <th className="px-6 py-4 text-center text-slate-700 dark:text-slate-300">SmartDG</th>
                                    <th className="px-6 py-4 text-center text-slate-700 dark:text-slate-300">Traditional Excel</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr>
                                    <td className="px-6 py-4 font-semibold">AI Insights</td>
                                    <td className="px-6 py-4 text-center text-emerald-600"><Check size={18} className="mx-auto" /></td>
                                    <td className="px-6 py-4 text-center text-red-500"><X size={18} className="mx-auto" /></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-semibold">Forecasting</td>
                                    <td className="px-6 py-4 text-center text-emerald-600"><Check size={18} className="mx-auto" /></td>
                                    <td className="px-6 py-4 text-center text-red-500"><X size={18} className="mx-auto" /></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-semibold">Auto KPIs Mapping</td>
                                    <td className="px-6 py-4 text-center text-emerald-600"><Check size={18} className="mx-auto" /></td>
                                    <td className="px-6 py-4 text-center text-red-500"><X size={18} className="mx-auto" /></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-semibold">Interactive Dashboard Builder</td>
                                    <td className="px-6 py-4 text-center text-emerald-600"><Check size={18} className="mx-auto" /></td>
                                    <td className="px-6 py-4 text-center text-slate-400">Limited</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-24 bg-slate-50 dark:bg-slate-950/20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight">Built For Every Segment</h2>
                        <p className="mt-4 text-slate-655 dark:text-slate-400 text-sm">Used by modern teams to generate reports instantly.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Startups */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                            <p className="text-sm italic text-slate-600 dark:text-slate-350">
                                "SmartDG lets us prototype data profiles in minutes. We uploaded Q1 sales CSV and got direct slides and charts instantly."
                            </p>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold"><User size={14} /></div>
                                <div>
                                    <p className="text-xs font-semibold">CEO, TechStartup</p>
                                    <p className="text-[10px] text-slate-550">Startups segment</p>
                                </div>
                            </div>
                        </div>

                        {/* Analysts */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                            <p className="text-sm italic text-slate-600 dark:text-slate-350">
                                "The forecasting engine is extremely solid. Using ARIMA and Prophet client curves saved us hours of custom Python scripts."
                            </p>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold"><User size={14} /></div>
                                <div>
                                    <p className="text-xs font-semibold">Data Analyst, Finance Corp</p>
                                    <p className="text-[10px] text-slate-555">Analysts segment</p>
                                </div>
                            </div>
                        </div>

                        {/* Businesses */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                            <p className="text-sm italic text-slate-600 dark:text-slate-350">
                                "Our marketing directors pull automated reports directly from lead CSV imports. Safe JWT and local storage settings are great."
                            </p>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold"><User size={14} /></div>
                                <div>
                                    <p className="text-xs font-semibold">Director, Marketing Team</p>
                                    <p className="text-[10px] text-slate-555">Businesses segment</p>
                                </div>
                            </div>
                        </div>

                        {/* Students */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                            <p className="text-sm italic text-slate-605 dark:text-slate-350">
                                "Perfect for compiling project statistics. I uploaded my academic research ledger and generated beautiful PDF reports."
                            </p>
                            <div className="flex items-center gap-2 mt-6">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold"><User size={14} /></div>
                                <div>
                                    <p className="text-xs font-semibold">Student, State University</p>
                                    <p className="text-[10px] text-slate-550">Students segment</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-100 dark:bg-slate-950 py-12 border-t border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-450 text-sm">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-sm">
                                S
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">SmartDG</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Instant AI BI Dashboards.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Links</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="hover:text-indigo-600 transition">About</a></li>
                            <li><a href="#" className="hover:text-indigo-600 transition">Features</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Support</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="hover:text-indigo-600 transition">Contact</a></li>
                            <li><a href="#" className="hover:text-indigo-600 transition">GitHub</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Legal</h4>
                        <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                            <li>© 2026 SmartDG Inc. All rights reserved.</li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
