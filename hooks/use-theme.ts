/**
 * @fileoverview A hook for managing the application's theme.
 * @file_zh-CN: 用于管理应用主题的钩子。
 */

import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setTheme(isDarkMode ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return { theme, toggleTheme };
}
