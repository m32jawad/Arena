import React, { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000/api/auth";

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

/* ─── Avatar SVG ─── */
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
const TeamAvatar = ({ team, size = 56 }) => {
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

/* ─── Position Ribbon ─── */
const PositionRibbon = ({ label }) => (
  <div
    className="absolute top-0 right-0 overflow-hidden"
    style={{ width: 90, height: 90, pointerEvents: "none" }}
  >
    <div
      className="text-[10px] font-bold text-white text-center py-[5px]"
      style={{
        width: 130,
        position: "absolute",
        top: 16,
        right: -36,
        transform: "rotate(45deg)",
        background: "linear-gradient(135deg, #e67e22 0%, #f39c12 100%)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </div>
  </div>
);

/* ─── Live Pulse Indicator ─── */
const LivePulse = () => (
  <span className="relative flex h-2.5 w-2.5 ml-2">
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

export default function LeaderboardPage2() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(() => {
    fetch(`${API_BASE}/public/leaderboard/`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Poll every 5 seconds for live updates */
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const topThree = teams.slice(0, 3);
  const restTeams = teams.slice(3);
  const positionLabels = ["1st Position", "2nd Position", "3rd Position"];

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
          style={{ letterSpacing: "3px" }}
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
        style={{ letterSpacing: "3px" }}
      >
        LEADERBOARD
      </h1>

      <div className="w-full max-w-[600px] flex flex-col gap-4">
        {/* ─── Top 3 Cards ─── */}
        {topThree.length > 0 && (
          <div className={`grid gap-3 mb-3`} style={{ gridTemplateColumns: `repeat(${Math.min(topThree.length, 3)}, 1fr)` }}>
            {topThree.map((team, idx) => (
              <div
                key={team.id}
                className="relative rounded-xl p-4 flex flex-col items-center text-center overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {/* Position Ribbon */}
                <PositionRibbon label={positionLabels[idx]} />

                {/* Avatar */}
                <div className="mt-2 mb-2">
                  <div
                    className="rounded-full overflow-hidden"
                    style={{ border: "3px solid #F39C12" }}
                  >
                    <TeamAvatar team={team} size={56} />
                  </div>
                </div>

                {/* Team Name + Live indicator */}
                <div className="flex items-center justify-center">
                  <span className="text-white text-base font-bold">{team.name}</span>
                  {team.session_status === "live" && <LivePulse />}
                </div>

                {/* Storyline / team size */}
                <span className="text-white/50 text-xs mt-0.5">
                  {team.storyline_title || `Team of ${team.team_size}`}
                </span>

                {/* Checkpoints */}
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: team.total_controllers || 0 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: i < (team.checkpoints_cleared || 0) ? "#D946EF" : "transparent",
                        border: i < (team.checkpoints_cleared || 0) ? "none" : "1.5px solid rgba(217, 70, 239, 0.5)",
                      }}
                    />
                  ))}
                </div>

                {/* Points */}
                <span className="text-white text-lg font-bold mt-2">
                  {(team.points || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ─── Other Teams - 2 column grid ─── */}
        {restTeams.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {restTeams.map((team, idx) => (
              <div
                key={team.id}
                className="rounded-xl px-3 py-3 flex items-center gap-3"
                style={{
                  background:
                    idx % 4 < 2
                      ? "rgba(140, 60, 180, 0.28)"
                      : "rgba(120, 50, 160, 0.18)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Avatar */}
                <div
                  className="rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: "2px solid #F39C12", width: 42, height: 42 }}
                >
                  <TeamAvatar team={team} size={38} />
                </div>

                {/* Name & Points */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center">
                    <span className="text-white text-sm font-semibold truncate">
                      {team.name}
                    </span>
                    {team.session_status === "live" && <LivePulse />}
                  </div>
                  {/* Checkpoint dots */}
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: team.total_controllers || 0 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: i < (team.checkpoints_cleared || 0) ? "#D946EF" : "transparent",
                          border: i < (team.checkpoints_cleared || 0) ? "none" : "1.5px solid rgba(217, 70, 239, 0.4)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Points */}
                <span className="text-white text-base font-bold flex-shrink-0">
                  {(team.points || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
