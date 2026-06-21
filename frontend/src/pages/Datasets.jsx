import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useDataset } from '../context/DatasetContext';
import { Database, Search, ArrowRight, Eye, BarChart3, Trash2, Plus, Calendar, AlertCircle } from 'lucide-react';

const Datasets = () => {
    const [dbDatasets, setDbDatasets] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]); // Session simulation for deleted datasets
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [sortBy, setSortBy] = useState('upload_date'); // upload_date, name, rows
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { setActiveDataset, clearActiveDataset, activeDataset } = useDataset();

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
            setDbDatasets(response.data);
        } catch (err) {
            console.error("Failed to load datasets", err);
            setError("Could not load database records. Showing offline demo datasets only.");
        } finally {
            setLoading(false);
        }
    };

    // Static Demo Datasets
    const demoItems = [
        {
            id: 'demo-sales',
            filename: 'Sales_Performance_Q2.csv',
            dataset_type: 'CSV',
            row_count: 1450,
            column_count: 7,
            upload_date: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
            status: 'Demo'
        },
        {
            id: 'demo-finance',
            filename: 'Finance_Ledger_2026.xlsx',
            dataset_type: 'Excel',
            row_count: 850,
            column_count: 7,
            upload_date: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
            status: 'Demo'
        },
        {
            id: 'demo-hr',
            filename: 'HR_Retention_Profile.csv',
            dataset_type: 'CSV',
            row_count: 512,
            column_count: 7,
            upload_date: new Date(Date.now() - 3600000 * 24 * 10).toISOString(), // 10 days ago
            status: 'Demo'
        }
    ];

    // Combine database datasets with demo datasets
    const formattedDbItems = dbDatasets.map(item => ({
        id: item.id,
        filename: item.filename,
        dataset_type: item.filename.endsWith('.csv') ? 'CSV' : 'Excel',
        row_count: item.row_count,
        column_count: item.column_count,
        upload_date: item.upload_date,
        status: item.status || 'Uploaded'
    }));

    const allDatasets = [...demoItems, ...formattedDbItems].filter(item => !deletedIds.includes(item.id));

    // Handle deletion
    const handleDelete = async (id, filename) => {
        if (confirm(`Are you sure you want to delete dataset "${filename}"?`)) {
            if (String(id).startsWith('demo-')) {
                setDeletedIds(prev => [...prev, id]);
            } else {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`http://localhost:8000/api/datasets/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setDbDatasets(prev => prev.filter(item => item.id !== id));
                } catch (err) {
                    console.error("Failed to delete dataset:", err);
                    alert("Failed to delete dataset from backend.");
                }
            }
            // If active dataset is deleted, clear context
            if (String(activeDataset?.id) === String(id)) {
                clearActiveDataset();
            }
        }
    };

    // Filter & Search & Sort logic
    const filteredDatasets = allDatasets
        .filter(item => {
            const matchesSearch = item.filename.toLowerCase().includes(search.toLowerCase());
            const matchesType = typeFilter === 'All' || item.dataset_type === typeFilter;
            return matchesSearch && matchesType;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.filename.localeCompare(b.filename);
            }
            if (sortBy === 'rows') {
                return (b.row_count || 0) - (a.row_count || 0);
            }
            // Sort by upload date desc
            return new Date(b.upload_date) - new Date(a.upload_date);
        });

    const triggerPreview = (id, dataset) => {
        if (dataset) setActiveDataset(dataset);
        navigate(`/dataset/${id}`);
    };

    const triggerAnalyze = (id, dataset) => {
        if (dataset) setActiveDataset(dataset);
        navigate(`/analysis/${id}`);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Dataset Center</h1>
                    <p className="text-slate-500 dark:text-slate-450 mt-1">
                        Manage your files, examine columns, and run profiling.
                    </p>
                </div>
                <Link
                    to="/upload"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-755 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition"
                >
                    <Plus size={16} /> Upload Dataset
                </Link>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-400 text-sm font-medium">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Filter and Search Bar controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search dataset name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 w-full sm:w-auto">
                        <span>Format:</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                            <option value="All">All Formats</option>
                            <option value="CSV">CSV</option>
                            <option value="Excel">Excel</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 w-full sm:w-auto">
                        <span>Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                            <option value="upload_date">Upload Date</option>
                            <option value="name">Alphabetical</option>
                            <option value="rows">Row Count</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main table content */}
            {filteredDatasets.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-105 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-6">
                        <Database size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 dark:text-slate-200">No datasets uploaded yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                        Get started by uploading a dataset file or adjusting your search parameters.
                    </p>
                    <Link
                        to="/upload"
                        className="mt-6 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                    >
                        Upload Dataset
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Dataset Name</th>
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Type</th>
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Rows</th>
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Columns</th>
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Upload Date</th>
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-3.5 font-bold text-slate-600 dark:text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {filteredDatasets.map((dataset) => (
                                    <tr key={dataset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                                            {dataset.filename}
                                        </td>
                                        <td className="px-6 py-4">
                                            {dataset.dataset_type === 'CSV' ? (
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-450 border border-amber-100 dark:border-amber-900/40">
                                                    CSV
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/40">
                                                    Excel
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-semibold">
                                            {dataset.row_count?.toLocaleString() || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-semibold">
                                            {dataset.column_count || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-550 dark:text-slate-400 font-semibold">
                                            {new Date(dataset.upload_date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                dataset.status === 'Demo' 
                                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40' 
                                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                                            }`}>
                                                {dataset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => triggerPreview(dataset.id, dataset)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Preview Data"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => triggerAnalyze(dataset.id, dataset)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Analyze Data"
                                                >
                                                    <BarChart3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dataset.id, dataset.filename)}
                                                    className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                                    title="Delete Dataset"
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
                </div>
            )}
        </div>
    );
};

export default Datasets;
