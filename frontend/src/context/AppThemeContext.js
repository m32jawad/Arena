import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppThemeContext = createContext();

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

const defaultAppTheme = {
  background_type: 'solid',
  background_value: '#1a1a2e',
  background_image: '',
  background_video: '/bgvideo.mp4',
  font_family: '',
  font_color: '#FFFFFF',
  button_color: '#CB30E0',
  button_text_color: '#FFFFFF',
};

export function AppThemeProvider({ children }) {
  const [appTheme, setAppTheme] = useState(defaultAppTheme);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const fetchAppTheme = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/app-theme/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAppTheme(data);
      }
    } catch {
      // silently fall back to defaults
    }
  }, []);

  useEffect(() => {
    fetchAppTheme();
  }, [fetchAppTheme]);

  // Auto-refresh theme every 3 seconds to catch real-time changes
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      fetchAppTheme();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchAppTheme]);

  // Inject Google Fonts dynamically
  useEffect(() => {
    if (!appTheme.font_family) return;

    const id = 'dynamic-app-google-fonts';
    let link = document.getElementById(id);
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(appTheme.font_family)}:wght@400;500;600;700&display=swap`;

    if (link) {
      link.href = href;
    } else {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }, [appTheme.font_family]);

  // Build CSS variables for real-time application
  const cssVars = {
    '--app-theme-bg-type': appTheme.background_type,
    '--app-theme-bg-value': appTheme.background_value,
    '--app-theme-bg-image': appTheme.background_image ? `url(${appTheme.background_image})` : 'none',
    '--app-theme-bg-video': appTheme.background_video,
    '--app-theme-font-family': appTheme.font_family || 'inherit',
    '--app-theme-font-color': appTheme.font_color,
    '--app-theme-button-color': appTheme.button_color,
    '--app-theme-button-text-color': appTheme.button_text_color,
  };

  return (
    <AppThemeContext.Provider value={{
      appTheme,
      setAppTheme,
      fetchAppTheme,
      cssVars,
      defaultAppTheme,
      autoRefreshEnabled,
      setAutoRefreshEnabled,
    }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
