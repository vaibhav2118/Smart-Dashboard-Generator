import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, UploadCloud, FileText, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
    const { logout } = useContext(AuthContext);

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
            <div className="p-6 text-2xl font-bold border-b border-gray-800">
                SmartDG
            </div>
            <div className="flex-1 py-6 flex flex-col gap-2">
                <Link to="/" className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition">
                    <LayoutDashboard size={20} /> Dashboard
                </Link>
                <Link to="/upload" className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition">
                    <UploadCloud size={20} /> Upload Dataset
                </Link>
                <Link to="/reports" className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition">
                    <FileText size={20} /> Reports
                </Link>
                <Link to="/settings" className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition">
                    <Settings size={20} /> Settings
                </Link>
            </div>
            <div className="p-4 border-t border-gray-800">
                <button onClick={logout} className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition w-full">
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
