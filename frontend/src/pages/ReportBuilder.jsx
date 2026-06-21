import { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Plotly from 'plotly.js-dist-min';
import { ThemeContext } from '../context/ThemeContext';
import { 
    FileText, 
    Sparkles, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Download, 
    Eye,
    TrendingUp,
    Layout,
    Clock,
    ShieldCheck
} from 'lucide-react';

const ReportBuilder = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const { theme } = useContext(ThemeContext);
    
    // Page state
    const [previewData, setPreviewData] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [compiling, setCompiling] = useState(false);
    const [error, setError] = useState(null);
    const [successReport, setSuccessReport] = useState(null);

    // Form inputs
    const [selectedType, setSelectedType] = useState('executive');
    const [sections, setSections] = useState({
        summary: true,
        profiling: false,
        kpis: true,
        charts: false,
        insights: true,
        forecast: false,
        recommendations: true
    });

    // Plot container DOM refs for base64 PNG capture
    const trendRef = useRef(null);
    const catRef = useRef(null);
    const forecastRef = useRef(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch preview summaries
                const previewRes = await axios.get(`http://localhost:8000/api/reports/preview/${datasetId}`, { headers });
                setPreviewData(previewRes.data);

                // 2. Fetch dashboard chart configs
                try {
                    const dbRes = await axios.get(`http://localhost:8000/api/datasets/${datasetId}/dashboard`, { headers });
                    setDashboardData(dbRes.data);
                } catch (e) {
                    console.warn("No dashboard compiled yet for this dataset.");
                }

                // 3. Fetch forecasting parameters
                try {
                    const fcRes = await axios.get(`http://localhost:8000/api/forecast/${datasetId}`, { headers });
                    setForecastData(fcRes.data);
                } catch (e) {
                    console.warn("No forecast compiled yet for this dataset.");
                }

            } catch (err) {
                console.error("Error loading report builder parameters:", err);
                setError("Failed to load report parameters. Verify dataset profiling is complete.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [datasetId]);

    // Handle template changes: auto-set defaults
    const handleTemplateChange = (type) => {
        setSelectedType(type);
        if (type === 'executive') {
            setSections({
                summary: true,
                profiling: false,
                kpis: true,
                charts: false,
                insights: previewData?.has_insights || false,
                forecast: false,
                recommendations: true
            });
        } else if (type === 'analytics') {
            setSections({
                summary: true,
                profiling: true,
                kpis: true,
                charts: true,
                insights: false,
                forecast: false,
                recommendations: false
            });
        } else if (type === 'forecast') {
            setSections({
                summary: true,
                profiling: false,
                kpis: false,
                charts: false,
                insights: false,
                forecast: previewData?.has_forecast || false,
                recommendations: true
            });
        } else if (type === 'full') {
            setSections({
                summary: true,
                profiling: true,
                kpis: true,
                charts: true,
                insights: previewData?.has_insights || false,
                forecast: previewData?.has_forecast || false,
                recommendations: true
            });
        }
    };

    const handleCheckboxChange = (key) => {
        setSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Render local Plotly elements in background to grab base64 PNG captures
    useEffect(() => {
        if (loading || compiling || !previewData) return;

        const isDark = theme === 'dark';
        const plotlyBg = isDark ? '#1e293b' : '#ffffff';
        const plotlyFont = isDark ? '#cbd5e1' : '#1e293b';

        // Render trend chart in background if available
        if (sections.charts && dashboardData?.charts && trendRef.current) {
            const trend = dashboardData.charts.find(c => c.id === 'dynamic_trend');
            if (trend) {
                const layout = { ...trend.layout, paper_bgcolor: plotlyBg, plot_bgcolor: plotlyBg, font: { color: plotlyFont } };
                Plotly.react(trendRef.current, trend.data, layout, { displayModeBar: false });
            }
        }

        // Render category chart in background
        if (sections.charts && dashboardData?.charts && catRef.current) {
            const cat = dashboardData.charts.find(c => c.id === 'dynamic_category');
            if (cat) {
                const layout = { ...cat.layout, paper_bgcolor: plotlyBg, plot_bgcolor: plotlyBg, font: { color: plotlyFont } };
                Plotly.react(catRef.current, cat.data, layout, { displayModeBar: false });
            }
        }

        // Render forecast chart in background
        if (sections.forecast && forecastData && forecastRef.current) {
            const actualX = forecastData.actual_points.map(d => d.Date);
            const actualY = forecastData.actual_points.map(d => d.Value);
            const forecastX = forecastData.forecast_points.map(d => d.Date);
            const forecastY = forecastData.forecast_points.map(d => d.Value);
            const upperY = forecastData.forecast_points.map(d => d.Upper || d.Value);
            const lowerY = forecastData.forecast_points.map(d => d.Lower || d.Value);

            const joinedX = [actualX[actualX.length - 1], ...forecastX];
            const joinedY = [actualY[actualY.length - 1], ...forecastY];
            const joinedUpper = [actualY[actualY.length - 1], ...upperY];
            const joinedLower = [actualY[actualY.length - 1], ...lowerY];

            const traces = [
                { x: joinedX, y: joinedUpper, type: 'scatter', mode: 'lines', line: { color: 'transparent' }, showlegend: false },
                { x: joinedX, y: joinedLower, type: 'scatter', mode: 'lines', fill: 'tonexty', fillcolor: 'rgba(99, 102, 241, 0.12)', line: { color: 'transparent' }, name: '95% CI' },
                { x: actualX, y: actualY, type: 'scatter', mode: 'lines+markers', name: 'Historical', marker: { color: '#6366f1' } },
                { x: joinedX, y: joinedY, type: 'scatter', mode: 'lines+markers', name: `${forecastData.model_used.toUpperCase()}`, marker: { color: '#a855f7' }, line: { dash: 'dash' } }
            ];

            const layout = {
                title: 'Forecast Projections',
                paper_bgcolor: plotlyBg,
                plot_bgcolor: plotlyBg,
                font: { color: plotlyFont },
                margin: { t: 40, b: 40, l: 40, r: 20 },
                showlegend: true
            };
            Plotly.react(forecastRef.current, traces, layout, { displayModeBar: false });
        }

    }, [sections, dashboardData, forecastData, loading, compiling, theme]);

    const handleCompileReport = async () => {
        setCompiling(true);
        setError(null);
        setSuccessReport(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Export Plotly chart elements to base64 images
            const charts_base64 = {};
            if (sections.charts) {
                if (trendRef.current) {
                    charts_base64["trend"] = await Plotly.toImage(trendRef.current, { format: 'png', width: 700, height: 350 });
                }
                if (catRef.current) {
                    charts_base64["category"] = await Plotly.toImage(catRef.current, { format: 'png', width: 700, height: 350 });
                }
            }
            if (sections.forecast && forecastRef.current) {
                charts_base64["forecast"] = await Plotly.toImage(forecastRef.current, { format: 'png', width: 700, height: 350 });
            }

            // 2. Submit compilation request to backend
            const response = await axios.post(`http://localhost:8000/api/reports/${datasetId}`, {
                report_type: selectedType,
                selected_sections: sections,
                charts_base64: Object.keys(charts_base64).length > 0 ? charts_base64 : null
            }, { headers });

            setSuccessReport(response.data);
        } catch (e) {
            console.error("Compilation failed", e);
            setError(e.response?.data?.detail || "Failed to generate report PDF.");
        } finally {
            setCompiling(false);
        }
    };

    const downloadPdf = async () => {
        if (!successReport) return;
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const response = await axios.get(`http://localhost:8000/api/reports/download/${successReport.id}`, {
                headers,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', successReport.report_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to download PDF:", err);
            setError("Failed to download the generated report file.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading Report Builder Studio parameters...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 select-none text-left">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Report Builder Studio</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                        Select report sections, review previews, and compile downloadable PDF structures.
                    </p>
                </div>
                <Link
                    to="/reports"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow transition w-fit shrink-0"
                >
                    View Report History <Clock size={16} />
                </Link>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Compilation Success Notification */}
            {successReport && (
                <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-2xl text-emerald-800 dark:text-emerald-400">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="shrink-0 text-emerald-500 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold">PDF Compiled Successfully</p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-450 mt-0.5">Filename: {successReport.report_name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={downloadPdf}
                            className="flex items-center gap-1 bg-emerald-650 hover:bg-emerald-750 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition"
                        >
                            <Download size={14} /> Download PDF
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                        <h2 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Layout size={18} className="text-indigo-550" /> 1. Configure Template
                        </h2>

                        {/* Template selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Report Template Type</label>
                            <select 
                                value={selectedType}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                                className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-3 outline-none text-slate-700 dark:text-slate-300"
                            >
                                <option value="executive">Executive Summary Report</option>
                                <option value="analytics">Detailed Data Analytics Report</option>
                                <option value="forecast">Forecasting Projections Report</option>
                                <option value="full">Full Comprehensive Business Report</option>
                            </select>
                        </div>

                        {/* Checkbox sections selector */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-500">Included Document Sections</label>
                            
                            <div className="space-y-2.5">
                                <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-350">
                                    <input type="checkbox" checked={sections.summary} onChange={() => handleCheckboxChange('summary')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    Dataset summary metadata
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-350">
                                    <input type="checkbox" checked={sections.profiling} onChange={() => handleCheckboxChange('profiling')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    Profiling summary statistics
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-350">
                                    <input type="checkbox" checked={sections.kpis} onChange={() => handleCheckboxChange('kpis')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    Calculated KPI analysis
                                </label>
                                <label className={`flex items-center gap-3 text-xs font-medium ${dashboardData ? "cursor-pointer text-slate-700 dark:text-slate-350" : "text-slate-400 cursor-not-allowed"}`}>
                                    <input type="checkbox" disabled={!dashboardData} checked={sections.charts} onChange={() => handleCheckboxChange('charts')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    Dashboard charts {!dashboardData && "(No dashboard charts created)"}
                                </label>
                                <label className={`flex items-center gap-3 text-xs font-medium ${previewData?.has_insights ? "cursor-pointer text-slate-700 dark:text-slate-350" : "text-slate-400 cursor-not-allowed"}`}>
                                    <input type="checkbox" disabled={!previewData?.has_insights} checked={sections.insights} onChange={() => handleCheckboxChange('insights')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    AI Insights summary {!previewData?.has_insights && "(Insights not generated yet)"}
                                </label>
                                <label className={`flex items-center gap-3 text-xs font-medium ${previewData?.has_forecast ? "cursor-pointer text-slate-700 dark:text-slate-350" : "text-slate-400 cursor-not-allowed"}`}>
                                    <input type="checkbox" disabled={!previewData?.has_forecast} checked={sections.forecast} onChange={() => handleCheckboxChange('forecast')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    Forecast projections {!previewData?.has_forecast && "(Forecast not calculated yet)"}
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-350">
                                    <input type="checkbox" checked={sections.recommendations} onChange={() => handleCheckboxChange('recommendations')} className="rounded border-slate-300 text-indigo-600 w-4 h-4 focus:ring-0" />
                                    Business Recommendations
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleCompileReport}
                            disabled={compiling}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition"
                        >
                            {compiling ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Compiling Document PDF...
                                </>
                            ) : (
                                <>
                                    Compile PDF Document
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview System Panel */}
                <div className="space-y-6 lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                        <h2 className="text-base font-extrabold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Eye size={18} className="text-indigo-550" /> 2. Report Document Preview
                        </h2>

                        <div className="border border-slate-150 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-6 min-h-[400px]">
                            {/* Title Mock Cover page */}
                            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 text-center space-y-2">
                                <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">SMARTDG BUSINESS INTELLIGENCE REPORT</h3>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{selectedType} report</p>
                                <div className="text-[10px] text-slate-500 pt-4 space-y-1">
                                    <p>Dataset Name: {previewData?.dataset_name}</p>
                                    <p>Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>

                            {/* Section: Quality Scorecard */}
                            {sections.summary && (
                                <div className="space-y-2 text-xs">
                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Section 1. Summary Scorecard Metrics</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Data Quality Score</span>
                                            <span className="text-base font-extrabold text-slate-800 dark:text-slate-105">{previewData?.quality_score}</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Forecast Reliability</span>
                                            <span className="text-base font-extrabold text-slate-800 dark:text-slate-105">{previewData?.has_forecast ? `${previewData?.forecast_reliability}%` : "N/A"}</span>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">AI Insight Confidence</span>
                                            <span className="text-base font-extrabold text-slate-800 dark:text-slate-105">{previewData?.has_insights ? `${previewData?.insight_reliability}%` : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section: AI Executive Summary */}
                            {sections.insights && previewData?.has_insights && (
                                <div className="space-y-2 text-xs">
                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Section 2. Executive Business Summary</h4>
                                    <p className="leading-relaxed text-slate-655 dark:text-slate-350">{previewData.insight_summary}</p>
                                </div>
                            )}

                            {/* Section: Forecast trajectory */}
                            {sections.forecast && previewData?.has_forecast && (
                                <div className="space-y-2 text-xs">
                                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400">Section 3. Forecast Projections</h4>
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex justify-between">
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Trend direction</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-105">{previewData.forecast_trend_direction?.toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Growth Pct</span>
                                            <span className="font-extrabold text-emerald-600">+{previewData.forecast_growth_rate?.toFixed(1)}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Forecast model</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-105">{previewData.forecast_model?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden container divs to mount Plotly elements for PNG rendering */}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                <div ref={trendRef} style={{ width: '600px', height: '300px' }} />
                <div ref={catRef} style={{ width: '600px', height: '300px' }} />
                <div ref={forecastRef} style={{ width: '600px', height: '300px' }} />
            </div>
        </div>
    );
};

export default ReportBuilder;
