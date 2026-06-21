import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getDataset } from '../utils/demoData';
import { ThemeContext } from '../context/ThemeContext';
import DatasetLifecycleRibbon from '../components/DatasetLifecycleRibbon';
import Plot from '../components/Plot';
import { 
    BarChart3, 
    ArrowRight, 
    AlertCircle, 
    Activity, 
    Grid, 
    Info, 
    Loader2,
    Calendar,
    Award,
    Database,
    HelpCircle,
    CheckCircle
} from 'lucide-react';

const DataProfiling = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme } = useContext(ThemeContext);
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isDemo = String(id).startsWith('demo-');

    useEffect(() => {
        const loadProfiling = async () => {
            setLoading(true);
            setError(null);
            
            if (isDemo) {
                const demo = getDataset(id);
                if (demo) {
                    const total_rows = demo.row_count;
                    const total_columns = demo.column_count;
                    const missing_values_count = demo.missing_values;
                    const duplicate_records_count = demo.duplicate_rows;
                    const missing_percentage = (missing_values_count / (total_rows * total_columns)) * 100;
                    
                    const classification = demo.classification || { numerical: [], categorical: [], date: [] };
                    
                    const statistics = {
                        numerical: {},
                        categorical: {}
                    };
                    
                    classification.numerical.forEach(col => {
                        let min = 100, q1 = 200, median = 300, q3 = 450, max = 1000, mean = 380, std = 120;
                        if (id === 'demo-sales') {
                            if (col === 'Revenue') { min = 180; q1 = 360; median = 800; q3 = 1200; max = 2400; mean = 985; std = 620; }
                            else if (col === 'Quantity') { min = 1; q1 = 1; median = 1; q3 = 2; max = 2; mean = 1.4; std = 0.5; }
                            else if (col === 'Profit') { min = 35; q1 = 80; median = 150; q3 = 300; max = 600; mean = 242; std = 165; }
                        } else if (id === 'demo-finance') {
                            if (col === 'Amount') { min = 120; q1 = 450; median = 900; q3 = 2500; max = 5000; mean = 1690; std = 1800; }
                            else if (col === 'Budget') { min = 150; q1 = 500; median = 800; q3 = 2000; max = 5000; mean = 1645; std = 1750; }
                        } else if (id === 'demo-hr') {
                            if (col === 'Salary') { min = 58000; q1 = 68000; median = 80000; q3 = 105000; max = 130000; mean = 88800; std = 24500; }
                            else if (col === 'Performance Rating') { min = 3.1; q1 = 3.6; median = 4.15; q3 = 4.5; max = 4.9; mean = 4.13; std = 0.55; }
                            else if (col === 'Tenure') { min = 0.8; q1 = 1.25; median = 2.25; q3 = 3.25; max = 5.0; mean = 2.43; std = 1.35; }
                        }
                        statistics.numerical[col] = { min, q1, median, q3, max, mean, std };
                    });
                    
                    const missing_by_column = {};
                    demo.columns.forEach(col => {
                        missing_by_column[col] = 0;
                    });
                    if (id === 'demo-sales') {
                        missing_by_column['Revenue'] = 2;
                    } else if (id === 'demo-hr') {
                        missing_by_column['Salary'] = 5;
                    }
                    
                    const outliers_by_column = {};
                    classification.numerical.forEach(col => {
                        outliers_by_column[col] = id === 'demo-sales' && col === 'Revenue' ? 1 : 0;
                    });
                    
                    const correlation_matrix = {};
                    classification.numerical.forEach(col1 => {
                        correlation_matrix[col1] = {};
                        classification.numerical.forEach(col2 => {
                            correlation_matrix[col1][col2] = col1 === col2 ? 1.0 : parseFloat((Math.random() * 0.6 + 0.2).toFixed(2));
                        });
                    });
                    
                    classification.categorical.forEach(col => {
                        let top_values = [];
                        if (id === 'demo-sales') {
                            if (col === 'Category') { top_values = [{ value: 'Electronics', count: 12 }, { value: 'Furniture', count: 8 }]; }
                            else if (col === 'Region') { top_values = [{ value: 'North', count: 6 }, { value: 'South', count: 5 }, { value: 'West', count: 5 }, { value: 'East', count: 4 }]; }
                            else if (col === 'Product') { top_values = [{ value: 'Quantum Laptop', count: 3 }, { value: 'Optic Screen 27', count: 2 }, { value: 'Ergonomic Desk', count: 2 }]; }
                        } else if (id === 'demo-finance') {
                            if (col === 'Department') { top_values = [{ value: 'Operations', count: 3 }, { value: 'Engineering', count: 3 }, { value: 'Marketing', count: 1 }]; }
                            else if (col === 'Category') { top_values = [{ value: 'Operating Exp', count: 3 }, { value: 'Technology', count: 3 }]; }
                        } else if (id === 'demo-hr') {
                            if (col === 'Department') { top_values = [{ value: 'Engineering', count: 2 }, { value: 'Sales', count: 2 }, { value: 'Design', count: 2 }]; }
                        }
                        statistics.categorical[col] = { top_values };
                    });
                    
                    setDataset({
                        id: demo.id,
                        filename: demo.filename,
                        total_rows,
                        total_columns,
                        missing_values_count,
                        missing_percentage,
                        duplicate_records_count,
                        memory_usage: demo.memory_usage,
                        classification,
                        statistics,
                        missing_by_column,
                        outliers_by_column,
                        correlation_matrix
                    });
                    setLoading(false);
                    return;
                }
            }

            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`http://localhost:8000/api/datasets/${id}/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setDataset(response.data);
            } catch (err) {
                console.error("Error loading profiling dataset", err);
                setError(err.response?.data?.detail || "Failed to parse and generate profiling statistics. Please verify the file is a valid, non-corrupted CSV or Excel sheet.");
            } finally {
                setLoading(false);
            }
        };

        loadProfiling();
    }, [id, isDemo]);

    if (loading) {
        return (
            <div className="space-y-8">
                {/* Header Skeleton */}
                <div className="animate-pulse space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div className="h-4 bg-slate-250 dark:bg-slate-800 rounded w-24"></div>
                    <div className="h-9 bg-slate-250 dark:bg-slate-800 rounded w-1/3"></div>
                </div>

                {/* Health Card Skeleton */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-16 h-16 rounded-full bg-slate-250 dark:bg-slate-800 shrink-0"></div>
                        <div className="space-y-2 w-full">
                            <div className="h-5 bg-slate-250 dark:bg-slate-800 rounded w-48"></div>
                            <div className="h-3 bg-slate-250 dark:bg-slate-800 rounded w-80"></div>
                        </div>
                    </div>
                    <div className="flex gap-4 shrink-0 w-full md:w-auto">
                        <div className="h-14 bg-slate-250 dark:bg-slate-800 rounded-xl w-28"></div>
                        <div className="h-14 bg-slate-250 dark:bg-slate-800 rounded-xl w-28"></div>
                    </div>
                </div>

                {/* Grid Skeletons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse"></div>
                    <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse"></div>
                    <div className="h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
                    <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-md space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto">
                    <AlertCircle size={32} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100">Profiling Operation Failed</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {error}
                    </p>
                </div>
                <div className="flex justify-center gap-4">
                    <Link to="/datasets" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-750 transition">
                        Back to Datasets
                    </Link>
                    <Link to="/upload" className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:bg-indigo-750 transition shadow-md">
                        Upload a Dataset
                    </Link>
                </div>
            </div>
        );
    }

    if (!dataset) {
        return (
            <div className="max-w-md mx-auto mt-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-105 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Database size={24} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">No dataset loaded. Please select a dataset to view its profile.</p>
                <Link to="/datasets" className="text-sm font-semibold text-indigo-650 hover:underline inline-block">
                    Go to Datasets Center
                </Link>
            </div>
        );
    }

    // Health Score Math
    const totalCells = dataset.total_rows * dataset.total_columns;
    const missingPct = totalCells > 0 ? (dataset.missing_values_count / totalCells) * 100 : 0;
    const duplicatePct = dataset.total_rows > 0 ? (dataset.duplicate_records_count / dataset.total_rows) * 100 : 0;
    
    const missingPenalty = Math.min(40, missingPct * 2);
    const duplicatePenalty = Math.min(30, duplicatePct * 1.5);
    
    const hasNumerical = dataset.classification?.numerical?.length > 0;
    const hasDate = dataset.classification?.date?.length > 0;
    const datatypePenalty = (!hasNumerical && !hasDate) ? 10 : 0;
    
    const healthScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty - datatypePenalty));

    // Health Rating
    let healthRating = "High Quality";
    let healthRatingColor = "text-emerald-600 dark:text-emerald-400";
    let healthScoreColor = "text-indigo-600 dark:text-indigo-400 border-indigo-500";
    let healthDescription = "Excellent! Low density of missing cells and minimal duplicate records detected. Schema matches validation targets.";
    
    if (healthScore < 90 && healthScore >= 70) {
        healthRating = "Medium Quality";
        healthRatingColor = "text-amber-500 dark:text-amber-400";
        healthScoreColor = "text-amber-550 dark:text-amber-400 border-amber-400";
        healthDescription = "Noticeable gaps found. Some columns contain empty values or duplicate records. Run details inspections before calculations.";
    } else if (healthScore < 70) {
        healthRating = "Action Required";
        healthRatingColor = "text-red-650 dark:text-red-400";
        healthScoreColor = "text-red-650 dark:text-red-400 border-red-500";
        healthDescription = "Warning: Substantial missing data or duplicates detected. Running analytics on this dataset might produce skewed predictions.";
    }

    // Dynamic Plotly theme settings based on current theme context
    const isDark = theme === 'dark';
    const plotlyBgColor = isDark ? '#0f172a' : '#ffffff';
    const plotlyPlotColor = isDark ? '#020617' : '#f8fafc';
    const plotlyFontColor = isDark ? '#cbd5e1' : '#1e293b';
    const plotlyGridColor = isDark ? '#334155' : '#e2e8f0';

    // 1. Data Type Distribution (Pie Chart)
    const pieData = [{
        values: [
            dataset.classification?.numerical?.length || 0,
            dataset.classification?.categorical?.length || 0,
            dataset.classification?.date?.length || 0
        ],
        labels: ['Numerical', 'Categorical', 'Date'],
        type: 'pie',
        marker: {
            colors: ['#6366f1', '#a855f7', '#3b82f6']
        },
        hoverinfo: 'label+percent',
        textinfo: 'value'
    }];

    const pieLayout = {
        title: {
            text: 'Column Type Distribution',
            font: { color: plotlyFontColor, size: 14 }
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        showlegend: true,
        height: 250,
        margin: { t: 40, b: 20, l: 20, r: 20 },
        legend: { orientation: 'h', x: 0, y: -0.2 }
    };

    // 2. Missing Values Chart (Bar Chart)
    const barData = [{
        x: Object.keys(dataset.missing_by_column || {}),
        y: Object.values(dataset.missing_by_column || {}),
        type: 'bar',
        marker: { color: '#ef4444' }
    }];

    const barLayout = {
        title: {
            text: 'Missing Values per Column',
            font: { color: plotlyFontColor, size: 14 }
        },
        xaxis: {
            title: 'Columns',
            font: { color: plotlyFontColor },
            gridcolor: plotlyGridColor
        },
        yaxis: {
            title: 'Missing Count',
            font: { color: plotlyFontColor },
            gridcolor: plotlyGridColor
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        height: 250,
        margin: { t: 40, b: 40, l: 40, r: 20 }
    };

    // 3. Dataset Structure Summary (Horizontal Bar)
    const structureData = [{
        x: [dataset.total_rows, dataset.total_columns, dataset.missing_values_count, dataset.duplicate_records_count],
        y: ['Total Rows', 'Total Columns', 'Missing Cells', 'Duplicate Rows'],
        type: 'bar',
        orientation: 'h',
        marker: { color: ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'] }
    }];

    const structureLayout = {
        title: {
            text: 'Dataset Structure Summary',
            font: { color: plotlyFontColor, size: 14 }
        },
        xaxis: {
            title: 'Count',
            font: { color: plotlyFontColor },
            gridcolor: plotlyGridColor
        },
        yaxis: {
            title: 'Metric',
            font: { color: plotlyFontColor }
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        height: 250,
        margin: { t: 40, b: 40, l: 100, r: 20 }
    };

    // 4. Top Numerical Columns Box Plot
    const numCols = dataset.classification?.numerical || [];
    const statsObj = dataset.statistics?.numerical || {};
    
    // Sort num cols by variance/std or just take top 5
    const topNumCols = numCols
        .filter(col => statsObj[col] && statsObj[col].q1 !== undefined && statsObj[col].q3 !== undefined)
        .slice(0, 5);

    const numericalStatsData = topNumCols.length > 0 ? topNumCols.map((col, idx) => {
        const stats = statsObj[col];
        const colors = ['#6366f1', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];
        return {
            name: col,
            type: 'box',
            y: [stats.min, stats.q1, stats.median, stats.q3, stats.max],
            boxpoints: false,
            marker: { color: colors[idx % colors.length] }
        };
    }) : [];

    const numericalStatsLayout = {
        title: {
            text: 'Top Numerical Columns Distribution',
            font: { color: plotlyFontColor, size: 14 }
        },
        xaxis: {
            title: 'Columns',
            font: { color: plotlyFontColor }
        },
        yaxis: {
            title: 'Value Distribution',
            font: { color: plotlyFontColor },
            gridcolor: plotlyGridColor
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        height: 250,
        margin: { t: 40, b: 40, l: 40, r: 20 },
        showlegend: false
    };

    // 5. Correlation Heatmap
    const corrCols = Object.keys(dataset.correlation_matrix || {});
    const corrValues = corrCols.map(col1 => corrCols.map(col2 => dataset.correlation_matrix[col1]?.[col2] ?? 0));

    const corrData = corrCols.length > 0 ? [{
        z: corrValues,
        x: corrCols,
        y: corrCols,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmin: -1,
        zmax: 1,
        showscale: true
    }] : [];

    const corrLayout = {
        title: {
            text: 'Pearson Correlation Matrix',
            font: { color: plotlyFontColor, size: 14 }
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        height: 250,
        margin: { t: 40, b: 40, l: 80, r: 20 }
    };

    // 6. Top Categorical Distribution Bar Chart
    const catCols = dataset.classification?.categorical || [];
    const activeCatCol = catCols[0]; // Take first category column
    const activeCatStats = dataset.statistics?.categorical?.[activeCatCol] || {};
    const activeCatTopVals = activeCatStats.top_values || [];

    const catBarData = activeCatTopVals.length > 0 ? [{
        x: activeCatTopVals.map(v => v.value),
        y: activeCatTopVals.map(v => v.count),
        type: 'bar',
        marker: { color: '#a855f7' }
    }] : [];

    const catBarLayout = {
        title: {
            text: `Top Frequencies: ${activeCatCol || 'None'}`,
            font: { color: plotlyFontColor, size: 14 }
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        height: 250,
        margin: { t: 40, b: 40, l: 40, r: 20 }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 rounded-lg border border-emerald-250 dark:border-emerald-900/40 flex items-center gap-1">
                            <Award size={12} className="text-emerald-600 dark:text-emerald-455" />
                            Analysis Generated From Real Dataset
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate mt-2">{dataset.filename}</h1>
                </div>
                <button
                    onClick={() => navigate(`/insights/${dataset.id}`)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-755 text-white font-semibold px-5 py-2.8 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition w-fit shrink-0"
                >
                    Generate AI Insights <ArrowRight size={16} />
                </button>
            </div>

            <DatasetLifecycleRibbon />

            {/* Health Score Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4 text-left">
                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-extrabold text-xl shrink-0 ${healthScoreColor}`}>
                        {healthScore}%
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-250">Data Health Score</h2>
                        <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                            {healthDescription}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 shrink-0 text-center">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Health Rating</p>
                        <p className={`text-sm font-extrabold mt-0.5 ${healthRatingColor}`}>{healthRating}</p>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Memory Footprint</p>
                        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{dataset.memory_usage}</p>
                    </div>
                </div>
            </div>

            {/* Row/Col metadata grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Rows</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{dataset.total_rows.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Columns</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{dataset.total_columns.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Missing Values</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                        {dataset.missing_values_count.toLocaleString()}{' '}
                        <span className="text-xs font-bold text-slate-400">({dataset.missing_percentage.toFixed(1)}%)</span>
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Duplicates Records</span>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{dataset.duplicate_records_count.toLocaleString()}</p>
                </div>
            </div>

            {/* Numerical / Categorical / Date columns list */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Numerical columns */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-indigo-500" /> Numerical Columns ({dataset.classification?.numerical?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {dataset.classification?.numerical?.map(col => (
                            <span key={col} className="px-2.5 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-350">
                                {col}
                            </span>
                        ))}
                        {(dataset.classification?.numerical?.length || 0) === 0 && (
                            <span className="text-xs text-slate-400 italic">None identified</span>
                        )}
                    </div>
                </div>

                {/* Categorical columns */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Grid size={16} className="text-violet-500" /> Categorical Columns ({dataset.classification?.categorical?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {dataset.classification?.categorical?.map(col => (
                            <span key={col} className="px-2.5 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-350">
                                {col}
                            </span>
                        ))}
                        {(dataset.classification?.categorical?.length || 0) === 0 && (
                            <span className="text-xs text-slate-400 italic">None identified</span>
                        )}
                    </div>
                </div>

                {/* Date columns */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" /> Date Columns ({dataset.classification?.date?.length || 0})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {dataset.classification?.date?.map(col => (
                            <span key={col} className="px-2.5 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-350">
                                {col}
                            </span>
                        ))}
                        {(dataset.classification?.date?.length || 0) === 0 && (
                            <span className="text-xs text-slate-400 italic">None identified</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Visualizations row using Plotly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[300px] flex items-center justify-center">
                    <Plot
                        data={pieData}
                        layout={pieLayout}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                        config={{ displayModeBar: false }}
                    />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[300px] flex items-center justify-center">
                    <Plot
                        data={barData}
                        layout={barLayout}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                        config={{ displayModeBar: false }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[300px] flex items-center justify-center">
                    <Plot
                        data={structureData}
                        layout={structureLayout}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                        config={{ displayModeBar: false }}
                    />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[300px] flex items-center justify-center">
                    {numCols.length > 0 ? (
                        <Plot
                            data={numericalStatsData}
                            layout={numericalStatsLayout}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-550 flex items-center justify-center">
                                <HelpCircle size={24} />
                            </div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Numerical Data</h4>
                            <p className="text-xs text-slate-550 dark:text-slate-405 max-w-xs leading-relaxed">
                                No numerical columns are classified in this dataset. Numerical Statistics Summary requires at least one integer/float field.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Correlation & Categorical Distribution Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[300px] flex items-center justify-center">
                    {corrCols.length > 0 ? (
                        <Plot
                            data={corrData}
                            layout={corrLayout}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-550 flex items-center justify-center">
                                <HelpCircle size={24} />
                            </div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Correlation Data</h4>
                            <p className="text-xs text-slate-550 dark:text-slate-405 max-w-xs leading-relaxed">
                                Pearson correlation matrix requires at least two numerical fields to calculate relationships.
                            </p>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm min-h-[300px] flex items-center justify-center">
                    {activeCatTopVals.length > 0 ? (
                        <Plot
                            data={catBarData}
                            layout={catBarLayout}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-550 flex items-center justify-center">
                                <HelpCircle size={24} />
                            </div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Categorical Columns</h4>
                            <p className="text-xs text-slate-550 dark:text-slate-405 max-w-xs leading-relaxed">
                                No categorical distributions are available for plotting.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary statistics table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-205 flex items-center gap-2">
                        <Info size={16} className="text-indigo-500" /> Numerical Summaries Table
                    </h3>
                </div>
                {numCols.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-955/80 border-b border-slate-200 dark:border-slate-800 font-bold">
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Column Name</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Mean / Average</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Median</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Min</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Max</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Std Dev</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Outliers</th>
                                    <th className="px-6 py-3.5 text-slate-650 dark:text-slate-400">Filled Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                {numCols.map(col => {
                                    const colStats = statsObj[col] || {};
                                    const missingCount = dataset.missing_by_column?.[col] || 0;
                                    const filledCount = dataset.total_rows - missingCount;
                                    const outliersCount = dataset.outliers_by_column?.[col] ?? 0;
                                    
                                    return (
                                        <tr key={col} className="hover:bg-slate-55/50 dark:hover:bg-slate-955/20 transition">
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{col}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-350">
                                                {colStats.mean !== null && colStats.mean !== undefined ? colStats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-350">
                                                {colStats.median !== null && colStats.median !== undefined ? colStats.median.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-350">
                                                {colStats.min !== null && colStats.min !== undefined ? colStats.min.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-350">
                                                {colStats.max !== null && colStats.max !== undefined ? colStats.max.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-350">
                                                {colStats.std !== null && colStats.std !== undefined ? colStats.std.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                            <td className={`px-6 py-4 font-bold ${outliersCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                                                {outliersCount}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-350">{filledCount.toLocaleString()} / {dataset.total_rows.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-550 dark:text-slate-405 italic text-sm">
                        No numerical column summaries available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataProfiling;
