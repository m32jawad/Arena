import React, { useState } from 'react';
import { Search, Trash2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Pending = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';
  const initialApprovals = [
    { name: 'Lily-Rose Chedjou', username: '@storyline1', email: '', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=32' },
    { name: 'Caitlyn King', username: '@storyline1', email: 'lillyrose@gmail.com', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=4' },
    { name: 'Fleur Cook', username: '@storyline4', email: 'hif@caitlynking.com', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=12' },
    { name: 'Marco Kelly', username: '@storyline5', email: 'fleurcook@icloud.com', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=14' },
    { name: 'Lulu Meyers', username: '@storyline3', email: 'marco@marockelly.co', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=45' },
    { name: 'Mikey Lawrence', username: '@storyline1', email: 'm.lawrence@gmail.com', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=8' },
    { name: 'Freya Browning', username: '@storyline1', email: 'hey@freyabrowning.com', time: '10 mins Ago', avatar: 'https://i.pravatar.cc/40?img=10' },
  ];

  const [pendingApprovals, setPendingApprovals] = useState(initialApprovals);
  const [query, setQuery] = useState('');

  const handleDelete = (index) => setPendingApprovals((prev) => prev.filter((_, i) => i !== index));
  const handleApprove = (index) => setPendingApprovals((prev) => prev.filter((_, i) => i !== index));

  const filtered = pendingApprovals.filter((p) => 
    (`${p.name} ${p.username} ${p.email}`).toLowerCase().includes(query.toLowerCase())
  );

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
          {filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: theme.sidebar_text }}>No pending approvals</div>
          ) : (
            filtered.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                <div className="col-span-1 flex items-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                  />
                </div>
                
                <div className="col-span-4 flex items-center gap-3">
                  <img 
                    src={item.avatar} 
                    alt={item.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{item.name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>{item.username}</div>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="text-sm truncate" style={{ color: theme.sidebar_text }}>{item.email}</div>
                </div>
                
                <div className="col-span-2 flex items-center">
                  <div className="text-sm" style={{ color: theme.sidebar_text }}>{item.time}</div>
                </div>
                
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDelete(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => handleApprove(index)}
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
          <button className="flex items-center gap-1 px-3 py-2 text-sm rounded border" style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-white rounded" style={{ backgroundColor: primaryColor }}>
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>
              3
            </button>
            <span className="px-2" style={{ color: theme.sidebar_text }}>...</span>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium rounded" style={{ color: theme.sidebar_text }}>
              10
            </button>
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

export default Pending;