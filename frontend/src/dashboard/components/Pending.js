import React, { useState } from 'react';
import { Search, Trash2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const Pending = () => {
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
    <div className="p-6">
      {/* Header with title and search */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Pending Approvals</h1>
        <div className="relative max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-gray-500">
              <span className="px-1.5 py-0.5 border border-gray-300 rounded">⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>
      </div>


      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-600">
          <div className="col-span-1"></div>
          <div className="col-span-4">Team Name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Time Requested</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table rows */}
        <div>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending approvals</div>
          ) : (
            filtered.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50">
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
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.username}</div>
                  </div>
                </div>
                
                <div className="col-span-3 flex items-center">
                  <div className="text-sm text-gray-600 truncate">{item.email}</div>
                </div>
                
                <div className="col-span-2 flex items-center">
                  <div className="text-sm text-gray-500">{item.time}</div>
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
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded border border-gray-300">
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-white bg-blue-600 rounded">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded">
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded">
              3
            </button>
            <span className="px-2 text-gray-400">...</span>
            <button className="w-8 h-8 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded">
              10
            </button>
          </div>
          
          <button className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded border border-gray-300">
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pending;