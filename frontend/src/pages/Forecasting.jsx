import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getDataset } from '../utils/demoData';
import { ThemeContext } from '../context/ThemeContext';
import Plot from '../components/Plot';
import { 
    LineChart, 
    ArrowRight, 
    Sparkles, 
    Compass, 
    CheckCircle2, 
    AlertCircle, 
    Loader2 
} from 'lucide-react';

const Forecasting = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme } = useContext(ThemeContext);
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadForecast = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                let dbList = [];
                try {
                    const response = await axios.get('http://localhost:8000/api/datasets/', {
                        headers: { 'Authorization': `Bearer ${token}` }
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
                console.error("Error loading forecasting dataset", err);
                setError("Failed to load forecast model parameters.");
            } finally {
                setLoading(false);
            }
        };

        loadForecast();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-405">Executing forecast calculations and scaling timelines...</p>
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

    const isDark = theme === 'dark';
    const plotlyBgColor = isDark ? '#0f172a' : '#ffffff';
    const plotlyPlotColor = isDark ? '#020617' : '#f8fafc';
    const plotlyFontColor = isDark ? '#cbd5e1' : '#1e293b';
    const plotlyGridColor = isDark ? '#334155' : '#e2e8f0';

    // 1. Build Actual and Forecast arrays
    const actualX = dataset.forecast.actual.map(d => d.Date);
    const actualY = dataset.forecast.actual.map(d => d.Value);

    const forecastX = dataset.forecast.forecast.map(d => d.Date);
    const forecastY = dataset.forecast.forecast.map(d => d.Value);
    const upperY = dataset.forecast.forecast.map(d => d.Upper);
    const lowerY = dataset.forecast.forecast.map(d => d.Lower);

    // Join last actual point to forecast for visual continuity
    const lastActualX = actualX[actualX.length - 1];
    const lastActualY = actualY[actualY.length - 1];

    const joinedForecastX = [lastActualX, ...forecastX];
    const joinedForecastY = [lastActualY, ...forecastY];
    const joinedUpperY = [lastActualY, ...upperY];
    const joinedLowerY = [lastActualY, ...lowerY];

    // Plotly traces mapping actual, forecast line, and confidence interval shaded range
    const traces = [
        // Upper bound boundary
        {
            x: joinedForecastX,
            y: joinedUpperY,
            type: 'scatter',
            mode: 'lines',
            line: { color: 'transparent' },
            showlegend: false,
            hoverinfo: 'none'
        },
        // Lower bound boundary filling up to the upper bound
        {
            x: joinedForecastX,
            y: joinedLowerY,
            type: 'scatter',
            mode: 'lines',
            fill: 'tonexty',
            fillcolor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.12)',
            line: { color: 'transparent' },
            name: '95% Confidence Interval'
        },
        // Actual historical curve
        {
            x: actualX,
            y: actualY,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Historical Actuals',
            marker: { color: '#6366f1', size: 6 },
            line: { color: '#6366f1', width: 3 }
        },
        // Forecast projection curve
        {
            x: joinedForecastX,
            y: joinedForecastY,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'ARIMA Projection',
            marker: { color: '#a855f7', size: 6 },
            line: { color: '#a855f7', width: 3, dash: 'dash' }
        }
    ];

    const layout = {
        title: {
            text: 'Timeline Projection Metrics',
            font: { color: plotlyFontColor, size: 16 }
        },
        xaxis: {
            font: { color: plotlyFontColor },
            gridcolor: plotlyGridColor
        },
        yaxis: {
            font: { color: plotlyFontColor },
            gridcolor: plotlyGridColor
        },
        paper_bgcolor: plotlyBgColor,
        plot_bgcolor: plotlyPlotColor,
        font: { color: plotlyFontColor },
        showlegend: true,
        height: 400,
        margin: { t: 50, b: 40, l: 50, r: 20 },
        legend: { orientation: 'h', x: 0, y: -0.25 }
    };

    return (
        <div className="space-y-8 select-none">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-605 dark:text-indigo-400 rounded-md border border-indigo-150 dark:border-indigo-900/40">
                            <Compass size={12} className="animate-spin duration-3000" /> Machine Learning Modeler
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate mt-2">Predictive Forecasting</h1>
                </div>
                <button
                    onClick={() => navigate('/reports')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-755 text-white font-semibold px-5 py-2.8 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition w-fit shrink-0"
                >
                    Generate Report <ArrowRight size={16} />
                </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Forecast Model Used</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">{dataset.forecast.model}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model Accuracy Score</span>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1.5">
                        <CheckCircle2 size={18} className="text-emerald-500" /> {dataset.forecast.accuracy}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prediction Horizon</span>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">{dataset.forecast.horizon}</p>
                </div>
            </div>

            {/* Plotly forecast graph */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <Plot
                    data={traces}
                    layout={layout}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                />
            </div>

            {/* Mathematical Model Context Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-indigo-550" /> Predictive Model Analysis Context
                </h3>
                <p className="text-xs text-slate-555 dark:text-slate-400 leading-relaxed max-w-4xl">
                    Timelines are fitted with multi-seasonality coefficients, detecting weekday/monthly fluctuations. The shaded area represents the 95% confidence bounds (lower and upper deviation). Standard errors are adjusted dynamically using model covariance matrix indices.
                </p>
            </div>
        </div>
    );
};

export default Forecasting;
