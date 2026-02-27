import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppThemeProvider } from './context/AppThemeContext';
import Layout from './dashboard/layout/Layout';
import Login from './dashboard/components/Login';
import SignUp from './signup/SignUp';
import LeaderboardPage from './leaderboard/LeaderboardPage';
import LeaderboardPage2 from './leaderboard/LeaderboardPage2';
import StationPage from './station/StationPage';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <Login />;
  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
<<<<<<< HEAD
          <Routes>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/leaderboard2" element={<LeaderboardPage2 />} />
            <Route path="/station" element={<StationPage />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
=======
          <AppThemeProvider>
            <Routes>
              <Route path="/signup" element={<SignUp />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/leaderboard2" element={<LeaderboardPage2 />} />
              <Route path="*" element={<AppContent />} />
            </Routes>
          </AppThemeProvider>
>>>>>>> 329b475a6efc6d975774ba7c24a271a0d761ea4f
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}