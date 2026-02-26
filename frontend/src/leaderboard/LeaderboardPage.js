import React, { useState, useEffect, useCallback } from "react";

// Automatically detect host IP/hostname for the backend API
const defaultApiBase = `http://${window.location.hostname}:8000/api/auth`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

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

  const fetchData = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/public/leaderboard/`).then((r) => r.json()).catch(() => []),
      fetch(`${API_BASE}/public/controllers/`).then((r) => r.json()).catch(() => []),
    ]).then(([leaderboardData, controllerData]) => {
      if (Array.isArray(leaderboardData)) setTeams(leaderboardData);
      if (Array.isArray(controllerData)) setControllers(controllerData);
      setLoading(false);
    });
  }, []);

  /* Poll every 5 seconds for live updates */
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
        className="text-white text-4xl md:text-5xl font-extrabold tracking-wide mb-8 text-center uppercase"
        style={{ fontFamily: "'Segoe UI', sans-serif", letterSpacing: "3px" }}
      >
        LEADERBOARD
      </h1>

      <div className="w-full max-w-[500px] flex flex-col gap-3">
        {/* ─── 1st Place Card ─── */}
        {firstTeam && (
          <div
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
                <span className="text-white text-lg font-bold mt-0.5">
                  {(firstTeam.points || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Other Teams ─── */}
        {otherTeams.map((team, idx) => (
          <div
            key={team.id}
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
            <span className="text-white text-lg font-bold flex-shrink-0">
              {(team.points || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
