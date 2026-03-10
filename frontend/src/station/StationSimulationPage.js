import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const defaultApiBase = `http://${window.location.hostname}:8000/api/auth`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

const EVENT_LIMIT = 120;

function nowTime() {
  return new Date().toLocaleTimeString();
}

function parseErrorMessage(payload) {
  if (!payload) return 'Request failed';
  if (typeof payload === 'string') return payload;
  return payload.detail || payload.error || payload.message || 'Request failed';
}

export default function StationSimulationPage() {
  const [searchParams] = useSearchParams();
  const stationIdFromQuery = searchParams.get('station') || searchParams.get('id');

  const [controllers, setControllers] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState('8001');

  const [wsConnected, setWsConnected] = useState(false);
  const [wsReadyState, setWsReadyState] = useState('CLOSED');
  const [stationStatus, setStationStatus] = useState(null);
  const [activityLog, setActivityLog] = useState([]);

  const [rfidTag, setRfidTag] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState('');

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const selectedController = useMemo(
    () => controllers.find((c) => String(c.id) === String(selectedId)) || null,
    [controllers, selectedId]
  );

  const host = useMemo(() => {
    if (manualHost.trim()) return manualHost.trim();
    if (selectedController?.station_host?.trim()) return selectedController.station_host.trim();
    if (selectedController?.ip_address) return selectedController.ip_address;
    return window.location.hostname;
  }, [manualHost, selectedController]);

  const port = useMemo(() => {
    const parsed = Number(manualPort || selectedController?.station_port || 8001);
    if (Number.isNaN(parsed) || parsed <= 0) return 8001;
    return parsed;
  }, [manualPort, selectedController]);

  const baseUrl = `http://${host}:${port}`;
  const wsUrl = `ws://${host}:${port}/ws`;

  const pushLog = (type, message, data) => {
    setActivityLog((prev) => {
      const next = [{ at: nowTime(), type, message, data }, ...prev];
      return next.slice(0, EVENT_LIMIT);
    });
  };

  const disconnectWs = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
    setWsReadyState('CLOSED');
  };

  const connectWs = () => {
    disconnectWs();
    setStationStatus(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setWsReadyState('CONNECTING');
      pushLog('info', `Connecting to ${wsUrl}`);

      ws.onopen = () => {
        setWsConnected(true);
        setWsReadyState('OPEN');
        setActionError('');
        pushLog('socket', 'WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          pushLog('event', `Incoming event: ${payload.type || 'unknown'}`, payload);
          if (payload.type === 'connection' || payload.type === 'status') {
            setStationStatus(payload);
          }
          if (payload.type === 'session_started') {
            setStationStatus((prev) => ({ ...prev, station_mode: 'active', current_session: payload.session }));
          }
          if (payload.type === 'session_ended') {
            setStationStatus((prev) => ({ ...prev, station_mode: 'result', last_result: payload.result, current_session: null }));
          }
          if (payload.type === 'station_reset') {
            setStationStatus((prev) => ({ ...prev, station_mode: 'ready', current_session: null, last_result: null }));
          }
        } catch (err) {
          pushLog('error', `Invalid WebSocket payload: ${err.message}`);
        }
      };

      ws.onerror = () => {
        pushLog('error', 'WebSocket error');
      };

      ws.onclose = () => {
        setWsConnected(false);
        setWsReadyState('CLOSED');
        pushLog('socket', 'WebSocket disconnected');
      };
    } catch (err) {
      setWsConnected(false);
      setWsReadyState('CLOSED');
      setActionError(`Could not connect: ${err.message}`);
      pushLog('error', `Connection failed: ${err.message}`);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/public/controllers/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!mounted) return;
        setControllers(Array.isArray(rows) ? rows : []);
        if (rows?.length) {
          const selectedFromQuery = stationIdFromQuery
            ? rows.find((row) => String(row.id) === String(stationIdFromQuery))
            : null;
          const initial = selectedFromQuery || rows[0];
          setSelectedId(String(initial.id));
          setManualHost(initial.station_host || initial.ip_address || '');
          setManualPort(String(initial.station_port || 8001));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setControllers([]);
      });

    return () => {
      mounted = false;
      disconnectWs();
    };
  }, [stationIdFromQuery]);

  useEffect(() => {
    if (!selectedController) return;
    setManualHost(selectedController.station_host || selectedController.ip_address || '');
    setManualPort(String(selectedController.station_port || 8001));
  }, [selectedController]);

  const callSimulationEndpoint = async (path, body) => {
    setActionError('');
    setIsSending(true);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload));
      }
      pushLog('action', `POST ${path}`, payload);
      return payload;
    } catch (err) {
      const message = err.message || 'Request failed';
      setActionError(message);
      pushLog('error', `POST ${path} failed: ${message}`);
      return null;
    } finally {
      setIsSending(false);
    }
  };

  const sendWs = (payload) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setActionError('WebSocket is not connected.');
      return;
    }
    wsRef.current.send(JSON.stringify(payload));
    pushLog('action', `WS send: ${payload.type}`, payload);
  };

  const scanRfid = () => {
    const tag = rfidTag.trim();
    if (!tag) return;
    callSimulationEndpoint('/simulate/rfid', { rfid_tag: tag });
  };

  const runStopButton = () => callSimulationEndpoint('/simulate/button/stop');
  const runHintButton = () => callSimulationEndpoint('/simulate/button/hint');
  const runSessionEnd = () => callSimulationEndpoint('/session/end');

  return (
    <div style={styles.page}>
      <div style={styles.gradientBackdrop} />
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Station Simulation Console</h1>
            <p style={styles.subtitle}>
              Trigger simulated hardware actions and watch live station events. Keep this page open next to
              <code style={styles.inlineCode}> /station?station=&lt;id&gt;</code> to validate socket-driven UI behavior.
            </p>
          </div>
          <div style={styles.statusPill(wsConnected)}>
            {wsConnected ? 'Socket Live' : 'Socket Offline'}
          </div>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Connection</h2>
            <label style={styles.label}>Controller</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={styles.input}
            >
              <option value="">Select a controller</option>
              {controllers.map((controller) => (
                <option key={controller.id} value={String(controller.id)}>
                  {controller.name}
                </option>
              ))}
            </select>

            <div style={styles.row}>
              <div style={styles.rowCol}>
                <label style={styles.label}>Station Host</label>
                <input
                  value={manualHost}
                  onChange={(e) => setManualHost(e.target.value)}
                  placeholder="192.168.1.10"
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.rowCol, maxWidth: 140 }}>
                <label style={styles.label}>Port</label>
                <input
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="8001"
                  style={styles.input}
                />
              </div>
            </div>

            <p style={styles.monoRow}>REST: {baseUrl}</p>
            <p style={styles.monoRow}>WS: {wsUrl}</p>
            <p style={styles.monoRow}>State: {wsReadyState}</p>

            <div style={styles.row}>
              <button style={styles.buttonPrimary} onClick={connectWs}>Connect Socket</button>
              <button style={styles.buttonGhost} onClick={disconnectWs}>Disconnect</button>
              <button style={styles.buttonGhost} onClick={() => sendWs({ type: 'get_status' })}>Get Status</button>
              <button style={styles.buttonGhost} onClick={() => sendWs({ type: 'ping' })}>Ping</button>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Simulated Hardware Actions</h2>
            <label style={styles.label}>RFID Tag</label>
            <div style={styles.row}>
              <input
                value={rfidTag}
                onChange={(e) => setRfidTag(e.target.value)}
                placeholder="Enter RFID tag"
                style={styles.input}
              />
              <button style={styles.buttonPrimary} disabled={isSending || !rfidTag.trim()} onClick={scanRfid}>
                Simulate RFID Scan
              </button>
            </div>

            <div style={styles.row}>
              <button style={styles.buttonWarning} disabled={isSending} onClick={runHintButton}>
                Simulate Hint Button
              </button>
              <button style={styles.buttonDanger} disabled={isSending} onClick={runStopButton}>
                Simulate Stop Button
              </button>
              <button style={styles.buttonGhost} disabled={isSending} onClick={runSessionEnd}>
                Force End Session
              </button>
            </div>

            {actionError ? <div style={styles.errorBox}>{actionError}</div> : null}
          </section>

          <section style={styles.cardWide}>
            <h2 style={styles.cardTitle}>Station Snapshot</h2>
            <pre style={styles.snapshot}>
              {JSON.stringify(stationStatus || { message: 'No status yet. Connect socket and request status.' }, null, 2)}
            </pre>
          </section>

          <section style={styles.cardWide}>
            <div style={styles.logHeader}>
              <h2 style={styles.cardTitle}>Event Log</h2>
              <button style={styles.buttonGhost} onClick={() => setActivityLog([])}>Clear</button>
            </div>
            <div style={styles.logWrap}>
              {activityLog.length === 0 ? (
                <p style={styles.logEmpty}>No events yet.</p>
              ) : (
                activityLog.map((entry, idx) => (
                  <div key={`${entry.at}-${idx}`} style={styles.logRow}>
                    <span style={styles.logTime}>{entry.at}</span>
                    <span style={styles.logType(entry.type)}>{entry.type.toUpperCase()}</span>
                    <span style={styles.logMsg}>{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    position: 'relative',
    color: '#ecf0f3',
    fontFamily: "'Trebuchet MS', 'Franklin Gothic Medium', sans-serif",
    background: '#10151f',
    padding: '28px 14px',
    boxSizing: 'border-box',
  },
  gradientBackdrop: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 15% 20%, rgba(60, 159, 228, 0.25), transparent 42%), radial-gradient(circle at 80% 10%, rgba(237, 124, 67, 0.22), transparent 38%), radial-gradient(circle at 75% 80%, rgba(95, 205, 137, 0.22), transparent 45%)',
    pointerEvents: 'none',
  },
  container: {
    position: 'relative',
    zIndex: 1,
    width: 'min(1180px, 100%)',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
    letterSpacing: '0.04em',
  },
  subtitle: {
    marginTop: 10,
    maxWidth: 760,
    lineHeight: 1.5,
    color: 'rgba(236, 240, 243, 0.82)',
  },
  inlineCode: {
    marginLeft: 6,
    padding: '2px 6px',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusPill: (live) => ({
    padding: '10px 14px',
    borderRadius: 999,
    border: `1px solid ${live ? '#5fcd89' : '#ed7c43'}`,
    color: live ? '#5fcd89' : '#ed7c43',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: 12,
    backgroundColor: 'rgba(10, 14, 20, 0.7)',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 14,
  },
  card: {
    gridColumn: 'auto',
    background: 'rgba(16, 21, 31, 0.86)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    boxSizing: 'border-box',
  },
  cardWide: {
    gridColumn: '1 / -1',
    background: 'rgba(16, 21, 31, 0.86)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    boxSizing: 'border-box',
  },
  cardTitle: {
    margin: '0 0 14px 0',
    fontSize: '1.06rem',
    letterSpacing: '0.03em',
  },
  row: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  rowCol: {
    flex: 1,
    minWidth: 180,
  },
  label: {
    display: 'block',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(236, 240, 243, 0.74)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 11px',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(10, 14, 20, 0.75)',
    color: '#ecf0f3',
    boxSizing: 'border-box',
  },
  buttonPrimary: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    backgroundColor: '#3c9fe4',
    color: '#08111a',
    cursor: 'pointer',
    fontWeight: 700,
  },
  buttonGhost: {
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '10px 14px',
    backgroundColor: 'transparent',
    color: '#ecf0f3',
    cursor: 'pointer',
    fontWeight: 600,
  },
  buttonWarning: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    backgroundColor: '#f2bc4c',
    color: '#121212',
    cursor: 'pointer',
    fontWeight: 700,
  },
  buttonDanger: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    backgroundColor: '#e05a5a',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  monoRow: {
    margin: '4px 0',
    fontFamily: "'Consolas', monospace",
    fontSize: 12,
    color: 'rgba(236, 240, 243, 0.8)',
    wordBreak: 'break-all',
  },
  errorBox: {
    marginTop: 6,
    border: '1px solid rgba(224, 90, 90, 0.8)',
    color: '#ffb7b7',
    backgroundColor: 'rgba(224, 90, 90, 0.16)',
    borderRadius: 10,
    padding: '10px 12px',
  },
  snapshot: {
    margin: 0,
    backgroundColor: 'rgba(10, 14, 20, 0.76)',
    border: '1px solid rgba(255, 255, 255, 0.13)',
    borderRadius: 10,
    padding: 12,
    maxHeight: 260,
    overflow: 'auto',
    fontFamily: "'Consolas', monospace",
    fontSize: 12,
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logWrap: {
    maxHeight: 340,
    overflow: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    backgroundColor: 'rgba(10, 14, 20, 0.66)',
  },
  logEmpty: {
    margin: 0,
    padding: 14,
    color: 'rgba(236, 240, 243, 0.64)',
  },
  logRow: {
    display: 'grid',
    gridTemplateColumns: '95px 88px 1fr',
    gap: 8,
    alignItems: 'start',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '8px 10px',
    fontFamily: "'Consolas', monospace",
    fontSize: 12,
  },
  logTime: {
    color: 'rgba(236, 240, 243, 0.65)',
  },
  logType: (type) => ({
    color: type === 'error' ? '#ff8d8d' : type === 'action' ? '#f2bc4c' : '#83d3ff',
    fontWeight: 700,
  }),
  logMsg: {
    color: '#ecf0f3',
    wordBreak: 'break-word',
  },
};
