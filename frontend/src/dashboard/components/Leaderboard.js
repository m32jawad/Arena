import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit, Slash, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

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
    return <img src={item.profile_photo} alt={item.name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
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
    <div className="rounded-full flex items-center justify-center text-white font-bold" style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: '#9333ea' }}>
      {item.name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

const Leaderboard = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('last7days');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/public/leaderboard/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = teams.filter((t) =>
    (`${t.name} ${t.email}`).toLowerCase().includes(query.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTeams = filtered.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const handleView = (team) => {
    console.log('View', team.name);
  };

  const handleEdit = (team) => {
    console.log('Edit', team.name);
  };

  const handleBlock = (id) => {
    if (window.confirm('Are you sure you want to block this team?')) {
      // TODO: Implement block API call
      setTeams((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const formatRemaining = (mins) => {
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}hr ${remainMins} mins`;
    }
    return `${mins} mins`;
  };

  const topThree = teams.slice(0, 3);

  if (loading) {
    return (
      <div className="p-6" style={{ fontFamily: textFont }}>
        <div className="flex justify-center items-center h-64" style={{ color: theme.sidebar_text }}>
          Loading leaderboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ fontFamily: textFont }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Leader Board</h1>
        </div>
        
        <button className="text-white px-4 py-2 rounded-lg font-semibold" style={{ backgroundColor: primaryColor }}>Add New Controller</button>
      </div>

      <h1 className="text-md font-semibold mb-1" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Top 3 Teams</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {topThree.length > 0 ? topThree.map((t, i) => (
          <div key={t.id} className="rounded-lg border p-4 flex flex-col justify-between" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-sm" style={{ color: theme.sidebar_text }}>{t.name}</div>
            <div className="text-3xl font-bold mt-2" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>{t.points} <span className='text-[20px]'>points</span></div>
            <div className="text-xs mt-3 flex items-center justify-end">
              {t.session_status === 'live' && (
                <span className="px-2 py-1 border border-green-200 text-green-600 rounded" style={{ backgroundColor: theme.sidebar_bg }}>
                  {formatRemaining(t.remaining_minutes)}
                </span>
              )}
              {t.session_status === 'ended' && (
                <span className="px-2 py-1 border border-gray-200 text-gray-600 rounded" style={{ backgroundColor: theme.sidebar_bg }}>
                  Ended
                </span>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-3 text-center py-8" style={{ color: theme.sidebar_text }}>
            No teams yet
          </div>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
        <div className='flex items-center justify-between'>
          <h1 className="text-md font-semibold mb-1 px-6 py-4" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>Detail View</h1>
          
          <div className="flex items-center gap-4 pr-6">
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
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b text-xs font-medium" style={{ backgroundColor: theme.sidebar_active_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
          <div className="col-span-1"></div>
          <div className="col-span-3">Team Name</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">Start Time</div>
          <div className="col-span-2">Remaining Time</div>
          <div className="col-span-1">RFID Number</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div>
          {paginatedTeams.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>
              {loading ? 'Loading...' : 'No teams found'}
            </div>
          ) : (
            paginatedTeams.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b items-center" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                <div className="col-span-1 flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <AvatarCircle item={item} size={40} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{item.name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>
                      {item.checkpoints_cleared}/{item.total_controllers} checkpoints • {item.points} points
                    </div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.email}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{formatTime(item.approved_at)}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>
                    {item.session_status === 'live' ? formatRemaining(item.remaining_minutes) : '—'}
                  </div>
                </div>

                <div className="col-span-1">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.id}</div>
                </div>

                <div className="col-span-1 flex items-center justify-end gap-2">
                  <button onClick={() => handleView(item)} title="View" className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => handleEdit(item)} title="Edit" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleBlock(item.id)} title="Block" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                    <Slash size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

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
                <button 
                  onClick={() => handlePageChange(1)}
                  className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" 
                  style={{ color: theme.sidebar_text }}
                >
                  1
                </button>
                {currentPage > 3 && <span className="px-2" style={{ color: theme.sidebar_text }}>...</span>}
              </>
            )}
            
            {currentPage > 1 && (
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" 
                style={{ color: theme.sidebar_text }}
              >
                {currentPage - 1}
              </button>
            )}
            
            <button 
              className="w-8 h-8 flex items-center justify-center text-sm font-medium text-white rounded" 
              style={{ backgroundColor: primaryColor }}
            >
              {currentPage}
            </button>
            
            {currentPage < totalPages && (
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" 
                style={{ color: theme.sidebar_text }}
              >
                {currentPage + 1}
              </button>
            )}
            
            {currentPage < totalPages - 1 && (
              <>
                {currentPage < totalPages - 2 && <span className="px-2" style={{ color: theme.sidebar_text }}>...</span>}
                <button 
                  onClick={() => handlePageChange(totalPages)}
                  className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" 
                  style={{ color: theme.sidebar_text }}
                >
                  {totalPages}
                </button>
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
    </div>
  );
};

export default Leaderboard;