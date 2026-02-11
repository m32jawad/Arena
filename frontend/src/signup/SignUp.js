import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api/auth';

const Avatar = ({ color = '#d97706' }) => (
  <svg viewBox="0 0 80 80" className="w-16 h-16 rounded-full flex-shrink-0" style={{ border: `3px solid ${color}` }}>
    <rect width="80" height="80" rx="40" fill="#2a1a40" />
    <ellipse cx="40" cy="32" rx="14" ry="15" fill={color} />
    <ellipse cx="40" cy="72" rx="24" ry="22" fill={color} />
  </svg>
);

const groupColors = [
  ['#e040a0', '#f5c542', '#60a0f0'],
  ['#f5c542', '#c9a050', '#60a0f0'],
  ['#e040a0', '#f5c542', '#60a0f0'],
  ['#e040a0', '#f5c542', '#60c8f0'],
];

const groupLabels = ['Group 1', 'Group 2', 'Group 3', 'Group 3'];

const bgStyle = { background: 'linear-gradient(180deg,#1a0a2e 0%,#16082b 50%,#0d0618 100%)' };
const btnStyle = { background: 'linear-gradient(135deg,#9b30ff 0%,#a83279 100%)' };
const fieldStyle = { background: 'rgba(255,255,255,0.06)', appearance: 'none' };

