import React, { useState, useEffect } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const defaultApiBase = `http://${window.location.hostname}:8000/api`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

const EmailSubscribers = () => {
  const { theme } = useTheme();
  const { apiFetch, token } = useAuth();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const data = await apiFetch(`${API_BASE}/email-subscribers/`);
      setSubscribers(data || []);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this subscriber from the mailing list?')) return;
    try {
      await apiFetch(`${API_BASE}/email-subscribers/${id}/delete/`, { method: 'DELETE' });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to remove subscriber.');
    }
  };

  const handleExportCSV = () => {    const url = `${API_BASE}/email-subscribers/csv/`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'email_subscribers.csv');
    if (token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.click();
          URL.revokeObjectURL(blobUrl);
        })
        .catch((err) => console.error('CSV download error:', err));
    } else {
      a.click();
    }
  };

  const filtered = subscribers.filter((s) =>
    `${s.party_name} ${s.email}`.toLowerCase().includes(query.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [query]);

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

  const statusColors = {
    approved: { bg: '#dcfce7', text: '#166534' },
    playing: { bg: '#dbeafe', text: '#1e40af' },
    ended: { bg: '#f3f4f6', text: '#374151' },
    pending: { bg: '#fef3c7', text: '#92400e' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
  };

  if (loading) {
    return (
      <div className="p-6" style={{ fontFamily: textFont }}>
        <div className="flex justify-center items-center h-64" style={{ color: theme.sidebar_text }}>
          Loading subscribers...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ fontFamily: textFont }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
          Email Subscribers
        </h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-md font-semibold" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>
            {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: theme.sidebar_text }} />
            <input
              type="text"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none"
              style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text }}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b text-xs font-medium" style={{ backgroundColor: theme.sidebar_active_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
          <div className="col-span-3">Party Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Team Size</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1">Signed Up</div>
          <div className="col-span-1"></div>
        </div>

        <div>
          {paginated.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>
              No email subscribers found.
            </div>
          ) : (
            paginated.map((s) => {
              const colors = statusColors[s.status] || { bg: '#f3f4f6', text: '#374151' };
              return (
                <div key={s.id} className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b items-center" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                  <div className="col-span-3 text-sm font-medium" style={{ color: theme.sidebar_active_text }}>
                    {s.party_name}
                  </div>
                  <div className="col-span-3 text-sm" style={{ color: theme.sidebar_text }}>
                    {s.email}
                  </div>
                  <div className="col-span-2 text-sm" style={{ color: theme.sidebar_text }}>
                    {s.team_size}
                  </div>
                  <div className="col-span-2">
                    <span className="px-2 py-1 rounded text-xs font-medium capitalize" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {s.status}
                    </span>
                  </div>
                  <div className="col-span-1 text-sm" style={{ color: theme.sidebar_text }}>
                    {formatDate(s.created_at)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="Remove from mailing list"
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: theme.sidebar_active_bg }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

export default EmailSubscribers;
