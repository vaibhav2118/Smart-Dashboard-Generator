import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';
import { 
    User, 
    Shield, 
    Bell, 
    Sun, 
    Moon, 
    Key, 
    Eye, 
    EyeOff, 
    Trash2, 
    CheckCircle2,
    Database
} from 'lucide-react';

const Settings = () => {
    const { user } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [activeTab, setActiveTab] = useState('Profile');
    const [successMsg, setSuccessMsg] = useState(null);

    // Form states
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [analysisAlerts, setAnalysisAlerts] = useState(true);

    // Storage metrics states
    const [storageMetrics, setStorageMetrics] = useState(null);
    const [loadingStorage, setLoadingStorage] = useState(false);

    const tabs = ['Profile', 'Theme', 'Notifications', 'Security', 'API Keys', 'Storage'];

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };
                const response = await axios.get('http://localhost:8000/api/settings/', { headers });
                const data = response.data;
                setApiKey(data.openai_key || '');
                setEmailNotifs(data.email_notifications);
                setAnalysisAlerts(data.analysis_alerts);
            } catch (error) {
                console.error("Error fetching settings from database:", error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'Storage') {
            const fetchStorage = async () => {
                setLoadingStorage(true);
                try {
                    const token = localStorage.getItem('token');
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const response = await axios.get('http://localhost:8000/api/settings/storage', { headers });
                    setStorageMetrics(response.data);
                } catch (error) {
                    console.error("Error loading storage metrics:", error);
                } finally {
                    setLoadingStorage(false);
                }
            };
            fetchStorage();
        }
    }, [activeTab]);

    const handleSave = async (section) => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const payload = {
                openai_key: apiKey,
                email_notifications: emailNotifs,
                analysis_alerts: analysisAlerts
            };
            await axios.put('http://localhost:8000/api/settings/', payload, { headers });
            setSuccessMsg(`${section} preferences saved successfully!`);
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings. Please make sure the backend server is running.");
        }
    };

    const handleDeleteAccount = () => {
        if (confirm("WARNING: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.")) {
            alert("Account deletion (simulated).");
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-8 max-w-4xl select-none animate-in fade-in duration-200 text-left">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Account Configuration</h1>
                <p className="text-slate-500 dark:text-slate-455 mt-1">
                    Manage your account details, visual preferences, and AI integrations.
                </p>
            </div>

            {/* Success toast */}
            {successMsg && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Tabs Row */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap -mb-px ${
                            activeTab === tab
                                ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400'
                                : 'border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-800'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Panels */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[300px]">
                
                {/* 1. PROFILE PANEL */}
                {activeTab === 'Profile' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <User size={18} className="text-indigo-500" /> Personal Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Full Name
                                </label>
                                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-200 font-semibold">
                                    {user?.name || 'User'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Email Address
                                </label>
                                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl text-slate-800 dark:text-slate-200 font-semibold">
                                    {user?.email || 'user@example.com'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. THEME PANEL */}
                {activeTab === 'Theme' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Sun size={18} className="text-indigo-500" /> Display Preference
                        </h2>
                        <div className="max-w-md space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                                Select your display theme preference. This selection will be saved locally inside your browser storage.
                            </p>
                            <button
                                onClick={toggleTheme}
                                className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-950 transition font-bold text-sm"
                            >
                                <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                                    {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                                    {theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
                                </span>
                                <span className="text-xs text-indigo-600 dark:text-indigo-400">Toggle Theme</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. NOTIFICATIONS PANEL */}
                {activeTab === 'Notifications' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Bell size={18} className="text-indigo-500" /> Notification Configurations
                        </h2>
                        
                        <div className="space-y-4 max-w-lg">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={emailNotifs}
                                    onChange={(e) => setEmailNotifs(e.target.checked)}
                                    className="mt-1 accent-indigo-600 rounded"
                                />
                                <div>
                                    <span className="block text-sm font-bold text-slate-850 dark:text-slate-200">Weekly Digest Reports</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                                        Receive summary metrics in your mailbox summarizing generated charts and forecasting anomalies weekly.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={analysisAlerts}
                                    onChange={(e) => setAnalysisAlerts(e.target.checked)}
                                    className="mt-1 accent-indigo-600 rounded"
                                />
                                <div>
                                    <span className="block text-sm font-bold text-slate-850 dark:text-slate-200">Data Profiling Complete alerts</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                                        Display alert indicators when heavy Excel datasets complete background statistical profiles.
                                    </span>
                                </div>
                            </label>

                            <button
                                onClick={() => handleSave('Notifications')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-sm w-fit"
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. SECURITY PANEL */}
                {activeTab === 'Security' && (
                    <div className="space-y-8">
                        <div className="space-y-6">
                            <h2 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <Shield size={18} className="text-indigo-500" /> Account Security
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm w-full focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm w-full focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    handleSave('Security');
                                }}
                                className="bg-indigo-600 hover:bg-indigo-755 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-sm"
                            >
                                Update Password
                            </button>
                        </div>

                        {/* Danger Zone */}
                        <div className="border-t border-red-200 dark:border-red-955 pt-6 space-y-4">
                            <h3 className="text-sm font-bold text-red-650 flex items-center gap-2"><Trash2 size={16} /> Danger Zone</h3>
                            <div className="p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="text-xs">
                                    <p className="font-bold text-red-750 dark:text-red-400">Permanently delete your account</p>
                                    <p className="text-slate-500 mt-1">Once completed, all dataset profiles and summaries are deleted forever.</p>
                                </div>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. API KEYS PANEL */}
                {activeTab === 'API Keys' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Key size={18} className="text-indigo-550" /> Integration Keys
                        </h2>
                        
                        <div className="max-w-lg space-y-4">
                            <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">
                                Enter your custom OpenAI API key to enable AI summaries, trends profiling, and automated report insights generation.
                            </p>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 mb-2">OpenAI Key</label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="pl-3.5 pr-10 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-sm w-full focus:outline-none"
                                        placeholder="sk-proj-..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-455 hover:text-slate-700 dark:hover:text-slate-300"
                                    >
                                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => handleSave('API Keys')}
                                className="bg-indigo-600 hover:bg-indigo-705 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-sm"
                            >
                                Save API Key
                            </button>
                        </div>
                    </div>
                )}

                {/* 6. STORAGE MONITORING PANEL */}
                {activeTab === 'Storage' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <Database size={18} className="text-indigo-500" /> Workspace Storage Metrics
                        </h2>
                        
                        {loadingStorage ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <div className="animate-spin border-2 border-indigo-600 border-t-transparent w-4 h-4 rounded-full" />
                                Loading real-time storage metrics...
                            </div>
                        ) : storageMetrics ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl">
                                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Datasets Count</span>
                                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{storageMetrics.dataset_count}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl">
                                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Reports Count</span>
                                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{storageMetrics.report_count}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl">
                                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Physical Disk Usage</span>
                                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{formatBytes(storageMetrics.disk_usage)}</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl">
                                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Forecast Caches size</span>
                                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{storageMetrics.forecast_cache_size}</span>
                                    <span className="text-[10px] text-slate-450 font-medium block mt-1">Serialized coordinate grids</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 p-5 border border-slate-150 dark:border-slate-850 rounded-2xl">
                                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">AI Insights Caches size</span>
                                    <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{storageMetrics.insight_cache_size}</span>
                                    <span className="text-[10px] text-slate-450 font-medium block mt-1">Cached executive JSON fields</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-red-500">Could not retrieve system storage metrics.</p>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default Settings;
