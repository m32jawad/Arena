import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Trash2, CheckCircle, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

/* Pre-built avatars must match signup page */
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

const SmallAvatar = ({ avatarId }) => {
  const av = AVATARS[avatarId];
  if (!av) return <div className="w-10 h-10 rounded-full bg-gray-500" />;
  return (
    <svg viewBox="0 0 80 80" width={40} height={40}>
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
};

const LargeAvatar = ({ avatarId }) => {
  const av = AVATARS[avatarId];
  if (!av) return <div className="w-28 h-28 rounded-full bg-gray-500" />;
  return (
    <svg viewBox="0 0 80 80" width={112} height={112}>
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
};

/* Format ISO date as "MMM YYYY" */
const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const Pending = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const prevCountRef = useRef(0);

  /* General settings (session_length & session_presets) */
  const [defaultSessionLength, setDefaultSessionLength] = useState(10);
  const [sessionPresetStep, setSessionPresetStep] = useState(5);

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* Approval modal state */
  const [modalItem, setModalItem] = useState(null);
  const [modalRfid, setModalRfid] = useState('');
  const [modalMinutes, setModalMinutes] = useState(10);

  /* Fetch pending signups from API */
  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pending/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPendingApprovals(data);
        // flash indicator when new entries arrive
        if (data.length > prevCountRef.current && prevCountRef.current > 0) {
          // new signup arrived!
        }
        prevCountRef.current = data.length;
      }
    } catch {
      // silently fail — will retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  /* Fetch general settings for session defaults */
  const fetchGeneralSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/general-settings/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const len = parseInt(data.session_length, 10);
        const preset = parseInt(data.session_presets, 10);
        if (!isNaN(len) && len > 0) setDefaultSessionLength(len);
        if (!isNaN(preset) && preset > 0) setSessionPresetStep(preset);
      }
    } catch { /* ignore */ }
  }, []);

  /* Poll every 5 seconds for real-time feel */
  useEffect(() => {
    fetchPending();
    fetchGeneralSettings();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, [fetchPending, fetchGeneralSettings]);

  /* Open approval modal — default time from general settings */
  const openApproveModal = (item) => {
    setModalItem(item);
    setModalRfid(item.rfid_tag || '');
    setModalMinutes(defaultSessionLength);
  };

  /* Approve with RFID & time */
  const handleApprove = async () => {
    if (!modalItem) return;
    try {
      const res = await fetch(`${API_BASE}/pending/${modalItem.id}/approve/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
          rfid_tag: modalRfid,
          session_minutes: modalMinutes,
        }),
      });
      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== modalItem.id));
        setModalItem(null);
      }
    } catch { /* ignore */ }
  };

  /* Decline from modal */
  const handleDeclineFromModal = async () => {
    if (!modalItem) return;
    await handleDelete(modalItem.id);
    setModalItem(null);
  };

  /* Reject / Delete */
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/pending/${id}/reject/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
      });
      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== id));
      }
    } catch { /* ignore */ }
  };

  const filtered = pendingApprovals.filter((p) =>
    (`${p.party_name} ${p.storyline_title} ${p.email}`).toLowerCase().includes(query.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* Reset to page 1 when search changes */
  useEffect(() => { setCurrentPage(1); }, [query]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  /* Time ago helper */
  const timeAgo = (isoStr) => {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="p-6" style={{ fontFamily: textFont }}>
      {/* Header with title and search */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Pending Approvals</h1>
        <div className="relative max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: theme.sidebar_text }} />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 border rounded-lg focus:outline-none"
              style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs" style={{ color: theme.sidebar_text }}>
              <span className="px-1.5 py-0.5 border rounded" style={{ borderColor: theme.sidebar_active_bg }}>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>
      </div>


      {/* Table */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b text-xs font-medium" style={{ backgroundColor: theme.sidebar_active_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
          <div className="col-span-1"></div>
          <div className="col-span-4">Team Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Time Requested</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table rows */}
        <div>
          {loading ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>No pending approvals</div>
          ) : (
            paginatedItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                <div className="col-span-1 flex items-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                  />
                </div>
                
                <div className="col-span-4 flex items-center gap-3">
                  {item.profile_photo ? (
                    <img 
                      src={item.profile_photo} 
                      alt={item.party_name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : item.avatar_id ? (
                    <SmallAvatar avatarId={item.avatar_id} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {item.party_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{item.party_name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>
                      {item.storyline_title ? `@${item.storyline_title}` : ''} · Team of {item.team_size}
                    </div>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="text-sm truncate" style={{ color: theme.sidebar_text }}>{item.email}</div>
                </div>
                
                <div className="col-span-2 flex items-center">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{timeAgo(item.created_at)}</div>
                </div>
                
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Reject"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => openApproveModal(item)}
                    className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                    title="Approve"
                  >
                    <CheckCircle size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: theme.sidebar_active_bg }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {currentPage > 2 && (
              <>
                <button onClick={() => handlePageChange(1)} className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>1</button>
                {currentPage > 3 && <span className="px-2" style={{ color: theme.sidebar_text }}>...</span>}
              </>
            )}
            {currentPage > 1 && (
              <button onClick={() => handlePageChange(currentPage - 1)} className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>{currentPage - 1}</button>
            )}
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-white rounded" style={{ backgroundColor: primaryColor }}>{currentPage}</button>
            {currentPage < totalPages && (
              <button onClick={() => handlePageChange(currentPage + 1)} className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>{currentPage + 1}</button>
            )}
            {currentPage < totalPages - 1 && (
              <>
                {currentPage < totalPages - 2 && <span className="px-2" style={{ color: theme.sidebar_text }}>...</span>}
                <button onClick={() => handlePageChange(totalPages)} className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>{totalPages}</button>
              </>
            )}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ─── Approval Modal ─── */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModalItem(null)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden"
            style={{ backgroundColor: theme.sidebar_bg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: theme.sidebar_active_bg }}>
              <h2 className="text-lg font-semibold m-0" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
                Edit Approvals
              </h2>
            </div>

            {/* Body — photo left, info right */}
            <div className="px-6 py-6">
              <div className="flex items-start gap-5">
                {/* Profile photo — left side */}
                <div className="flex-shrink-0">
                  {modalItem.profile_photo ? (
                    <img
                      src={modalItem.profile_photo}
                      alt={modalItem.party_name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : modalItem.avatar_id ? (
                    <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center">
                      <LargeAvatar avatarId={modalItem.avatar_id} />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: primaryColor }}>
                      {modalItem.party_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* Info — right side */}
                <div className="flex-1 min-w-0 pt-1">
                  {/* Name + storyline */}
                  <div className="mb-1">
                    <span className="text-base font-semibold" style={{ color: theme.sidebar_active_text }}>
                      {modalItem.party_name}
                    </span>
                    {modalItem.storyline_title && (
                      <span className="text-sm ml-1.5" style={{ color: theme.sidebar_text }}>@{modalItem.storyline_title}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="text-sm mb-0.5" style={{ color: theme.sidebar_text }}>
                    {modalItem.email || '—'}
                  </div>

                  {/* Last visited */}
                  <div className="text-xs mb-4" style={{ color: theme.sidebar_text }}>
                    Last Visited {formatDate(modalItem.created_at)}
                  </div>

                  {/* RFID Input */}
                  <input
                    type="text"
                    placeholder="Enter RFID TAG ID"
                    value={modalRfid}
                    onChange={(e) => setModalRfid(e.target.value)}
                    className="w-full py-2.5 px-4 rounded-lg border text-sm outline-none mb-3"
                    style={{
                      backgroundColor: theme.sidebar_bg,
                      borderColor: theme.sidebar_active_bg,
                      color: theme.sidebar_active_text,
                    }}
                  />

                  {/* Time stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalMinutes((m) => Math.max(sessionPresetStep, m - sessionPresetStep))}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white border-none cursor-pointer transition hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Minus size={18} />
                    </button>
                    <div
                      className="px-4 py-2.5 rounded-lg border text-sm font-medium min-w-[76px] text-center"
                      style={{
                        borderColor: theme.sidebar_active_bg,
                        color: theme.sidebar_active_text,
                      }}
                    >
                      {modalMinutes} mins
                    </div>
                    <button
                      onClick={() => setModalMinutes((m) => m + sessionPresetStep)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white border-none cursor-pointer transition hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 pt-2 flex gap-4">
              <button
                onClick={handleApprove}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold border-none cursor-pointer transition hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Approve
              </button>
              <button
                onClick={handleDeclineFromModal}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border cursor-pointer transition hover:opacity-80"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: theme.sidebar_active_bg,
                  color: theme.sidebar_active_text,
                }}
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pending;

/* CSRF cookie helper for Django session auth */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}