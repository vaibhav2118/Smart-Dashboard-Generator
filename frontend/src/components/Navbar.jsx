import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="text-xl font-semibold text-gray-800">
                Welcome back, {user?.name || 'User'}
            </div>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
