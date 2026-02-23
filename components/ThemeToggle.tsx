'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Initialize from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('cv_theme') as 'dark' | 'light' | null;
        const initial = saved ?? 'dark';
        setTheme(initial);
        document.documentElement.setAttribute('data-theme', initial === 'light' ? 'light' : '');
    }, []);

    function toggle() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('cv_theme', next);
        document.documentElement.setAttribute('data-theme', next === 'light' ? 'light' : '');
    }

    return (
        <button
            className="theme-toggle-btn"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
