import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/auth';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken') || '',
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

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

  // ── Staff (API-driven) ──
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // null = add, object = edit
  const [staffForm, setStaffForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', is_staff: true });

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    setStaffError('');
    try {
      const data = await apiFetch(`${API_BASE}/staff/`);
      setStaff(data);
    } catch (err) {
      setStaffError(err.message);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') fetchStaff();
  }, [activeTab, fetchStaff]);

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({ username: '', email: '', first_name: '', last_name: '', password: '', is_staff: true });
    setShowStaffModal(true);
  };

  const openEditStaff = (user) => {
    setEditingStaff(user);
    setStaffForm({ username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, password: '', is_staff: user.is_staff });
    setShowStaffModal(true);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffError('');
    try {
      if (editingStaff) {
        const body = { ...staffForm };
        if (!body.password) delete body.password;
        delete body.username; // username not editable
        await apiFetch(`${API_BASE}/staff/${editingStaff.id}/`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch(`${API_BASE}/staff/`, { method: 'POST', body: JSON.stringify(staffForm) });
      }
      setShowStaffModal(false);
      fetchStaff();
    } catch (err) {
      setStaffError(err.message);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`${API_BASE}/staff/${id}/`, { method: 'DELETE' });
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBlockStaff = async (id) => {
    try {
      await apiFetch(`${API_BASE}/staff/${id}/toggle-block/`, { method: 'POST' });
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddStaff = () => openAddStaff();

  // ── Storylines (API-driven) ──
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState('');
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [storyForm, setStoryForm] = useState({ title: '', text: '', image: null });
  const [storyImagePreview, setStoryImagePreview] = useState('');
  const [viewingStory, setViewingStory] = useState(null);

  const fetchStories = useCallback(async () => {
    setStoriesLoading(true);
    setStoriesError('');
    try {
      const data = await apiFetch(`${API_BASE}/storylines/`);
      setStories(data);
    } catch (err) {
      setStoriesError(err.message);
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'story') fetchStories();
  }, [activeTab, fetchStories]);

  const openAddStory = () => {
    setEditingStory(null);
    setStoryForm({ title: '', text: '', image: null });
    setStoryImagePreview('');
    setShowStoryModal(true);
  };

  const openEditStory = (story) => {
    setEditingStory(story);
    setStoryForm({ title: story.title, text: story.text, image: null });
    setStoryImagePreview(story.image || '');
    setShowStoryModal(true);
  };

  const handleStoryImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStoryForm({ ...storyForm, image: file });
      setStoryImagePreview(URL.createObjectURL(file));
    }
  };

  const handleStorySubmit = async (e) => {
    e.preventDefault();
    setStoriesError('');
    try {
      const formData = new FormData();
      formData.append('title', storyForm.title);
      formData.append('text', storyForm.text);
      if (storyForm.image) formData.append('image', storyForm.image);

      const url = editingStory ? `${API_BASE}/storylines/${editingStory.id}/` : `${API_BASE}/storylines/`;
      const method = editingStory ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') || '' },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Request failed');
        }
      });

      setShowStoryModal(false);
      fetchStories();
    } catch (err) {
      setStoriesError(err.message);
    }
  };

  const handleDeleteStory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this storyline?')) return;
    try {
      await apiFetch(`${API_BASE}/storylines/${id}/`, { method: 'DELETE' });
      fetchStories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddStory = () => openAddStory();

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
              {staffError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{staffError}</div>
              )}
              {staffLoading ? (
                <div className="text-center text-gray-500 py-8">Loading users...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((s) => (
                    <div key={s.id} className={`border rounded-lg p-5 flex items-start gap-4 ${!s.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-900">
                          {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}`.trim() : s.username}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">@{s.username}</div>
                        <div className="text-sm text-gray-400 mt-1">{s.email || '—'}</div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {s.is_superuser && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Superuser</span>}
                          {s.is_staff && !s.is_superuser && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Staff</span>}
                          {!s.is_active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Blocked</span>}
                        </div>
                        {!s.is_superuser && (
                          <div className="mt-4 flex items-center gap-2">
                            <button onClick={() => openEditStaff(s)} className="bg-[#CB30E0] text-white px-3 py-1 rounded text-sm">Edit</button>
                            <button onClick={() => handleDeleteStaff(s.id)} className="px-3 py-1 border rounded text-sm hover:bg-red-50 hover:text-red-600">Delete</button>
                            <button onClick={() => handleBlockStaff(s.id)} className={`px-3 py-1 border rounded text-sm ${s.is_active ? 'hover:bg-yellow-50 hover:text-yellow-700' : 'hover:bg-green-50 hover:text-green-700'}`}>
                              {s.is_active ? 'Block' : 'Unblock'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500 flex-shrink-0">
                        {(s.first_name || s.username || '?')[0].toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit Staff Modal */}
              {showStaffModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={() => setShowStaffModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingStaff ? 'Edit User' : 'Add New User'}</h2>
                    <form onSubmit={handleStaffSubmit} className="space-y-4">
                      {!editingStaff && (
                        <div>
                          <label className="text-xs text-gray-600">Username *</label>
                          <input required value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">First Name</label>
                          <input value={staffForm.first_name} onChange={(e) => setStaffForm({ ...staffForm, first_name: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Last Name</label>
                          <input value={staffForm.last_name} onChange={(e) => setStaffForm({ ...staffForm, last_name: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Email</label>
                        <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">{editingStaff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                        <input type="password" required={!editingStaff} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_staff_cb" checked={staffForm.is_staff} onChange={(e) => setStaffForm({ ...staffForm, is_staff: e.target.checked })} className="w-4 h-4" />
                        <label htmlFor="is_staff_cb" className="text-sm text-gray-700">Staff status</label>
                      </div>
                      {staffError && <div className="text-sm text-red-600">{staffError}</div>}
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowStaffModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#CB30E0] text-white rounded-lg text-sm font-medium">{editingStaff ? 'Save Changes' : 'Create User'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'story' && (
            <div className="w-full">
              {storiesError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{storiesError}</div>
              )}
              {storiesLoading ? (
                <div className="text-center text-gray-500 py-8">Loading storylines...</div>
              ) : stories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No storylines yet. Click "Add StoryLine" to create one.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stories.map((st) => (
                    <div key={st.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 pr-2">
                        <div className="text-lg font-semibold text-gray-900">{st.title}</div>
                        <div className="text-sm text-gray-600 mt-2 line-clamp-4">{st.text}</div>
                        {st.text && st.text.length > 200 && (
                          <button onClick={() => setViewingStory(st)} className="text-xs text-[#CB30E0] hover:underline mt-1">... Review all</button>
                        )}
                        <div className="mt-4 flex items-center gap-3">
                          <button onClick={() => openEditStory(st)} className="bg-[#CB30E0] text-white px-3 py-1 rounded text-sm">Edit</button>
                          <button onClick={() => handleDeleteStory(st.id)} className="px-3 py-1 border rounded text-sm hover:bg-red-50 hover:text-red-600">Delete</button>
                        </div>
                      </div>
                      {st.image && (
                        <img src={st.image} alt={st.title} className="w-24 h-24 object-cover rounded flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* View Full Storyline Modal */}
              {viewingStory && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[80vh] overflow-y-auto">
                    <button onClick={() => setViewingStory(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">{viewingStory.title}</h2>
                    {viewingStory.image && (
                      <img src={viewingStory.image} alt={viewingStory.title} className="w-full max-h-48 object-cover rounded-lg mb-4" />
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingStory.text}</p>
                  </div>
                </div>
              )}

              {/* Add / Edit Story Modal */}
              {showStoryModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button onClick={() => setShowStoryModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingStory ? 'Edit Storyline' : 'Add New Storyline'}</h2>
                    <form onSubmit={handleStorySubmit} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-600">Title *</label>
                        <input required value={storyForm.title} onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Paragraph</label>
                        <textarea rows={4} value={storyForm.text} onChange={(e) => setStoryForm({ ...storyForm, text: e.target.value })} className="w-full mt-1 p-2 border border-gray-200 rounded text-sm resize-none" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Image</label>
                        <input type="file" accept="image/*" onChange={handleStoryImageChange} className="w-full mt-1 text-sm" />
                        {storyImagePreview && (
                          <img src={storyImagePreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded border" />
                        )}
                      </div>
                      {storiesError && <div className="text-sm text-red-600">{storiesError}</div>}
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowStoryModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#CB30E0] text-white rounded-lg text-sm font-medium">{editingStory ? 'Save Changes' : 'Create Storyline'}</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;