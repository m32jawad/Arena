import React, { useState } from 'react';
import { Search, Trash2, CheckCircle } from 'lucide-react';

const Dashboard = () => {
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
    <>
      {/* Top cards */}
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-stretch">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="text-xs text-gray-500">Currently Playing</div>
            <div className="text-3xl font-abold text-gray-900 mt-3">20</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-center">
            <div className="text-sm text-gray-700 mb-3">Controller 1</div>
            <div className="w-20 h-3 rounded bg-red-500" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-center">
            <div className="text-sm text-gray-700 mb-3">Controller 2</div>
            <div className="w-20 h-3 rounded bg-yellow-400" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-center">
            <div className="text-sm text-gray-700 mb-3">Controller 3</div>
            <div className="w-20 h-3 rounded bg-green-500" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Pending Approvals</h2>
            <div className="relative w-full max-w-sm">
              <div className="flex items-center bg-gray-50 border rounded px-3 py-2 w-full">
                <Search size={16} className="text-gray-400 mr-2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="bg-transparent outline-none text-sm w-full" />
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-white border rounded px-2 py-0.5">⌘K</div>
            </div>
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center text-xs text-gray-500 px-3 py-3 border-b">
              <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>
              <div className="flex-1 font-medium">Team / Gamer Name</div>
              <div className="w-56 hidden md:block">Email</div>
              <div className="w-28 text-right">Time Requested</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            <div>
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No pending approvals</div>
              ) : (
                filtered.map((item, index) => (
                  <div key={index} className="flex items-center px-3 py-4 border-b hover:bg-gray-50">
                    <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>

                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <img src={item.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500 truncate">{item.username}</div>
                      </div>
                    </div>

                    <div className="w-56 hidden md:block">
                      <div className="text-sm text-gray-600 truncate">{item.email}</div>
                    </div>

                    <div className="w-28 text-xs text-gray-400 text-right">{item.time}</div>

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
              <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-600">‹ Previous</button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <button className="px-2 py-1 rounded bg-white border">1</button>
              <button className="px-2 py-1 rounded">2</button>
              <button className="px-2 py-1 rounded">3</button>
              <button className="px-2 py-1 rounded">10</button>
            </div>

            <div>
              <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-600">Next ›</button>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Sessions</h2>
            <div className="relative w-full max-w-sm">
              <div className="flex items-center bg-gray-50 border rounded px-3 py-2 w-full">
                <Search size={16} className="text-gray-400 mr-2" />
                <input value={sessionQuery} onChange={(e) => setSessionQuery(e.target.value)} placeholder="Search" className="bg-transparent outline-none text-sm w-full" />
              </div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-white border rounded px-2 py-0.5">⌘K</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-xs text-gray-500 px-3 py-3 border-b">
              <div className="flex-1 font-medium">Team Name</div>
              <div className="w-28 text-right">Joining Time</div>
            </div>

            <div className="space-y-2 mt-3">
              {pendingApprovals.filter(s => (`${s.name} ${s.username} ${s.email}`).toLowerCase().includes(sessionQuery.toLowerCase())).slice(0,7).map((s, i) => (
                <div key={i} className="flex items-center px-3 py-3 border-b hover:bg-gray-50">
                  <div className="w-8"><input type="checkbox" className="w-4 h-4" /></div>
                  <img src={s.avatar} alt="a" className="w-10 h-10 rounded-full mr-3" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.username}</div>
                  </div>
                  <div className="text-xs text-gray-400">{s.time}</div>
                </div>
              ))}
            </div>

            {/* Sessions pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-600">‹ Previous</button>
              </div>

              <div>
                <button className="flex items-center gap-2 px-3 py-2 border rounded text-sm text-gray-600">Next ›</button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
};

export default Dashboard;
