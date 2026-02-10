import React, { useState } from 'react';
import { Search, ChevronDown, MoreVertical, X, Clock, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Sessions = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';
  const [activeTab, setActiveTab] = useState('live');
  const [timeFilter, setTimeFilter] = useState('last7days');
  
  // Live Sessions Data
  const liveSessions = [
    { 
      name: 'Lily-Rose Chedjou', 
      username: '@storyline1', 
      rfid: 'RFID-001234', 
      time: '10 mins', 
      avatar: 'https://i.pravatar.cc/40?img=32',
      status: 'active'
    },
    { 
      name: 'Caitlyn King', 
      username: '@storyline1', 
      rfid: 'RFID-001235', 
      time: '14 mins', 
      avatar: 'https://i.pravatar.cc/40?img=4',
      status: 'active'
    },
    { 
      name: 'Fleur Cook', 
      username: '@storyline2', 
      rfid: 'RFID-001236', 
      time: '16 mins', 
      avatar: 'https://i.pravatar.cc/40?img=12',
      status: 'active'
    },
    { 
      name: 'Marco Kelly', 
      username: '@storyline4', 
      rfid: 'RFID-001237', 
      time: '30 mins', 
      avatar: 'https://i.pravatar.cc/40?img=14',
      status: 'active'
    },
    { 
      name: 'Lulu Meyers', 
      username: '@storyline1', 
      rfid: 'RFID-001238', 
      time: '5 mins', 
      avatar: 'https://i.pravatar.cc/40?img=45',
      status: 'active'
    },
    { 
      name: 'Mikey Lawrence', 
      username: '@storyline5', 
      rfid: 'RFID-001239', 
      time: '1 min', 
      avatar: 'https://i.pravatar.cc/40?img=8',
      status: 'active'
    },
    { 
      name: 'Freya Browning', 
      username: '@storyline1', 
      rfid: 'RFID-001240', 
      time: '4 mins', 
      avatar: 'https://i.pravatar.cc/40?img=10',
      status: 'active'
    },
  ];

  // Ended Sessions Data (same structure but different status)
  const endedSessions = [
    { 
      name: 'Lily-Rose Chedjou', 
      username: '@storyline1', 
      rfid: 'RFID-001234', 
      time: '10 mins ago', 
      avatar: 'https://i.pravatar.cc/40?img=32',
      status: 'ended'
    },
    { 
      name: 'Caitlyn King', 
      username: '@storyline1', 
      rfid: 'RFID-001235', 
      time: '14 mins ago', 
      avatar: 'https://i.pravatar.cc/40?img=4',
      status: 'ended'
    },
    { 
      name: 'Fleur Cook', 
      username: '@storyline2', 
      rfid: 'RFID-001236', 
      time: '16 mins ago', 
      avatar: 'https://i.pravatar.cc/40?img=12',
      status: 'ended'
    },
    { 
      name: 'Marco Kelly', 
      username: '@storyline4', 
      rfid: 'RFID-001237', 
      time: '30 mins ago', 
      avatar: 'https://i.pravatar.cc/40?img=14',
      status: 'ended'
    },
  ];

  const currentSessions = activeTab === 'live' ? liveSessions : endedSessions;
  const [query, setQuery] = useState('');

  const filteredSessions = currentSessions.filter((session) =>
    `${session.name} ${session.username} ${session.rfid}`.toLowerCase().includes(query.toLowerCase())
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
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>
              {activeTab === 'live' ? 'No live sessions' : 'No ended sessions'}
            </div>
          ) : (
            filteredSessions.map((session, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={session.avatar} 
                      alt={session.name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {session.status === 'active' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{session.name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>{session.username}</div>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{session.rfid}</div>
                </div>
                
                <div className="col-span-2 flex items-center">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span className={`text-sm font-medium ${
                      session.status === 'active' ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      {session.time}
                    </span>
                  </div>
                </div>
                
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {activeTab === 'live' ? (
                    <button
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                      title="End Session"
                    >
                      End Game
                    </button>
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
    </div>
  );
};

export default Sessions;