export default function SignUp() {
  const [step, setStep] = useState(1);
  const [partyName, setPartyName] = useState('');
  const [email, setEmail] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [receiveOffers, setReceiveOffers] = useState(false);

  const [storylines, setStorylines] = useState([]);
  const [selectedStoryline, setSelectedStoryline] = useState(null);
  const [viewingStory, setViewingStory] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupPhoto, setGroupPhoto] = useState(null);

  useEffect(() => {
    if (step === 2) {
      fetch(`${API_BASE}/public/storylines/`)
        .then(res => res.json())
        .then(data => setStorylines(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [step]);

  /* ─── Step 3: Group Photo ─── */
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-8" style={bgStyle}>
        <div className="w-full max-w-[400px] flex flex-col items-center">
          <img src="/logo.png" alt="Unreal Place" className="w-40 mb-2" />

          {/* Camera upload */}
          <div className="w-full flex items-center gap-4 mt-6 mb-2 px-1">
            <label className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center cursor-pointer flex-shrink-0">
              <input type="file" accept="image/*" className="hidden" onChange={e => setGroupPhoto(e.target.files[0])} />
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
              </svg>
            </label>
            <div className="text-white text-lg font-semibold leading-snug">
              Realistic Group<br />Photo
            </div>
          </div>

          {/* OR divider */}
          <div className="flex items-center w-full my-4">
            <div className="flex-1 h-px bg-white/20"></div>
            <span className="px-4 text-white/60 text-sm font-semibold tracking-wider">OR</span>
            <div className="flex-1 h-px bg-white/20"></div>
          </div>

          {/* Group grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 w-full mb-8">
            {groupLabels.map((label, idx) => (
              <div
                key={idx}
                className={`cursor-pointer rounded-xl p-2 transition ${selectedGroup === idx ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setSelectedGroup(idx)}
              >
                <div className="text-white font-bold text-base mb-2">{label}</div>
                <div className="flex -space-x-3">
                  {groupColors[idx].map((c, i) => (
                    <Avatar key={i} color={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Signup button */}
          <button
            className="w-full py-4 rounded-2xl text-white text-lg font-semibold cursor-pointer border-none transition hover:opacity-90"
            style={btnStyle}
          >
            Signup
          </button>

          {/* Terms */}
          <p className="text-white/60 text-xs mt-4 text-center">
            * By Clicking <span className="font-bold text-white">Signup</span> I Accept{' '}
            <span className="text-pink-400 cursor-pointer">Terms and Conditions</span>
          </p>
        </div>
      </div>
    );
  }

 /* ─── Step 2: Select Storyline ─── */
if (step === 2) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={bgStyle}>
      <div className="w-full max-w-[400px] flex flex-col items-center">
        <img src="/logo.png" alt="Unreal Place" className="w-40 mb-2" />

        <h1 className="text-white text-3xl font-bold my-3 mb-6 text-center">Select Storyline</h1>

        {/* Container with fixed height that becomes scrollable when there are more than 2 storylines */}
        <div 
          className="w-full mb-6"
          style={{ 
            maxHeight: storylines.length > 2 ? '320px' : 'auto',
            overflowY: storylines.length > 2 ? 'auto' : 'visible',
            scrollbarWidth: 'thin',
            scrollbarColor: '#9b30ff transparent',
            paddingRight: storylines.length > 2 ? '8px' : '0'
          }}
        >
          <div className="flex flex-col gap-4">
            {storylines.map(s => (
              <div
                key={s.id}
                className={`flex items-stretch rounded-xl border overflow-hidden cursor-pointer transition ${selectedStoryline === s.id ? 'border-purple-500' : 'border-white/10'}`}
                style={{ background: 'rgba(255,255,255,0.06)' }}
                onClick={() => setSelectedStoryline(s.id)}
              >
                {s.image && (
                  <img src={s.image} alt={s.title} className="w-24 min-h-full object-cover flex-shrink-0" />
                )}
                <div className="p-3.5 flex flex-col gap-1.5">
                  <h3 className="text-white text-lg font-bold m-0">{s.title}</h3>
                  <p className="text-white/70 text-[13px] leading-snug m-0 line-clamp-4">{s.text}</p>
                  {s.text && s.text.length > 100 && (
                    <button
                      className="bg-transparent border-none text-purple-400 text-xs cursor-pointer p-0 mt-1 text-left hover:underline"
                      onClick={e => { e.stopPropagation(); setViewingStory(s); }}
                    >View all</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className="w-full py-4 rounded-2xl text-white text-lg font-semibold cursor-pointer border-none transition hover:opacity-90"
          style={btnStyle}
          onClick={() => setStep(3)}
        >
          Step 2 of 3
        </button>
      </div>

      {/* Storyline Modal */}
      {viewingStory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5" onClick={() => setViewingStory(null)}>
          <div className="rounded-xl w-full max-w-[480px] p-6 relative max-h-[80vh] overflow-y-auto" style={{ background: '#1e1035' }} onClick={e => e.stopPropagation()}>
            <button className="absolute top-3 right-4 bg-transparent border-none text-white text-2xl cursor-pointer" onClick={() => setViewingStory(null)}>&times;</button>
            <h2 className="text-white text-xl font-bold mb-3">{viewingStory.title}</h2>
            {viewingStory.image && (
              <img src={viewingStory.image} alt={viewingStory.title} className="w-full max-h-48 object-cover rounded-lg mb-4" />
            )}
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap m-0">{viewingStory.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

  /* ─── Step 1: Sign Up ─── */
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-8" style={bgStyle}>
      <div className="w-full max-w-[400px] flex flex-col items-center">
        <img src="/logo.png" alt="Unreal Place" className="w-40 mb-2" />

        <h1 className="text-white text-3xl font-bold my-3 mb-8 text-center">Sign Up</h1>

        <form className="w-full flex flex-col gap-[18px]" onSubmit={e => { e.preventDefault(); setStep(2); }}>
          <input
            type="text"
            placeholder="Party Name"
            value={partyName}
            onChange={e => setPartyName(e.target.value)}
            className="w-full py-[18px] px-5 rounded-xl border border-white/10 text-white text-base outline-none placeholder-white/60 box-border"
            style={fieldStyle}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full py-[18px] px-5 rounded-xl border border-white/10 text-white text-base outline-none placeholder-white/60 box-border"
            style={fieldStyle}
          />

          <select
            value={teamSize}
            onChange={e => setTeamSize(e.target.value)}
            className="w-full py-[18px] px-5 rounded-xl border border-white/10 text-white text-base outline-none cursor-pointer box-border"
            style={{
              ...fieldStyle,
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23ffffff' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 20px center',
              backgroundSize: '12px',
            }}
          >
            <option value="" disabled style={{ background: '#1a0a2e' }}>Team Size</option>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n} style={{ background: '#1a0a2e' }}>{n}</option>
            ))}
          </select>

          <div className="flex items-center gap-3.5 py-1.5">
            <label className="relative w-12 h-[26px] flex-shrink-0">
              <input
                type="checkbox"
                checked={receiveOffers}
                onChange={e => setReceiveOffers(e.target.checked)}
                className="peer opacity-0 w-0 h-0"
              />
              <span className="absolute inset-0 cursor-pointer rounded-full bg-white/15 transition-all peer-checked:bg-purple-600 before:content-[''] before:absolute before:h-5 before:w-5 before:left-[3px] before:bottom-[3px] before:bg-[#aaa] before:rounded-full before:transition-all peer-checked:before:translate-x-[22px] peer-checked:before:bg-white"></span>
            </label>
            <span className="text-white text-base font-medium">Receive Offers</span>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl text-white text-lg font-semibold cursor-pointer mt-1 border-none transition hover:opacity-90"
            style={btnStyle}
          >
            Next
          </button>
        </form>
      </div>
    </div>
  );
}
