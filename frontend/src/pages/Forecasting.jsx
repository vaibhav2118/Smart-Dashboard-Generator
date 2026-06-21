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
    Loader2,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Activity,
    ShieldAlert
} from 'lucide-react';

const Forecasting = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { theme } = useContext(ThemeContext);
    const [dataset, setDataset] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState(null);
    const [viewState, setViewState] = useState('EMPTY'); // EMPTY, LOADING, SUCCESS, OUTDATED
    
    // Configuration selectors
    const [selectedDateCol, setSelectedDateCol] = useState('');
    const [selectedTargetCol, setSelectedTargetCol] = useState('');
    const [selectedModel, setSelectedModel] = useState('arima');
    const [selectedHorizon, setSelectedHorizon] = useState(30);

    const loadForecastCache = async () => {
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
                // Map demo forecast data
                setForecast({
                    model_used: resolved.forecast.model,
                    date_column: 'Date',
                    target_column: resolved.classification.numerical[0] || 'Revenue',
                    forecast_horizon: parseInt(resolved.forecast.horizon) || 30,
                    actual_points: resolved.forecast.actual,
                    forecast_points: resolved.forecast.forecast,
                    growth_rate: parseFloat(resolved.insights.growth_rate) || 18.4,
                    trend_direction: 'upward',
                    reliability_score: resolved.health_score
                });
                setViewState('SUCCESS');
                setLoading(false);
                return;
            }

            // Real dataset path
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // Query dataset list to resolve column classifications
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

            // Pre-fill columns list selections
            const dateCols = resolved.classification?.date || [];
            const numCols = resolved.classification?.numerical || [];
            if (dateCols.length > 0) setSelectedDateCol(dateCols[0]);
            else if (resolved.columns?.length > 0) setSelectedDateCol(resolved.columns[0]);
            
            if (numCols.length > 0) setSelectedTargetCol(numCols[0]);
            else if (resolved.columns?.length > 0) setSelectedTargetCol(resolved.columns[resolved.columns.length - 1]);

            // Query cached forecasts
            try {
                const response = await axios.get(`http://localhost:8000/api/forecast/${id}`, { headers });
                setForecast(response.data);
                setViewState('SUCCESS');
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    // Outdated
                    setForecast(e.response.data);
                    setViewState('OUTDATED');
                } else if (e.response && e.response.status === 404) {
                    setViewState('EMPTY');
                } else {
                    setError("Failed to communicate with forecasting engine.");
                }
            }
        } catch (err) {
            console.error("Error loading forecasting dataset", err);
            setError("Failed to load forecast model parameters.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadForecastCache();
    }, [id]);

    const handleCalculate = async () => {
        if (!selectedDateCol || !selectedTargetCol) {
            alert("Please select both Date and Target columns.");
            return;
        }
        
        setCalculating(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const response = await axios.post(`http://localhost:8000/api/forecast/${id}`, {
                date_column: selectedDateCol,
                target_column: selectedTargetCol,
                model: selectedModel,
                horizon: parseInt(selectedHorizon)
            }, { headers });
            
            setForecast(response.data);
            setViewState('SUCCESS');
        } catch (e) {
            console.error("Failed executing forecast", e);
            const msg = e.response && e.response.data && e.response.data.detail 
                ? e.response.data.detail 
                : "Forecasting calculations failed. Verify target data contains numerical sequences.";
            setError(msg);
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="text-indigo-650 animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading dataset forecast parameters...</p>
            </div>
        );
    }

    // Build Plotly data traces if forecast success state loaded
    let traces = [];
    let layout = {};
    let localSummary = "";
    
    if (forecast) {
        const isDark = theme === 'dark';
        const plotlyBgColor = isDark ? '#0f172a' : '#ffffff';
        const plotlyPlotColor = isDark ? '#020617' : '#f8fafc';
        const plotlyFontColor = isDark ? '#cbd5e1' : '#1e293b';
        const plotlyGridColor = isDark ? '#334155' : '#e2e8f0';

        const actualX = forecast.actual_points.map(d => d.Date);
        const actualY = forecast.actual_points.map(d => d.Value);

        const forecastX = forecast.forecast_points.map(d => d.Date);
        const forecastY = forecast.forecast_points.map(d => d.Value);
        const upperY = forecast.forecast_points.map(d => d.Upper || d.Value);
        const lowerY = forecast.forecast_points.map(d => d.Lower || d.Value);

        const lastActualX = actualX[actualX.length - 1];
        const lastActualY = actualY[actualY.length - 1];

        const joinedForecastX = [lastActualX, ...forecastX];
        const joinedForecastY = [lastActualY, ...forecastY];
        const joinedUpperY = [lastActualY, ...upperY];
        const joinedLowerY = [lastActualY, ...lowerY];

        traces = [
            {
                x: joinedForecastX,
                y: joinedUpperY,
                type: 'scatter',
                mode: 'lines',
                line: { color: 'transparent' },
                showlegend: false,
                hoverinfo: 'none'
            },
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
            {
                x: actualX,
                y: actualY,
                type: 'scatter',
                mode: 'lines+markers',
                name: 'Historical Actuals',
                marker: { color: '#6366f1', size: 6 },
                line: { color: '#6366f1', width: 3 }
            },
            {
                x: joinedForecastX,
                y: joinedForecastY,
                type: 'scatter',
                mode: 'lines+markers',
                name: `${forecast.model_used.toUpperCase()} Projection`,
                marker: { color: '#a855f7', size: 6 },
                line: { color: '#a855f7', width: 3, dash: 'dash' }
            }
        ];

        layout = {
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

        // Phase 7: Local Business Interpretation Rule Engine
        const growthDirText = forecast.growth_rate > 0 ? "an expansion" : "a contraction";
        const modelLabel = forecast.model_used === 'linear_regression' ? 'Linear Regression' : forecast.model_used.toUpperCase();
        
        if (forecast.trend_direction === 'upward') {
            localSummary = `Using ${modelLabel} calculations, ${forecast.target_column} is expected to increase steadily over the next ${forecast.forecast_horizon} days. Projections indicate ${growthDirText} of +${forecast.growth_rate.toFixed(1)}% compared to the latest historical record. The reliability index is scored at ${forecast.reliability_score}%, supporting an expansionary budget policy.`;
        } else if (forecast.trend_direction === 'downward') {
            localSummary = `The forecasting engine identifies a declining trend direction. ${forecast.target_column} is projected to contract by ${forecast.growth_rate.toFixed(1)}% over the next ${forecast.forecast_horizon} days. Management should review operational costs or raw inputs to defend margins against this contraction.`;
        } else {
            localSummary = `Projections indicate a stable, flat trend direction for ${forecast.target_column} (growth margin of ${forecast.growth_rate.toFixed(1)}%) over the next ${forecast.forecast_horizon} days. Regular seasonal variances are present, but no structural trajectory shifts are detected.`;
        }
    }

    return (
        <div className="space-y-8 select-none">
            {/* Header banner */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md border border-indigo-150 dark:border-indigo-900/40">
                            <Compass size={12} className="animate-spin duration-3000" /> Machine Learning Modeler
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight truncate mt-2">Predictive Forecasting</h1>
                </div>
                <button
                    onClick={() => navigate('/reports')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md hover:-translate-y-0.5 transition w-fit shrink-0"
                >
                    Generate Report <ArrowRight size={16} />
                </button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Outdated Cache Banner */}
            {viewState === 'OUTDATED' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-800 dark:text-amber-400">
                    <div className="flex items-start gap-3">
                        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold">Forecast Outdated</p>
                            <p className="text-xs text-amber-700 dark:text-amber-450 mt-0.5">Dataset changed since forecasts were compiled. Displaying outdated cache values.</p>
                        </div>
                    </div>
                    <button
                        onClick={handleCalculate}
                        disabled={calculating}
                        className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow transition shrink-0"
                    >
                        <RefreshCw size={14} className={calculating ? "animate-spin" : ""} /> Regenerate Forecast
                    </button>
                </div>
            )}

            {/* Configuration Studio panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-extrabold mb-4 flex items-center gap-2 text-slate-850 dark:text-slate-100">
                    <Activity size={18} className="text-indigo-650" /> Forecast Configuration Panel
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Date Column */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Date Column</label>
                        <select 
                            value={selectedDateCol}
                            onChange={(e) => setSelectedDateCol(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
                        >
                            <option value="">Select Date Column</option>
                            {dataset?.columns?.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>

                    {/* Target Column */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Target Value Column</label>
                        <select 
                            value={selectedTargetCol}
                            onChange={(e) => setSelectedTargetCol(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
                        >
                            <option value="">Select Target Column</option>
                            {dataset?.columns?.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>

                    {/* Model */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Forecast Model</label>
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300 font-semibold"
                        >
                            <option value="arima">ARIMA (Statsmodels Auto-Regressive)</option>
                            <option value="prophet">Prophet (Additive Seasonality)</option>
                            <option value="linear_regression">Linear Regression Trend</option>
                        </select>
                    </div>

                    {/* Horizon */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">Horizon: {selectedHorizon} Steps</label>
                        <input 
                            type="range"
                            min="5"
                            max="90"
                            value={selectedHorizon}
                            onChange={(e) => setSelectedHorizon(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-105 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-3"
                        />
                    </div>
                </div>

                {!dataset?.id?.startsWith('demo-') && (
                    <button
                        onClick={handleCalculate}
                        disabled={calculating}
                        className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition hover:-translate-y-0.5 mt-6 w-full sm:w-fit flex items-center justify-center gap-1.5 mx-auto sm:mx-0"
                    >
                        {calculating ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Training Forecast Models...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={14} /> Run Forecast Calculations
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Calculations logic view state */}
            {calculating ? (
                <div className="min-h-[30vh] flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <Loader2 size={40} className="text-indigo-600 animate-spin" />
                    <div className="text-center space-y-1">
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100">Running Seasonality fits...</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Training Prophet/ARIMA regression algorithms, grouping date intervals, and computing standard margin boundaries.
                        </p>
                    </div>
                </div>
            ) : viewState === 'EMPTY' ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center space-y-6">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                        <LineChart size={32} />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">No Projections Compiled</h2>
                        <p className="text-xs text-slate-505 leading-relaxed">
                            Configure Date, Target, and Model type parameters above to compute and visualize forecast trajectories.
                        </p>
                    </div>
                </div>
            ) : (
                /* Success View State */
                <div className="space-y-8">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model Used</span>
                            <p className="text-lg font-bold text-slate-850 dark:text-slate-100 mt-2">
                                {forecast.model_used === 'linear_regression' ? 'Linear Regression' : forecast.model_used.toUpperCase()}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Forecast Reliability</span>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1.5">
                                <CheckCircle2 size={18} className="text-emerald-500" /> {forecast.reliability_score}%
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Growth Pct</span>
                            <p className={`text-lg font-bold mt-2 ${forecast.growth_rate >= 0 ? "text-emerald-600 dark:text-emerald-450" : "text-rose-650 dark:text-rose-400"}`}>
                                {forecast.growth_rate >= 0 ? "+" : ""}{forecast.growth_rate.toFixed(1)}%
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trend Direction</span>
                            <p className="text-lg font-bold text-slate-850 dark:text-slate-100 mt-2 flex items-center gap-1.5">
                                {forecast.trend_direction === 'upward' ? (
                                    <>
                                        <TrendingUp size={18} className="text-emerald-500" /> Upward
                                    </>
                                ) : forecast.trend_direction === 'downward' ? (
                                    <>
                                        <TrendingDown size={18} className="text-rose-500" /> Downward
                                    </>
                                ) : (
                                    <>
                                        <Activity size={18} className="text-amber-500" /> Flat
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Chart Plotly */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <Plot
                            data={traces}
                            layout={layout}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                        />
                    </div>

                    {/* Business summary paragraph details */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-205 flex items-center gap-1.5">
                            <Sparkles size={16} className="text-indigo-550" /> Business Projections Summary
                        </h3>
                        <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed max-w-4xl">
                            {localSummary}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Forecasting;
