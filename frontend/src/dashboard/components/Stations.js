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
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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

  useEffect(() => {
    fetchControllers();
    // Silent poll every 5 seconds — only metric values update, no loading flash
    const interval = setInterval(() => fetchControllers(true), 5000);
    return () => clearInterval(interval);
  }, [fetchControllers]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (ctl) => {
    setEditing(ctl);
    setForm({
      name: ctl.name,
      ip_address: ctl.ip_address,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editing) {
        await apiFetch(`${API_BASE}/controllers/${editing.id}/`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch(`${API_BASE}/controllers/`, {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
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
                    <h2 className="text-lg font-medium" style={{ ...headLabelSt, fontFamily: headingFont }}>{ctl.name}</h2>
                    <div className="text-xs mt-0.5" style={labelSt}>IP: {ctl.ip_address}</div>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center ml-auto">
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>

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