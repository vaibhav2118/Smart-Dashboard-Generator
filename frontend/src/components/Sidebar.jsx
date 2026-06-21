import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useDataset } from '../context/DatasetContext';
import { 
    LayoutDashboard, 
    Database,
    BarChart3, 
    Brain,
    LineChart, 
    FileText, 
    Settings, 
    LogOut, 
    ChevronLeft, 
    ChevronRight,
    X,
    Sparkles,
    Layers
} from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleCollapse, mobileOpen, setMobileOpen }) => {
    const { logout } = useContext(AuthContext);
    const { activeDataset } = useDataset();
    const location = useLocation();

    // Resolved dataset ID — prefers live context, falls back to localStorage, then demo
    const activeDatasetId = activeDataset?.id
        || localStorage.getItem('activeDatasetId')
        || 'demo-sales';

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/datasets', label: 'Datasets', icon: Database },
        { path: `/analysis/${activeDatasetId}`, label: 'Analysis', icon: BarChart3 },
        { path: `/insights/${activeDatasetId}`, label: 'AI Insights', icon: Brain },
        { path: `/forecast/${activeDatasetId}`, label: 'Forecasting', icon: LineChart },
        { path: `/chat/${activeDatasetId}`, label: 'AI Copilot', icon: Sparkles },
        { path: '/reports', label: 'Reports', icon: FileText },
        { path: '/settings', label: 'Settings', icon: Settings },
    ];

    const isActive = (path) => {
        if (path.split('/').length > 2) {
            const rootPath = path.split('/')[1];
            return location.pathname.startsWith(`/${rootPath}`);
        }
        return location.pathname === path;
    };

    const sidebarContent = (
        <div className="flex flex-col h-full bg-slate-900 dark:bg-slate-950 text-white select-none">
            {/* Header / Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center font-bold text-base shrink-0 shadow-md shadow-indigo-600/35">
                        S
                    </div>
                    {(!isCollapsed || mobileOpen) && (
                        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            SmartDG
                        </span>
                    )}
                </div>
                {/* Desktop Collapse Arrow */}
                <button 
                    onClick={toggleCollapse}
                    className="hidden md:flex p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                {/* Mobile Close Button */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Active Dataset Indicator */}
            {(!isCollapsed || mobileOpen) && (
                <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2 min-w-0">
                    <Layers size={13} className="text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-none mb-0.5">Active Dataset</p>
                        <p className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
                            {activeDataset?.filename
                                || (activeDatasetId.startsWith('demo-')
                                    ? activeDatasetId.replace('demo-', 'Demo: ').replace('sales','Sales').replace('finance','Finance').replace('hr','HR')
                                    : 'None selected')}
                        </p>
                    </div>
                </div>
            )}
            {isCollapsed && !mobileOpen && (
                <div className="flex justify-center mt-3 mb-1">
                    <Layers size={14} className="text-indigo-400" title={activeDataset?.filename || 'No dataset'} />
                </div>
            )}

            {/* Navigation links */}
            <div className="flex-1 py-2 flex flex-col gap-1 px-3">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 ${
                                active 
                                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                        >
                            <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
                            {(!isCollapsed || mobileOpen) && (
                                <span className="text-sm truncate">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Footer / Logout */}
            <div className="p-3 border-t border-slate-800">
                <button 
                    onClick={logout} 
                    className={`flex items-center gap-3 px-3 py-3 text-slate-400 hover:text-white hover:bg-slate-800/40 transition rounded-lg w-full ${
                        isCollapsed && !mobileOpen ? 'justify-center' : ''
                    }`}
                >
                    <LogOut size={20} />
                    {(!isCollapsed || mobileOpen) && <span className="text-sm">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Drawer Overlay */}
            {mobileOpen && (
                <div 
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                />
            )}

            {/* Sidebar Shell */}
            <aside 
                className={`fixed md:sticky top-0 left-0 z-50 h-screen transition-all duration-300 shrink-0 ${
                    mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
                } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
            >
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;
