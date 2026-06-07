import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import axios from 'axios';
import { 
    Menu, 
    LogOut, 
    Settings as SettingsIcon, 
    Plus, 
    Bell, 
    ChevronDown, 
    Database, 
    FileText 
} from 'lucide-react';

const Navbar = ({ setMobileOpen }) => {
    const { user, logout } = useContext(AuthContext);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [datasetsCount, setDatasetsCount] = useState(0);
    const [reportsCount, setReportsCount] = useState(0);
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const navigate = useNavigate();

    // Fetch counts from backend or local storage
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const response = await axios.get('http://localhost:8000/api/datasets/', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    // Sum up real database items + the 3 demo datasets
                    setDatasetsCount(response.data.length + 3);
                } else {
                    setDatasetsCount(3);
                }
            } catch (err) {
                // Fallback to demo count
                setDatasetsCount(3);
            }

            // Get reports count from backend
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const response = await axios.get('http://localhost:8000/api/reports/', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setReportsCount(response.data.length > 0 ? response.data.length : 2);
                } else {
                    setReportsCount(2);
                }
            } catch (err) {
                setReportsCount(2);
            }
        };

        fetchStats();
        // Set up listener for localStorage updates (e.g. when uploading or generating reports)
        window.addEventListener('storage', fetchStats);
        return () => window.removeEventListener('storage', fetchStats);
    }, []);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get time-of-day greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <nav className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 select-none shrink-0 transition-colors duration-200">
            <div className="flex items-center gap-4 min-w-0">
                {/* Mobile hamburger menu */}
                <button
                    onClick={() => setMobileOpen(prev => !prev)}
                    className="md:hidden p-2 text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    aria-label="Toggle Navigation"
                >
                    <Menu size={20} />
                </button>
                
                {/* Greeting */}
                <div className="flex flex-col">
                    <h2 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {getGreeting()}, <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{user?.name || 'User'}</span> 👋
                    </h2>
                </div>

                {/* Micro stats indicators (desktop only) */}
                <div className="hidden lg:flex items-center gap-4 ml-6 border-l border-slate-200 dark:border-slate-800 pl-6 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                        <Database size={13} className="text-indigo-500" />
                        <span>Datasets: <strong className="text-slate-700 dark:text-slate-300 font-bold">{datasetsCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                        <FileText size={13} className="text-indigo-500" />
                        <span>Reports: <strong className="text-slate-700 dark:text-slate-300 font-bold">{reportsCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>Last Login: <strong className="text-slate-700 dark:text-slate-300 font-bold">Today</strong></span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Primary New Analysis Action */}
                <button
                    onClick={() => navigate('/upload')}
                    className="hidden sm:flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold px-3 py-1.8 rounded-lg shadow-sm hover:shadow transition"
                >
                    <Plus size={14} /> New Analysis
                </button>

                <ThemeToggle />

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setNotificationsOpen(prev => !prev)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition relative"
                        aria-label="View notifications"
                    >
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-605 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                    </button>

                    {notificationsOpen && (
                        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">Notifications</span>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">Mark all read</span>
                            </div>
                            <div className="max-h-60 overflow-y-auto text-xs p-1.5 space-y-1">
                                <div className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition text-slate-700 dark:text-slate-300">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">Sales Data Analyzed</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Demo sales performance dataset is ready.</p>
                                </div>
                                <div className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition text-slate-700 dark:text-slate-300">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">Welcome to SmartDG</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Start by uploading a dataset or trying a demo.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(prev => !prev)}
                        className="flex items-center gap-1 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition text-slate-700 dark:text-slate-350"
                    >
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-indigo-500/10">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <ChevronDown size={14} className={`transition duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Profile details */}
                            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
                            </div>

                            {/* Menu links */}
                            <div className="p-1.5 space-y-0.5">
                                <Link
                                    to="/settings"
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition"
                                >
                                    <SettingsIcon size={16} className="text-slate-400" />
                                    Settings
                                </Link>
                                <button
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition w-full text-left font-medium"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
