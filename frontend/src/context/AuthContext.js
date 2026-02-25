import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if user is already logged in via session
  useEffect(() => {
    fetch(`${API_BASE}/me/`, { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    // First get CSRF token
    const csrfRes = await fetch(`${API_BASE}/login/`, {
      method: 'HEAD',
      credentials: 'include',
    }).catch(() => null);

    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const res = await fetch(`${API_BASE}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data);
    return data;
  };

  const logout = async () => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    await fetch(`${API_BASE}/logout/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
    }).catch(() => {});
    setUser(null);
  };

  const apiFetch = async (url, options = {}) => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };

    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || '',
        ...(options.headers || {}),
      },
    };

    const res = await fetch(url, { ...defaultOptions, ...options });
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status}`);
    }
    return res.json();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
