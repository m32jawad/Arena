import React, { useState, useEffect, useRef } from 'react';

const STATES = {
  OFFLINE: 'offline',
  READY: 'ready',
  ACTIVE: 'active',
  RESULT: 'result',
};

const VIDEO_MAP = {
  [STATES.OFFLINE]: '/01-StationOffline.mp4',
  [STATES.READY]: '/02-StationReady.mp4',
  [STATES.ACTIVE]: '/03-StationActive.mp4',
  [STATES.RESULT]: '/04-StationResult.mp4',
};

const LABEL_MAP = {
  [STATES.OFFLINE]: 'Offline',
  [STATES.READY]: 'Ready',
  [STATES.ACTIVE]: 'Active',
  [STATES.RESULT]: 'Result',
};

export default function StationPage() {
  const [currentState, setCurrentState] = useState(STATES.OFFLINE);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = VIDEO_MAP[currentState];
    video.load();
    video.play().catch(() => {});
  }, [currentState]);

  return (
    <div style={styles.container}>
      {/* Full-screen looping video */}
      <video
        ref={videoRef}
        style={styles.video}
        autoPlay
        loop
        muted
        playsInline
        src={VIDEO_MAP[currentState]}
      />

      {/* State badge */}
      <div style={styles.badge}>
        <span style={styles.dot(currentState)} />
        {LABEL_MAP[currentState]}
      </div>

      {/* State switcher controls */}
      <div style={styles.controls}>
        {Object.values(STATES).map((s) => (
          <button
            key={s}
            onClick={() => setCurrentState(s)}
            style={{
              ...styles.btn,
              ...(currentState === s ? styles.btnActive : {}),
            }}
          >
            {LABEL_MAP[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

const DOT_COLOR = {
  [STATES.OFFLINE]: '#aaaaaa',
  [STATES.READY]: '#22c55e',
  [STATES.ACTIVE]: '#f59e0b',
  [STATES.RESULT]: '#a855f7',
};

const styles = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    minWidth: '100%',
    minHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'cover',
  },
  badge: {
    position: 'absolute',
    top: 20,
    left: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: 20,
    backdropFilter: 'blur(6px)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    userSelect: 'none',
  },
  dot: (state) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: DOT_COLOR[state] || '#fff',
    display: 'inline-block',
    flexShrink: 0,
  }),
  controls: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 12,
  },
  btn: {
    padding: '10px 22px',
    borderRadius: 8,
    border: '2px solid rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    transition: 'background 0.2s, border-color 0.2s',
  },
  btnActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#fff',
  },
};
