import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";

// Automatically detect host IP/hostname for the backend API
const defaultApiBase = `http://${window.location.hostname}:8000/api/auth`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;
const FILTER_ORDER = ["active", "7days", "all"];

/* ─── Pre-built avatars (must match signup page) ─── */
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

/* ─── Avatar SVG (reusable) ─── */
const AvatarSVG = ({ bg = "#F39C12", skin = "#E67E22", hair = "#2C3E50", size = 64 }) => (
  <svg viewBox="0 0 80 80" width={size} height={size}>
    <rect width="80" height="80" rx="40" fill={bg} />
    <ellipse cx="40" cy="34" rx="13" ry="14" fill={skin} />
    <ellipse cx="40" cy="70" rx="22" ry="20" fill={skin} />
    <ellipse cx="40" cy="24" rx="14" ry="10" fill={hair} />
    <circle cx="34" cy="34" r="2" fill="#fff" />
    <circle cx="46" cy="34" r="2" fill="#fff" />
    <circle cx="34" cy="34" r="1" fill="#222" />
    <circle cx="46" cy="34" r="1" fill="#222" />
    <path d="M36 40 Q40 44 44 40" stroke="#222" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

/* ─── Team Avatar: renders photo, avatar preset, or fallback initial ─── */
const TeamAvatar = ({ team, size = 64 }) => {
  if (team.profile_photo) {
    return (
      <img
        src={team.profile_photo}
        alt={team.name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const av = AVATARS[team.avatar_id];
  if (av) {
    return <AvatarSVG bg={av.bg} skin={av.skin} hair={av.hair} size={size} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, #9b30ff 0%, #a83279 100%)",
      }}
    >
      {team.name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
};

/* ─── Controller Circles (checkpoints) ─── */
const ControllerCircles = ({ controllers, clearedIds }) => {
  if (!controllers || controllers.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {controllers.map((c) => {
        const isCleared = clearedIds.includes(c.id);
        return (
          <div
            key={c.id}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: isCleared ? "#D946EF" : "transparent",
              border: isCleared ? "none" : "2px solid rgba(217, 70, 239, 0.5)",
              boxShadow: isCleared ? "0 0 6px rgba(217, 70, 239, 0.6)" : "none",
            }}
            title={`${c.name}${isCleared ? " ✓" : ""}`}
          />
        );
      })}
    </div>
  );
};

/* ─── Group Avatars (3 overlapping, for 1st place) ─── */
const GroupAvatars = ({ team, size = 80 }) => {
  // If team has a profile photo, show it large instead of group
  if (team.profile_photo) {
    return (
      <div
        className="rounded-full overflow-hidden"
        style={{ border: "3px solid #00BFFF", width: size, height: size }}
      >
        <img
          src={team.profile_photo}
          alt={team.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const av = AVATARS[team.avatar_id];
  if (av) {
    return (
      <div
        className="rounded-full overflow-hidden"
        style={{ border: "3px solid #F39C12", width: size, height: size }}
      >
        <AvatarSVG bg={av.bg} skin={av.skin} hair={av.hair} size={size - 6} />
      </div>
    );
  }

  // Fallback: initial letter
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        border: "3px solid #F39C12",
        background: "linear-gradient(135deg, #9b30ff 0%, #a83279 100%)",
      }}
    >
      {team.name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
};

/* ─── Live Pulse Indicator ─── */
const LivePulse = () => (
  <span className="relative flex h-2.5 w-2.5 ml-1.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
  </span>
);

/* ─── RollingNumber: count-up animation on score increase ─── */
const RollingNumber = ({ value, className, style }) => {
  const motionVal = useMotionValue(value);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());
  const prevRef = useRef(value);
  const [display, setDisplay] = useState(value.toLocaleString());

  useEffect(() => {
    const unsubscribe = rounded.onChange((v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    if (value !== prevRef.current) {
      // Only animate upward (score increase)
      if (value > prevRef.current) {
        const controls = animate(motionVal, value, {
          duration: 1.2,
          ease: [0.22, 1, 0.36, 1],
        });
        prevRef.current = value;
        return () => controls.stop();
      } else {
        // Score reset or decreased — jump immediately
        motionVal.set(value);
        setDisplay(value.toLocaleString());
        prevRef.current = value;
      }
    }
  }, [value, motionVal]);

  return <span className={className} style={style}>{display}</span>;
};

const VideoBg = () => (
  <>
    <video
      autoPlay
      loop
      muted
      playsInline
      className="fixed inset-0 w-full h-full object-cover"
      style={{ zIndex: -1 }}
    >
      <source src="/bgvideo.mp4" type="video/mp4" />
    </video>
    <div
      className="fixed inset-0"
      style={{ zIndex: -1, background: "rgba(10, 5, 20, 0.5)" }}
    />
  </>
);

export default function LeaderboardPage() {
  const [teams, setTeams] = useState([]);
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active' (default), '7days', 'all'
  const [autoRotate, setAutoRotate] = useState(false);
  const [rotationMinutes, setRotationMinutes] = useState(1);
  // Track which team IDs recently gained points for the glow flash
  const [scoredIds, setScoredIds] = useState(new Set());
  const prevScoresRef = useRef({});

  useEffect(() => {
    fetch(`${API_BASE}/public/leaderboard-settings/`)
      .then((r) => r.json())
      .then((data) => {
        if (FILTER_ORDER.includes(data.default_filter)) {
          setFilter(data.default_filter);
        }
        setAutoRotate(Boolean(data.auto_rotate));
        setRotationMinutes(Math.max(1, Number(data.rotation_minutes) || 1));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/public/leaderboard/?filter=${filter}`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/public/controllers/`).then((r) => r.json()).catch(() => []),
    ]).then(([leaderboardData, controllerData]) => {
      if (Array.isArray(leaderboardData)) {
        // Detect score increases
        const newlyScored = new Set();
        leaderboardData.forEach((team) => {
          const prev = prevScoresRef.current[team.id];
          if (prev !== undefined && team.points > prev) {
            newlyScored.add(team.id);
          }
          prevScoresRef.current[team.id] = team.points;
        });
        if (newlyScored.size > 0) {
          setScoredIds(newlyScored);
          setTimeout(() => setScoredIds(new Set()), 2000);
        }
        setTeams(leaderboardData);
      }
      if (Array.isArray(controllerData)) setControllers(controllerData);
      setLoading(false);
    });
  }, [filter]);

  /* Poll every 5 seconds for live updates */
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!autoRotate) return undefined;

    const intervalMs = Math.max(1, rotationMinutes) * 60 * 1000;
    const interval = setInterval(() => {
      setFilter((prev) => {
        const idx = FILTER_ORDER.indexOf(prev);
        if (idx === -1) return FILTER_ORDER[0];
        return FILTER_ORDER[(idx + 1) % FILTER_ORDER.length];
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [autoRotate, rotationMinutes]);

  // Get cleared controller IDs for a team
  const getClearedIds = (team) =>
    (team.checkpoints || []).map((cp) => cp.controller_id);

  const firstTeam = teams[0];
  const otherTeams = teams.slice(1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <VideoBg />
        <div className="text-white/60 text-lg">Loading...</div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <VideoBg />
        <h1
          className="text-white text-4xl md:text-5xl font-extrabold tracking-wide mb-6 text-center uppercase"
          style={{ fontFamily: "'Segoe UI', sans-serif", letterSpacing: "3px" }}
        >
          LEADERBOARD
        </h1>
        <p className="text-white/50 text-lg">No active sessions yet. Sign up to get started!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <VideoBg />
      {/* Title */}
      <h1
        className="text-white text-4xl md:text-5xl font-extrabold tracking-wide mb-4 text-center uppercase"
        style={{ fontFamily: "'Segoe UI', sans-serif", letterSpacing: "3px" }}
      >
        LEADERBOARD
      </h1>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'active', label: 'Active Sessions' },
          { key: '7days', label: 'Past 7 Days' },
          { key: 'all', label: 'All Time' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              backgroundColor: filter === f.key ? 'rgba(217,70,239,0.8)' : 'rgba(255,255,255,0.1)',
              color: filter === f.key ? '#fff' : 'rgba(255,255,255,0.6)',
              border: filter === f.key ? '1px solid rgba(217,70,239,0.9)' : '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <motion.div layout className="w-full max-w-[500px] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {/* ─── 1st Place Card ─── */}
          {firstTeam && (
            <motion.div
              key={firstTeam.id}
              layout
              layoutId={`team-${firstTeam.id}`}
              initial={{ opacity: 0, y: -40 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: scoredIds.has(firstTeam.id)
                  ? [
                      "0 0 0px rgba(217,70,239,0)",
                      "0 0 32px rgba(217,70,239,0.9)",
                      "0 0 16px rgba(217,70,239,0.5)",
                      "0 0 0px rgba(217,70,239,0)",
                    ]
                  : "0 0 0px rgba(217,70,239,0)",
              }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ layout: { type: "spring", stiffness: 500, damping: 35 }, duration: 0.5 }}
              className="rounded-xl p-5 mb-2"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div className="flex items-center gap-4">
                <GroupAvatars team={firstTeam} size={70} />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center">
                    <span className="text-white text-xl font-bold">{firstTeam.name}</span>
                    {firstTeam.session_status === "live" && <LivePulse />}
                  </div>
                  {/* Controller circles = checkpoints */}
                  <ControllerCircles
                    controllers={controllers}
                    clearedIds={getClearedIds(firstTeam)}
                  />
                  <RollingNumber
                    value={firstTeam.points || 0}
                    className="text-white text-lg font-bold mt-0.5"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Other Teams ─── */}
          {otherTeams.map((team, idx) => (
            <motion.div
              key={team.id}
              layout
              layoutId={`team-${team.id}`}
              initial={{ opacity: 0, y: -40 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: scoredIds.has(team.id)
                  ? [
                      "0 0 0px rgba(217,70,239,0)",
                      "0 0 28px rgba(217,70,239,0.85)",
                      "0 0 14px rgba(217,70,239,0.5)",
                      "0 0 0px rgba(217,70,239,0)",
                    ]
                  : "0 0 0px rgba(217,70,239,0)",
              }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ layout: { type: "spring", stiffness: 500, damping: 35 }, duration: 0.5 }}
              className="rounded-xl px-4 py-3 flex items-center gap-4"
              style={{
                background:
                  idx % 2 === 0
                    ? "rgba(140, 60, 180, 0.25)"
                    : "rgba(120, 50, 160, 0.18)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Avatar */}
              <div
                className="rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "3px solid #F39C12", width: 50, height: 50 }}
              >
                <TeamAvatar team={team} size={44} />
              </div>

              {/* Name + Controller Circles */}
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center">
                  <span className="text-white text-base font-semibold">{team.name}</span>
                  {team.session_status === "live" && <LivePulse />}
                </div>
                <ControllerCircles
                  controllers={controllers}
                  clearedIds={getClearedIds(team)}
                />
              </div>

              {/* Points */}
              <RollingNumber
                value={team.points || 0}
                className="text-white text-lg font-bold flex-shrink-0"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
