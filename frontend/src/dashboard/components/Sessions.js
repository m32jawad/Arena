import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronDown, MoreVertical, Clock, Pencil, Minus, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

/* Pre-built avatars (must match signup page) */
const AVATARS = {
  "avatar-1": { bg: "#6C3483", skin: "#F39C12", hair: "#2C3E50" },
  "avatar-2": { bg: "#1ABC9C", skin: "#E74C3C", hair: "#F1C40F" },
  "avatar-3": { bg: "#2980B9", skin: "#E67E22", hair: "#8E44AD" },
  "avatar-4": { bg: "#E74C3C", skin: "#3498DB", hair: "#2ECC71" },
  "avatar-5": { bg: "#8E44AD", skin: "#1ABC9C", hair: "#F39C12" },
  "avatar-6": { bg: "#F39C12", skin: "#9B59B6", hair: "#E74C3C" },
  "avatar-7": { bg: "#2ECC71", skin: "#E74C3C", hair: "#3498DB" },
  "avatar-8": { bg: "#3498DB", skin: "#F1C40F", hair: "#E74C3C" },
};

const AvatarCircle = ({ item, size = 40 }) => {
  if (item.profile_photo) {
    return <img src={item.profile_photo} alt={item.party_name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const av = AVATARS[item.avatar_id];
  if (av) {
    return (
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <rect width="80" height="80" rx="40" fill={av.bg} />
        <ellipse cx="40" cy="34" rx="13" ry="14" fill={av.skin} />
        <ellipse cx="40" cy="70" rx="22" ry="20" fill={av.skin} />
        <ellipse cx="40" cy="24" rx="14" ry="10" fill={av.hair} />
        <circle cx="34" cy="34" r="2" fill="#fff" />
        <circle cx="46" cy="34" r="2" fill="#fff" />
        <circle cx="34" cy="34" r="1" fill="#222" />
        <circle cx="46" cy="34" r="1" fill="#222" />
      </svg>
    );
  }
  return (
    <div className="rounded-full bg-purple-600 flex items-center justify-center text-white font-bold" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {item.party_name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

const Sessions = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';
  const [activeTab, setActiveTab] = useState('live');
  const [timeFilter, setTimeFilter] = useState('last7days');
  const [query, setQuery] = useState('');

  const [liveSessions, setLiveSessions] = useState([]);
  const [endedSessions, setEndedSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Controllers (for edit modal circles) */
  const [controllers, setControllers] = useState([]);

  /* General settings (for session presets step) */
  const [sessionPresetStep, setSessionPresetStep] = useState(10);
  const [allowExtension, setAllowExtension] = useState(true);
  const [allowReduction, setAllowReduction] = useState(false);

  /* Edit modal state */
  const [editItem, setEditItem] = useState(null);
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [liveRemaining, setLiveRemaining] = useState(0);
  const editTimerRef = useRef(null);

  /* Fetch controllers */
  const fetchControllers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/controllers/`, { credentials: 'include' });
      if (res.ok) setControllers(await res.json());
    } catch { /* ignore */ }
  }, []);

  /* Fetch general settings */
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/general-settings/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.session_presets) setSessionPresetStep(Number(data.session_presets) || 10);
        setAllowExtension(data.allow_extension ?? true);
        setAllowReduction(data.allow_reduction ?? false);
      }
    } catch { /* ignore */ }
  }, []);

  /* Fetch live sessions */
  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions/live/`, { credentials: 'include' });
      if (res.ok) setLiveSessions(await res.json());
    } catch { /* ignore */ }
  }, []);

  /* Fetch ended sessions */
  const fetchEnded = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions/ended/`, { credentials: 'include' });
      if (res.ok) setEndedSessions(await res.json());
    } catch { /* ignore */ }
  }, []);

  /* Poll every 5 seconds */
  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchLive(), fetchEnded(), fetchControllers(), fetchSettings()]);
      setLoading(false);
    };
    load();
    const interval = setInterval(() => {
      fetchLive();
      fetchEnded();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLive, fetchEnded, fetchControllers, fetchSettings]);

  /* End game */
  const handleEndGame = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}/end/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      });
      if (res.ok) {
        setLiveSessions((prev) => prev.filter((s) => s.id !== id));
        fetchEnded();
        setEditItem(null);
      }
    } catch { /* ignore */ }
  };

  /* Open edit modal */
  const openEditModal = (session) => {
    setEditItem(session);
    setExtraMinutes(0);
    setLiveRemaining(session.remaining_minutes || 0);
  };

  /* Real-time countdown while modal is open */
  useEffect(() => {
    if (!editItem) {
      if (editTimerRef.current) clearInterval(editTimerRef.current);
      return;
    }
    // Recalculate remaining from approved_at + session_minutes
    const tick = () => {
      if (!editItem.approved_at) return;
      const end = new Date(editItem.approved_at).getTime() + editItem.session_minutes * 60000;
      const now = Date.now();
      setLiveRemaining(Math.max(0, Math.floor((end - now) / 60000)));
    };
    tick();
    editTimerRef.current = setInterval(tick, 1000);
    return () => { if (editTimerRef.current) clearInterval(editTimerRef.current); };
  }, [editItem]);

  /* Update session — send extra minutes to add or subtract */
  const handleUpdateSession = async () => {
    if (!editItem) return;
    if (extraMinutes === 0) { setEditItem(null); return; }
    if (extraMinutes > 0 && !allowExtension) { setEditItem(null); return; }
    if (extraMinutes < 0 && !allowReduction) { setEditItem(null); return; }
    try {
      const res = await fetch(`${API_BASE}/sessions/${editItem.id}/update/`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ extra_minutes: extraMinutes }),
      });
      if (res.ok) {
        fetchLive();
        setEditItem(null);
      }
    } catch { /* ignore */ }
  };

  /* Toggle checkpoint — add or remove */
  const handleToggleCheckpoint = async (controllerId) => {
    if (!editItem) return;
    
    const isCleared = editItem.checkpoints?.some(cp => cp.controller_id === controllerId);
    
    try {
      if (isCleared) {
        // Remove checkpoint
        const checkpoint = editItem.checkpoints.find(cp => cp.controller_id === controllerId);
        if (!checkpoint) return;
        
        const res = await fetch(`${API_BASE}/sessions/${editItem.id}/checkpoints/${checkpoint.id}/remove/`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-CSRFToken': getCookie('csrftoken') },
        });
        
        if (res.ok) {
          // Update local state
          setEditItem(prev => ({
            ...prev,
            checkpoints: prev.checkpoints.filter(cp => cp.id !== checkpoint.id),
            checkpoints_cleared: (prev.checkpoints_cleared || 0) - 1,
          }));
          // Refresh sessions
          fetchLive();
          fetchEnded();
        }
      } else {
        // Add checkpoint
        const res = await fetch(`${API_BASE}/sessions/${editItem.id}/checkpoints/add/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({ controller_id: controllerId }),
        });
        
        if (res.ok) {
          const data = await res.json();
          // Update local state
          setEditItem(prev => ({
            ...prev,
            checkpoints: [...(prev.checkpoints || []), data.checkpoint],
            checkpoints_cleared: (prev.checkpoints_cleared || 0) + 1,
          }));
          // Refresh sessions
          fetchLive();
          fetchEnded();
        }
      }
    } catch (err) {
      console.error('Error toggling checkpoint:', err);
    }
  };

  /* Format approved_at as readable time */
  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  /* Calculate up‐time in minutes from approved_at to now */
  const getUpTime = (isoStr) => {
    if (!isoStr) return 0;
    const diff = Date.now() - new Date(isoStr).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  const currentSessions = activeTab === 'live' ? liveSessions : endedSessions;

  const filteredSessions = currentSessions.filter((s) =>
    `${s.party_name} ${s.storyline_title} ${s.rfid_tag} ${s.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6" style={{ fontFamily: textFont }}>
      {/* Header with title, tabs, and search */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Sessions</h1>
        
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors`}
            style={activeTab === 'live' ? { backgroundColor: primaryColor, color: '#fff' } : { color: theme.sidebar_text }}
          >
            Live Sessions
          </button>
          <button
            onClick={() => setActiveTab('ended')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors`}
            style={activeTab === 'ended' ? { backgroundColor: primaryColor, color: '#fff' } : { color: theme.sidebar_text }}
          >
            Ended Sessions
          </button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex items-center justify-between">
          <span></span>
          <div className="relative max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: theme.sidebar_text }} />
              <input
                type="text"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none"
                style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}
              />
            </div>
          </div>

          {/* Date Filter Dropdown - Only shown for Ended Sessions */}
          {activeTab === 'ended' && (
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 border rounded-lg focus:outline-none text-sm"
                style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}
              >
                <option value="last7days">Last 7 days</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last30days">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={18} style={{ color: theme.sidebar_text }} />
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b text-xs font-medium" style={{ backgroundColor: theme.sidebar_active_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
          <div className="col-span-5">Team Name</div>
          <div className="col-span-3">RFID Number</div>
          <div className="col-span-2">{activeTab === 'live' ? 'Remaining Time' : 'Ended Time'}</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table rows */}
        <div>
          {loading ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>Loading…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>
              {activeTab === 'live' ? 'No live sessions' : 'No ended sessions'}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div key={session.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="relative">
                    <AvatarCircle item={session} size={40} />
                    {activeTab === 'live' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{session.party_name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>
                      {session.storyline_title ? `@${session.storyline_title}` : ''}{session.team_size ? ` · Team of ${session.team_size}` : ''}
                      {' · '}{session.checkpoints_cleared || 0}/{controllers.length} checkpoints
                      {' · '}{session.points || 0} pts
                    </div>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{session.rfid_tag || '—'}</div>
                </div>
                
                <div className="col-span-2 flex items-center">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className={`text-sm font-medium ${activeTab === 'live' ? 'text-orange-500' : 'text-gray-500'}`}>
                      {activeTab === 'live'
                        ? `${session.remaining_minutes} min${session.remaining_minutes !== 1 ? 's' : ''}`
                        : session.ended_ago || '—'}
                    </span>
                  </div>
                </div>
                
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {activeTab === 'live' ? (
                    <>
                      <button
                        onClick={() => openEditModal(session)}
                        className="p-2 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                        title="Edit Session"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleEndGame(session.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                        title="End Session"
                      >
                        End Game
                      </button>
                    </>
                  ) : (
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="View Details"
                    >
                      <MoreVertical size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sessions pagination */}
        <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: theme.sidebar_active_bg }}>
          <div>
            <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>‹ Previous</button>
          </div>

          <div className="flex items-center gap-2 text-sm" style={{ color: theme.sidebar_text }}>
            <button className="px-2 py-1 rounded border text-white" style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>1</button>
            <button className="px-2 py-1 rounded">2</button>
            <button className="px-2 py-1 rounded">3</button>
            <button className="px-2 py-1 rounded">10</button>
          </div>

          <div>
            <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>Next ›</button>
          </div>
        </div>
      </div>

      {/* ─── Edit Session Modal ─── */}
      {editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditItem(null)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-[540px] mx-4 overflow-hidden"
            style={{ backgroundColor: theme.sidebar_bg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between" style={{ borderColor: theme.sidebar_active_bg }}>
              <h2 className="text-lg font-semibold m-0" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
                Edit Session
              </h2>
              <button
                onClick={() => handleEndGame(editItem.id)}
                className="px-4 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg cursor-pointer transition hover:bg-red-50"
              >
                End Game
              </button>
            </div>

            {/* Body — photo left, info right */}
            <div className="px-6 py-6">
              <div className="flex items-start gap-5">
                {/* Profile photo — left side */}
                <div className="flex-shrink-0">
                  {editItem.profile_photo ? (
                    <img src={editItem.profile_photo} alt={editItem.party_name} className="w-24 h-24 rounded-full object-cover" />
                  ) : editItem.avatar_id && AVATARS[editItem.avatar_id] ? (
                    <svg viewBox="0 0 80 80" width={96} height={96}>
                      <rect width="80" height="80" rx="40" fill={AVATARS[editItem.avatar_id].bg} />
                      <ellipse cx="40" cy="34" rx="13" ry="14" fill={AVATARS[editItem.avatar_id].skin} />
                      <ellipse cx="40" cy="70" rx="22" ry="20" fill={AVATARS[editItem.avatar_id].skin} />
                      <ellipse cx="40" cy="24" rx="14" ry="10" fill={AVATARS[editItem.avatar_id].hair} />
                      <circle cx="34" cy="34" r="2" fill="#fff" />
                      <circle cx="46" cy="34" r="2" fill="#fff" />
                      <circle cx="34" cy="34" r="1" fill="#222" />
                      <circle cx="46" cy="34" r="1" fill="#222" />
                    </svg>
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: primaryColor }}>
                      {editItem.party_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* Info — right side */}
                <div className="flex-1 min-w-0 pt-1">
                  {/* RFID */}
                  <div className="text-xs font-medium mb-1" style={{ color: theme.sidebar_text }}>
                    RFID # {editItem.rfid_tag || '—'}
                  </div>

                  {/* Name + members */}
                  <div className="text-base font-semibold mb-0.5" style={{ color: theme.sidebar_active_text }}>
                    {editItem.party_name}{editItem.team_size > 1 ? ` (${editItem.team_size} members)` : ''}
                  </div>

                  {/* Points */}
                  <div className="text-sm mb-3" style={{ color: theme.sidebar_text }}>
                    {editItem.points || 0} points
                  </div>

                  {/* Time info */}
                  <div className="space-y-1 text-sm" style={{ color: theme.sidebar_text }}>
                    <div>
                      <span className="font-medium" style={{ color: theme.sidebar_active_text }}>Time Started:</span>{' '}
                      {formatTime(editItem.approved_at)}
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: theme.sidebar_active_text }}>Time Remaining:</span>{' '}
                      <span className="text-orange-500 font-medium">{liveRemaining} mins</span>
                    </div>
                    <div>
                      <span className="font-medium" style={{ color: theme.sidebar_active_text }}>Up Time:</span>{' '}
                      {getUpTime(editItem.approved_at)} mins
                    </div>
                  </div>
                </div>
              </div>

              {/* Controller circles */}
              <div className="mt-6">
                <div className="text-xs font-medium mb-2" style={{ color: theme.sidebar_text }}>
                  Controllers ({controllers.length}) - Click to toggle checkpoints
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {controllers.map((c) => {
                    const isCleared = editItem.checkpoints?.some(cp => cp.controller_id === c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleToggleCheckpoint(c.id)}
                        className="w-10 h-10 rounded-full border-2 cursor-pointer hover:opacity-80 transition-all"
                        style={{
                          backgroundColor: isCleared ? primaryColor : 'transparent',
                          borderColor: isCleared ? primaryColor : theme.sidebar_text,
                        }}
                        title={`${c.name} (${isCleared ? 'Cleared' : 'Not cleared'})`}
                      />
                    );
                  })}
                  {controllers.length === 0 && (
                    <span className="text-xs" style={{ color: theme.sidebar_text }}>No controllers</span>
                  )}
                </div>
              </div>

              {/* Extra time stepper */}
              <div className="mt-6">
                <div className="text-xs font-medium mb-2" style={{ color: theme.sidebar_text }}>
                  {allowReduction ? 'Adjust Time' : 'Add Extra Time'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExtraMinutes((m) => allowReduction ? m - sessionPresetStep : Math.max(0, m - sessionPresetStep))}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white border-none cursor-pointer transition hover:opacity-90"
                    style={{ backgroundColor: primaryColor, opacity: !allowReduction && extraMinutes === 0 ? 0.5 : 1 }}
                    disabled={!allowReduction && extraMinutes === 0}
                  >
                    <Minus size={18} />
                  </button>
                  <div
                    className="px-4 py-2.5 rounded-lg border text-sm font-medium min-w-[90px] text-center"
                    style={{ borderColor: theme.sidebar_active_bg, color: extraMinutes < 0 ? '#ef4444' : theme.sidebar_active_text }}
                  >
                    {extraMinutes > 0 ? '+' : ''}{extraMinutes} mins
                  </div>
                  <button
                    onClick={() => setExtraMinutes((m) => m + sessionPresetStep)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white border-none cursor-pointer transition hover:opacity-90"
                    style={{ backgroundColor: primaryColor, opacity: !allowExtension ? 0.5 : 1 }}
                    disabled={!allowExtension}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 pt-2 flex gap-4">
              <button
                onClick={handleUpdateSession}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold border-none cursor-pointer transition hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Update
              </button>
              <button
                onClick={() => setEditItem(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border cursor-pointer transition hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: theme.sidebar_active_bg,
                  color: theme.sidebar_active_text,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;