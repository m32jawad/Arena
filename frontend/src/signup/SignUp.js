import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppTheme } from "../context/AppThemeContext";

// Automatically detect host IP/hostname for the backend API
const defaultApiBase = `http://${window.location.hostname}:8000/api`;
const API_BASE = process.env.REACT_APP_API_BASE || defaultApiBase;

/* ─── Pre-built avatar collection ─── */
const AVATARS = [
  { id: "avatar-1", bg: "#6C3483", skin: "#F39C12", hair: "#2C3E50" },
  { id: "avatar-2", bg: "#1ABC9C", skin: "#E74C3C", hair: "#F1C40F" },
  { id: "avatar-3", bg: "#2980B9", skin: "#E67E22", hair: "#8E44AD" },
  { id: "avatar-4", bg: "#E74C3C", skin: "#3498DB", hair: "#2ECC71" },
  { id: "avatar-5", bg: "#8E44AD", skin: "#1ABC9C", hair: "#F39C12" },
  { id: "avatar-6", bg: "#F39C12", skin: "#9B59B6", hair: "#E74C3C" },
  { id: "avatar-7", bg: "#2ECC71", skin: "#E74C3C", hair: "#3498DB" },
  { id: "avatar-8", bg: "#3498DB", skin: "#F1C40F", hair: "#E74C3C" },
];

