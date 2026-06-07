import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label="Toggle Theme"
        >
            {theme === 'dark' ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} />}
        </button>
    );
};

export default ThemeToggle;
