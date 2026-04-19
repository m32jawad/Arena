import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const defaultApiBase = `http://${window.location.hostname}:8000/api`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

const AuditLog = () => {
  const { theme } = useTheme();
  const { apiFetch } = useAuth();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await apiFetch(`${API_BASE}/audit-logs/?limit=500`);
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((log) => {
    const matchesQuery = `${log.user} ${log.description} ${log.action_display}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action.startsWith(actionFilter);
    return matchesQuery && matchesAction;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [query, actionFilter]);

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    const date = d.toLocaleDateString();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${date} ${h}:${m} ${ampm}`;
  };

  const actionColors = {
    signup_approved: { bg: '#dcfce7', text: '#166534' },
    signup_rejected: { bg: '#fee2e2', text: '#991b1b' },
    session_ended: { bg: '#fef3c7', text: '#92400e' },
    session_time_added: { bg: '#dbeafe', text: '#1e40af' },
    session_time_reduced: { bg: '#fce7f3', text: '#9d174d' },
    session_points_updated: { bg: '#e0e7ff', text: '#3730a3' },
    staff_created: { bg: '#dcfce7', text: '#166534' },
    staff_deleted: { bg: '#fee2e2', text: '#991b1b' },
    controller_created: { bg: '#dcfce7', text: '#166534' },
    controller_deleted: { bg: '#fee2e2', text: '#991b1b' },
  };

  if (loading) {
    return (
      <div className="p-6" style={{ fontFamily: textFont }}>
        <div className="flex justify-center items-center h-64" style={{ color: theme.sidebar_text }}>
          Loading audit logs...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ fontFamily: textFont }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
          Audit Log
        </h1>
        <span className="text-sm" style={{ color: theme.sidebar_text }}>
          {filtered.length} entries
        </span>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-md font-semibold" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
            Activity History
          </h2>
          <div className="flex items-center gap-4">
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
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 border rounded-lg focus:outline-none text-sm"
                style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}
              >
                <option value="all">All Actions</option>
                <option value="signup">Signups</option>
                <option value="session">Sessions</option>
                <option value="staff">Staff</option>
                <option value="controller">Controllers</option>
                <option value="storyline">Storylines</option>
                <option value="settings">Settings</option>
                <option value="checkpoint">Checkpoints</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" size={18} style={{ color: theme.sidebar_text }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b text-xs font-medium" style={{ backgroundColor: theme.sidebar_active_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-2">User</div>
          <div className="col-span-2">Action</div>
          <div className="col-span-6">Description</div>
        </div>

        <div>
          {paginatedLogs.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>
              No audit log entries found.
            </div>
          ) : (
            paginatedLogs.map((log) => {
              const colors = actionColors[log.action] || { bg: '#f3f4f6', text: '#374151' };
              return (
                <div key={log.id} className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b items-center" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                  <div className="col-span-2 text-sm" style={{ color: theme.sidebar_text }}>
                    {formatDate(log.created_at)}
                  </div>
                  <div className="col-span-2 text-sm font-medium" style={{ color: theme.sidebar_active_text }}>
                    {log.user}
                  </div>
                  <div className="col-span-2">
                    <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {log.action_display}
                    </span>
                  </div>
                  <div className="col-span-6 text-sm" style={{ color: theme.sidebar_text }}>
                    {log.description}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: theme.sidebar_active_bg }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm" style={{ color: theme.sidebar_text }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
