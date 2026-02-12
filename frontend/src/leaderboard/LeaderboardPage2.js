import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api/auth";

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

  useEffect(() => {
    fetch(`${API_BASE}/public/leaderboard/`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
        } else {
          setTeams(getDemoTeams());
        }
      })
      .catch(() => {
        setTeams(getDemoTeams());
      })
      .finally(() => setLoading(false));
  }, []);

  const getDemoTeams = () => [
    { name: "Team A", top_player: "Top player name", points: 70000 },
    { name: "Team A", top_player: "Top player name", points: 55000 },
    { name: "Team A", top_player: "Top player name", points: 45000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
    { name: "Team Name", points: 55000 },
  ];

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
        <div className="grid grid-cols-3 gap-3 mb-3">
          {topThree.map((team, idx) => (
            <div
              key={idx}
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
                  <AvatarSVG size={56} />
                </div>
              </div>

              {/* Team Name */}
              <span className="text-white text-base font-bold">{team.name}</span>

              {/* Top Player */}
              <span className="text-white/50 text-xs mt-0.5">
                {team.top_player || "Top player name"}
              </span>

              {/* Points */}
              <span className="text-white text-lg font-bold mt-2">
                {(team.points || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Other Teams - 2 column grid ─── */}
        <div className="grid grid-cols-2 gap-3">
          {restTeams.map((team, idx) => (
            <div
              key={idx}
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
                <AvatarSVG size={38} />
              </div>

              {/* Name & Points */}
              <div className="flex flex-col min-w-0">
                <span className="text-white text-sm font-semibold truncate">
                  {team.name}
                </span>
                <span className="text-white text-base font-bold">
                  {(team.points || 0).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
