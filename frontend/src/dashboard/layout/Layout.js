import React, { useState } from 'react';
import {
  LayoutDashboard,
  Clock,
  Users,
  Trophy,
  Headphones,
  Search,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Dashboard from '../components/Dashboard';
import Pending from '../components/Pending';
import Sessions from '../components/Sessions';
import Stations from '../components/Stations';
import Leaderboard from '../components/Leaderboard';
import Settings from '../components/Settings';

// NavItem used by Sidebar
function NavItem({ icon, label, badge, active, status, onClick, theme }) {
  const activeBg = theme?.sidebar_active_bg || '#F3F4F6';
  const activeText = theme?.sidebar_active_text || '#1F2937';
  const normalText = theme?.sidebar_text || '#4B5563';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-200"
      style={{
        backgroundColor: active ? activeBg : 'transparent',
        color: active ? activeText : normalText,
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = activeBg + '22';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: normalText }}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: activeBg, color: normalText }}>
          {badge}
        </span>
      )}
      {status && <span className="w-2 h-2 bg-green-500 rounded-full" />}
    </div>
  );
}

function getMainBgStyle(theme) {
  if (!theme) return { backgroundColor: '#F9FAFB' };
  const { background_type, background_value, background_image } = theme;
  if (background_type === 'image' && background_image) {
    return {
      backgroundImage: `url(${background_image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  if (background_type === 'gradient' && background_value) {
    return { background: background_value };
  }
  return { backgroundColor: background_value || '#F9FAFB' };
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isSuperuser = user?.is_superuser;
  const [active, setActive] = useState(isSuperuser ? 'Dashboard' : 'Pending');

  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  return (
    <div className="flex min-h-screen" style={{ fontFamily: textFont }}>
      {/* Sidebar */}
      <aside
        className="w-64 h-screen flex flex-col justify-between sticky top-0 border-r"
        style={{
          backgroundColor: theme.sidebar_bg || '#FFFFFF',
          borderColor: theme.sidebar_active_bg || '#E5E7EB',
          color: theme.sidebar_text || '#4B5563',
        }}
      >
        <div>
          <div className="p-6 text-xl font-semibold" style={{ fontFamily: headingFont }}>🎮</div>

          <div className="px-4 mb-4">
            <div className="flex items-center gap-2 border rounded px-3 py-2" style={{ backgroundColor: theme.sidebar_active_bg + '44', borderColor: theme.sidebar_active_bg }}>
              <Search size={16} style={{ color: theme.sidebar_text }} />
              <input placeholder="Search" className="bg-transparent outline-none text-sm w-full" style={{ color: theme.sidebar_text }} />
            </div>
          </div>

          <nav className="space-y-1 px-4">
            {isSuperuser && (
              <NavItem theme={theme} icon={<LayoutDashboard size={20} />} label="Dashboard" active={active==='Dashboard'} onClick={() => setActive('Dashboard')} />
            )}
            <NavItem theme={theme} icon={<Clock size={20} />} label="Pending" badge="10" active={active==='Pending'} onClick={() => setActive('Pending')} />
            <NavItem theme={theme} icon={<Users size={20} />} label="Sessions" badge="8" active={active==='Sessions'} onClick={() => setActive('Sessions')} />
            <NavItem theme={theme} icon={<Clock size={20} />} label="Stations" active={active==='Stations'} onClick={() => setActive('Stations')} />
            {isSuperuser && (
              <NavItem theme={theme} icon={<Trophy size={20} />} label="Leaderboard" active={active==='Leaderboard'} onClick={() => setActive('Leaderboard')} />
            )}
          </nav>
        </div>

        <div className="p-4 space-y-3">
          {isSuperuser && (
            <NavItem theme={theme} icon={<SettingsIcon size={20} />} label="Settings" active={active==='Settings'} onClick={() => setActive('Settings')} />
          )}
          <NavItem theme={theme} icon={<Headphones size={20} />} label="Support" status />
          <NavItem
            theme={theme}
            icon={<LogOut size={20} />}
            label="Logout"
            onClick={logout}
          />
          <div className="flex items-center gap-3 mt-6 p-3">
            <img
              src="https://i.pravatar.cc/40"
              className="w-10 h-10 rounded-full"
              alt="User avatar"
            />
            <div>
              <p className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{user?.username}</p>
              <p className="text-xs" style={{ color: theme.sidebar_text }}>{user?.email || (isSuperuser ? 'Superuser' : 'Staff')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-auto" style={{ ...getMainBgStyle(theme) }}>
        {/* Header (breadcrumb + actions) */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/28" alt="avatar" className="w-7 h-7 rounded-full" />
            <div>
              <div className="text-sm" style={{ color: theme.sidebar_text }}>{user?.username} <span style={{ color: theme.sidebar_active_bg }}>/</span> <span className="font-medium">{active}</span></div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: headingFont, color: theme.sidebar_active_text }}>{active}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 border rounded text-sm" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}>Scan Band</button>
            <button className="px-3 py-2 border rounded text-white text-sm" style={{ backgroundColor: primaryColor }}>
              <span className="text-sm">Walk-in Guest</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <div>
          {active === 'Dashboard' && isSuperuser && <Dashboard />}
          {active === 'Pending' && <Pending />}
          {active === 'Sessions' && <Sessions />}
          {active === 'Stations' && <Stations readOnly={!isSuperuser} />}
          {active === 'Leaderboard' && isSuperuser && <Leaderboard />}
          {active === 'Settings' && isSuperuser && <Settings />}
          {active !== 'Dashboard' && active !== 'Pending' && active !== 'Sessions' && active !== 'Stations' && active !== 'Leaderboard' && active !== 'Settings' && (
            <div className="text-gray-500">{active} page content not implemented yet.</div>
          )}
        </div>
      </main>
    </div>
  );
}
