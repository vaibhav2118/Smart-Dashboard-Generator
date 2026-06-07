import React from 'react';
import { DollarSign, Hash, BarChart3, Package, Users, Activity, Layers, Tag, MapPin, Search } from 'lucide-react';

const KpiCard = ({ label, value }) => {
    // Dynamically pick icon and color based on label keywords
    const lowerLabel = label.toLowerCase();
    let Icon = Activity;
    let colorClass = "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40";
    
    if (lowerLabel.includes("revenue") || lowerLabel.includes("profit") || lowerLabel.includes("margin")) {
        Icon = DollarSign;
        colorClass = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40";
    } else if (lowerLabel.includes("order") || lowerLabel.includes("quantity")) {
        Icon = Hash;
        colorClass = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40";
    } else if (lowerLabel.includes("product") || lowerLabel.includes("item") || lowerLabel.includes("stock")) {
        Icon = Package;
        colorClass = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40";
    } else if (lowerLabel.includes("region") || lowerLabel.includes("country")) {
        Icon = MapPin;
        colorClass = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40";
    } else if (lowerLabel.includes("employee") || lowerLabel.includes("department")) {
        Icon = Users;
        colorClass = "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900/40";
    } else if (lowerLabel.includes("categor")) {
        Icon = Layers;
        colorClass = "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-100 dark:border-fuchsia-900/40";
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex items-start justify-between min-w-[200px] flex-1">
            <div className="min-w-0 pr-2">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate mb-1">
                    {label}
                </p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 truncate">
                    {value}
                </p>
            </div>
            <div className={`p-3 rounded-xl border shrink-0 ${colorClass}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default KpiCard;
