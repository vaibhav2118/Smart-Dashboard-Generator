import { useLocation, Link, useParams } from 'react-router-dom';
import { Activity, LayoutDashboard, Brain, LineChart, FileText, MessageSquare, ChevronRight, Check } from 'lucide-react';

const DatasetLifecycleRibbon = () => {
    const location = useLocation();
    const { datasetId, id } = useParams();
    
    // Resolve dataset ID either from datasetId or id
    const activeId = datasetId || id;
    
    if (!activeId) return null;

    const stages = [
        { key: 'analysis', title: 'Analysis', icon: Activity, path: `/analysis/${activeId}` },
        { key: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, path: `/dashboard/${activeId}` },
        { key: 'insights', title: 'Insights', icon: Brain, path: `/insights/${activeId}` },
        { key: 'forecasting', title: 'Forecasting', icon: LineChart, path: `/forecast/${activeId}` },
        { key: 'reports', title: 'Reports', icon: FileText, path: `/report-builder/${activeId}` },
        { key: 'copilot', title: 'Copilot', icon: MessageSquare, path: `/chat/${activeId}` }
    ];

    // Determine current index based on pathname
    const currentIndex = stages.findIndex(stage => location.pathname.startsWith(stage.path.split('/' + activeId)[0]));

    return (
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-6 shadow-sm overflow-x-auto hide-scrollbar">
            <div className="flex items-center min-w-max gap-2">
                {stages.map((stage, idx) => {
                    const isActive = idx === currentIndex;
                    const isPast = idx < currentIndex;
                    const Icon = stage.icon;

                    let colorClasses = "text-slate-400 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800";
                    if (isActive) {
                        colorClasses = "text-indigo-700 bg-indigo-50 border-indigo-300 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-800 font-bold shadow-sm";
                    } else if (isPast) {
                        colorClasses = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/40 font-medium";
                    }

                    return (
                        <div key={stage.key} className="flex items-center">
                            <Link 
                                to={stage.path}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition hover:-translate-y-0.5 ${colorClasses}`}
                            >
                                {isPast ? <Check size={14} className="text-emerald-500" /> : <Icon size={14} />}
                                <span className="text-xs">{stage.title}</span>
                            </Link>
                            {idx < stages.length - 1 && (
                                <ChevronRight size={14} className="text-slate-300 dark:text-slate-700 mx-2" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DatasetLifecycleRibbon;
