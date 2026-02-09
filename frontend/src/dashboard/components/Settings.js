import React, { useState } from 'react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [arenaName, setArenaName] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [sessionLength, setSessionLength] = useState('');
  const [sessionPresets, setSessionPresets] = useState('');
  const [allowExtension, setAllowExtension] = useState(false);
  const [allowReduction, setAllowReduction] = useState(false);

  const handleSave = () => {
    const payload = {
      arenaName,
      timeZone,
      dateFormat,
      sessionLength,
      sessionPresets,
      allowExtension,
      allowReduction,
    };
    console.log('Save settings', payload);
    alert('Settings saved (console logged)');
  };

  const initialStaff = [
    { name: 'Staff Name', title: 'Job Title : Reception', emp: '# 0027', avatar: 'https://i.pravatar.cc/80' },
    { name: 'Staff Name', title: 'Job Title : Reception', emp: '# 0027', avatar: 'https://i.pravatar.cc/81' },
    { name: 'Staff Name', title: 'Job Title : Reception', emp: '# 0027', avatar: 'https://i.pravatar.cc/82' },
    { name: 'Staff Name', title: 'Job Title : Reception', emp: '# 0027', avatar: 'https://i.pravatar.cc/83' },
  ];

  const [staff, setStaff] = useState(initialStaff);

  const handleEditStaff = (i) => console.log('Edit staff', staff[i]);
  const handleDeleteStaff = (i) => setStaff((s) => s.filter((_, idx) => idx !== i));
  const handleBlockStaff = (i) => console.log('Block staff', staff[i]);
  const handleAddStaff = () => console.log('Add staff');

  const initialStories = [
    {
      title: 'Story line 1',
      text: 'A storyline (or plot line) is the connected, chronological sequence of events, actions, and developments that form the backbone of a narrative in books, films, or plays.',
      img: 'https://picsum.photos/80/80?random=1',
    },
    {
      title: 'Story line 1',
      text: 'A storyline (or plot line) is the connected, chronological sequence of events, actions, and developments that form the backbone of a narrative in books, films, or plays.',
      img: 'https://picsum.photos/80/80?random=2',
    },
    {
      title: 'Story line 1',
      text: 'A storyline (or plot line) is the connected, chronological sequence of events, actions, and developments that form the backbone of a narrative in books, films, or plays.',
      img: 'https://picsum.photos/80/80?random=3',
    },
  ];

  const [stories, setStories] = useState(initialStories);
  const handleEditStory = (i) => console.log('Edit story', stories[i]);
  const handleDeleteStory = (i) => setStories((s) => s.filter((_, idx) => idx !== i));
  const handleAddStory = () => console.log('Add StoryLine');

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Settings</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === 'general' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === 'themes' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Themes
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === 'staff' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Staff Settings
            </button>
            <button
              onClick={() => setActiveTab('story')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${activeTab === 'story' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Story Line
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'staff' && (
            <button onClick={handleAddStaff} className="bg-[#CB30E0] text-white px-4 py-2 rounded-lg font-semibold">Add Staff</button>
          )}
          {activeTab === 'story' && (
            <button onClick={handleAddStory} className="bg-[#CB30E0] text-white px-4 py-2 rounded-lg font-semibold">Add StoryLine</button>
          )}
        </div>
      </div>

      {activeTab === 'general' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 w-full">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Arena Name</label>
              <input value={arenaName} onChange={(e) => setArenaName(e.target.value)} placeholder="Arena Name" className="w-full mt-2 p-2 border border-gray-200 rounded" />
            </div>

            <div>
              <label className="text-xs text-gray-600">Time Zone</label>
              <input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} placeholder="Time Zone" className="w-full mt-2 p-2 border border-gray-200 rounded" />
            </div>

            <div>
              <label className="text-xs text-gray-600">Date & Time Format</label>
              <input value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} placeholder="Date & Time Format" className="w-full mt-2 p-2 border border-gray-200 rounded" />
            </div>

            <div>
              <label className="text-xs text-gray-600">Default Session Length</label>
              <input value={sessionLength} onChange={(e) => setSessionLength(e.target.value)} placeholder="e.g. 90 minutes" className="w-full mt-2 p-2 border border-gray-200 rounded" />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-600">Available Session Presets</label>
              <input value={sessionPresets} onChange={(e) => setSessionPresets(e.target.value)} placeholder="e.g. 10 minutes" className="w-full mt-2 p-2 border border-gray-200 rounded" />
            </div>

            <div>
              <label className="text-xs text-gray-600">Allow Session Time Extension</label>
              <select value={allowExtension ? 'on' : 'off'} onChange={(e) => setAllowExtension(e.target.value === 'on')} className="w-full mt-2 p-2 border border-gray-200 rounded">
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600">Allow Time Reduction</label>
              <select value={allowReduction ? 'on' : 'off'} onChange={(e) => setAllowReduction(e.target.value === 'on')} className="w-full mt-2 p-2 border border-gray-200 rounded">
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button onClick={handleSave} className="bg-[#CB30E0] text-white px-4 py-2 rounded">Save</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 w-full">
          {activeTab === 'themes' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <label className="text-sm font-medium text-gray-700">Signup Theme (Mobile)</label>
                <input placeholder="Image / Video/ Solid Color / Gradient" className="w-full mt-2 p-2 border border-gray-200 rounded" />
                <div className="mt-3 flex items-center gap-4">
                  <div className="w-16 h-24 bg-gray-100 rounded border flex-shrink-0" />
                  <button className="bg-[#CB30E0] text-white px-3 py-1 rounded">Upload</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Heading Font Style</label>
                  <input placeholder="Cairo" className="w-full mt-2 p-2 border border-gray-200 rounded" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Text Font Style</label>
                  <input placeholder="Barlow Condense" className="w-full mt-2 p-2 border border-gray-200 rounded" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Admin Panel Theme</label>
                <input placeholder="Image / Video/ Solid Color / Gradient" className="w-full mt-2 p-2 border border-gray-200 rounded" />
                <div className="mt-3 flex items-center gap-4">
                  <div className="w-16 h-24 bg-white rounded border flex-shrink-0" />
                  <button className="bg-[#CB30E0] text-white px-3 py-1 rounded">Upload</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Heading Font Style</label>
                  <input placeholder="Cairo" className="w-full mt-2 p-2 border border-gray-200 rounded" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Text Font Style</label>
                  <input placeholder="Barlow Condense" className="w-full mt-2 p-2 border border-gray-200 rounded" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button className="bg-[#CB30E0] text-white px-3 py-2 rounded">−</button>
                <button className="bg-[#CB30E0] text-white px-3 py-2 rounded">+</button>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="w-full">
              <div className="grid grid-cols-3 gap-4">
                {staff.map((s, i) => (
                  <div key={i} className="border rounded p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-lg font-semibold">{s.name}</div>
                      <div className="text-sm text-gray-500">{s.title}</div>
                      <div className="text-sm text-gray-400 mt-2">Emp {s.emp}</div>
                      <div className="mt-4 flex items-center gap-2">
                        <button onClick={() => handleEditStaff(i)} className="bg-[#CB30E0] text-white px-3 py-1 rounded">Edit</button>
                        <button onClick={() => handleDeleteStaff(i)} className="px-3 py-1 border rounded">Delete</button>
                        <button onClick={() => handleBlockStaff(i)} className="px-3 py-1 border rounded">Block</button>
                      </div>
                    </div>
                    <img src={s.avatar} alt={s.name} className="w-20 h-20 rounded-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'story' && (
            <div className="w-full">
              <div className="grid grid-cols-3 gap-4">
                {stories.map((st, idx) => (
                  <div key={idx} className="border rounded p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 pr-4">
                      <div className="text-lg font-semibold">{st.title}</div>
                      <div className="text-sm text-gray-600 mt-2">{st.text}</div>
                      <div className="mt-4 flex items-center gap-3">
                        <button onClick={() => handleEditStory(idx)} className="bg-[#CB30E0] text-white px-3 py-1 rounded">Edit</button>
                        <button onClick={() => handleDeleteStory(idx)} className="px-3 py-1 border rounded">Delete</button>
                      </div>
                    </div>
                    <img src={st.img} alt={st.title} className="w-24 h-24 object-cover rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;