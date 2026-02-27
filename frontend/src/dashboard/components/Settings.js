import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

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
  const { theme: globalTheme, setTheme: setGlobalTheme, fetchTheme: refetchGlobalTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [arenaName, setArenaName] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [dateFormat, setDateFormat] = useState('');
  const [sessionLength, setSessionLength] = useState('');
  const [sessionPresets, setSessionPresets] = useState('');
  const [allowExtension, setAllowExtension] = useState(false);
  const [allowReduction, setAllowReduction] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [generalSuccess, setGeneralSuccess] = useState('');

  // ── Theme state ──
  const [themeForm, setThemeForm] = useState({
    background_type: 'solid',
    background_value: '#F9FAFB',
    sidebar_bg: '#FFFFFF',
    sidebar_text: '#4B5563',
    sidebar_active_bg: '#F3F4F6',
    sidebar_active_text: '#1F2937',
    primary_color: '#CB30E0',
    heading_font: '',
    text_font: '',
  });
  const [themeImageFile, setThemeImageFile] = useState(null);
  const [themeImagePreview, setThemeImagePreview] = useState('');
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeError, setThemeError] = useState('');
  const [themeSuccess, setThemeSuccess] = useState('');

  // ── App Theme (Signup Page) ──
  const [appThemeForm, setAppThemeForm] = useState({
    background_type: 'solid',
    background_value: '#1a1a2e',
    font_family: '',
    font_color: '#FFFFFF',
    button_color: '#CB30E0',
    button_text_color: '#FFFFFF',
  });
  const [appThemeImageFile, setAppThemeImageFile] = useState(null);
  const [appThemeImagePreview, setAppThemeImagePreview] = useState('');
  const [appThemeVideoFile, setAppThemeVideoFile] = useState(null);
  const [appThemeVideoPreview, setAppThemeVideoPreview] = useState('');
  const [appThemeLoading, setAppThemeLoading] = useState(false);
  const [appThemeError, setAppThemeError] = useState('');
  const [appThemeSuccess, setAppThemeSuccess] = useState('');

  const fetchAppThemeSettings = useCallback(async () => {
    setAppThemeLoading(true);
    setAppThemeError('');
    try {
      const data = await apiFetch(`${API_BASE}/app-theme/`);
      setAppThemeForm({
        background_type: data.background_type || 'solid',
        background_value: data.background_value || '#1a1a2e',
        font_family: data.font_family || '',
        font_color: data.font_color || '#FFFFFF',
        button_color: data.button_color || '#CB30E0',
        button_text_color: data.button_text_color || '#FFFFFF',
      });
      setAppThemeImagePreview(data.background_image || '');
      setAppThemeVideoPreview(data.background_video || '');
      setAppThemeImageFile(null);
      setAppThemeVideoFile(null);
    } catch (err) {
      setAppThemeError(err.message);
    } finally {
      setAppThemeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'app-theme') fetchAppThemeSettings();
  }, [activeTab, fetchAppThemeSettings]);

  const handleAppThemeSave = async () => {
    setAppThemeError('');
    setAppThemeSuccess('');
    try {
      const formData = new FormData();
      formData.append('background_type', appThemeForm.background_type);
      formData.append('background_value', appThemeForm.background_value);
      formData.append('font_family', appThemeForm.font_family);
      formData.append('font_color', appThemeForm.font_color);
      formData.append('button_color', appThemeForm.button_color);
      formData.append('button_text_color', appThemeForm.button_text_color);

      if (appThemeImageFile) {
        formData.append('background_image', appThemeImageFile);
      }
      if (appThemeForm.background_type !== 'image') {
        formData.append('clear_background_image', 'true');
      }

      if (appThemeVideoFile) {
        formData.append('background_video', appThemeVideoFile);
      }
      if (appThemeForm.background_type !== 'video') {
        formData.append('clear_background_video', 'true');
      }

      const res = await fetch(`${API_BASE}/app-theme/`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') || '' },
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Request failed');
      }
      setAppThemeSuccess('App theme saved! Changes will appear on signup page in real-time.');
      setTimeout(() => setAppThemeSuccess(''), 3000);
    } catch (err) {
      setAppThemeError(err.message);
    }
  };

  const handleAppThemeReset = () => {
    const defaults = {
      background_type: 'solid',
      background_value: '#1a1a2e',
      font_family: '',
      font_color: '#FFFFFF',
      button_color: '#CB30E0',
      button_text_color: '#FFFFFF',
    };
    setAppThemeForm(defaults);
    setAppThemeImageFile(null);
    setAppThemeImagePreview('');
    setAppThemeVideoFile(null);
    setAppThemeVideoPreview('');
  };

  const GOOGLE_FONTS_APP = [
    '', 'Cairo', 'Barlow Condensed', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Poppins', 'Raleway', 'Nunito', 'Inter', 'Oswald', 'Playfair Display',
    'Merriweather', 'Ubuntu', 'Quicksand', 'Rubik', 'Comfortaa', 'Orbitron',
    'Bebas Neue', 'Anton', 'Righteous', 'Bangers', 'Press Start 2P',
  ];

  const GOOGLE_FONTS = [
    '', 'Cairo', 'Barlow Condensed', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
    'Poppins', 'Raleway', 'Nunito', 'Inter', 'Oswald', 'Playfair Display',
    'Merriweather', 'Ubuntu', 'Quicksand', 'Rubik', 'Comfortaa', 'Orbitron',
    'Bebas Neue', 'Anton', 'Righteous', 'Bangers', 'Press Start 2P',
  ];

  const fetchThemeSettings = useCallback(async () => {
    setThemeLoading(true);
    setThemeError('');
    try {
      const data = await apiFetch(`${API_BASE}/dashboard-theme/`);
      setThemeForm({
        background_type: data.background_type || 'solid',
        background_value: data.background_value || '#F9FAFB',
        sidebar_bg: data.sidebar_bg || '#FFFFFF',
        sidebar_text: data.sidebar_text || '#4B5563',
        sidebar_active_bg: data.sidebar_active_bg || '#F3F4F6',
        sidebar_active_text: data.sidebar_active_text || '#1F2937',
        primary_color: data.primary_color || '#CB30E0',
        heading_font: data.heading_font || '',
        text_font: data.text_font || '',
      });
      setThemeImagePreview(data.background_image || '');
      setThemeImageFile(null);
    } catch (err) {
      setThemeError(err.message);
    } finally {
      setThemeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'themes') fetchThemeSettings();
  }, [activeTab, fetchThemeSettings]);

  const handleThemeSave = async () => {
    setThemeError('');
    setThemeSuccess('');
    try {
      const formData = new FormData();
      formData.append('background_type', themeForm.background_type);
      formData.append('background_value', themeForm.background_value);
      formData.append('sidebar_bg', themeForm.sidebar_bg);
      formData.append('sidebar_text', themeForm.sidebar_text);
      formData.append('sidebar_active_bg', themeForm.sidebar_active_bg);
      formData.append('sidebar_active_text', themeForm.sidebar_active_text);
      formData.append('primary_color', themeForm.primary_color);
      formData.append('heading_font', themeForm.heading_font);
      formData.append('text_font', themeForm.text_font);

      if (themeImageFile) {
        formData.append('background_image', themeImageFile);
      }
      if (themeForm.background_type !== 'image') {
        formData.append('clear_background_image', 'true');
      }

      const res = await fetch(`${API_BASE}/dashboard-theme/`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') || '' },
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Request failed');
      }
      const saved = await res.json();
      // Update global theme so the entire panel reflects immediately
      setGlobalTheme(saved);
      setThemeSuccess('Theme saved & applied!');
      setTimeout(() => setThemeSuccess(''), 3000);
    } catch (err) {
      setThemeError(err.message);
    }
  };

  const handleThemeReset = async () => {
    const defaults = {
      background_type: 'solid',
      background_value: '#F9FAFB',
      sidebar_bg: '#FFFFFF',
      sidebar_text: '#4B5563',
      sidebar_active_bg: '#F3F4F6',
      sidebar_active_text: '#1F2937',
      primary_color: '#CB30E0',
      heading_font: '',
      text_font: '',
    };
    setThemeForm(defaults);
    setThemeImageFile(null);
    setThemeImagePreview('');
  };

  // Fetch general settings from backend
  const fetchGeneralSettings = useCallback(async () => {
    setGeneralLoading(true);
    setGeneralError('');
    try {
      const data = await apiFetch(`${API_BASE}/general-settings/`);
      setArenaName(data.arena_name || '');
      setTimeZone(data.time_zone || '');
      setDateFormat(data.date_format || '');
      setSessionLength(data.session_length || '');
      setSessionPresets(data.session_presets || '');
      setAllowExtension(data.allow_extension || false);
      setAllowReduction(data.allow_reduction || false);
    } catch (err) {
      setGeneralError(err.message);
    } finally {
      setGeneralLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'general') fetchGeneralSettings();
  }, [activeTab, fetchGeneralSettings]);

  const handleSave = async () => {
    setGeneralError('');
    setGeneralSuccess('');
    try {
      const payload = {
        arena_name: arenaName,
        time_zone: timeZone,
        date_format: dateFormat,
        session_length: sessionLength,
        session_presets: sessionPresets,
        allow_extension: allowExtension,
        allow_reduction: allowReduction,
      };
      await apiFetch(`${API_BASE}/general-settings/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setGeneralSuccess('Settings saved successfully!');
      setTimeout(() => setGeneralSuccess(''), 3000);
    } catch (err) {
      setGeneralError(err.message);
    }
  };

  // ── Staff (API-driven) ──
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // null = add, object = edit
  const [staffForm, setStaffForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', is_staff: true, rfid_tag: '' });

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
    setStaffForm({ username: '', email: '', first_name: '', last_name: '', password: '', is_staff: true, rfid_tag: '' });
    setShowStaffModal(true);
  };

  const openEditStaff = (user) => {
    setEditingStaff(user);
    setStaffForm({ username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, password: '', is_staff: user.is_staff, rfid_tag: user.rfid_tag || '' });
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
  const [storyForm, setStoryForm] = useState({ title: '', text: '', hint: '', image: null });
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
    setStoryForm({ title: '', text: '', hint: '', image: null });
    setStoryImagePreview('');
    setShowStoryModal(true);
  };

  const openEditStory = (story) => {
    setEditingStory(story);
    setStoryForm({ title: story.title, text: story.text, hint: story.hint || '', image: null });
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
      formData.append('hint', storyForm.hint || '');
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

  // Theme-aware helper styles
  const primaryColor = globalTheme.primary_color || '#CB30E0';
  const labelSt = { color: globalTheme.sidebar_text };
  const headLabelSt = { color: globalTheme.sidebar_active_text };
  const inputSt = { backgroundColor: globalTheme.sidebar_bg, borderColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_active_text };
  const modalSt = { backgroundColor: globalTheme.sidebar_bg, color: globalTheme.sidebar_active_text };

  return (
    <div className="p-6" style={{ fontFamily: globalTheme.text_font || 'inherit' }}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-4" style={{ color: globalTheme.sidebar_active_text, fontFamily: globalTheme.heading_font || 'inherit' }}>Settings</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('general')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={activeTab === 'general' ? { backgroundColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_active_text } : { color: globalTheme.sidebar_text }}
            >
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={activeTab === 'themes' ? { backgroundColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_active_text } : { color: globalTheme.sidebar_text }}
            >
              Dashboard Theme
            </button>
            <button
              onClick={() => setActiveTab('app-theme')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={activeTab === 'app-theme' ? { backgroundColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_active_text } : { color: globalTheme.sidebar_text }}
            >
              App Theme (Signup)
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={activeTab === 'staff' ? { backgroundColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_active_text } : { color: globalTheme.sidebar_text }}
            >
              Staff Settings
            </button>
            <button
              onClick={() => setActiveTab('story')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={activeTab === 'story' ? { backgroundColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_active_text } : { color: globalTheme.sidebar_text }}
            >
              Story Line
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'staff' && (
            <button onClick={handleAddStaff} className="text-white px-4 py-2 rounded-lg font-semibold" style={{ backgroundColor: primaryColor }}>Add Staff</button>
          )}
          {activeTab === 'story' && (
            <button onClick={handleAddStory} className="text-white px-4 py-2 rounded-lg font-semibold" style={{ backgroundColor: primaryColor }}>Add StoryLine</button>
          )}
        </div>
      </div>

      {activeTab === 'general' ? (
        <div className="rounded-lg border p-6 w-full" style={{ backgroundColor: globalTheme.sidebar_bg, borderColor: globalTheme.sidebar_active_bg }}>
          {generalError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{generalError}</div>
          )}
          {generalSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{generalSuccess}</div>
          )}
          {generalLoading ? (
            <div className="text-center py-8" style={labelSt}>Loading settings...</div>
          ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs" style={labelSt}>Arena Name</label>
              <input value={arenaName} onChange={(e) => setArenaName(e.target.value)} placeholder="Arena Name" className="w-full mt-2 p-2 border rounded" style={inputSt} />
            </div>

            <div>
              <label className="text-xs" style={labelSt}>Time Zone</label>
              <input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} placeholder="Time Zone" className="w-full mt-2 p-2 border rounded" style={inputSt} />
            </div>

            <div>
              <label className="text-xs" style={labelSt}>Date & Time Format</label>
              <input value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} placeholder="Date & Time Format" className="w-full mt-2 p-2 border rounded" style={inputSt} />
            </div>

            <div>
              <label className="text-xs" style={labelSt}>Default Session Length</label>
              <input value={sessionLength} onChange={(e) => setSessionLength(e.target.value)} placeholder="e.g. 90 minutes" className="w-full mt-2 p-2 border rounded" style={inputSt} />
            </div>

            <div className="col-span-2">
              <label className="text-xs" style={labelSt}>Available Session Presets</label>
              <input value={sessionPresets} onChange={(e) => setSessionPresets(e.target.value)} placeholder="e.g. 10 minutes" className="w-full mt-2 p-2 border rounded" style={inputSt} />
            </div>

            <div>
              <label className="text-xs" style={labelSt}>Allow Session Time Extension</label>
              <select value={allowExtension ? 'on' : 'off'} onChange={(e) => setAllowExtension(e.target.value === 'on')} className="w-full mt-2 p-2 border rounded" style={inputSt}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div>
              <label className="text-xs" style={labelSt}>Allow Time Reduction</label>
              <select value={allowReduction ? 'on' : 'off'} onChange={(e) => setAllowReduction(e.target.value === 'on')} className="w-full mt-2 p-2 border rounded" style={inputSt}>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
          )}

          <div className="mt-6">
            <button onClick={handleSave} className="text-white px-4 py-2 rounded" style={{ backgroundColor: primaryColor }}>Save</button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-6 w-full" style={{ backgroundColor: globalTheme.sidebar_bg, borderColor: globalTheme.sidebar_active_bg }}>
          {activeTab === 'themes' && (
            <div className="space-y-6 max-w-3xl">
              {themeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{themeError}</div>
              )}
              {themeSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{themeSuccess}</div>
              )}
              {themeLoading ? (
                <div className="text-center py-8" style={labelSt}>Loading theme...</div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-2" style={headLabelSt}>Background Type</label>
                    <div className="flex gap-3">
                      {['solid', 'gradient', 'image'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setThemeForm({ ...themeForm, background_type: t })}
                          className="px-4 py-2 rounded-lg text-sm border font-medium capitalize"
                          style={themeForm.background_type === t
                            ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                            : { backgroundColor: globalTheme.sidebar_bg, color: globalTheme.sidebar_text, borderColor: globalTheme.sidebar_active_bg }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Solid Color */}
                  {themeForm.background_type === 'solid' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Background Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={themeForm.background_value || '#F9FAFB'}
                          onChange={(e) => setThemeForm({ ...themeForm, background_value: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                          style={{ borderColor: globalTheme.sidebar_active_bg }}
                        />
                        <input
                          type="text"
                          value={themeForm.background_value}
                          onChange={(e) => setThemeForm({ ...themeForm, background_value: e.target.value })}
                          placeholder="#F9FAFB"
                          className="flex-1 p-2 border rounded text-sm"
                          style={inputSt}
                        />
                      </div>
                    </div>
                  )}

                  {/* Gradient */}
                  {themeForm.background_type === 'gradient' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>CSS Gradient</label>
                      <input
                        type="text"
                        value={themeForm.background_value}
                        onChange={(e) => setThemeForm({ ...themeForm, background_value: e.target.value })}
                        placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        className="w-full p-2 border rounded text-sm"
                        style={inputSt}
                      />
                      {themeForm.background_value && (
                        <div className="mt-2 w-full h-16 rounded border" style={{ background: themeForm.background_value }} />
                      )}
                    </div>
                  )}

                  {/* Image */}
                  {themeForm.background_type === 'image' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Background Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setThemeImageFile(file);
                            setThemeImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="w-full text-sm"
                      />
                      {themeImagePreview && (
                        <img src={themeImagePreview} alt="Background preview" className="mt-2 w-full max-h-32 object-cover rounded border" />
                      )}
                    </div>
                  )}

                  {/* Sidebar Colors */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={headLabelSt}>Sidebar Colors</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'sidebar_bg', label: 'Sidebar Background' },
                        { key: 'sidebar_text', label: 'Sidebar Text' },
                        { key: 'sidebar_active_bg', label: 'Active Item Background' },
                        { key: 'sidebar_active_text', label: 'Active Item Text' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs block mb-1" style={labelSt}>{label}</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={themeForm[key] || '#000000'}
                              onChange={(e) => setThemeForm({ ...themeForm, [key]: e.target.value })}
                              className="w-9 h-9 rounded border cursor-pointer"
                              style={{ borderColor: globalTheme.sidebar_active_bg }}
                            />
                            <input
                              type="text"
                              value={themeForm[key]}
                              onChange={(e) => setThemeForm({ ...themeForm, [key]: e.target.value })}
                              className="flex-1 p-2 border rounded text-sm"
                              style={inputSt}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary / Accent Color */}
                  <div>
                    <label className="text-sm font-medium block mb-1" style={headLabelSt}>Primary / Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={themeForm.primary_color || '#CB30E0'}
                        onChange={(e) => setThemeForm({ ...themeForm, primary_color: e.target.value })}
                        className="w-12 h-10 rounded border cursor-pointer"
                        style={{ borderColor: globalTheme.sidebar_active_bg }}
                      />
                      <input
                        type="text"
                        value={themeForm.primary_color}
                        onChange={(e) => setThemeForm({ ...themeForm, primary_color: e.target.value })}
                        className="flex-1 p-2 border rounded text-sm"
                        style={inputSt}
                      />
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Heading Font</label>
                      <select
                        value={themeForm.heading_font}
                        onChange={(e) => setThemeForm({ ...themeForm, heading_font: e.target.value })}
                        className="w-full p-2 border rounded text-sm"
                        style={inputSt}
                      >
                        {GOOGLE_FONTS.map((f) => (
                          <option key={f} value={f}>{f || '— Default —'}</option>
                        ))}
                      </select>
                      {themeForm.heading_font && (
                        <p className="mt-1 text-xs" style={{ fontFamily: themeForm.heading_font, color: globalTheme.sidebar_text }}>Preview: {themeForm.heading_font}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Text / Body Font</label>
                      <select
                        value={themeForm.text_font}
                        onChange={(e) => setThemeForm({ ...themeForm, text_font: e.target.value })}
                        className="w-full p-2 border rounded text-sm"
                        style={inputSt}
                      >
                        {GOOGLE_FONTS.map((f) => (
                          <option key={f} value={f}>{f || '— Default —'}</option>
                        ))}
                      </select>
                      {themeForm.text_font && (
                        <p className="mt-1 text-xs" style={{ fontFamily: themeForm.text_font, color: globalTheme.sidebar_text }}>Preview: {themeForm.text_font}</p>
                      )}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={headLabelSt}>Live Preview</label>
                    <div className="flex rounded-lg border overflow-hidden h-40">
                      {/* Mini sidebar preview */}
                      <div className="w-1/4 p-2 flex flex-col gap-1" style={{ backgroundColor: themeForm.sidebar_bg, color: themeForm.sidebar_text }}>
                        <div className="text-[10px] font-bold" style={{ fontFamily: themeForm.heading_font || 'inherit' }}>Sidebar</div>
                        <div className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: themeForm.sidebar_active_bg, color: themeForm.sidebar_active_text }}>Active</div>
                        <div className="text-[9px] px-1 py-0.5">Item 2</div>
                        <div className="text-[9px] px-1 py-0.5">Item 3</div>
                      </div>
                      {/* Mini main area preview */}
                      <div
                        className="flex-1 p-2"
                        style={
                          themeForm.background_type === 'gradient'
                            ? { background: themeForm.background_value }
                            : themeForm.background_type === 'image' && themeImagePreview
                              ? { backgroundImage: `url(${themeImagePreview})`, backgroundSize: 'cover' }
                              : { backgroundColor: themeForm.background_value }
                        }
                      >
                        <div className="text-[10px] font-bold mb-1" style={{ fontFamily: themeForm.heading_font || 'inherit', color: themeForm.sidebar_active_text }}>Heading</div>
                        <div className="text-[9px] mb-2" style={{ fontFamily: themeForm.text_font || 'inherit', color: themeForm.sidebar_text }}>Body text preview</div>
                        <div className="inline-block text-[9px] px-2 py-0.5 rounded text-white" style={{ backgroundColor: themeForm.primary_color }}>Button</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleThemeSave} className="text-white px-4 py-2 rounded font-medium text-sm" style={{ backgroundColor: primaryColor }}>Save & Apply Theme</button>
                    <button onClick={handleThemeReset} className="px-4 py-2 border rounded text-sm" style={{ borderColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_text }}>Reset to Defaults</button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'app-theme' && (
            <div className="space-y-6 max-w-3xl">
              {appThemeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{appThemeError}</div>
              )}
              {appThemeSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{appThemeSuccess}</div>
              )}
              {appThemeLoading ? (
                <div className="text-center py-8" style={labelSt}>Loading app theme...</div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-2" style={headLabelSt}>Background Type</label>
                    <div className="flex gap-3 flex-wrap">
                      {['solid', 'gradient', 'image', 'video'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setAppThemeForm({ ...appThemeForm, background_type: t })}
                          className="px-4 py-2 rounded-lg text-sm border font-medium capitalize"
                          style={appThemeForm.background_type === t
                            ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                            : { backgroundColor: globalTheme.sidebar_bg, color: globalTheme.sidebar_text, borderColor: globalTheme.sidebar_active_bg }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Solid Color */}
                  {appThemeForm.background_type === 'solid' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Background Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={appThemeForm.background_value || '#1a1a2e'}
                          onChange={(e) => setAppThemeForm({ ...appThemeForm, background_value: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                          style={{ borderColor: globalTheme.sidebar_active_bg }}
                        />
                        <input
                          type="text"
                          value={appThemeForm.background_value}
                          onChange={(e) => setAppThemeForm({ ...appThemeForm, background_value: e.target.value })}
                          placeholder="#1a1a2e"
                          className="flex-1 p-2 border rounded text-sm"
                          style={inputSt}
                        />
                      </div>
                    </div>
                  )}

                  {/* Gradient */}
                  {appThemeForm.background_type === 'gradient' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>CSS Gradient</label>
                      <input
                        type="text"
                        value={appThemeForm.background_value}
                        onChange={(e) => setAppThemeForm({ ...appThemeForm, background_value: e.target.value })}
                        placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        className="w-full p-2 border rounded text-sm"
                        style={inputSt}
                      />
                      {appThemeForm.background_value && (
                        <div className="mt-2 w-full h-16 rounded border" style={{ background: appThemeForm.background_value }} />
                      )}
                    </div>
                  )}

                  {/* Image */}
                  {appThemeForm.background_type === 'image' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Background Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setAppThemeImageFile(file);
                            setAppThemeImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="w-full text-sm"
                      />
                      {appThemeImagePreview && (
                        <img src={appThemeImagePreview} alt="Background preview" className="mt-2 w-full max-h-32 object-cover rounded border" />
                      )}
                    </div>
                  )}

                  {/* Video */}
                  {appThemeForm.background_type === 'video' && (
                    <div>
                      <label className="text-sm block mb-1" style={labelSt}>Background Video</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setAppThemeVideoFile(file);
                            setAppThemeVideoPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="w-full text-sm"
                      />
                      {appThemeVideoPreview && (
                        <div className="mt-2">
                          <p className="text-xs mb-1" style={labelSt}>Preview:</p>
                          <video src={appThemeVideoPreview} controls autoPlay loop muted className="w-full max-h-32 rounded border" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Font Family */}
                  <div>
                    <label className="text-sm block mb-1" style={labelSt}>Font Family</label>
                    <select
                      value={appThemeForm.font_family}
                      onChange={(e) => setAppThemeForm({ ...appThemeForm, font_family: e.target.value })}
                      className="w-full p-2 border rounded text-sm"
                      style={inputSt}
                    >
                      {GOOGLE_FONTS_APP.map((f) => (
                        <option key={f} value={f}>{f || '— Default —'}</option>
                      ))}
                    </select>
                    {appThemeForm.font_family && (
                      <p className="mt-1 text-xs" style={{ fontFamily: appThemeForm.font_family, color: globalTheme.sidebar_text }}>Preview: {appThemeForm.font_family}</p>
                    )}
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={headLabelSt}>Colors</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: 'font_color', label: 'Text/Font Color' },
                        { key: 'button_color', label: 'Button Color' },
                        { key: 'button_text_color', label: 'Button Text Color' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs block mb-1" style={labelSt}>{label}</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={appThemeForm[key] || '#FFFFFF'}
                              onChange={(e) => setAppThemeForm({ ...appThemeForm, [key]: e.target.value })}
                              className="w-9 h-9 rounded border cursor-pointer"
                              style={{ borderColor: globalTheme.sidebar_active_bg }}
                            />
                            <input
                              type="text"
                              value={appThemeForm[key]}
                              onChange={(e) => setAppThemeForm({ ...appThemeForm, [key]: e.target.value })}
                              className="flex-1 p-2 border rounded text-sm"
                              style={inputSt}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div>
                    <label className="text-sm font-medium block mb-2" style={headLabelSt}>Live Preview (Signup Page)</label>
                    <div className="rounded-lg border overflow-hidden h-48 flex flex-col items-center justify-center" style={{
                      background: appThemeForm.background_type === 'gradient' 
                        ? appThemeForm.background_value
                        : appThemeForm.background_type === 'image' && appThemeImagePreview
                        ? `url(${appThemeImagePreview})`
                        : appThemeForm.background_value,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}>
                      <div className="text-center">
                        <div className="text-xl font-bold mb-3" style={{ color: appThemeForm.font_color, fontFamily: appThemeForm.font_family ? `${appThemeForm.font_family}, sans-serif` : 'inherit' }}>Sign Up</div>
                        <button className="px-6 py-2 rounded-xl text-sm font-semibold transition hover:opacity-90" style={{ background: appThemeForm.button_color, color: appThemeForm.button_text_color }}>
                          Next
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleAppThemeSave} className="text-white px-4 py-2 rounded font-medium text-sm" style={{ backgroundColor: primaryColor }}>Save & Apply Theme</button>
                    <button onClick={handleAppThemeReset} className="px-4 py-2 border rounded text-sm" style={{ borderColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_text }}>Reset to Defaults</button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="w-full">
              {staffError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{staffError}</div>
              )}
              {staffLoading ? (
                <div className="text-center py-8" style={labelSt}>Loading users...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((s) => (
                    <div key={s.id} className={`border rounded-lg p-5 flex items-start gap-4 ${!s.is_active ? 'opacity-60' : ''}`} style={{ borderColor: globalTheme.sidebar_active_bg, backgroundColor: !s.is_active ? globalTheme.sidebar_active_bg : 'transparent' }}>
                      <div className="flex-1">
                        <div className="text-lg font-semibold" style={{ color: globalTheme.sidebar_active_text }}>
                          {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}`.trim() : s.username}
                        </div>
                        <div className="text-sm mt-0.5" style={{ color: globalTheme.sidebar_text }}>@{s.username}</div>
                        <div className="text-sm mt-1" style={{ color: globalTheme.sidebar_text }}>{s.email || '—'}</div>
                        {s.rfid_tag && (
                          <div className="text-xs mt-1 font-mono" style={{ color: globalTheme.sidebar_text }}>
                            RFID: {s.rfid_tag}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {s.is_superuser && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Superuser</span>}
                          {s.is_staff && !s.is_superuser && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Staff</span>}
                          {!s.is_active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Blocked</span>}
                        </div>
                        {!s.is_superuser && (
                          <div className="mt-4 flex items-center gap-2">
                            <button onClick={() => openEditStaff(s)} className="text-white px-3 py-1 rounded text-sm" style={{ backgroundColor: globalTheme.primary_color || '#CB30E0' }}>Edit</button>
                            <button onClick={() => handleDeleteStaff(s.id)} className="px-3 py-1 border rounded text-sm hover:bg-red-50 hover:text-red-600">Delete</button>
                            <button onClick={() => handleBlockStaff(s.id)} className={`px-3 py-1 border rounded text-sm ${s.is_active ? 'hover:bg-yellow-50 hover:text-yellow-700' : 'hover:bg-green-50 hover:text-green-700'}`}>
                              {s.is_active ? 'Block' : 'Unblock'}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_text }}>
                        {(s.first_name || s.username || '?')[0].toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit Staff Modal */}
              {showStaffModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="rounded-xl shadow-xl w-full max-w-md p-6 relative" style={modalSt}>
                    <button onClick={() => setShowStaffModal(false)} className="absolute top-4 right-4" style={{ color: globalTheme.sidebar_text }}>
                      <X size={20} />
                    </button>
                    <h2 className="text-lg font-semibold mb-4" style={headLabelSt}>{editingStaff ? 'Edit User' : 'Add New User'}</h2>
                    <form onSubmit={handleStaffSubmit} className="space-y-4">
                      {!editingStaff && (
                        <div>
                          <label className="text-xs" style={labelSt}>Username *</label>
                          <input required value={staffForm.username} onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs" style={labelSt}>First Name</label>
                          <input value={staffForm.first_name} onChange={(e) => setStaffForm({ ...staffForm, first_name: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} />
                        </div>
                        <div>
                          <label className="text-xs" style={labelSt}>Last Name</label>
                          <input value={staffForm.last_name} onChange={(e) => setStaffForm({ ...staffForm, last_name: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs" style={labelSt}>Email</label>
                        <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} />
                      </div>
                      <div>
                        <label className="text-xs" style={labelSt}>RFID Tag</label>
                        <input value={staffForm.rfid_tag} onChange={(e) => setStaffForm({ ...staffForm, rfid_tag: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} placeholder="Optional" />
                      </div>
                      <div>
                        <label className="text-xs" style={labelSt}>{editingStaff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                        <input type="password" required={!editingStaff} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="is_staff_cb" checked={staffForm.is_staff} onChange={(e) => setStaffForm({ ...staffForm, is_staff: e.target.checked })} className="w-4 h-4" />
                        <label htmlFor="is_staff_cb" className="text-sm" style={labelSt}>Staff status</label>
                      </div>
                      {staffError && <div className="text-sm text-red-600">{staffError}</div>}
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowStaffModal(false)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_text }}>Cancel</button>
                        <button type="submit" className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: primaryColor }}>{editingStaff ? 'Save Changes' : 'Create User'}</button>
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
                <div className="text-center py-8" style={labelSt}>Loading storylines...</div>
              ) : stories.length === 0 ? (
                <div className="text-center py-8" style={labelSt}>No storylines yet. Click "Add StoryLine" to create one.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stories.map((st) => (
                    <div key={st.id} className="border rounded-lg p-4 flex items-start justify-between gap-4" style={{ borderColor: globalTheme.sidebar_active_bg }}>
                      <div className="flex-1 pr-2">
                        <div className="text-lg font-semibold" style={headLabelSt}>{st.title}</div>
                        <div className="text-sm mt-2 line-clamp-4" style={labelSt}>{st.text}</div>
                        {st.text && st.text.length > 200 && (
                          <button onClick={() => setViewingStory(st)} className="text-xs hover:underline mt-1" style={{ color: primaryColor }}>... Review all</button>
                        )}
                        <div className="mt-4 flex items-center gap-3">
                          <button onClick={() => openEditStory(st)} className="text-white px-3 py-1 rounded text-sm" style={{ backgroundColor: primaryColor }}>Edit</button>
                          <button onClick={() => handleDeleteStory(st.id)} className="px-3 py-1 border rounded text-sm hover:bg-red-50 hover:text-red-600" style={{ borderColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_text }}>Delete</button>
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
                  <div className="rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[80vh] overflow-y-auto" style={modalSt}>
                    <button onClick={() => setViewingStory(null)} className="absolute top-4 right-4" style={{ color: globalTheme.sidebar_text }}>
                      <X size={20} />
                    </button>
                    <h2 className="text-lg font-semibold mb-3" style={headLabelSt}>{viewingStory.title}</h2>
                    {viewingStory.image && (
                      <img src={viewingStory.image} alt={viewingStory.title} className="w-full max-h-48 object-cover rounded-lg mb-4" />
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed" style={labelSt}>{viewingStory.text}</p>
                    {viewingStory.hint && (
                      <div className="mt-4 p-3 rounded-lg border" style={{ borderColor: globalTheme.sidebar_active_bg, backgroundColor: globalTheme.sidebar_active_bg + '55' }}>
                        <div className="text-xs font-semibold mb-1" style={{ color: globalTheme.primary_color || '#CB30E0' }}>IN-GAME HINT</div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={labelSt}>{viewingStory.hint}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add / Edit Story Modal */}
              {showStoryModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="rounded-xl shadow-xl w-full max-w-md p-6 relative overflow-y-auto max-h-[90vh]" style={modalSt}>
                    <button onClick={() => setShowStoryModal(false)} className="absolute top-4 right-4" style={{ color: globalTheme.sidebar_text }}>
                      <X size={20} />
                    </button>
                    <h2 className="text-lg font-semibold mb-4" style={headLabelSt}>{editingStory ? 'Edit Storyline' : 'Add New Storyline'}</h2>
                    <form onSubmit={handleStorySubmit} className="space-y-4">
                      <div>
                        <label className="text-xs" style={labelSt}>Title *</label>
                        <input required value={storyForm.title} onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm" style={inputSt} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold" style={labelSt}>Paragraph</label>
                        <textarea rows={4} value={storyForm.text} onChange={(e) => setStoryForm({ ...storyForm, text: e.target.value })} className="w-full mt-1 p-2 border rounded text-sm resize-none" style={inputSt} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold" style={{ ...labelSt, color: globalTheme.primary_color || '#CB30E0' }}>💡 In-Game Hint</label>
                        <textarea rows={3} value={storyForm.hint || ''} onChange={(e) => setStoryForm({ ...storyForm, hint: e.target.value })} placeholder="Hint shown to players during their active session at the station…" className="w-full mt-1 p-2 border-2 rounded text-sm resize-none" style={{ ...inputSt, borderColor: globalTheme.primary_color || '#CB30E0' }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold" style={labelSt}>Image</label>
                        <input type="file" accept="image/*" onChange={handleStoryImageChange} className="w-full mt-1 text-sm" />
                        {storyImagePreview && (
                          <img src={storyImagePreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded border" style={{ borderColor: globalTheme.sidebar_active_bg }} />
                        )}
                      </div>
                      {storiesError && <div className="text-sm text-red-600">{storiesError}</div>}
                      <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowStoryModal(false)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: globalTheme.sidebar_active_bg, color: globalTheme.sidebar_text }}>Cancel</button>
                        <button type="submit" className="px-4 py-2 text-white rounded-lg text-sm font-medium" style={{ backgroundColor: primaryColor }}>{editingStory ? 'Save Changes' : 'Create Storyline'}</button>
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