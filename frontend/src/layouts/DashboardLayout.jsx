import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
            {/* Sidebar component */}
            <Sidebar 
                isCollapsed={sidebarCollapsed} 
                toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                mobileOpen={mobileSidebarOpen}
                setMobileOpen={setMobileSidebarOpen}
            />

            {/* Main view container */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Navbar component */}
                <Navbar setMobileOpen={setMobileSidebarOpen} />

                {/* Content pages main area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
