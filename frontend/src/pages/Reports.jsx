import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Plus, Eye, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('Executive Summary');
    const [successMsg, setSuccessMsg] = useState(null);

    const templates = [
        { name: 'Executive Summary', desc: 'Auto-compile general column profiles, row sums, and health rankings.' },
        { name: 'Sales Analysis', desc: 'Focuses on regional performance metrics, products, and profit margins.' },
        { name: 'Forecast Report', desc: 'Includes time-series projections, model configurations, and horizons.' },
        { name: 'Finance Report', desc: 'Detailed budgets compared against ledger debit outputs.' }
    ];

    // Seed default reports + load from database
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/reports/');
                if (response.data.length > 0) {
                    const mapped = response.data.map(r => ({
                        id: r.id,
                        name: r.report_name,
                        type: r.report_type,
                        date: r.generated_date
                    }));
                    setReports(mapped);
                } else {
                    const defaults = [
                        { name: 'Sales_Performance_Q2_Summary.pdf', type: 'Sales Analysis' },
                        { name: 'Finance_Ledger_2026_Audit_Report.pdf', type: 'Finance Report' }
                    ];
                    const seeded = [];
                    for (const def of defaults) {
                        const seedRes = await axios.post('http://localhost:8000/api/reports/', {
                            report_name: def.name,
                            report_type: def.type,
                            report_url: `/api/reports/download/${def.name}`,
                            report_path: `uploads/reports/${def.name}`
                        });
                        seeded.push({
                            id: seedRes.data.id,
                            name: seedRes.data.report_name,
                            type: seedRes.data.report_type,
                            date: seedRes.data.generated_date
                        });
                    }
                    setReports(seeded);
                }
            } catch (error) {
                console.error("Error fetching reports:", error);
            }
        };
        fetchReports();
    }, []);

    const generateReport = async () => {
        const activeDatasetName = localStorage.getItem('activeDatasetId') === 'demo-finance' 
            ? 'Finance_Ledger_2026' 
            : localStorage.getItem('activeDatasetId') === 'demo-hr' 
                ? 'HR_Retention_Profile' 
                : 'Sales_Performance_Q2';

        const activeDatasetId = localStorage.getItem('activeDatasetId');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const cleanDatasetId = uuidRegex.test(activeDatasetId) ? activeDatasetId : null;

        const reportName = `${activeDatasetName}_${selectedTemplate.replace(' ', '_')}_Report.pdf`;

        try {
            const response = await axios.post('http://localhost:8000/api/reports/', {
                report_name: reportName,
                report_type: selectedTemplate,
                report_url: `/api/reports/download/${reportName}`,
                report_path: `uploads/reports/${reportName}`,
                dataset_id: cleanDatasetId
            });

            const newReport = {
                id: response.data.id,
                name: response.data.report_name,
                type: response.data.report_type,
                date: response.data.generated_date
            };

            setReports(prev => [newReport, ...prev]);

            // Dispatch a custom storage event to update the Navbar counts instantly
            window.dispatchEvent(new Event('storage'));

            setSuccessMsg(`Compiled report "${newReport.name}" successfully!`);
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report on the backend database.");
        }
    };

    const handleDelete = async (id, name) => {
        if (confirm(`Delete report "${name}"?`)) {
            try {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(id)) {
                    await axios.delete(`http://localhost:8000/api/reports/${id}`);
                }
                const updated = reports.filter(r => r.id !== id);
                setReports(updated);
                window.dispatchEvent(new Event('storage'));
            } catch (error) {
                console.error("Error deleting report:", error);
                alert("Failed to delete report from the database.");
            }
        }
    };

    const handleDownload = (name) => {
        alert(`Downloading ${name} (Simulated PDF download)...`);
    };

    const handleView = (name) => {
        alert(`Viewing preview for ${name} (Simulated PDF viewer)...`);
    };

    return (
        <div className="space-y-8 select-none">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Report Exporter</h1>
                    <p className="text-slate-500 dark:text-slate-450 mt-1">
                        Compile custom business intelligence templates to PDF layout.
                    </p>
                </div>
            </div>

            {/* Success toast message */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
                    <span>{successMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Templates Grid Picker */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="font-bold text-base mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500" /> 1. Select Report Template
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {templates.map(temp => (
                                <div
                                    key={temp.name}
                                    onClick={() => setSelectedTemplate(temp.name)}
                                    className={`p-4 rounded-xl border-2 text-left cursor-pointer transition select-none flex flex-col justify-between min-h-[110px] ${
                                        selectedTemplate === temp.name
                                            ? 'border-indigo-600 bg-indigo-50/15 dark:bg-indigo-950/10'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-250">{temp.name}</h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{temp.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Compilation trigger button */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full min-h-[220px]">
                    <div>
                        <h2 className="font-bold text-base mb-2">2. Compile Parameters</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Generate PDF summaries based on active columns data, AI insights descriptions, and time-series forecast projections.
                        </p>
                    </div>
                    <button
                        onClick={generateReport}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-705 text-white font-semibold py-3 rounded-xl text-sm transition shadow-md mt-6"
                    >
                        <Plus size={16} /> Compile Report
                    </button>
                </div>
            </div>

            {/* Generated PDF history list table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 dark:text-slate-200">Generated Reports</h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
                        {reports.length} Reports Total
                    </span>
                </div>

                {reports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                        No reports generated yet. Compile your first template.
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
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-250 flex items-center gap-2 truncate max-w-[280px]">
                                            <FileText size={16} className="text-red-500 shrink-0" />
                                            <span className="truncate">{report.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{report.type}</td>
                                        <td className="px-6 py-4 text-slate-605 dark:text-slate-400 font-medium">
                                            {new Date(report.date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleView(report.name)}
                                                    className="p-1.5 text-slate-550 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="View Report"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(report.name)}
                                                    className="p-1.5 text-slate-550 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Download PDF"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(report.id, report.name)}
                                                    className="p-1.5 text-slate-550 hover:text-red-650 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Delete Report"
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
