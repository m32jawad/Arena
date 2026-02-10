import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const API_BASE = 'http://localhost:8000/api/auth';

const defaultTheme = {
  background_type: 'solid',
  background_value: '#F9FAFB',
  background_image: '',
  sidebar_bg: '#FFFFFF',
  sidebar_text: '#4B5563',
  sidebar_active_bg: '#F3F4F6',
  sidebar_active_text: '#1F2937',
  primary_color: '#CB30E0',
  heading_font: '',
  text_font: '',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(defaultTheme);

  const fetchTheme = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard-theme/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTheme(data);
      }
    } catch {
      // silently fall back to defaults
    }
  }, []);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Inject Google Fonts dynamically
  useEffect(() => {
    const fonts = [theme.heading_font, theme.text_font].filter(Boolean);
    if (fonts.length === 0) return;

    const id = 'dynamic-google-fonts';
    let link = document.getElementById(id);
    const href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')}&display=swap`;

    if (link) {
      link.href = href;
    } else {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [theme.heading_font, theme.text_font]);

  // Build a CSS-variables style object that Layout can spread onto the root element
  const cssVars = {
    '--theme-bg-type': theme.background_type,
    '--theme-bg-value': theme.background_value,
    '--theme-bg-image': theme.background_image ? `url(${theme.background_image})` : 'none',
    '--theme-sidebar-bg': theme.sidebar_bg,
    '--theme-sidebar-text': theme.sidebar_text,
    '--theme-sidebar-active-bg': theme.sidebar_active_bg,
    '--theme-sidebar-active-text': theme.sidebar_active_text,
    '--theme-primary': theme.primary_color,
    '--theme-heading-font': theme.heading_font || 'inherit',
    '--theme-text-font': theme.text_font || 'inherit',
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fetchTheme, cssVars, defaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
