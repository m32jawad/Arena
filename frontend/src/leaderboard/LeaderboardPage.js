import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api/auth";

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

/* ─── Progress Dots ─── */
const ProgressDots = ({ filled = 3, total = 10 }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="w-3 h-3 rounded-full"
        style={{
          backgroundColor: i < filled ? "#D946EF" : "transparent",
          border: i < filled ? "none" : "2px solid rgba(217, 70, 239, 0.5)",
        }}
      />
    ))}
  </div>
);

/* ─── Group Avatars (3 overlapping, for 1st place) ─── */
const GroupAvatars = ({ size = 80 }) => {
  const avatars = [
    { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#00BFFF" },
    { bg: "#E74C3C", skin: "#D4A07A", hair: "#1a1a2e", border: "#FF1493" },
    { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#F39C12" },
  ];
  return (
    <div className="relative flex items-center" style={{ width: size * 2.2, height: size }}>
      {avatars.map((av, idx) => (
        <div
          key={idx}
          className="absolute rounded-full overflow-hidden"
          style={{
            left: `${idx * (size * 0.6)}px`,
            zIndex: idx === 1 ? 2 : 1,
            border: `3px solid ${av.border}`,
            width: size,
            height: size,
          }}
        >
          <AvatarSVG bg={av.bg} skin={av.skin} hair={av.hair} size={size - 6} />
        </div>
      ))}
    </div>
  );
};

/* ─── Single Avatar (for other teams) ─── */
const SingleAvatar = ({ size = 52 }) => (
  <div
    className="rounded-full overflow-hidden flex-shrink-0"
    style={{ border: "3px solid #F39C12", width: size, height: size }}
  >
    <AvatarSVG bg="#F39C12" skin="#E67E22" hair="#2C3E50" size={size - 6} />
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

export default function LeaderboardPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch real leaderboard data
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
    { name: "Team A", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
    { name: "Team Name", points: 50000, filled: 3 },
  ];

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
              <GroupAvatars size={70} />
              <div className="flex flex-col gap-1.5">
                <span className="text-white text-xl font-bold">{firstTeam.name}</span>
                <ProgressDots filled={firstTeam.filled || 3} total={10} />
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
            key={idx}
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
            <SingleAvatar size={50} />

            {/* Name + Dots */}
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-white text-base font-semibold">{team.name}</span>
              <ProgressDots filled={team.filled || 3} total={10} />
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