const AvatarSVG = ({ bg, skin, hair, size = 64 }) => (
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

const ThemedVideoBg = ({ appTheme }) => {
  if (appTheme.background_type === 'video' && appTheme.background_video) {
    return (
      <>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover"
          style={{ zIndex: -1 }}
        >
          <source src={appTheme.background_video} type="video/mp4" />
        </video>
        <div
          className="fixed inset-0"
          style={{ zIndex: -1, background: "rgba(10, 5, 20, 0.5)" }}
        />
      </>
    );
  }

  if (appTheme.background_type === 'image' && appTheme.background_image) {
    return (
      <div
        className="fixed inset-0"
        style={{
          zIndex: -1,
          backgroundImage: `url(${appTheme.background_image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    );
  }

  if (appTheme.background_type === 'gradient') {
    return (
      <div
        className="fixed inset-0"
        style={{
          zIndex: -1,
          background: appTheme.background_value,
        }}
      />
    );
  }

  // Default: solid color
  return (
    <div
      className="fixed inset-0"
      style={{
        zIndex: -1,
        background: appTheme.background_value,
      }}
    />
  );
};

export default function SignUp() {
  const { appTheme } = useAppTheme();

  const [step, setStep] = useState(1);
  const [partyName, setPartyName] = useState("");
  const [email, setEmail] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [receiveOffers, setReceiveOffers] = useState(false);

  const [storylines, setStorylines] = useState([]);
  const [selectedStoryline, setSelectedStoryline] = useState(null);
  const [viewingStory, setViewingStory] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupPhoto, setGroupPhoto] = useState(null);

  /* Camera / selfie / avatar state */
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Dynamic button style based on theme
  const btnStyle = {
    background: appTheme.button_color,
    color: appTheme.button_text_color,
  };

  // Dynamic field style with theme colors
  const fieldStyle = {
    background: "rgba(255,255,255,0.06)",
    appearance: "none",
    color: appTheme.font_color,
    fontFamily: appTheme.font_family ? `${appTheme.font_family}, sans-serif` : 'inherit',
  };

  /* Open camera */
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      // clear previous selections
      setSelfieBlob(null);
      setSelfiePreview(null);
      setSelectedAvatar(null);
      setGroupPhoto(null);
      setSelectedGroup(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      alert("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  /* Capture photo from camera */
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const photoUrl = URL.createObjectURL(blob);
      setSelfieBlob(blob);
      setSelfiePreview(photoUrl);
      setGroupPhoto(photoUrl);
      // stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      setCameraOpen(false);
      // clear selections when photo taken
      setSelectedAvatar(null);
      setSelectedGroup(null);
    }, "image/jpeg", 0.85);
  }, []);

  /* Close camera without capture */
  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setCameraOpen(false);
  }, []);

  /* Select avatar */
  const pickAvatar = useCallback((av) => {
    setSelectedAvatar(av);
    // clear selfie when avatar picked
    setSelfieBlob(null);
    setSelfiePreview(null);
    setGroupPhoto(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      setCameraOpen(false);
    }
  }, []);

  /* Handle file upload (fallback) */
  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelfieBlob(file);
    setSelfiePreview(URL.createObjectURL(file));
    setSelectedAvatar(null);
    setGroupPhoto(null);
  }, []);

  /* Submit signup */
  const handleSignup = useCallback(async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("party_name", partyName);
      fd.append("email", email);
      fd.append("team_size", teamSize || "1");
      fd.append("receive_offers", receiveOffers ? "true" : "false");
      if (selectedStoryline) fd.append("storyline_id", selectedStoryline);
      if (selfieBlob) {
        fd.append("profile_photo", selfieBlob, "selfie.jpg");
      }
      if (selectedAvatar) {
        fd.append("avatar_id", selectedAvatar.id);
      }
      if (selectedGroup) {
        fd.append("group_id", selectedGroup);
      }

      const res = await fetch(`${API_BASE}/public/signup/`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setSignupDone(true);
      } else {
        const err = await res.json();
        alert(err.error || "Signup failed.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [partyName, email, teamSize, receiveOffers, selectedStoryline, selfieBlob, selectedAvatar, selectedGroup]);

  /* Cleanup camera on unmount */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (step === 2) {
      fetch(`${API_BASE}/public/storylines/`)
        .then((res) => res.json())
        .then((data) => setStorylines(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [step]);

  /* ─── Step 3: Group Selection with Avatars ─── */
  if (step === 3) {
    /* Success screen after signup */
    if (signupDone) {
      return (
        <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ fontFamily: appTheme.font_family ? `${appTheme.font_family}, sans-serif` : 'inherit' }}>
          <ThemedVideoBg appTheme={appTheme} />
          <div className="w-full max-w-[400px] flex flex-col items-center text-center">
            <img src="/logo.png" alt="Unreal Place" className="w-40 mb-6 cursor-pointer" onClick={() => { setSignupDone(false); setStep(1); }} />
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: appTheme.font_color }}>Request Submitted!</h2>
            <p style={{ color: `${appTheme.font_color}99` }} className="text-sm">Your signup is pending approval. You'll be notified once approved.</p>
          </div>
        </div>
      );
    }

    /* Group avatars configuration */
    const groups = [
      {
        id: 1,
        name: "Group 1",
        avatars: [
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#FF1493" },
          { bg: "#3498DB", skin: "#E74C3C", hair: "#2ECC71", border: "#FF1493" },
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#FF1493" },
        ],
        borderColor: "#FF1493",
      },
      {
        id: 2,
        name: "Group 2",
        avatars: [
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#00BFFF" },
          { bg: "#3498DB", skin: "#E74C3C", hair: "#2ECC71", border: "#00BFFF" },
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#00BFFF" },
        ],
        borderColor: "#00BFFF",
      },
      {
        id: 3,
        name: "Group 3",
        avatars: [
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#00FFFF" },
          { bg: "#3498DB", skin: "#E74C3C", hair: "#2ECC71", border: "#00FFFF" },
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#00FFFF" },
        ],
        borderColor: "#00FFFF",
      },
      {
        id: 4,
        name: "Group 4",
        avatars: [
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#FF4500" },
          { bg: "#3498DB", skin: "#E74C3C", hair: "#2ECC71", border: "#FF4500" },
          { bg: "#F39C12", skin: "#E67E22", hair: "#2C3E50", border: "#FF4500" },
        ],
        borderColor: "#FF4500",
      },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-8" style={{ fontFamily: appTheme.font_family ? `${appTheme.font_family}, sans-serif` : 'inherit' }}>
        <ThemedVideoBg appTheme={appTheme} />
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <img src="/logo.png" alt="Unreal Place" className="w-40 mb-6 cursor-pointer" onClick={() => { closeCamera(); setStep(1); }} />

          {/* Realistic Group Photo Section */}
          <div className="w-full flex flex-col items-center mb-4">
            {cameraOpen ? (
              /* Live camera preview */
              <div className="relative w-full flex flex-col items-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-60 h-60 rounded-2xl object-cover border-4"
                  style={{ transform: "scaleX(-1)", borderColor: appTheme.button_color }}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold border-none cursor-pointer transition hover:opacity-90"
                    style={btnStyle}
                  >
                    Capture
                  </button>
                  <button
                    onClick={closeCamera}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold border bg-transparent cursor-pointer hover:opacity-60 transition"
                    style={{ borderColor: appTheme.font_color, color: appTheme.font_color }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : groupPhoto ? (
              /* Group photo preview */
              <div className="flex flex-col items-center">
                <img
                  src={groupPhoto}
                  alt="Group photo"
                  className="w-48 h-48 rounded-2xl object-cover border-4"
                  style={{ borderColor: '#22c55e' }}
                />
                <button
                  onClick={openCamera}
                  className="mt-3 px-4 py-2 rounded-lg text-xs border bg-transparent cursor-pointer hover:opacity-60 transition"
                  style={{ borderColor: appTheme.font_color, color: appTheme.font_color }}
                >
                  Retake
                </button>
              </div>
            ) : (
              /* Camera button */
              <button
                onClick={openCamera}
                className="w-full flex flex-col items-center justify-center py-6 rounded-2xl bg-white/5 border-2 border-dashed cursor-pointer hover:bg-white/10 transition"
                style={{
                  borderColor: appTheme.button_color,
                }}
              >
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: appTheme.font_color }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                </div>
                <span className="text-base font-semibold" style={{ color: appTheme.font_color }}>Realistic Group Photo</span>
              </button>
            )}
          </div>

          {/* OR divider */}
          <div className="flex items-center w-full my-5">
            <div className="flex-1 h-px" style={{ background: appTheme.font_color + '33' }}></div>
            <span className="px-4 text-sm font-semibold tracking-wider" style={{ color: appTheme.font_color + '99' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: appTheme.font_color + '33' }}></div>
          </div>

          {/* Groups Grid */}
          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroup(group.id);
                  setGroupPhoto(null);
                }}
                className={`flex flex-col items-center py-6 px-4 rounded-2xl bg-white/5 cursor-pointer transition hover:bg-white/10`}
                style={{
                  borderWidth: selectedGroup === group.id ? '4px' : '2px',
                  borderColor: selectedGroup === group.id ? group.borderColor : "rgba(255,255,255,0.1)",
                  borderStyle: 'solid',
                }}
              >
                <span className="text-sm font-semibold mb-3" style={{ color: appTheme.font_color }}>{group.name}</span>
                <div className="relative flex items-center justify-center" style={{ width: "120px", height: "50px" }}>
                  {group.avatars.map((avatar, idx) => (
                    <div
                      key={idx}
                      className="absolute"
                      style={{
                        left: `${idx * 28}px`,
                        zIndex: idx,
                      }}
                    >
                      <div
                        className="rounded-full border-[3px] overflow-hidden"
                        style={{ borderColor: group.borderColor }}
                      >
                        <AvatarSVG bg={avatar.bg} skin={avatar.skin} hair={avatar.hair} size={44} />
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Signup button */}
          <button
            className="w-full py-4 rounded-2xl text-lg font-semibold cursor-pointer border-none transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={btnStyle}
            disabled={submitting || (!groupPhoto && !selectedGroup)}
            onClick={handleSignup}
          >
            {submitting ? "Submitting…" : "Signup"}
          </button>

          {/* Terms */}
          <p className="text-xs mt-4 text-center" style={{ color: `${appTheme.font_color}99` }}>
            * By Clicking <span className="font-bold" style={{ color: appTheme.font_color }}>Signup</span> I Accept{" "}
            <span style={{ color: appTheme.button_color }} className="cursor-pointer">Terms and Conditions</span>
          </p>
        </div>
      </div>
    );
  }

  /* ─── Step 2: Select Storyline ─── */
  if (step === 2) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-5 py-8"
        style={{ fontFamily: appTheme.font_family ? `${appTheme.font_family}, sans-serif` : 'inherit' }}
      >
        <ThemedVideoBg appTheme={appTheme} />
        <div className="w-full max-w-[400px] flex flex-col items-center">
        <img src="/logo.png" alt="Unreal Place" className="w-40 mb-2 cursor-pointer" onClick={() => setStep(1)} />

          {/* Back button */}
          <button
            onClick={() => setStep(1)}
            className="self-start flex items-center gap-1.5 text-sm bg-transparent border-none cursor-pointer hover:opacity-60 transition mb-2 -mt-1"
            style={{ color: `${appTheme.font_color}b3` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 className="text-3xl font-bold my-3 mb-6 text-center" style={{ color: appTheme.font_color }}>
            Select Storyline
          </h1>

          {/* Container with fixed height that becomes scrollable when there are more than 2 storylines */}
          <div
            className="w-full mb-6"
            style={{
              maxHeight: storylines.length > 2 ? "320px" : "auto",
              overflowY: storylines.length > 2 ? "auto" : "visible",
              scrollbarWidth: "thin",
              scrollbarColor: appTheme.button_color + " transparent",
              paddingRight: storylines.length > 2 ? "8px" : "0",
            }}
          >
            <div className="flex flex-col gap-4">
              {storylines.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-stretch rounded-xl border overflow-hidden cursor-pointer transition`}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: selectedStoryline === s.id ? appTheme.button_color : "rgba(255,255,255,0.1)",
                    borderWidth: '1px',
                  }}
                  onClick={() => setSelectedStoryline(s.id)}
                >
                  {s.image && (
                    <img
                      src={s.image}
                      alt={s.title}
                      className="w-24 min-h-full object-cover flex-shrink-0"
                    />
                  )}
                  <div className="p-3.5 flex flex-col gap-1.5">
                    <h3 className="text-lg font-bold m-0" style={{ color: appTheme.font_color }}>
                      {s.title}
                    </h3>
                    <p className="text-[13px] leading-snug m-0 line-clamp-4" style={{ color: `${appTheme.font_color}b3` }}>
                      {s.text}
                    </p>
                    {s.text && s.text.length > 100 && (
                      <button
                        className="bg-transparent border-none text-xs cursor-pointer p-0 mt-1 text-left hover:underline"
                        style={{ color: appTheme.button_color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingStory(s);
                        }}
                      >
                        View all
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            className="w-full py-4 rounded-2xl text-lg font-semibold cursor-pointer border-none transition hover:opacity-90"
            style={btnStyle}
            onClick={() => setStep(3)}
          >
            Step 2 of 3
          </button>
        </div>

        {/* Storyline Modal */}
        {viewingStory && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5"
            onClick={() => setViewingStory(null)}
          >
            <div
              className="rounded-xl w-full max-w-[480px] p-6 relative max-h-[80vh] overflow-y-auto"
              style={{ background: "#1e1035" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-4 bg-transparent border-none text-2xl cursor-pointer"
                style={{ color: appTheme.font_color }}
                onClick={() => setViewingStory(null)}
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-3" style={{ color: appTheme.font_color }}>
                {viewingStory.title}
              </h2>
              {viewingStory.image && (
                <img
                  src={viewingStory.image}
                  alt={viewingStory.title}
                  className="w-full max-h-48 object-cover rounded-lg mb-4"
                />
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap m-0" style={{ color: `${appTheme.font_color}cc` }}>
                {viewingStory.text}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── Step 1: Sign Up ─── */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-8"
      style={{ fontFamily: appTheme.font_family ? `${appTheme.font_family}, sans-serif` : 'inherit' }}
    >
      <ThemedVideoBg appTheme={appTheme} />
      <div className="w-full max-w-[400px] flex flex-col items-center">
        <img src="/logo.png" alt="Unreal Place" className="w-40 mb-2 cursor-pointer" onClick={() => setStep(1)} />

        <h1 className="text-3xl font-bold my-3 mb-8 text-center" style={{ color: appTheme.font_color }}>
          Sign Up
        </h1>

        <form
          className="w-full flex flex-col gap-[18px]"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <input
            type="text"
            placeholder="Party Name"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            className="w-full py-[18px] px-5 rounded-xl border border-white/10 text-base outline-none placeholder-opacity-60 box-border"
            style={{
              ...fieldStyle,
              placeholderColor: `${appTheme.font_color}99`,
            }}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full py-[18px] px-5 rounded-xl border border-white/10 text-base outline-none placeholder-opacity-60 box-border"
            style={{
              ...fieldStyle,
              placeholderColor: `${appTheme.font_color}99`,
            }}
          />

          <select
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="w-full py-[18px] px-5 rounded-xl border border-white/10 text-base outline-none cursor-pointer box-border"
            style={{
              ...fieldStyle,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23ffffff' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 20px center",
              backgroundSize: "12px",
            }}
          >
            <option value="" disabled style={{ background: "#1a0a2e" }}>
              Team Size
            </option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n} style={{ background: "#1a0a2e" }}>
                {n}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3.5 py-1.5">
            <label className="relative w-12 h-[26px] flex-shrink-0">
              <input
                type="checkbox"
                checked={receiveOffers}
                onChange={(e) => setReceiveOffers(e.target.checked)}
                className="peer opacity-0 w-0 h-0"
              />
              <span 
                className="absolute inset-0 cursor-pointer rounded-full bg-white/15 transition-all peer-checked:bg-purple-600 before:content-[''] before:absolute before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-[#aaa] before:rounded-full before:transition-all peer-checked:before:translate-x-[22px] peer-checked:before:bg-white"
                style={{
                  backgroundColor: receiveOffers ? appTheme.button_color : 'rgba(255,255,255,0.15)',
                }}
              ></span>
            </label>
            <span className="text-base font-medium" style={{ color: appTheme.font_color }}>
              Receive Offers
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl text-lg font-semibold cursor-pointer mt-1 border-none transition hover:opacity-90"
            style={btnStyle}
          >
            Next
          </button>
        </form>
      </div>
    </div>
  );
}