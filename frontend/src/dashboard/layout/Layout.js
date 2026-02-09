import React, { useState } from 'react';
import {
  LayoutDashboard,
  Clock,
  Users,
  Trophy,
  Headphones,
  Search,
  Settings as SettingsIcon,
} from "lucide-react";

import Dashboard from '../components/Dashboard';
import Pending from '../components/Pending';
import Sessions from '../components/Sessions';
import Stations from '../components/Stations';
import Leaderboard from '../components/Leaderboard';
import Settings from '../components/Settings';

// NavItem used by Sidebar
function NavItem({ icon, label, badge, active, status, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-200 ${
        active 
          ? "bg-gray-100 font-medium text-gray-800" 
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {badge && (
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      {status && <span className="w-2 h-2 bg-green-500 rounded-full" />}
    </div>
  );
}

export default function Layout() {
  const [active, setActive] = useState('Dashboard');

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col justify-between sticky top-0">
        <div>
          <div className="p-6 text-xl font-semibold">🎮</div>

          <div className="px-4 mb-4">
            <div className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input placeholder="Search" className="bg-transparent outline-none text-sm w-full" />
            </div>
          </div>

          <nav className="space-y-1 px-4">
            <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={active==='Dashboard'} onClick={() => setActive('Dashboard')} />
            <NavItem icon={<Clock size={20} />} label="Pending" badge="10" active={active==='Pending'} onClick={() => setActive('Pending')} />
            <NavItem icon={<Users size={20} />} label="Sessions" badge="8" active={active==='Sessions'} onClick={() => setActive('Sessions')} />
            <NavItem icon={<Clock size={20} />} label="Stations" active={active==='Stations'} onClick={() => setActive('Stations')} />
            <NavItem icon={<Trophy size={20} />} label="Leaderboard" active={active==='Leaderboard'} onClick={() => setActive('Leaderboard')} />
          </nav>
        </div>

        <div className="p-4 space-y-3">
          <NavItem icon={<SettingsIcon size={20} />} label="Settings" active={active==='Settings'} onClick={() => setActive('Settings')} />
          <NavItem icon={<Headphones size={20} />} label="Support" status />
          <div className="flex items-center gap-3 mt-6 p-3">
            <img
              src="https://i.pravatar.cc/40"
              className="w-10 h-10 rounded-full"
              alt="User avatar"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Olivia Rhye</p>
              <p className="text-xs text-gray-500">olivia@untitledui.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Header (breadcrumb + actions) */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/28" alt="avatar" className="w-7 h-7 rounded-full" />
            <div>
              <div className="text-sm text-gray-500">Olivia Rhye <span className="text-gray-300">/</span> <span className="font-medium">{active}</span></div>
              <h1 className="text-2xl font-semibold text-gray-800">{active}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-2 border rounded bg-white text-sm">Scan Band</button>
            <button className="px-3 py-2 border rounded bg-[#CB30E0] text-white text-sm">
              <span className="text-sm">Walk-in Guest</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <div>
          {active === 'Dashboard' && <Dashboard />}
          {active === 'Pending' && <Pending />}
          {active === 'Sessions' && <Sessions />}
          {active === 'Stations' && <Stations />}
          {active === 'Leaderboard' && <Leaderboard />}
          {active === 'Settings' && <Settings />}
          {active !== 'Dashboard' && active !== 'Pending' && active !== 'Sessions' && active !== 'Stations' && active !== 'Leaderboard' && active !== 'Settings' && (
            <div className="text-gray-500">{active} page content not implemented yet.</div>
          )}
        </div>
      </main>
    </div>
  );
}
