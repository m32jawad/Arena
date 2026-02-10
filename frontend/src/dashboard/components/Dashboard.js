import React, { useState } from 'react';
import { Search, Trash2, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Dashboard = () => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';
  const initialApprovals = [
    {
      teamName: "Team / Gamer Name",
      name: "Lily-Rose Chedjou",
      username: "@storyline1",
      email: "lilyrose@gmail.com",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=32",
    },
    {
      teamName: "Team Name",
      name: "Caitlyn King",
      username: "@storyline3",
      email: "hi@caitlynking.com",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=4",
    },
    {
      teamName: "Team Name",
      name: "Fleur Cook",
      username: "@storyline1",
      email: "fleurcook@icloud.com",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=12",
    },
    {
      teamName: "Team Name",
      name: "Marco Kelly",
      username: "@storyline1",
      email: "marco@marockelly.co",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=14",
    },
    {
      teamName: "Team Name",
      name: "Lulu Meyers",
      username: "@storyline3",
      email: "lulu@lulumeyers.com",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=45",
    },
    {
      teamName: "Team Name",
      name: "Mikey Lawrence",
      username: "@storyline1",
      email: "m.lawrence@gmail.com",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=8",
    },
    {
      teamName: "Team Name",
      name: "Freya Browning",
      username: "@storyline1",
      email: "hey@freyabrowning.com",
      time: "10 mins Ago",
      avatar: "https://i.pravatar.cc/40?img=10",
    }
  ];

  const [pendingApprovals, setPendingApprovals] = useState(initialApprovals);
  const [query, setQuery] = useState("");
  const [sessionQuery, setSessionQuery] = useState("");

  const handleDelete = (index) => {
    setPendingApprovals((prev) => prev.filter((_, i) => i !== index));
  };

  const filtered = pendingApprovals.filter((p) =>
    (`${p.name} ${p.username} ${p.email}`).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ fontFamily: textFont }}>
      {/* Top cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-stretch">
          <div className="rounded-xl shadow-sm border p-6 flex flex-col justify-between" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-xs" style={{ color: theme.sidebar_text }}>Currently Playing</div>
            <div className="text-3xl font-bold mt-3" style={{ color: theme.sidebar_active_text, fontFamily: headingFont }}>20</div>
          </div>

          <div className="rounded-xl shadow-sm border p-4 flex flex-col justify-center" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-sm mb-3" style={{ color: theme.sidebar_active_text }}>Controller 1</div>
            <div className="w-20 h-3 rounded bg-red-500" />
          </div>

          <div className="rounded-xl shadow-sm border p-4 flex flex-col justify-center" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-sm mb-3" style={{ color: theme.sidebar_active_text }}>Controller 2</div>
            <div className="w-20 h-3 rounded bg-yellow-400" />
          </div>

          <div className="rounded-xl shadow-sm border p-4 flex flex-col justify-center" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
            <div className="text-sm mb-3" style={{ color: theme.sidebar_active_text }}>Controller 3</div>
            <div className="w-20 h-3 rounded bg-green-500" />
          </div>
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
              {filtered.length === 0 ? (
                <div className="p-6 text-center" style={{ color: theme.sidebar_text }}>No pending approvals</div>
              ) : (
                filtered.map((item, index) => (
                  <div key={index} className="flex items-center px-3 py-4 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                    <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img src={item.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: theme.sidebar_active_text }}>{item.name}</div>
                        <div className="text-xs truncate" style={{ color: theme.sidebar_text }}>{item.username}</div>
                      </div>
                    </div>

                    <div className="w-56 hidden md:block">
                      <div className="text-sm truncate" style={{ color: theme.sidebar_text }}>{item.email}</div>
                    </div>

                    <div className="w-28 text-xs text-right" style={{ color: theme.sidebar_text }}>{item.time}</div>

                    <div className="w-24 text-right flex items-center justify-end gap-2">
                      <button title="Delete" onClick={() => handleDelete(index)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                        <Trash2 size={14} />
                      </button>
                      <button title="Approve" className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full">
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))
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
              {pendingApprovals.filter(s => (`${s.name} ${s.username} ${s.email}`).toLowerCase().includes(sessionQuery.toLowerCase())).slice(0,7).map((s, i) => (
                <div key={i} className="flex items-center px-3 py-3 border-b" style={{ borderColor: theme.sidebar_active_bg + '66' }}>
                  <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>
                  <img src={s.avatar} alt="a" className="w-10 h-10 rounded-full mr-3" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: theme.sidebar_active_text }}>{s.name}</div>
                    <div className="text-xs" style={{ color: theme.sidebar_text }}>{s.username}</div>
                  </div>
                  <div className="text-xs" style={{ color: theme.sidebar_text }}>{s.time}</div>
                </div>
              ))}
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
