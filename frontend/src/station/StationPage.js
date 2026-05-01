import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

// Inject CSS animation for pulse effect
if (typeof document !== 'undefined' && !document.getElementById('station-pulse-css')) {
  const style = document.createElement('style');
  style.id = 'station-pulse-css';
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }
    @keyframes hint-bar {
      0%, 100% { transform: scaleY(0.45); opacity: 0.55; }
      50% { transform: scaleY(1); opacity: 1; }
    }
    @keyframes hint-popup-in {
      0% { opacity: 0; transform: translateY(-14px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes hint-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.28); }
      50% { box-shadow: 0 0 0 14px rgba(251,191,36,0); }
    }
    @keyframes stationFadeIn {
      0% { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
      100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

const defaultApiBase = `http://${window.location.hostname}:8000/api/auth`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

const STATES = {
  OFFLINE: 'offline',
  READY:   'ready',
  ACTIVE:  'active',
  RESULT:  'result',
};

const VIDEO_MAP = {
  [STATES.OFFLINE]: '/01-StationOffline.mp4',
  [STATES.READY]:   '/02-StationReady.mp4',
  [STATES.ACTIVE]:  '/03-StationActive.mp4',
  [STATES.RESULT]:  '/04-StationResult.mp4',
};

function getStationConnection(controller) {
  const host = controller?.station_host || controller?.ip_address || window.location.hostname;
  const parsedPort = Number(controller?.station_port || 8001);
  const port = Number.isNaN(parsedPort) || parsedPort <= 0 ? 8001 : parsedPort;
  return { host, port };
}

function formatTime(secs) {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function mapStationStartError(payload) {
  if (!payload) return 'Failed to start session.';
  if (payload.error_code === 'station_already_completed') {
    const controllerName = payload.controller_name ? ` "${payload.controller_name}"` : '';
    return `This session already completed station${controllerName}. Move to a new station and scan again.`;
  }
  return payload.error || payload.message || 'Failed to start session.';
}

function toStationSlug(name, fallbackId) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base) return base;
  if (fallbackId != null) return `station-${fallbackId}`;
  return 'station';
}

const AVATARS = {
  "avatar-1": { bg: "#6C3483", skin: "#F39C12", hair: "#2C3E50" },
  "avatar-2": { bg: "#1ABC9C", skin: "#E74C3C", hair: "#F1C40F" },
  "avatar-3": { bg: "#2980B9", skin: "#E67E22", hair: "#8E44AD" },
  "avatar-4": { bg: "#E74C3C", skin: "#3498DB", hair: "#2ECC71" },
  "avatar-5": { bg: "#8E44AD", skin: "#1ABC9C", hair: "#F39C12" },
  "avatar-6": { bg: "#F39C12", skin: "#9B59B6", hair: "#E74C3C" },
  "avatar-7": { bg: "#2ECC71", skin: "#E74C3C", hair: "#3498DB" },
  "avatar-8": { bg: "#3498DB", skin: "#F1C40F", hair: "#E74C3C" },
  "group-1": { bg: "#FF1493", skin: "#F39C12", hair: "#2C3E50" },
  "group-2": { bg: "#00BFFF", skin: "#E74C3C", hair: "#2ECC71" },
  "group-3": { bg: "#00CED1", skin: "#E67E22", hair: "#8E44AD" },
  "group-4": { bg: "#FF4500", skin: "#3498DB", hair: "#2ECC71" },
};

const RecentAvatar = ({ scan }) => {
  const size = 28;
  if (scan.profile_photo) {
    return <img src={scan.profile_photo} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const av = AVATARS[scan.avatar_id];
  if (av) {
    return (
      <svg viewBox="0 0 80 80" width={size} height={size} style={{ flexShrink: 0 }}>
        <rect width="80" height="80" rx="40" fill={av.bg} />
        <ellipse cx="40" cy="34" rx="13" ry="14" fill={av.skin} />
        <ellipse cx="40" cy="70" rx="22" ry="20" fill={av.skin} />
        <ellipse cx="40" cy="24" rx="14" ry="10" fill={av.hair} />
      </svg>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {scan.party_name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

// ─────────────────────────────────────────────
export default function StationPage() {
  const [searchParams] = useSearchParams();
  const { stationName: stationSlugParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stationId = searchParams.get('station') || searchParams.get('id');

  const devMode = searchParams.get('dev') === '1';

  const [appState,          setAppState]          = useState(STATES.OFFLINE);
  const [fadingOut,         setFadingOut]         = useState(false);
  const [controllers,       setControllers]       = useState([]);
  const [selectedCtrl,      setSelectedCtrl]      = useState(null);
  const [recentScans,       setRecentScans]       = useState([]);
  const stationSimUrl = selectedCtrl
    ? `/station-sim?station=${selectedCtrl.id}`
    : '/station-sim';

  // WebSocket connection
  const [wsConnected,       setWsConnected]       = useState(false);
  const [stationStatus,     setStationStatus]     = useState(null);
  const [lastHealthCheck,   setLastHealthCheck]   = useState(null);
  const wsRef = useRef(null);
  const healthCheckTimerRef = useRef(null);

  // READY
  const [rfidInput,  setRfidInput]  = useState('');
  const [rfidError,  setRfidError]  = useState('');
  const [rfidBusy,   setRfidBusy]   = useState(false);

  // ACTIVE
  const [session,        setSession]        = useState(null); // { id, party_name, rfid_tag, session_minutes }
  const [countdown,      setCountdown]      = useState(0);
  const [stopping,       setStopping]       = useState(false);
  const [storylineHint,  setStorylineHint]  = useState('');
  const [hintAudioUrl,   setHintAudioUrl]   = useState('');
  const [hintPlaying,    setHintPlaying]    = useState(false);

  // RESULT
  const [result,      setResult]      = useState(null);
  const [staffRfid,   setStaffRfid]   = useState('');
  const [staffError,  setStaffError]  = useState('');
  const [staffBusy,   setStaffBusy]   = useState(false);

  const videoRef      = useRef(null);
  const rfidRef       = useRef(null);
  const staffRfidRef  = useRef(null);
  const sessionRef    = useRef(null);  // stable ref for timer callback
  const countdownRef  = useRef(null);
  const hintAudioRef  = useRef(null);  // ref for hint audio element

  // keep sessionRef in sync
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ── video swap ──────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const src = VIDEO_MAP[appState];
    if (src) { v.src = src; v.load(); v.play().catch(() => {}); }
  }, [appState]);

  // ── auto-focus inputs ───────────────────────
  useEffect(() => {
    if (appState === STATES.READY)  setTimeout(() => rfidRef.current?.focus(),     100);
    if (appState === STATES.RESULT) setTimeout(() => staffRfidRef.current?.focus(), 400);
  }, [appState]);

  // ── fetch controllers on mount ──────────────
  useEffect(() => {
    fetch(`${API_BASE}/public/controllers/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setControllers(data))
      .catch(() => {});
  }, []);

  // ── auto-select station from URL param ──────
  useEffect(() => {
    if (controllers.length === 0) return;

    let ctrl = null;
    if (stationSlugParam) {
      const normalizedSlug = decodeURIComponent(stationSlugParam).toLowerCase();
      ctrl = controllers.find(c => toStationSlug(c.name, c.id) === normalizedSlug);
    }

    if (!ctrl && stationId) {
      ctrl = controllers.find(c => String(c.id) === String(stationId));
    }

    if (ctrl) {
      setSelectedCtrl(ctrl);
      setAppState(prev => (prev === STATES.OFFLINE ? STATES.READY : prev));
    }
  }, [stationSlugParam, stationId, controllers]);

  // ── keep station URL canonicalized as /station/<name-slug> ──────
  useEffect(() => {
    if (!selectedCtrl) return;
    const slug = toStationSlug(selectedCtrl.name, selectedCtrl.id);
    const targetPath = `/station/${slug}`;
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  }, [selectedCtrl, location.pathname, navigate]);

  // ── monitor station health (mark stale after 30s) ───────────
  useEffect(() => {
    if (!wsConnected || !lastHealthCheck) return;
    
    const checkHealth = setInterval(() => {
      const now = new Date();
      const elapsed = (now - lastHealthCheck) / 1000; // seconds
      
      // If no response in 30 seconds, consider connection unhealthy
      if (elapsed > 30) {
        console.warn('⚠️ Station health check timeout - no response in 30s');
        // Could optionally set a flag here to show warning
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(checkHealth);
  }, [wsConnected, lastHealthCheck]);

  // ── HTTP fallback: poll station health when WebSocket is down ───────
  useEffect(() => {
    if (wsConnected || !selectedCtrl) return;
    
    // Fallback: try HTTP health check every 15 seconds
    const pollStationHealth = async () => {
      try {
        const { host: stationHost, port: stationPort } = getStationConnection(selectedCtrl);
        const response = await fetch(`http://${stationHost}:${stationPort}/health`, {
          timeout: 3000,
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Station health (HTTP):', data);
          // Get full status
          const statusResponse = await fetch(`http://${stationHost}:${stationPort}/`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            setStationStatus({
              station_id: statusData.station_id,
              station_name: statusData.station_name,
              hardware_mode: statusData.hardware_mode,
              has_active_session: statusData.has_active_session,
            });
            setLastHealthCheck(new Date());
          }
        }
      } catch (err) {
        console.log('❌ HTTP health check failed:', err.message);
      }
    };
    
    pollStationHealth(); // Initial check
    const interval = setInterval(pollStationHealth, 15000);
    return () => clearInterval(interval);
  }, [wsConnected, selectedCtrl]);

  // ── poll recent scans while READY ───────────
  const fetchRecent = useCallback(() => {
    if (!selectedCtrl) return;
    fetch(`${API_BASE}/rfid/station-recent/?controller_id=${selectedCtrl.id}&limit=3`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRecentScans(d.recent_scans || []); })
      .catch(() => {});
  }, [selectedCtrl]);

  useEffect(() => {
    if (appState === STATES.READY) {
      fetchRecent();
      const t = setInterval(fetchRecent, 10_000);
      return () => clearInterval(t);
    }
  }, [appState, fetchRecent]);

  // ── countdown ticker ────────────────────────
  useEffect(() => {
    if (appState !== STATES.ACTIVE) return;
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          // auto-stop using the stable ref so we don't capture stale state
          doStop(sessionRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [appState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket connection to station hardware ────────────────────────
  useEffect(() => {
    if (!selectedCtrl) return;

    // Connect to station hardware WebSocket
    const { host: stationHost, port: stationPort } = getStationConnection(selectedCtrl);
    const wsUrl = `ws://${stationHost}:${stationPort}/ws`;

    console.log(`🔌 Connecting to station WebSocket: ${wsUrl}`);

    let ws = null;
    let reconnectTimeout = null;
    let heartbeatInterval = null;

    const connect = () => {
      try {
        console.log(`🔌 Creating WebSocket connection to: ${wsUrl}`);
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ Connected to station hardware');
          setWsConnected(true);
          // Don't set appState here — the 'connection' message from station
          // will sync the correct state (READY, ACTIVE, or RESULT)

          // Send heartbeat and status check every 10 seconds
          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              console.log('💓 Sending ping and get_status');
              ws.send(JSON.stringify({ type: 'ping' }));
              ws.send(JSON.stringify({ type: 'get_status' }));
            } else {
              console.log('⚠️ WebSocket not open, readyState:', ws?.readyState);
            }
          }, 10000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 Station message:', data);
            console.log('📨 Message type:', data.type);
            console.log('📨 Full message:', JSON.stringify(data, null, 2));

            switch (data.type) {
              case 'connection':
                // Initial connection — sync state with station
                console.log('🔌 Connection message received, station mode:', data.station_mode);
                setStationStatus({
                  station_id: data.station_id,
                  station_name: data.station_name,
                  hardware_mode: data.hardware_mode,
                  station_mode: data.station_mode,
                  has_active_session: data.current_session ? true : false,
                });
                setLastHealthCheck(new Date());
                
                // Sync frontend state with station mode
                if (data.station_mode === 'active' && data.current_session) {
                  console.log('🔄 Resuming active session');
                  const sess = data.current_session;
                  setSession({
                    id: sess.session_id,
                    party_name: sess.party_name,
                    rfid_tag: sess.rfid_tag,
                    session_minutes: sess.session_minutes,
                    per_station_seconds: sess.per_station_seconds,
                    total_controllers: sess.total_controllers,
                    current_controller_index: sess.current_controller_index,
                    is_end_controller: sess.is_end_controller,
                  });
                  setCountdown(sess.station_remaining_seconds || sess.per_station_seconds || 0);
                  setStorylineHint(sess.storyline_hint || '');
                  setHintAudioUrl(sess.hint_audio || '');
                  setAppState(STATES.ACTIVE);
                } else if (data.station_mode === 'result' && data.last_result) {
                  console.log('🔄 Resuming result screen');
                  setResult({
                    party_name: data.last_result.party_name,
                    points: data.last_result.total_points,
                    station_points: data.last_result.station_points,
                    station_elapsed_seconds: data.last_result.station_elapsed_seconds,
                    station_remaining_seconds: data.last_result.station_remaining_seconds,
                    per_station_seconds: data.last_result.per_station_seconds,
                    session_ended: data.last_result.session_ended,
                    current_controller_index: data.last_result.current_controller_index,
                    total_controllers: data.last_result.total_controllers,
                    controller_name: data.last_result.controller_name,
                  });
                  setAppState(STATES.RESULT);
                } else if (data.station_mode === 'ready') {
                  setAppState(STATES.READY);
                }
                break;

              case 'session_started': {
                // Hardware detected RFID scan and started session
                console.log('🎮 Session started event received');
                const startSess = data.session;
                const hwSessionData = {
                  id: startSess.session_id,
                  party_name: startSess.party_name,
                  rfid_tag: startSess.rfid_tag,
                  session_minutes: startSess.session_minutes,
                  per_station_seconds: startSess.per_station_seconds,
                  total_controllers: startSess.total_controllers,
                  current_controller_index: startSess.current_controller_index,
                  is_end_controller: startSess.is_end_controller,
                };
                const hwCountdown = startSess.station_remaining_seconds || startSess.per_station_seconds || startSess.session_minutes * 60;
                setRfidInput('');
                setRfidError('');
                transitionTo(STATES.ACTIVE, () => {
                  setSession(hwSessionData);
                  setCountdown(hwCountdown);
                  setStorylineHint(startSess.storyline_hint || '');
                  setHintAudioUrl(startSess.hint_audio || '');
                });
                break;
              }

              case 'session_ended': {
                // Session completed at this station (stop button pressed)
                console.log('🏁 Session ended event received');
                const endResult = data.result;
                const hwResultData = {
                  party_name: endResult.party_name,
                  points: endResult.total_points,
                  station_points: endResult.station_points,
                  station_elapsed_seconds: endResult.station_elapsed_seconds,
                  station_remaining_seconds: endResult.station_remaining_seconds,
                  per_station_seconds: endResult.per_station_seconds,
                  session_ended: endResult.session_ended,
                  current_controller_index: endResult.current_controller_index,
                  total_controllers: endResult.total_controllers,
                  controller_name: endResult.controller_name,
                };
                clearInterval(countdownRef.current);
                if (hintAudioRef.current) { hintAudioRef.current.pause(); hintAudioRef.current = null; }
                setHintPlaying(false);
                transitionTo(STATES.RESULT, () => {
                  setResult(hwResultData);
                  setSession(null);
                  setHintAudioUrl('');
                });
                break;
              }

              case 'station_reset': {
                // Staff scanned card on RESULT screen — go back to READY
                console.log('🔄 Station reset received');
                if (hintAudioRef.current) { hintAudioRef.current.pause(); hintAudioRef.current = null; }
                setHintPlaying(false);
                transitionTo(STATES.READY, () => {
                  setResult(null);
                  setSession(null);
                  setRfidInput('');
                  setRfidError('');
                  setStaffRfid('');
                  setStaffError('');
                  setStorylineHint('');
                  setHintAudioUrl('');
                });
                break;
              }

              case 'button_press':
                // Hardware button pressed
                console.log('🔘 Button press:', data.button);
                if (data.button === 'hint') {
                  const audioUrl = data.hint_audio || hintAudioUrl;
                  if (audioUrl) {
                    playHintAudio(audioUrl);
                  }
                  if (data.hint) {
                    setStorylineHint(data.hint);
                  }
                }
                break;

              case 'error':
                console.log('❌ Error received:', data.message);
                setRfidError(mapStationStartError(data));
                setTimeout(() => setRfidError(''), 8000);
                break;

              case 'pong':
                setLastHealthCheck(new Date());
                break;

              case 'status':
                setStationStatus({
                  station_id: data.station_id,
                  station_name: data.station_name,
                  hardware_mode: data.hardware_mode,
                  station_mode: data.station_mode,
                  has_active_session: data.current_session ? true : false,
                });
                setLastHealthCheck(new Date());
                break;

              default:
                console.log('Unknown message type:', data.type);
                break;
            }
          } catch (err) {
            console.error('❌ Error parsing station message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('🔌 Disconnected from station hardware');
          setWsConnected(false);
          // Keep current appState — don't reset to OFFLINE on disconnect
          // The reconnect will re-sync state via 'connection' message
          wsRef.current = null;

          // Clear heartbeat
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          // Try to reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 5000);
        };
      } catch (err) {
        console.error('❌ Failed to create WebSocket:', err);
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
      setWsConnected(false);
      setStationStatus(null);
      setLastHealthCheck(null);
    };
  }, [selectedCtrl]); // Only reconnect when station changes, NOT on appState change

  // ── fade transition helper ────────────────────
  function transitionTo(newState, action) {
    setFadingOut(true);
    setTimeout(() => {
      if (action) action();
      setAppState(newState);
      setFadingOut(false);
    }, 380);
  }

  // ── helpers ──────────────────────────────────
  const playHintAudio = useCallback((audioUrl) => {
    if (!audioUrl) return;

    try {
      if (hintAudioRef.current) {
        hintAudioRef.current.pause();
        hintAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audio.onplay = () => setHintPlaying(true);
      audio.onpause = () => setHintPlaying(false);
      audio.onended = () => setHintPlaying(false);
      audio.onerror = () => setHintPlaying(false);

      hintAudioRef.current = audio;
      audio.play().catch(err => {
        console.error('Audio play failed:', err);
        setHintPlaying(false);
      });
    } catch (err) {
      console.error('Failed to play hint audio:', err);
      setHintPlaying(false);
    }
  }, []);

  async function doStop(sess) {
    if (!sess) return;
    clearInterval(countdownRef.current);
    setStopping(true);
    try {
      const body = { rfid: sess.rfid_tag };
      // Pass controller IP if we know it
      if (selectedCtrl?.ip_address) body.controller_ip = selectedCtrl.ip_address;
      
      const res  = await fetch(`${API_BASE}/rfid/stop/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const resultData = res.ok ? {
        party_name:            data.party_name || sess.party_name,
        points:                data.total_points,
        station_points:        data.station_points,
        station_elapsed_seconds: data.station_elapsed_seconds,
        station_remaining_seconds: data.station_remaining_seconds,
        per_station_seconds:   data.per_station_seconds,
        session_ended:         data.session_ended,
        current_controller_index: data.current_controller_index,
        total_controllers:     data.total_controllers,
        controller_name:       data.controller_name,
      } : {
        party_name: sess.party_name,
        points: null,
        error: data.error || 'Could not end session.',
      };
      setStopping(false);
      transitionTo(STATES.RESULT, () => setResult(resultData));
    } catch {
      setStopping(false);
      transitionTo(STATES.RESULT, () => setResult({ party_name: sess.party_name, points: null, error: 'Connection error.' }));
    }
  }

  // ── READY: RFID submit ───────────────────────
  async function handleRfidSubmit() {
    const rfid = rfidInput.trim();
    if (!rfid) return;
    setRfidError(''); setRfidBusy(true);
    try {
      // 1. Check session status
      const stRes  = await fetch(`${API_BASE}/rfid/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid }),
      });
      const stData = await stRes.json();
      if (!stRes.ok || stData.session_status !== 'active') {
        setRfidError(stData.error || `No active session for this tag (${stData.session_status || 'unknown'}).`);
        return;
      }
      // 2. Start / resume
      const startBody = { rfid };
      if (selectedCtrl?.ip_address) startBody.controller_ip = selectedCtrl.ip_address;
      const startRes  = await fetch(`${API_BASE}/rfid/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startBody),
      });
      const startData = await startRes.json();
      if (!startRes.ok) { setRfidError(mapStationStartError(startData)); return; }

      const sessionData = {
        id: startData.session_id,
        party_name: startData.party_name,
        rfid_tag: rfid,
        session_minutes: startData.session_minutes,
        per_station_seconds: startData.per_station_seconds,
        total_controllers: startData.total_controllers,
        current_controller_index: startData.current_controller_index,
        is_end_controller: startData.is_end_controller,
      };
      const countdownVal = startData.station_remaining_seconds || startData.per_station_seconds || startData.remaining_seconds;
      setRfidInput('');
      transitionTo(STATES.ACTIVE, () => {
        setSession(sessionData);
        setCountdown(countdownVal);
        setStorylineHint(startData.storyline_hint || '');
        setHintAudioUrl(startData.hint_audio || '');
      });
    } catch { setRfidError('Connection error. Please try again.'); }
    finally   { setRfidBusy(false); }
  }

  // ── ACTIVE: manual stop ──────────────────────
  function handleStopSession() {
    if (stopping) return;
    doStop(session);
  }

  // ── RESULT: staff RFID reset ─────────────────
  async function handleStaffRfid() {
    const rfid = staffRfid.trim();
    if (!rfid) return;
    setStaffError(''); setStaffBusy(true);
    try {
      const res  = await fetch(`${API_BASE}/rfid/check-staff/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid }),
      });
      const data = await res.json();
      if (res.ok && data.is_staff) {
        if (hintAudioRef.current) { hintAudioRef.current.pause(); hintAudioRef.current = null; }
        setHintPlaying(false);
        transitionTo(STATES.READY, () => {
          setStaffRfid(''); setStaffError('');
          setResult(null); setSession(null);
          setRfidInput(''); setRfidError('');
          setStorylineHint(''); setHintAudioUrl('');
        });
      } else {
        setStaffError(data.error || 'Not a valid staff RFID.');
      }
    } catch { setStaffError('Connection error. Please try again.'); }
    finally   { setStaffBusy(false); }
  }

  // ── OFFLINE: station selector ─────────────────
  if (appState === STATES.OFFLINE) {
    return (
      <div style={styles.container}>
        <video ref={videoRef} style={styles.video} autoPlay loop muted playsInline src={VIDEO_MAP.offline} />
        <div style={styles.selectorOverlay}>
          <div style={styles.selectorBox}>
            <h2 style={styles.selectorTitle}>Select Station</h2>
            {controllers.length === 0
              ? <p style={styles.selectorEmpty}>No stations found. Add controllers in the dashboard.</p>
              : <div style={styles.selectorList}>
                  {controllers.map(ctrl => (
                    <button key={ctrl.id} style={styles.selectorBtn}
                      onClick={() => {
                        setSelectedCtrl(ctrl);
                        setAppState(STATES.READY);
                        navigate(`/station/${toStationSlug(ctrl.name, ctrl.id)}`);
                      }}>
                      {ctrl.name}
                    </button>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────
  return (
    <div style={styles.container}>
      {/* background video */}
      <video ref={videoRef} style={styles.video} autoPlay loop muted playsInline src={VIDEO_MAP[appState]} />
      {/* dim overlay */}
      <div style={styles.dimOverlay} />

      {/* station name badge */}
      {selectedCtrl && <div style={styles.stationBadge}>{selectedCtrl.name}</div>}
      {/* <a href={stationSimUrl} style={styles.simulatorBadge}>Open Simulator</a> */}

      {/* ─── READY ─── */}
      {appState === STATES.READY && (
        <div style={{ ...styles.centerPanel, opacity: fadingOut ? 0 : 1, transition: 'opacity 0.35s linear', animation: fadingOut ? 'none' : 'stationFadeIn 0.45s ease' }}>
          <h1 style={styles.stateTitle}>READY</h1>
          
          {/* Station health status indicator */}
          <div style={styles.statusPanel}>
            <div style={{
              ...styles.statusIndicator,
              backgroundColor: wsConnected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)',
              borderColor: wsConnected ? '#00ff00' : '#ffa500',
            }}>
              <span style={{ fontSize: '18px', marginRight: '8px' }}>
                {wsConnected ? '●' : '○'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {wsConnected ? 'Hardware Connected' : 'Manual Mode'}
                </div>
                {stationStatus && wsConnected && (
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    {stationStatus.hardware_mode === 'simulated' ? '🧪 Simulation Mode' : '⚙️ Real Hardware'}
                    {lastHealthCheck && (
                      <span style={{ marginLeft: '12px' }}>
                        Last: {lastHealthCheck.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Waiting message — always shown, scanning happens via hardware */}
          <p style={styles.stateSubtitle}>
            {wsConnected
              ? 'Scan your RFID tag on the reader to begin'
              : 'Scan or enter your RFID tag to begin'}
          </p>

          {/* Animated scan indicator when hardware connected */}
          {wsConnected && (
            <div style={styles.scanPulse}>
              <div style={styles.scanIcon}></div>
              <p style={styles.scanText}>Waiting for RFID scan…</p>
            </div>
          )}

          {/* Manual input — when no hardware OR in dev mode */}
          {(!wsConnected || devMode) && (
            <div style={styles.inputRow}>
              <input
                ref={rfidRef}
                type="text"
                value={rfidInput}
                onChange={e => { setRfidInput(e.target.value); setRfidError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleRfidSubmit()}
                placeholder="RFID / Card Number"
                style={styles.textInput}
                autoComplete="off"
              />
              <button
                onClick={handleRfidSubmit}
                disabled={rfidBusy || !rfidInput.trim()}
                style={{ ...styles.greenBtn, opacity: (rfidBusy || !rfidInput.trim()) ? 0.5 : 1 }}
              >
                {rfidBusy ? 'Checking…' : 'START'}
              </button>
            </div>
          )}

          {/* Error banner — shown prominently */}
          {rfidError && (
            <div style={styles.errorBannerLarge}>
              <span style={{ fontSize: '24px', marginRight: '10px' }}>⚠️</span>
              <span>{rfidError}</span>
            </div>
          )}

          {recentScans.length > 0 && (
            <div style={styles.recentBox}>
              <p style={styles.recentHeading}>LAST TEAMS AT THIS STATION</p>
              {recentScans.map((scan, i) => (
                <div key={i} style={{ ...styles.recentRow, ...(i < recentScans.length - 1 ? styles.recentRowBorder : {}) }}>
                  <span style={styles.recentRank}>#{i + 1}</span>
                  <RecentAvatar scan={scan} />
                  <span style={styles.recentName}>{scan.party_name}</span>
                  <span style={styles.recentPts}>{scan.points_earned ?? scan.station_points ?? scan.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVE ─── */}
      {appState === STATES.ACTIVE && session && (
        <div style={{ ...styles.centerPanel, opacity: fadingOut ? 0 : 1, transition: 'opacity 0.35s linear', animation: fadingOut ? 'none' : 'stationFadeIn 0.45s ease' }}>
          <div style={styles.activeDot} />
          <p  style={styles.activeLabel}>SESSION ACTIVE</p>
          <h1 style={styles.teamName}>{session.party_name}</h1>

          {session.total_controllers > 1 && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', margin: 0 }}>
              STATION {(session.current_controller_index || 0) + 1} OF {session.total_controllers}
            </p>
          )}

          <div style={styles.timerCard}>
            <span style={styles.timerDigits}>{formatTime(countdown)}</span>
            <span style={styles.timerSub}>STATION TIME REMAINING</span>
          </div>

          <button
            onClick={handleStopSession}
            disabled={stopping}
            style={{ ...styles.stopBtn, opacity: stopping ? 0.5 : 1, display: devMode ? undefined : 'none'}}
          >
            {stopping ? 'Stopping…' : 'STOP'}
          </button>

          {hintPlaying && (
            <div style={styles.hintPopup}>
              <div style={styles.hintPopupIcon}>💡</div>
              <div style={styles.hintPopupTextWrap}>
                <span style={styles.hintPlayingLabel}>HINT PLAYING</span>
                {storylineHint && (
                  <span style={styles.hintPlayingSubtext}>{storylineHint}</span>
                )}
              </div>
              <div style={styles.hintBars}>
                <span style={{ ...styles.hintBar, animationDelay: '0s' }} />
                <span style={{ ...styles.hintBar, animationDelay: '0.12s' }} />
                <span style={{ ...styles.hintBar, animationDelay: '0.24s' }} />
                <span style={{ ...styles.hintBar, animationDelay: '0.36s' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── RESULT ─── */}
      {appState === STATES.RESULT && result && (
        <div style={{ ...styles.centerPanel, opacity: fadingOut ? 0 : 1, transition: 'opacity 0.35s linear', animation: fadingOut ? 'none' : 'stationFadeIn 0.45s ease' }}>
          <h1 style={styles.resultHeading}>
            {result.session_ended ? 'SESSION COMPLETE' : 'STATION COMPLETE'}
          </h1>
          <p  style={styles.resultTeam}>{result.party_name}</p>

          {result.points != null ? (
            <>
              {/* Per-station points */}
              <div style={styles.pointsCard}>
                <span style={styles.pointsNumber}>{result.station_points ?? result.points}</span>
                <span style={styles.pointsLabel}>
                  {result.session_ended ? 'STATION POINTS' : 'POINTS THIS STATION'}
                </span>
                {result.per_station_seconds > 0 && result.station_remaining_seconds != null && (
                  <span style={styles.bonusChip}>
                    {formatTime(result.station_remaining_seconds)} remaining of {formatTime(result.per_station_seconds)}
                  </span>
                )}
              </div>

              {/* Total points — always shown */}
              <div style={{ ...styles.pointsCard, borderColor: 'rgba(34,197,94,0.38)', backgroundColor: 'rgba(34,197,94,0.1)', marginTop: 8 }}>
                <span style={{ ...styles.pointsNumber, fontSize: 52 }}>{result.points}</span>
                <span style={{ ...styles.pointsLabel, color: '#22c55e' }}>TOTAL POINTS</span>
              </div>

              {/* Progress indicator */}
              {result.total_controllers > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', marginTop: 4 }}>
                  Station {result.current_controller_index} of {result.total_controllers}
                  {!result.session_ended && ' — Move to the next station and scan your card'}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: '#f87171', marginTop: 12 }}>{result.error}</p>
          )}

          {wsConnected ? (
            // Hardware mode — staff scans card on the reader to reset
            <div style={styles.staffBox}>
              <p style={styles.staffHeading}>STAFF — SCAN YOUR RFID TAG TO RESET STATION</p>
              <div style={styles.scanPulse}>
                <div style={styles.scanIcon}></div>
                <p style={styles.scanText}>Waiting for staff card…</p>
              </div>
              {rfidError && (
                <div style={{ ...styles.errorBannerLarge, marginTop: '12px' }}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>⚠️</span>
                  <span>{rfidError}</span>
                </div>
              )}
            </div>
          ) : (
            // Manual mode — staff enters RFID
            <div style={styles.staffBox}>
              <p style={styles.staffHeading}>STAFF — SCAN RFID TO RESET STATION</p>
              <div style={styles.inputRow}>
                <input
                  ref={staffRfidRef}
                  type="password"
                  value={staffRfid}
                  onChange={e => { setStaffRfid(e.target.value); setStaffError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleStaffRfid()}
                  placeholder="Staff RFID"
                  style={styles.textInput}
                  autoComplete="off"
                />
                <button
                  onClick={handleStaffRfid}
                  disabled={staffBusy || !staffRfid.trim()}
                  style={{ ...styles.greenBtn, opacity: (staffBusy || !staffRfid.trim()) ? 0.5 : 1 }}
                >
                  {staffBusy ? '…' : 'RESET'}
                </button>
              </div>
              {staffError && <div style={styles.errorBanner}>{staffError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  video: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    minWidth: '100%', minHeight: '100%',
    width: 'auto', height: 'auto',
    objectFit: 'cover',
    zIndex: 0,
  },
  dimOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 1,
  },
  stationBadge: {
    position: 'absolute',
    top: 18, left: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 12, fontWeight: 700,
    padding: '5px 14px',
    borderRadius: 20,
    backdropFilter: 'blur(6px)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    zIndex: 10,
  },
  simulatorBadge: {
    position: 'absolute',
    top: 18,
    right: 20,
    backgroundColor: 'rgba(15,80,145,0.75)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    padding: '6px 12px',
    borderRadius: 20,
    backdropFilter: 'blur(6px)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    zIndex: 10,
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  centerPanel: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    width: '90%',
    maxWidth: 500,
    textAlign: 'center',
  },

  // READY
  stateTitle: {
    color: '#fff',
    fontSize: 52, fontWeight: 900,
    letterSpacing: '0.18em',
    margin: 0,
    textShadow: '0 2px 24px rgba(0,0,0,0.7)',
  },
  statusPanel: {
    width: '100%',
    marginBottom: 16,
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 18px',
    borderRadius: 12,
    border: '2px solid',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    backdropFilter: 'blur(8px)',
    textTransform: 'uppercase',
  },
  scanPulse: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '24px 0',
  },
  scanIcon: {
    fontSize: 48,
    animation: 'pulse 2s ease-in-out infinite',
  },
  scanText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  errorBannerLarge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fca5a5',
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: 'rgba(239,68,68,0.2)',
    border: '2px solid rgba(239,68,68,0.5)',
    padding: '14px 20px',
    borderRadius: 12,
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'center',
    backdropFilter: 'blur(8px)',
  },
  stateSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15, margin: 0,
    letterSpacing: '0.03em',
  },
  inputRow: { display: 'flex', gap: 8, width: '100%' },
  textInput: {
    flex: 1,
    padding: '13px 16px',
    borderRadius: 10,
    border: '2px solid rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 16,
    outline: 'none',
    backdropFilter: 'blur(8px)',
    letterSpacing: '0.04em',
  },
  greenBtn: {
    padding: '13px 22px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#22c55e',
    color: '#fff',
    fontSize: 15, fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s',
  },
  errorBanner: {
    color: '#fca5a5',
    fontSize: 13,
    backgroundColor: 'rgba(239,68,68,0.18)',
    border: '1px solid rgba(239,68,68,0.35)',
    padding: '8px 14px',
    borderRadius: 8,
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  recentBox: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 12,
    padding: '14px 18px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  recentHeading: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10, fontWeight: 700,
    letterSpacing: '0.14em',
    margin: '0 0 10px',
    textTransform: 'uppercase',
  },
  recentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    marginBottom: 8,
  },
  recentRowBorder: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
  recentRank: { color: 'rgba(255,255,255,0.38)', fontSize: 12, fontWeight: 700, minWidth: 22 },
  recentName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: 600, textAlign: 'left' },
  recentPts:  { color: '#fbbf24', fontSize: 13, fontWeight: 700 },

  // ACTIVE
  activeDot: {
    width: 14, height: 14,
    borderRadius: '50%',
    backgroundColor: '#f59e0b',
    boxShadow: '0 0 14px 5px rgba(245,158,11,0.55)',
  },
  activeLabel: {
    color: '#f59e0b',
    fontSize: 13, fontWeight: 700,
    letterSpacing: '0.22em',
    margin: 0,
  },
  teamName: {
    color: '#fff',
    fontSize: 54, fontWeight: 900,
    margin: 0,
    letterSpacing: '-0.02em',
    textShadow: '0 2px 28px rgba(0,0,0,0.75)',
    wordBreak: 'break-word',
  },
  timerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 16,
    padding: '20px 52px',
    backdropFilter: 'blur(10px)',
    border: '2px solid rgba(245,158,11,0.38)',
    margin: '4px 0',
  },
  timerDigits: {
    color: '#fff',
    fontSize: 88, fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  timerSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.22em',
    marginTop: 4,
  },
  stopBtn: {
    padding: '15px 42px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 17, fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: 6,
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 24px rgba(239,68,68,0.4)',
  },

  // RESULT
  resultHeading: {
    color: '#a855f7',
    fontSize: 34, fontWeight: 800,
    letterSpacing: '0.13em',
    margin: 0,
    textShadow: '0 2px 20px rgba(168,85,247,0.45)',
  },
  resultTeam: {
    color: '#fff',
    fontSize: 48, fontWeight: 900,
    margin: 0,
    letterSpacing: '-0.02em',
    wordBreak: 'break-word',
  },
  pointsCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: 16,
    padding: '20px 64px',
    border: '2px solid rgba(168,85,247,0.38)',
    backdropFilter: 'blur(10px)',
  },
  pointsNumber: {
    color: '#fff',
    fontSize: 92, fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  pointsLabel: {
    color: '#a855f7',
    fontSize: 12, fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  bonusChip: {
    color: '#fbbf24',
    fontSize: 13, fontWeight: 600,
    marginTop: 6,
  },
  staffBox: {
    width: '100%',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 12,
    padding: '16px 18px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  staffHeading: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10, fontWeight: 700,
    letterSpacing: '0.14em',
    margin: '0 0 10px',
    textTransform: 'uppercase',
  },

  // HINT
  hintBtn: {
    padding: '12px 32px',
    borderRadius: 12,
    border: '2px solid rgba(251,191,36,0.55)',
    backgroundColor: 'rgba(251,191,36,0.12)',
    color: '#fbbf24',
    fontSize: 15, fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: 4,
    backdropFilter: 'blur(8px)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  hintPopup: {
    position: 'fixed',
    top: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    borderRadius: 999,
    backgroundColor: 'rgba(20,14,6,0.9)',
    border: '1px solid rgba(251,191,36,0.55)',
    backdropFilter: 'blur(10px)',
    animation: 'hint-popup-in 220ms ease-out',
  },
  hintPopupIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    backgroundColor: 'rgba(251,191,36,0.2)',
    animation: 'hint-glow 1.1s ease-out infinite',
  },
  hintPlayingLabel: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.14em',
    whiteSpace: 'nowrap',
  },
  hintPopupTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
    maxWidth: 360,
  },
  hintPlayingSubtext: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 300,
  },
  hintBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 3,
    height: 14,
  },
  hintBar: {
    width: 3,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
    transformOrigin: 'bottom',
    animation: 'hint-bar 0.8s ease-in-out infinite',
  },
  hintOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintModal: {
    backgroundColor: 'rgba(15,12,30,0.97)',
    backdropFilter: 'blur(20px)',
    border: '2px solid rgba(251,191,36,0.35)',
    borderRadius: 18,
    padding: '32px 36px',
    maxWidth: 520,
    width: '90%',
    boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
  },
  hintModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hintModalTitle: {
    color: '#fbbf24',
    fontSize: 18, fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  hintCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 4,
  },
  hintModalText: {
    color: '#fff',
    fontSize: 17,
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap',
    margin: 0,
  },

  // OFFLINE selector
  selectorOverlay: {
    position: 'absolute', inset: 0, zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  selectorBox: {
    backgroundColor: 'rgba(12,12,22,0.9)',
    borderRadius: 16,
    padding: '36px 48px',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
    minWidth: 340,
    textAlign: 'center',
  },
  selectorTitle: {
    color: '#fff',
    fontSize: 24, fontWeight: 700,
    marginBottom: 20,
    letterSpacing: '0.08em',
  },
  selectorEmpty: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  selectorList: { display: 'flex', flexDirection: 'column', gap: 10 },
  selectorBtn: {
    padding: '12px 24px',
    borderRadius: 10,
    border: '2px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontSize: 16, fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'background 0.2s',
  },
};
