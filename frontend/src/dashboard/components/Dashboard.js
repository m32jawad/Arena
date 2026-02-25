import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

const Dashboard = () => {
  const { theme } = useTheme();
  const { apiFetch } = useAuth();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sessionQuery, setSessionQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, sessions, ctrlData] = await Promise.all([
        apiFetch(`${API_BASE}/pending/`),
        apiFetch(`${API_BASE}/sessions/live/`),
        apiFetch(`${API_BASE}/controllers/`)
      ]);
      setPendingApprovals(pending || []);
      setLiveSessions(sessions || []);
      setControllers(ctrlData || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (id) => {
    try {
      await apiFetch(`${API_BASE}/pending/${id}/reject/`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiFetch(`${API_BASE}/pending/${id}/approve/`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const filtered = pendingApprovals.filter((p) =>
    (`${p.party_name} ${p.email}`).toLowerCase().includes(query.toLowerCase())
  );

  const filteredSessions = liveSessions.filter((s) =>
    (`${s.party_name} ${s.email}`).toLowerCase().includes(sessionQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: textFont }}>
      {/* Top cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-stretch">
          <div className="rounded-xl shadow-sm border p-6 flex flex-col justify-between" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-xs" style={{ color: theme.sidebar_text }}>Currently Playing</div>
            <div className="text-3xl font-bold mt-3" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
              {loading ? '...' : liveSessions.length}
            </div>
          </div>

          {controllers.slice(0, 3).map((ctrl, idx) => (
            <div key={ctrl.id} className="rounded-xl shadow-sm border p-4 flex flex-col justify-center" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
              <div className="text-sm mb-3" style={{ color: theme.sidebar_active_text }}>{ctrl.name}</div>
              <div className="w-20 h-3 rounded" style={{ backgroundColor: idx === 0 ? '#ef4444' : idx === 1 ? '#facc15' : '#22c55e' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Pending Approvals */}
        <div className="rounded-lg shadow-sm border p-6 lg:col-span-7" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Pending Approvals</h2>
            <div className="relative w-full max-w-sm">
              <div className="flex items-center border rounded px-3 py-2 w-full" style={{ backgroundColor: theme.sidebar_active_bg + '44', borderColor: theme.sidebar_active_bg }}>
                <Search size={16} className="mr-2" style={{ color: theme.sidebar_text }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="bg-transparent outline-none text-sm w-full" style={{ color: theme.sidebar_active_text }} />
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs border rounded px-2 py-0.5" style={{ color: theme.sidebar_text, backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>⌘K</div>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center text-xs px-3 py-3 border-b" style={{ color: theme.sidebar_text, borderColor: theme.sidebar_active_bg }}>
              <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>
              <div className="flex-1 font-medium">Team / Gamer Name</div>
              <div className="w-56 hidden md:block">Email</div>
              <div className="w-28 text-right">Time Requested</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            <div>
              {loading ? (
                <div className="p-6 text-center" style={{ color: theme.sidebar_text }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center" style={{ color: theme.sidebar_text }}>No pending approvals</div>
              ) : (
                filtered.map((item) => {
                  const photoUrl = item.profile_photo || (item.avatar_id ? `https://i.pravatar.cc/40?img=${item.avatar_id}` : 'https://i.pravatar.cc/40');
                  return (
                    <div key={item.id} className="flex items-center px-3 py-4 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                      <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>

                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img src={photoUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: theme.sidebar_active_text }}>{item.party_name}</div>
                          <div className="text-xs truncate" style={{ color: theme.sidebar_text }}>Team size: {item.team_size}</div>
                        </div>
                      </div>

                      <div className="w-56 hidden md:block">
                        <div className="text-sm truncate" style={{ color: theme.sidebar_text }}>{item.email || '—'}</div>
                      </div>

                      <div className="w-28 text-xs text-right" style={{ color: theme.sidebar_text }}>{getTimeAgo(item.created_at)}</div>

                      <div className="w-24 text-right flex items-center justify-end gap-2">
                        <button title="Reject" onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                          <Trash2 size={14} />
                        </button>
                        <button title="Approve" onClick={() => handleApprove(item.id)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full">
                          <CheckCircle size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>‹ Previous</button>
            </div>

            <div className="flex items-center gap-2 text-sm" style={{ color: theme.sidebar_text }}>
              <button className="px-2 py-1 rounded border" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}>1</button>
              <button className="px-2 py-1 rounded">2</button>
              <button className="px-2 py-1 rounded">3</button>
              <button className="px-2 py-1 rounded">10</button>
            </div>

            <div>
              <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>Next ›</button>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="rounded-lg shadow-sm border p-6 lg:col-span-5" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Sessions</h2>
            <div className="relative w-full max-w-sm">
              <div className="flex items-center border rounded px-3 py-2 w-full" style={{ backgroundColor: theme.sidebar_active_bg + '44', borderColor: theme.sidebar_active_bg }}>
                <Search size={16} className="mr-2" style={{ color: theme.sidebar_text }} />
                <input value={sessionQuery} onChange={(e) => setSessionQuery(e.target.value)} placeholder="Search" className="bg-transparent outline-none text-sm w-full" style={{ color: theme.sidebar_active_text }} />
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs border rounded px-2 py-0.5" style={{ color: theme.sidebar_text, backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>⌘K</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-xs px-3 py-3 border-b" style={{ color: theme.sidebar_text, borderColor: theme.sidebar_active_bg }}>
              <div className="flex-1 font-medium">Team Name</div>
              <div className="w-28 text-right">Joining Time</div>
            </div>

            <div className="space-y-2 mt-3">
              {loading ? (
                <div className="p-6 text-center" style={{ color: theme.sidebar_text }}>Loading...</div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-6 text-center" style={{ color: theme.sidebar_text }}>No live sessions</div>
              ) : (
                filteredSessions.slice(0, 7).map((s) => {
                  const photoUrl = s.profile_photo || (s.avatar_id ? `https://i.pravatar.cc/40?img=${s.avatar_id}` : 'https://i.pravatar.cc/40');
                  return (
                    <div key={s.id} className="flex items-center px-3 py-3 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                      <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>
                      <img src={photoUrl} alt="avatar" className="w-10 h-10 rounded-full mr-3 object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{s.party_name}</div>
                        <div className="text-xs" style={{ color: theme.sidebar_text }}>{s.session_minutes} min session</div>
                      </div>
                      <div className="text-xs" style={{ color: theme.sidebar_text }}>{getTimeAgo(s.approved_at || s.created_at)}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sessions pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>‹ Previous</button>
              </div>

              <div>
                <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>Next ›</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
