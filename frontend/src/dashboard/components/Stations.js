import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  HardDrive,
  Thermometer,
  BarChart3,
  Clock,
  Power,
  ArrowUpRight,
  Trash2,
  Edit2,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const defaultApiBase = `http://${window.location.hostname}:8000/api/auth`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

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

const METRIC_ICONS = {
  cpu_usage: <Cpu size={18} />,
  storage_usage: <HardDrive size={18} />,
  cpu_temperature: <Thermometer size={18} />,
  ram_usage: <BarChart3 size={18} />,
  system_uptime: <Clock size={18} />,
  voltage_power_status: <Power size={18} />,
};

const METRIC_LABELS = {
  cpu_usage: 'CPU Usage',
  storage_usage: 'Storage Usage',
  cpu_temperature: 'CPU Temperature',
  ram_usage: 'RAM Usage',
  system_uptime: 'System Uptime',
  voltage_power_status: 'Voltage / Power Status',
};

const METRIC_KEYS = Object.keys(METRIC_LABELS);

const emptyForm = {
  name: '',
  ip_address: '',
  station_minutes: 10,
  is_start: false,
  is_end: false,
  hint_audio: null,
  hint_audio_url: '',
  clear_hint_audio: false,
  requires_staff_reset: true,
  auto_reset_seconds: 20,
  // Per-storyline audio hints
  existingStorylineHints: [],   // [{ storyline_id, storyline_title, hint_audio }]
  storylineHintFiles: {},       // { [storyline_id]: File }
  storylineHintClears: {},      // { [storyline_id]: true }
};

