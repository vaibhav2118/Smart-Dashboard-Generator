import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useDataset } from '../context/DatasetContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileDown, FileText, Loader2, AlertCircle, ArrowLeft, Building2 } from 'lucide-react';

const ExecutiveBrief = () => {
    const { datasetId } = useParams();
    const { activeDataset } = useDataset();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    
    const briefRef = useRef(null);
    const isDemo = String(datasetId).startsWith('demo-');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                if (isDemo) {
                    setData({
                        profile: { total_rows: 15000, total_columns: 12, missing_values_count: 5, duplicate_records_count: 2 },
                        kpis: [{ label: 'Revenue', value: '$1.2M' }, { label: 'Active Users', value: '14,000' }],
                        insights: [
                            { insight: 'Revenue shows a 15% increase Q/Q.', type: 'Trend' },
                            { insight: 'Customer churn correlated with low engagement scores.', type: 'Correlation' }
                        ],
                        forecast: { model_used: 'prophet', trend_direction: 'Upward', growth_rate: 12.5 }
                    });
                    setLoading(false);
                    return;
                }

                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch everything in parallel
                const [profRes, kpiRes, insRes, forRes] = await Promise.allSettled([
                    axios.get(`http://localhost:8000/api/datasets/${datasetId}/profile`, { headers }),
                    axios.get(`http://localhost:8000/api/datasets/${datasetId}/kpis`, { headers }),
                    axios.get(`http://localhost:8000/api/insights/${datasetId}`, { headers }),
                    axios.get(`http://localhost:8000/api/forecast/${datasetId}`, { headers })
                ]);

                setData({
                    profile: profRes.status === 'fulfilled' ? profRes.value.data : null,
                    kpis: kpiRes.status === 'fulfilled' ? kpiRes.value.data.kpis : null,
                    insights: insRes.status === 'fulfilled' ? (insRes.value.data.insight_data?.insights || []) : null,
                    forecast: forRes.status === 'fulfilled' ? forRes.value.data : null
                });
            } catch (err) {
                console.error("Failed to load brief data", err);
                setError("Failed to compile executive brief data.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [datasetId, isDemo]);

    const handleExportPDF = async () => {
        if (!briefRef.current) return;
        setExportingPdf(true);
        try {
            const canvas = await html2canvas(briefRef.current, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
            pdf.save(`Executive_Brief_${activeDataset?.filename || 'Dataset'}.pdf`);
        } catch (e) {
            console.error("PDF Export failed", e);
            alert("Failed to export PDF.");
        } finally {
            setExportingPdf(false);
        }
    };

    const handleExportMarkdown = () => {
        if (!data) return;
        
        let md = `# Executive Brief: ${activeDataset?.filename || datasetId}\n`;
        md += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
        
        md += `## Data Health Profile\n`;
        if (data.profile) {
            md += `- Total Rows: ${data.profile.total_rows}\n`;
            md += `- Total Columns: ${data.profile.total_columns}\n`;
            md += `- Missing Values: ${data.profile.missing_values_count}\n`;
            md += `- Duplicate Records: ${data.profile.duplicate_records_count}\n\n`;
        } else {
            md += `No profile data generated.\n\n`;
        }

        md += `## Key Performance Indicators\n`;
        if (data.kpis && data.kpis.length > 0) {
            data.kpis.forEach(k => {
                md += `- ${k.label}: ${k.value}\n`;
            });
            md += `\n`;
        } else {
            md += `No KPIs configured or calculated.\n\n`;
        }

        md += `## AI Strategic Insights\n`;
        if (data.insights && data.insights.length > 0) {
            data.insights.forEach(i => {
                const text = typeof i === 'string' ? i : (i.insight || i.description);
                md += `- ${text}\n`;
            });
            md += `\n`;
        } else {
            md += `No AI insights generated.\n\n`;
        }

        md += `## Forecasting Summary\n`;
        if (data.forecast) {
            md += `- Model Used: ${data.forecast.model_used}\n`;
            md += `- Trend Direction: ${data.forecast.trend_direction}\n`;
            md += `- Growth Rate: ${data.forecast.growth_rate}%\n`;
            md += `- Forecast Horizon: ${data.forecast.forecast_horizon}\n\n`;
        } else {
            md += `No forecasting model run.\n\n`;
        }

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Executive_Brief_${activeDataset?.filename || 'Dataset'}.md`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Compiling Executive Brief...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-750 max-w-3xl mx-auto mt-8">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
            </div>
        );
    }

    // Math for health score (simplified)
    let healthScore = 100;
    if (data?.profile) {
        const total = data.profile.total_rows * data.profile.total_columns;
        const missingPct = total > 0 ? (data.profile.missing_values_count / total) * 100 : 0;
        const dupPct = data.profile.total_rows > 0 ? (data.profile.duplicate_records_count / data.profile.total_rows) * 100 : 0;
        healthScore = Math.max(0, Math.round(100 - (missingPct * 2) - (dupPct * 1.5)));
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                    <Link to={`/command-center/${datasetId}`} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-300">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="font-extrabold text-lg tracking-tight">Executive Brief</h1>
                        <p className="text-xs text-slate-500">Export-ready summary</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportMarkdown} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition">
                        <FileText size={16} /> Markdown
                    </button>
                    <button onClick={handleExportPDF} disabled={exportingPdf} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-md disabled:opacity-50">
                        {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div className="bg-slate-100 dark:bg-[#0B1120] p-4 sm:p-8 rounded-3xl overflow-x-auto">
                {/* A4 Page Container */}
                <div ref={briefRef} className="bg-white text-slate-900 w-[210mm] min-h-[297mm] mx-auto p-12 shadow-md rounded-lg flex flex-col print:shadow-none print:w-auto print:min-h-0 print:p-0">
                    
                    {/* Header */}
                    <div className="border-b-2 border-indigo-600 pb-6 mb-8 flex justify-between items-end">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                <Building2 size={24} />
                                <span className="font-black tracking-widest uppercase text-sm">SmartDG</span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-slate-900">Executive Brief</h1>
                            <p className="text-slate-500 mt-2 font-medium">Dataset: <span className="text-slate-800 font-bold">{activeDataset?.filename || datasetId}</span></p>
                        </div>
                        <div className="text-right text-sm font-semibold text-slate-400">
                            <p>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wider">Automated Intelligence Report</p>
                        </div>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-10 flex-1">
                        
                        {/* 1. KPIs */}
                        <section>
                            <h2 className="text-xl font-extrabold text-slate-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-sm">Key Performance Indicators</h2>
                            {data.kpis && data.kpis.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {data.kpis.map((kpi, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                                            <p className="text-2xl font-black text-indigo-700 mt-1">{kpi.value}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm italic text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">No KPIs have been computed for this dataset. Generate a dashboard first.</p>
                            )}
                        </section>

                        {/* 2. Insights */}
                        <section>
                            <h2 className="text-xl font-extrabold text-slate-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-sm">Strategic AI Insights</h2>
                            {data.insights && data.insights.length > 0 ? (
                                <ul className="space-y-3">
                                    {data.insights.map((ins, idx) => {
                                        const text = typeof ins === 'string' ? ins : (ins.insight || ins.description);
                                        const type = typeof ins === 'string' ? 'Insight' : (ins.type || 'Insight');
                                        return (
                                            <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                                                <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5"></span>
                                                <div>
                                                    <span className="font-bold text-slate-800 mr-2">{type}:</span>
                                                    <span className="text-slate-600">{text}</span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-sm italic text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">No AI insights generated. Run the Insights module first.</p>
                            )}
                        </section>

                        {/* 3. Forecast */}
                        <section>
                            <h2 className="text-xl font-extrabold text-slate-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-sm">Forecasting Summary</h2>
                            {data.forecast ? (
                                <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl text-sm leading-relaxed text-slate-700">
                                    <p className="mb-2"><strong className="text-slate-900">Trend Direction:</strong> The projected trend is <span className="font-bold text-indigo-700">{data.forecast.trend_direction}</span> with an estimated growth rate of <span className="font-bold text-indigo-700">{data.forecast.growth_rate}%</span>.</p>
                                    <p className="mb-2"><strong className="text-slate-900">Forecast Horizon:</strong> Predicting next {data.forecast.forecast_horizon} periods.</p>
                                    <p><strong className="text-slate-900">Algorithmic Confidence:</strong> High (Model: {data.forecast.model_used.toUpperCase()})</p>
                                </div>
                            ) : (
                                <p className="text-sm italic text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">No forecast models have been trained on this dataset.</p>
                            )}
                        </section>

                        {/* 4. Data Health */}
                        <section>
                            <h2 className="text-xl font-extrabold text-slate-800 border-b border-slate-200 pb-2 mb-4 uppercase tracking-wide text-sm">Data Integrity & Health</h2>
                            {data.profile ? (
                                <div className="flex items-center gap-6 bg-slate-50 border border-slate-100 p-5 rounded-xl">
                                    <div className="shrink-0 text-center pr-6 border-r border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health Score</p>
                                        <p className="text-3xl font-black text-emerald-600">{healthScore}%</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-600 flex-1">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-500">Total Rows:</span>
                                            <span className="font-bold text-slate-800">{data.profile.total_rows.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-500">Total Columns:</span>
                                            <span className="font-bold text-slate-800">{data.profile.total_columns.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-500">Missing Values:</span>
                                            <span className="font-bold text-slate-800">{data.profile.missing_values_count.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-slate-500">Duplicate Rows:</span>
                                            <span className="font-bold text-slate-800">{data.profile.duplicate_records_count.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm italic text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">Dataset profile has not been generated.</p>
                            )}
                        </section>

                    </div>
                    
                    {/* Footer */}
                    <div className="mt-12 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                        SmartDG Executive Brief • Confidential & Proprietary
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveBrief;
