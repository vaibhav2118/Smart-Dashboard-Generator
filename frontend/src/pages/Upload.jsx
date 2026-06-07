import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';

const Upload = () => {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successData, setSuccessData] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];

    const validateFile = (selectedFile) => {
        const extension = '.' + selectedFile.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            setError('Only CSV and Excel files are allowed.');
            return false;
        }
        setError(null);
        return true;
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
                setSuccessData(null);
                setPreviewData(null);
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (validateFile(selectedFile)) {
                setFile(selectedFile);
                setSuccessData(null);
                setPreviewData(null);
            }
        }
    };

    const uploadFile = async () => {
        if (!file) return;

        setUploading(true);
        setProgress(0);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Retrieve token from local storage (must match existing AuthContext setup)
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:8000/api/datasets/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });

            setSuccessData({
                id: response.data.dataset_id,
                filename: file.name,
                rows: response.data.rows,
                columns: response.data.columns,
                type: file.name.endsWith('.csv') ? 'CSV' : 'Excel'
            });

            // Fetch dataset preview
            fetchPreview(response.data.dataset_id);
            setFile(null);
        } catch (err) {
            console.error("Upload failed", err);
            setError(err.response?.data?.detail || 'Failed to upload dataset. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const fetchPreview = async (datasetId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:8000/api/datasets/${datasetId}/preview`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setPreviewData(response.data);
        } catch (err) {
            console.error("Error fetching preview", err);
            setError("Uploaded successfully, but preview failed to load.");
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Upload Dataset</h1>
                <p className="text-slate-500 dark:text-slate-450 mt-1">
                    Import your tabular files to generate insights and forecast metrics.
                </p>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Drag and Drop Zone Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition select-none min-h-[300px] ${
                            dragActive 
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' 
                                : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-slate-50/30 dark:hover:bg-slate-900/60'
                        }`}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            accept=".csv, .xls, .xlsx"
                            className="hidden"
                        />

                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 shadow-sm">
                            <UploadCloud size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Drag & Drop your dataset here</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            Support CSV, XLS, and XLSX file formats up to 50MB.
                        </p>
                        <button 
                            type="button" 
                            className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
                        >
                            Select File
                        </button>
                    </div>

                    {/* Selected File Card / Progress */}
                    {file && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        {file.name.endsWith('.csv') ? <FileText size={24} /> : <FileSpreadsheet size={24} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-550 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    disabled={uploading}
                                    className="text-xs font-semibold text-red-650 hover:text-red-500 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>

                            {uploading ? (
                                <div className="space-y-2">
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-indigo-650 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        <span>Uploading...</span>
                                        <span>{progress}%</span>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={uploadFile}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-semibold transition"
                                >
                                    Upload & Analyze
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column Context Cards */}
                <div className="space-y-6">
                    {/* Upload Context Details */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-fit space-y-6">
                        <h2 className="font-semibold text-lg">Dataset Guidelines</h2>
                        <ul className="space-y-4 text-sm text-slate-655 dark:text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 mt-2 shrink-0" />
                                Ensure your dataset has a clear header row mapping column names.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 mt-2 shrink-0" />
                                Format date columns as `YYYY-MM-DD` for proper time-series forecasting.
                            </li>
                        </ul>
                    </div>

                    {/* Try Demo Dataset Card */}
                    <div className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-805 rounded-2xl p-6 h-fit space-y-4 text-left">
                        <h2 className="font-semibold text-lg">Or try with a demo dataset</h2>
                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                            No files ready? Get started instantly with one of our pre-configured business ledgers.
                        </p>
                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => {
                                    localStorage.setItem('activeDatasetId', 'demo-sales');
                                    navigate('/dataset/demo-sales');
                                }}
                                className="w-full text-left px-3.5 py-2 border border-slate-250 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 font-bold text-xs transition cursor-pointer"
                            >
                                Sales Performance Q2
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem('activeDatasetId', 'demo-finance');
                                    navigate('/dataset/demo-finance');
                                }}
                                className="w-full text-left px-3.5 py-2 border border-slate-250 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 font-bold text-xs transition cursor-pointer"
                            >
                                Finance Ledger 2026
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem('activeDatasetId', 'demo-hr');
                                    navigate('/dataset/demo-hr');
                                }}
                                className="w-full text-left px-3.5 py-2 border border-slate-250 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 font-bold text-xs transition cursor-pointer"
                            >
                                HR Retention Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Summary & Dataset Preview Section */}
            {successData && (
                <div className="space-y-8 border-t border-slate-200 dark:border-slate-850 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Dataset Uploaded Successfully</h3>
                                <p className="text-sm text-slate-550 dark:text-slate-400 mt-0.5">
                                    "{successData.filename}" has been stored and registered in database records.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate(`/dataset/${successData.id}`)}
                                className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
                            >
                                View Dataset
                            </button>
                            <button
                                onClick={() => navigate(`/analysis/${successData.id}`)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
                            >
                                Analyze Dataset <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Metadata indicators */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Rows</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{successData.rows.toLocaleString()}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Columns</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{successData.columns}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Format</p>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 mt-1.5">
                                {successData.type}
                            </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</p>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 mt-1.5">
                                Active Raw
                            </span>
                        </div>
                    </div>

                    {/* Table Preview */}
                    {previewData && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">First 10 Rows Preview</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
                                            {previewData.columns.map((col, idx) => (
                                                <th key={idx} className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-400 tracking-wider whitespace-nowrap">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                        {previewData.rows.map((row, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition">
                                                {previewData.columns.map((col, colIdx) => (
                                                    <td key={colIdx} className="px-6 py-3 text-slate-700 dark:text-slate-350 whitespace-nowrap font-medium">
                                                        {row[col] === null ? <span className="text-slate-400 italic">null</span> : String(row[col])}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Upload;
