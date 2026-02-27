import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api/auth';

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

function formatTime(secs) {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
export default function StationPage() {
  const [searchParams] = useSearchParams();
  const stationId = searchParams.get('station') || searchParams.get('id');

  const [appState,          setAppState]          = useState(STATES.OFFLINE);
  const [controllers,       setControllers]       = useState([]);
  const [selectedCtrl,      setSelectedCtrl]      = useState(null);
  const [recentScans,       setRecentScans]       = useState([]);

  // READY
  const [rfidInput,  setRfidInput]  = useState('');
  const [rfidError,  setRfidError]  = useState('');
  const [rfidBusy,   setRfidBusy]   = useState(false);

  // ACTIVE
  const [session,        setSession]        = useState(null); // { id, party_name, rfid_tag, session_minutes }
  const [countdown,      setCountdown]      = useState(0);
  const [stopping,       setStopping]       = useState(false);
  const [storylineHint,  setStorylineHint]  = useState('');
  const [showHint,       setShowHint]       = useState(false);

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
    if (stationId && controllers.length > 0) {
      const ctrl = controllers.find(c => String(c.id) === String(stationId));
      if (ctrl) { setSelectedCtrl(ctrl); setAppState(STATES.READY); }
    }
  }, [stationId, controllers]);

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

  // ── helpers ──────────────────────────────────
  async function doStop(sess) {
    if (!sess) return;
    clearInterval(countdownRef.current);
    setStopping(true);
    try {
      const res  = await fetch(`${API_BASE}/rfid/stop/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid: sess.rfid_tag }),
      });
      const data = await res.json();
      setResult(res.ok ? {
        party_name:            data.party_name || sess.party_name,
        points:                data.total_points,
        elapsed_seconds:       data.elapsed_seconds,
        remaining_points_added: data.remaining_points_added,
      } : {
        party_name: sess.party_name,
        points: null,
        error: data.error || 'Could not end session.',
      });
    } catch {
      setResult({ party_name: sess.party_name, points: null, error: 'Connection error.' });
    } finally {
      setStopping(false);
      setAppState(STATES.RESULT);
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
      const startRes  = await fetch(`${API_BASE}/rfid/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) { setRfidError(startData.error || 'Failed to start session.'); return; }

      setSession({ id: startData.session_id, party_name: startData.party_name, rfid_tag: rfid, session_minutes: startData.session_minutes });
      setCountdown(startData.remaining_seconds);
      setStorylineHint(startData.storyline_hint || '');
      setShowHint(false);
      setRfidInput('');
      setAppState(STATES.ACTIVE);
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
        setStaffRfid(''); setStaffError('');
        setResult(null); setSession(null);
        setRfidInput(''); setRfidError('');
        setStorylineHint(''); setShowHint(false);
        setAppState(STATES.READY);
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
                      onClick={() => { setSelectedCtrl(ctrl); setAppState(STATES.READY); }}>
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

      {/* ─── READY ─── */}
      {appState === STATES.READY && (
        <div style={styles.centerPanel}>
          <h1 style={styles.stateTitle}>READY</h1>
          <p  style={styles.stateSubtitle}>Scan or enter your RFID tag to begin</p>

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
          {rfidError && <div style={styles.errorBanner}>{rfidError}</div>}

          {recentScans.length > 0 && (
            <div style={styles.recentBox}>
              <p style={styles.recentHeading}>LAST TEAMS AT THIS STATION</p>
              {recentScans.map((scan, i) => (
                <div key={i} style={{ ...styles.recentRow, ...(i < recentScans.length - 1 ? styles.recentRowBorder : {}) }}>
                  <span style={styles.recentRank}>#{i + 1}</span>
                  <span style={styles.recentName}>{scan.party_name}</span>
                  <span style={styles.recentPts}>+{scan.points_earned} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ACTIVE ─── */}
      {appState === STATES.ACTIVE && session && (
        <div style={styles.centerPanel}>
          <div style={styles.activeDot} />
          <p  style={styles.activeLabel}>SESSION ACTIVE</p>
          <h1 style={styles.teamName}>{session.party_name}</h1>

          <div style={styles.timerCard}>
            <span style={styles.timerDigits}>{formatTime(countdown)}</span>
            <span style={styles.timerSub}>REMAINING</span>
          </div>

          <button
            onClick={handleStopSession}
            disabled={stopping}
            style={{ ...styles.stopBtn, opacity: stopping ? 0.5 : 1 }}
          >
            {stopping ? 'Stopping…' : 'STOP SESSION'}
          </button>

          <button
            onClick={() => storylineHint ? setShowHint(true) : null}
            style={{
              ...styles.hintBtn,
              opacity: storylineHint ? 1 : 0.35,
              cursor: storylineHint ? 'pointer' : 'default',
            }}
            title={storylineHint ? 'Show hint' : 'No hint for this storyline'}
          >
            💡 HINT
          </button>
        </div>
      )}

      {/* ─── HINT POPUP ─── */}
      {showHint && storylineHint && (
        <div style={styles.hintOverlay} onClick={() => setShowHint(false)}>
          <div style={styles.hintModal} onClick={e => e.stopPropagation()}>
            <div style={styles.hintModalHeader}>
              <span style={styles.hintModalTitle}>💡 HINT</span>
              <button onClick={() => setShowHint(false)} style={styles.hintCloseBtn}>✕</button>
            </div>
            <p style={styles.hintModalText}>{storylineHint}</p>
          </div>
        </div>
      )}

      {/* ─── RESULT ─── */}
      {appState === STATES.RESULT && result && (
        <div style={styles.centerPanel}>
          <h1 style={styles.resultHeading}>SESSION COMPLETE</h1>
          <p  style={styles.resultTeam}>{result.party_name}</p>

          {result.points != null ? (
            <div style={styles.pointsCard}>
              <span style={styles.pointsNumber}>{result.points}</span>
              <span style={styles.pointsLabel}>TOTAL POINTS</span>
              {result.remaining_points_added > 0 && (
                <span style={styles.bonusChip}>+{result.remaining_points_added} time bonus</span>
              )}
            </div>
          ) : (
            <p style={{ color: '#f87171', marginTop: 12 }}>{result.error}</p>
          )}

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