const Stations = ({ readOnly = false }) => {
  const { theme } = useTheme();
  const headingFont = theme.heading_font || 'inherit';
  const textFont = theme.text_font || 'inherit';
  const primaryColor = theme.primary_color || '#CB30E0';

  // Theme-aware helpers
  const labelSt = { color: theme.sidebar_text };
  const headLabelSt = { color: theme.sidebar_active_text };
  const inputSt = { backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg, color: theme.sidebar_active_text };
  const modalSt = { backgroundColor: theme.sidebar_bg, color: theme.sidebar_active_text };

  const [controllers, setControllers] = useState([]);
  const [storylines, setStorylines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const fetchControllers = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const data = await apiFetch(`${API_BASE}/controllers/`);
      setControllers(data);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchStorylines = useCallback(async () => {
    try {
      const data = await apiFetch(`${API_BASE}/storylines/`);
      setStorylines(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchControllers();
    fetchStorylines();
    // Silent poll every 5 seconds — only metric values update, no loading flash
    const interval = setInterval(() => fetchControllers(true), 5000);
    return () => clearInterval(interval);
  }, [fetchControllers, fetchStorylines]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (ctl) => {
    setEditing(ctl);
    setForm({
      ...emptyForm,
      name: ctl.name,
      ip_address: ctl.ip_address,
      station_minutes: ctl.station_minutes || 10,
      is_start: ctl.is_start || false,
      is_end: ctl.is_end || false,
      hint_audio: null,
      hint_audio_url: ctl.hint_audio || '',
      clear_hint_audio: false,
      requires_staff_reset: ctl.requires_staff_reset ?? true,
      auto_reset_seconds: ctl.auto_reset_seconds ?? 20,
      existingStorylineHints: ctl.storyline_hints || [],
      storylineHintFiles: {},
      storylineHintClears: {},
    });
    setFormError('');
    setShowModal(true);
  };

  /* Upload per-storyline audio hints (set or clear) for a controller */
  const saveStorylineHints = async (controllerId) => {
    const ids = new Set([
      ...Object.keys(form.storylineHintFiles || {}),
      ...Object.keys(form.storylineHintClears || {}),
    ]);
    for (const sid of ids) {
      const file = form.storylineHintFiles?.[sid];
      const clear = form.storylineHintClears?.[sid];
      if (!file && !clear) continue;
      const hfd = new FormData();
      hfd.append('storyline_id', sid);
      if (file) {
        hfd.append('hint_audio', file);
      } else if (clear) {
        hfd.append('clear', 'true');
      }
      const res = await fetch(`${API_BASE}/controllers/${controllerId}/storyline-hints/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') || '' },
        body: hfd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save storyline hint');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('ip_address', form.ip_address);
      fd.append('station_minutes', String(form.station_minutes || 10));
      fd.append('is_start', form.is_start);
      fd.append('is_end', form.is_end);
      fd.append('requires_staff_reset', form.requires_staff_reset);
      fd.append('auto_reset_seconds', String(form.auto_reset_seconds ?? 20));
      if (form.hint_audio) {
        fd.append('hint_audio', form.hint_audio);
      } else if (form.clear_hint_audio) {
        fd.append('clear_hint_audio', 'true');
      }
      const url = editing
        ? `${API_BASE}/controllers/${editing.id}/`
        : `${API_BASE}/controllers/`;
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCookie('csrftoken') || '' },
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed');
      }
      const saved = await res.json();
      // Save per-storyline audio hints against the (now-existing) controller
      await saveStorylineHints(saved.id);
      setShowModal(false);
      fetchControllers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this controller?')) return;
    try {
      await apiFetch(`${API_BASE}/controllers/${id}/`, { method: 'DELETE' });
      fetchControllers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRefresh = () => {
    fetchControllers();
  };

  const [restartingId, setRestartingId] = useState(null);
  const [restartMsg, setRestartMsg] = useState({});

  const handleRestartService = async (ctl) => {
    if (!window.confirm(`Restart the arena-station service on "${ctl.name}" (${ctl.ip_address})?`)) return;
    setRestartingId(ctl.id);
    setRestartMsg((prev) => ({ ...prev, [ctl.id]: null }));
    try {
      const data = await apiFetch(`${API_BASE}/controllers/${ctl.id}/restart-service/`, { method: 'POST' });
      setRestartMsg((prev) => ({ ...prev, [ctl.id]: { ok: true, text: data.message || 'Restart triggered.' } }));
    } catch (err) {
      setRestartMsg((prev) => ({ ...prev, [ctl.id]: { ok: false, text: err.message } }));
    } finally {
      setRestartingId(null);
    }
  };

  const getMetrics = (ctl) =>
    METRIC_KEYS.filter((k) => ctl[k]).map((k) => ({
      key: k,
      icon: METRIC_ICONS[k],
      label: METRIC_LABELS[k],
      value: ctl[k],
    }));

  return (
    <div className="p-6" style={{ fontFamily: textFont }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold" style={{ ...headLabelSt, fontFamily: headingFont }}>Stations</h1>

        {!readOnly && (
          <button onClick={openAdd} className="px-3 py-2 border rounded text-white text-sm" style={{ backgroundColor: primaryColor }}>
            <span className="text-sm">Add New Controller</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-8" style={labelSt}>Loading controllers...</div>
      ) : controllers.length === 0 ? (
        <div className="text-center py-8" style={labelSt}>No controllers found. {!readOnly && 'Click "Add New Controller" to create one.'}</div>
      ) : (
        <div className="space-y-6">
          {controllers.map((ctl) => {
            const metrics = getMetrics(ctl);
            const firstRow = metrics.slice(0, 4);
            const secondRow = metrics.slice(4);

            return (
              <div key={ctl.id} className="rounded-lg border p-6" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
                <div className="flex items-center gap-4 mb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-medium" style={{ ...headLabelSt, fontFamily: headingFont }}>{ctl.name}</h2>
                      {ctl.is_start && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e50' }}>START</span>
                      )}
                      {ctl.is_end && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444450' }}>END ROOM</span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={labelSt}>IP: {ctl.ip_address}</div>
                    <div className="text-xs mt-0.5" style={labelSt}>Station Time: {ctl.station_minutes || 0} min</div>
                    <div className="text-xs mt-0.5" style={labelSt}>
                      Reset: {ctl.requires_staff_reset === false
                        ? `Auto (${ctl.auto_reset_seconds ?? 0}s cooldown)`
                        : 'Staff card required'}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center ml-auto gap-1">
                      <button
                        aria-label="Restart Service"
                        title="Restart arena-station service on this Pi"
                        disabled={restartingId === ctl.id}
                        onClick={() => handleRestartService(ctl)}
                        className="p-2 rounded"
                        style={{ color: restartingId === ctl.id ? '#888' : '#f59e0b' }}
                      >
                        <RotateCcw size={16} className={restartingId === ctl.id ? 'animate-spin' : ''} />
                      </button>
                      <button aria-label="Delete" onClick={() => handleDelete(ctl.id)} className="p-2 text-red-600">
                        <Trash2 size={16} />
                      </button>
                      <button aria-label="Edit" onClick={() => openEdit(ctl)} className="p-2" style={labelSt}>
                        <Edit2 size={16} />
                      </button>
                      <button aria-label="Refresh" onClick={handleRefresh} className="p-2" style={labelSt}>
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {restartMsg[ctl.id] && (
                  <div className={`mt-2 mb-1 text-xs px-2 py-1 rounded ${restartMsg[ctl.id].ok ? 'text-green-500' : 'text-red-500'}`}>
                    {restartMsg[ctl.id].text}
                  </div>
                )}

                {metrics.length === 0 ? (
                  <div className="mt-4 text-sm" style={labelSt}>No metrics data available.</div>
                ) : (
                  <>
                    {/* First row — up to 4 boxes */}
                    {firstRow.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 mb-4">
                        {firstRow.map((m) => (
                          <div key={m.key} className="p-4 rounded-lg border shadow-sm relative" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
                            <div className="absolute top-3 right-3">
                              <div className="inline-flex items-center gap-2 border rounded-md px-2 py-1 text-xs text-green-600" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
                                <ArrowUpRight size={14} className="text-green-500" />
                                <span className="font-medium">—</span>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md" style={{ backgroundColor: theme.sidebar_active_bg }}>{m.icon}</div>
                                <div>
                                  <div className="text-xs font-medium" style={labelSt}>{m.label}</div>
                                  <div className="text-xl font-semibold mt-1" style={headLabelSt}>{m.value}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Second row — remaining boxes */}
                    {secondRow.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {secondRow.map((m) => (
                          <div key={m.key} className="p-4 rounded-lg border shadow-sm relative" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
                            <div className="absolute top-3 right-3">
                              <div className="inline-flex items-center gap-2 border rounded-md px-2 py-1 text-xs text-green-600" style={{ backgroundColor: theme.sidebar_bg, borderColor: theme.sidebar_active_bg }}>
                                <ArrowUpRight size={14} className="text-green-500" />
                                <span className="font-medium">—</span>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md" style={{ backgroundColor: theme.sidebar_active_bg }}>{m.icon}</div>
                                <div>
                                  <div className="text-xs font-medium" style={labelSt}>{m.label}</div>
                                  <div className="text-xl font-semibold mt-1" style={headLabelSt}>{m.value}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Controller Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[85vh] overflow-y-auto" style={modalSt}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4" style={labelSt}>
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-5" style={{ ...headLabelSt, fontFamily: headingFont }}>
              {editing ? 'Edit Controller' : 'Add New Controller'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name & IP — required */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium block mb-1" style={labelSt}>Controller Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Controller 1"
                    className="w-full p-2 border rounded text-sm"
                    style={inputSt}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={labelSt}>IP Address *</label>
                  <input
                    required
                    value={form.ip_address}
                    onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                    placeholder="e.g. 192.168.1.100"
                    className="w-full p-2 border rounded text-sm"
                    style={inputSt}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={labelSt}>Station Time (min) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.station_minutes}
                    onChange={(e) => setForm({ ...form, station_minutes: e.target.value })}
                    placeholder="e.g. 6"
                    className="w-full p-2 border rounded text-sm"
                    style={inputSt}
                  />
                </div>
              </div>

              {/* Start / End controller toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_start}
                    onChange={(e) => setForm({ ...form, is_start: e.target.checked, ...(e.target.checked ? { is_end: false } : {}) })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#22c55e' }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#22c55e' }}>Start Room</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_end}
                    onChange={(e) => setForm({ ...form, is_end: e.target.checked, ...(e.target.checked ? { is_start: false } : {}) })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: '#ef4444' }}
                  />
                  <span className="text-sm font-medium" style={{ color: '#ef4444' }}>End Room (final)</span>
                </label>
              </div>
              {form.is_end && (
                <div className="text-xs -mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: theme.sidebar_active_bg, color: theme.sidebar_text }}>
                  Players must complete <b>all other rooms</b> before this final room can be started. Completing it finishes the game.
                </div>
              )}

              {/* Reset behaviour between groups */}
              <div className="rounded-lg border p-3" style={{ borderColor: theme.sidebar_active_bg }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requires_staff_reset}
                    onChange={(e) => setForm({ ...form, requires_staff_reset: e.target.checked })}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: primaryColor }}
                  />
                  <span className="text-sm font-medium" style={headLabelSt}>Require staff card swipe to reset between groups</span>
                </label>
                <p className="text-xs mt-1 ml-6" style={labelSt}>
                  When enabled, a staff card must be scanned to make this station ready for the next group.
                </p>
                {!form.requires_staff_reset && (
                  <div className="mt-3 ml-6 flex items-center gap-2">
                    <label className="text-xs font-medium" style={labelSt}>Auto-reset cooldown (seconds)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.auto_reset_seconds}
                      onChange={(e) => setForm({ ...form, auto_reset_seconds: e.target.value })}
                      className="w-24 p-2 border rounded text-sm"
                      style={inputSt}
                    />
                  </div>
                )}
              </div>

              {/* Hint Audio — default / fallback */}
              <div>
                <label className="text-xs font-medium block mb-1" style={labelSt}>Default Hint Audio (optional)</label>
                <p className="text-xs mb-1" style={labelSt}>Used when the player's storyline has no specific hint below.</p>
                {form.hint_audio_url && !form.clear_hint_audio && !form.hint_audio && (
                  <div className="flex items-center gap-2 mb-2 text-sm" style={labelSt}>
                    <span className="truncate max-w-xs">{form.hint_audio_url.split('/').pop()}</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, clear_hint_audio: true })}
                      className="text-red-500 text-xs underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setForm({ ...form, hint_audio: e.target.files[0] || null, clear_hint_audio: false })}
                  className="w-full p-2 border rounded text-sm"
                  style={inputSt}
                />
              </div>

              {/* Per-storyline Hint Audio */}
              {storylines.length > 0 && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={labelSt}>Per-Storyline Hint Audio (optional)</label>
                  <p className="text-xs mb-2" style={labelSt}>
                    Set a different audio hint for this station depending on the player's storyline.
                  </p>
                  <div className="space-y-3">
                    {storylines.map((s) => {
                      const existing = (form.existingStorylineHints || []).find((h) => h.storyline_id === s.id);
                      const pendingFile = form.storylineHintFiles?.[s.id];
                      const cleared = form.storylineHintClears?.[s.id];
                      const showExisting = existing && existing.hint_audio && !pendingFile && !cleared;
                      return (
                        <div key={s.id} className="border rounded-lg p-2" style={{ borderColor: theme.sidebar_active_bg }}>
                          <div className="text-xs font-medium mb-1" style={headLabelSt}>{s.title}</div>
                          {showExisting && (
                            <div className="flex items-center gap-2 mb-1 text-xs" style={labelSt}>
                              <span className="truncate max-w-[240px]">{existing.hint_audio.split('/').pop()}</span>
                              <button
                                type="button"
                                onClick={() => setForm({
                                  ...form,
                                  storylineHintClears: { ...form.storylineHintClears, [s.id]: true },
                                  storylineHintFiles: { ...form.storylineHintFiles, [s.id]: null },
                                })}
                                className="text-red-500 underline"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                          {pendingFile && (
                            <div className="text-xs mb-1 text-green-600 truncate max-w-[280px]">New: {pendingFile.name}</div>
                          )}
                          {cleared && !pendingFile && (
                            <div className="text-xs mb-1 text-red-500">Will be removed on save</div>
                          )}
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files[0] || null;
                              setForm({
                                ...form,
                                storylineHintFiles: { ...form.storylineHintFiles, [s.id]: file },
                                storylineHintClears: { ...form.storylineHintClears, [s.id]: false },
                              });
                            }}
                            className="w-full p-1.5 border rounded text-xs"
                            style={inputSt}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formError && <div className="text-sm text-red-600">{formError}</div>}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                  style={{ borderColor: theme.sidebar_active_bg, color: theme.sidebar_text }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  {editing ? 'Save Changes' : 'Create Controller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stations;