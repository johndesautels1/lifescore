/**
 * Theme Toggle Component
 * Switches between light and dark mode
 */

import React, { useEffect, useState } from 'react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setIsDark(!isDark)}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀️' : '🌙'} {isDark ? 'Light' : 'Dark'}
    </button>
  );
};

export default ThemeToggle;
