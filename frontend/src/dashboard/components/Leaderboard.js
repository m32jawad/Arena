import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit, Slash, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Leaderboard = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';
  const initialTeams = [
    { name: 'Team A', username: '@teamA', points: 23000, remaining: '3hr 34 mins', email: 'teamA@example.com', startTime: '2:50 PM', rfid: '2344535', avatar: 'https://i.pravatar.cc/40?img=32' },
    { name: 'Team B', username: '@teamB', points: 22300, remaining: '5hr 34 mins', email: 'teamB@example.com', startTime: '2:23 PM', rfid: '4674634', avatar: 'https://i.pravatar.cc/40?img=4' },
    { name: 'Team C', username: '@teamC', points: 13000, remaining: '1hr 34 mins', email: 'teamC@example.com', startTime: '2:12 PM', rfid: '65734536', avatar: 'https://i.pravatar.cc/40?img=12' },
    { name: 'Lily-Rose Chedjou', username: '@storyline1', points: 4200, remaining: '10 mins', email: 'lilyrose@gmail.com', startTime: '2:50 PM', rfid: '2344535', avatar: 'https://i.pravatar.cc/40?img=32' },
    { name: 'Caitlyn King', username: '@storyline2', points: 3800, remaining: '14 mins', email: 'hi@caitlynking.com', startTime: '2:23 PM', rfid: '4674634', avatar: 'https://i.pravatar.cc/40?img=4' },
    { name: 'Fleur Cook', username: '@storyline3', points: 3400, remaining: '16 mins', email: 'fleurcook@icloud.com', startTime: '2:12 PM', rfid: '65734536', avatar: 'https://i.pravatar.cc/40?img=12' },
  ];

  const [teams, setTeams] = useState(initialTeams);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('last7days');

  const filtered = teams.filter((t) =>
    (`${t.name} ${t.username} ${t.email}`).toLowerCase().includes(query.toLowerCase())
  );

  const handleView = (index) => {
    const t = teams[index];
    console.log('View', t.name);
  };

  const handleEdit = (index) => {
    const t = teams[index];
    console.log('Edit', t.name);
  };

  const handleBlock = (index) => {
    setTeams((prev) => prev.filter((_, i) => i !== index));
  };

  const topThree = teams.slice(0, 3);

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
        {topThree.map((t, i) => (
          <div key={i} className="rounded-lg border p-4 flex flex-col justify-between" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-sm" style={{ color: theme.sidebar_text }}>{t.name}</div>
            <div className="text-3xl font-bold mt-2" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>{t.points} <span className='text-[20px]'>points</span></div>
            <div className="text-xs mt-3 flex items-center justify-end">
              <span className="px-2 py-1 border border-green-200 text-green-600 rounded" style={{ backgroundColor: theme.sidebar_bg }}>{t.remaining}</span>
            </div>
          </div>
        ))}
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
          {filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>No teams found</div>
          ) : (
            filtered.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b items-center" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                <div className="col-span-1 flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                </div>

                <div className="col-span-3 flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{item.name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>{item.username}</div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.email}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.startTime}</div>
                </div>

                <div className="col-span-2">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.remaining}</div>
                </div>

                <div className="col-span-1">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.rfid}</div>
                </div>

                <div className="col-span-1 flex items-center justify-end gap-2">
                  <button onClick={() => handleView(index)} title="View" className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => handleEdit(index)} title="Edit" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleBlock(index)} title="Block" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                    <Slash size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t" style={{ borderColor: theme.sidebar_active_bg }}>
          <button className="flex items-center gap-1 px-3 py-2 text-sm rounded border" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-white rounded" style={{ backgroundColor: primaryColor }}>1</button>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>2</button>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>3</button>
            <span className="px-2" style={{ color: theme.sidebar_text }}>...</span>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>10</button>
          </div>

          <button className="flex items-center gap-1 px-3 py-2 text-sm rounded border" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;