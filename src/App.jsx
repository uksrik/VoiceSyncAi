import React, { useState, useRef, useEffect, useCallback } from "react";
import { prepareAudioDataUrl } from "./audioUtils.js";
import { parseDeckFile } from "./deckParse.js";
import DeckScriptSection from "./DeckScriptSection.jsx";

const MUSIC_GENRES = [
  { id: "cinematic", label: "Cinematic", icon: "", desc: "Epic orchestral" },
  { id: "ambient", label: "Ambient", icon: "", desc: "Calm & atmospheric" },
  { id: "corporate", label: "Corporate", icon: "", desc: "Professional & clean" },
  { id: "upbeat", label: "Upbeat", icon: "", desc: "Energetic & lively" },
  { id: "emotional", label: "Emotional", icon: "", desc: "Warm & heartfelt" },
  { id: "none", label: "No Music", icon: "", desc: "Voice only" },
];

//  Claude TTS Voice Engine 
// Uses Anthropic's native audio output (claude-sonnet-4-20250514) for
// genuinely natural, human-sounding speech  not browser synthesis.
//
// Each profile maps to one of Claude's built-in TTS voices plus a persona
// system prompt that shapes accent, pace, and emotional colour.
//
// Available Claude TTS voices: alloy  echo  fable  onyx  nova  shimmer
// 
const VOICE_GROUPS = [
  {
    group: " Indian Voices",
    color: "#f97316",
    voices: [
      {
        id: "priya", label: "Priya", gender: "female", style: "Warm & Melodic", accent: "Indian",
        emoji: "", desc: "Soft, melodic tone with a natural Indian lilt",
        claudeVoice: "shimmer",
        persona: "You are Priya, a warm and melodic Indian woman. Speak with a gentle South Asian lilt, soft consonants, a naturally musical rhythm, and heartfelt warmth. Your pace is unhurried and expressive.",
        sampleText: "Namaste! I'm Priya  warm, melodic, and expressive.",
        flag: "",
      },
      {
        id: "arjun", label: "Arjun", gender: "male", style: "Confident & Clear", accent: "Indian",
        emoji: "", desc: "Crisp, professional delivery with authoritative presence",
        claudeVoice: "onyx",
        persona: "You are Arjun, a confident and articulate Indian professional. Speak with a crisp North Indian English accent, clear enunciation, measured authority, and an assured, forward-leaning energy.",
        sampleText: "Hello, Arjun here  confident and articulate.",
        flag: "",
      },
      {
        id: "kavya", label: "Kavya", gender: "female", style: "Bright & Expressive", accent: "South Indian",
        emoji: "", desc: "Vibrant and expressive with a South Indian cadence",
        claudeVoice: "nova",
        persona: "You are Kavya, a bright and expressive young woman from South India. Speak with a vibrant Kannada-influenced English cadence, slightly faster pace, rising intonation, and genuine enthusiasm.",
        sampleText: "Hi! I'm Kavya  bright, expressive and full of life!",
        flag: "",
      },
      {
        id: "vikram", label: "Vikram", gender: "male", style: "Deep & Narrative", accent: "North Indian",
        emoji: "", desc: "Rich baritone with a deliberate storytelling pace",
        claudeVoice: "fable",
        persona: "You are Vikram, a deep-voiced storyteller from North India. Speak with a resonant Hindi-accented baritone, deliberate pacing, strong consonants, and the gravitas of a seasoned narrator.",
        sampleText: "Vikram speaking. Every word carries weight and depth.",
        flag: "",
      },
    ],
  },
  {
    group: " Telugu Voices",
    color: "#10b981",
    voices: [
      {
        id: "lakshmi", label: "Lakshmi", gender: "female", style: "Graceful & Warm", accent: "Telugu",
        emoji: "", desc: "Melodious Telugu lilt with graceful South Indian warmth",
        claudeVoice: "shimmer",
        persona: "You are Lakshmi, a graceful Telugu woman from Andhra Pradesh. Speak English with a beautiful Telugu-influenced cadence  soft retroflex consonants, gently musical intonation, warm vowels, and the dignified poise of a classical South Indian speaker. Your tone is sincere and heartfelt.",
        sampleText: "Namaskaram! I am Lakshmi  graceful, warm, and deeply expressive.",
        flag: "",
      },
      {
        id: "krishna", label: "Krishna", gender: "male", style: "Strong & Resonant", accent: "Telugu",
        emoji: "", desc: "Deep, authoritative Telugu male with commanding presence",
        claudeVoice: "onyx",
        persona: "You are Krishna, a confident Telugu man from Hyderabad. Speak English with a strong Telugu-accented baritone  distinct retroflex sounds, measured authority, slightly elongated vowels, and the commanding presence of a Telangana professional. Clear, direct, and trustworthy.",
        sampleText: "Hello! Krishna here  strong, clear, and confident.",
        flag: "",
      },
      {
        id: "divya", label: "Divya", gender: "female", style: "Bright & Youthful", accent: "Telugu",
        emoji: "", desc: "Energetic young Telugu woman, modern and expressive",
        claudeVoice: "nova",
        persona: "You are Divya, a bright and enthusiastic young Telugu woman from Hyderabad. Speak with vibrant energy, a modern Hyderabadi English accent with Telugu cadence, fast-paced rhythm, naturally rising intonation, and infectious positivity. You blend tech-city confidence with traditional warmth.",
        sampleText: "Hi everyone! Divya here  energetic, modern, and ready to inspire!",
        flag: "",
      },
    ],
  },
  {
    group: " Tamil Voices",
    color: "#f43f5e",
    voices: [
      {
        id: "meenakshi", label: "Meenakshi", gender: "female", style: "Classical & Elegant", accent: "Tamil",
        emoji: "", desc: "Elegant Tamil cadence with classical poise",
        claudeVoice: "shimmer",
        persona: "You are Meenakshi, an elegant Tamil woman from Chennai. Speak English with a refined Tamil Nadu accent  distinct Tamil consonants, a beautifully rhythmic cadence, precise articulation, and the dignified warmth of a Chennai professional. Your speech has the grace of classical South Indian culture.",
        sampleText: "Vanakkam! I am Meenakshi  elegant, precise, and warmly expressive.",
        flag: "",
      },
      {
        id: "murugan", label: "Murugan", gender: "male", style: "Bold & Expressive", accent: "Tamil",
        emoji: "", desc: "Spirited Tamil male with bold expressive delivery",
        claudeVoice: "fable",
        persona: "You are Murugan, a bold and expressive Tamil man from Tamil Nadu. Speak English with a strong Tamil accent  distinctive Tamil retroflex consonants, emphatic stress patterns, passionate delivery, and the spirited energy of a Chennai storyteller. Your voice carries deep cultural pride.",
        sampleText: "Hello! Murugan speaking  bold, expressive, and full of spirit.",
        flag: "",
      },
      {
        id: "kavitha", label: "Kavitha", gender: "female", style: "Soft & Poetic", accent: "Tamil",
        emoji: "", desc: "Gentle and poetic Tamil voice with lyrical quality",
        claudeVoice: "alloy",
        persona: "You are Kavitha, a soft-spoken and poetic Tamil woman from Coimbatore. Speak English with a gentle Tamil lilt  melodious intonation, thoughtful pacing, soft consonants, and the lyrical quality of Tamil literature brought to life. Your voice is like poetry in motion.",
        sampleText: "Hello! I am Kavitha  soft, poetic, and lyrical in every word.",
        flag: "",
      },
    ],
  },
  {
    group: " Indian-American Voices",
    color: "#06b6d4",
    voices: [
      {
        id: "ananya", label: "Ananya", gender: "female", style: "Polished & Modern", accent: "Indian-American",
        emoji: "", desc: "Smooth American fluency with a subtle South Asian warmth",
        claudeVoice: "shimmer",
        persona: "You are Ananya, a first-generation Indian-American woman. Speak with polished American fluency but with a subtle South Asian warmth in your vowels. You are modern, articulate, and culturally confident.",
        sampleText: "Hey! Ananya here  polished, modern, and culturally fluid.",
        flag: "",
      },
      {
        id: "rohan", label: "Rohan", gender: "male", style: "Smooth & Dynamic", accent: "Indian-American",
        emoji: "", desc: "Energetic American cadence with a hint of Indian heritage",
        claudeVoice: "echo",
        persona: "You are Rohan, a dynamic Indian-American man in his 30s. Speak with energetic American cadence, confident rhythm, and a very subtle Indian-heritage warmth. You sound sharp, modern, and inspiring.",
        sampleText: "Rohan here  dynamic, sharp, and ready to inspire.",
        flag: "",
      },
    ],
  },
  {
    group: " International Voices",
    color: "#a78bfa",
    voices: [
      {
        id: "nova", label: "Nova", gender: "female", style: "Professional", accent: "American",
        emoji: "", desc: "Clear, confident American newsreader",
        claudeVoice: "nova",
        persona: "You are Nova, a professional American female broadcaster. Speak with clear, crisp American English, confident pacing, and a polished newsreader tone. Authoritative yet approachable.",
        sampleText: "Hello! I'm Nova  professional and clear.",
        flag: "",
      },
      {
        id: "echo", label: "Echo", gender: "male", style: "Deep & Rich", accent: "British",
        emoji: "", desc: "Warm baritone with British authority",
        claudeVoice: "onyx",
        persona: "You are Echo, a British male with a deep, resonant voice. Speak with a refined RP British accent, measured pace, warm baritone depth, and understated authority. Think BBC documentary narrator.",
        sampleText: "Echo here. Deep, British, and authoritative.",
        flag: "",
      },
      {
        id: "aria", label: "Aria", gender: "female", style: "Warm & Natural", accent: "Australian",
        emoji: "", desc: "Conversational, friendly Australian",
        claudeVoice: "alloy",
        persona: "You are Aria, a warm and friendly Australian woman. Speak with a natural Australian accent  slightly upward inflection, relaxed and conversational, genuinely warm and inviting. Never stiff.",
        sampleText: "Hi there! Aria speaking  warm and natural.",
        flag: "",
      },
      {
        id: "orion", label: "Orion", gender: "male", style: "Calm & Measured", accent: "American",
        emoji: "", desc: "Soothing, meditative American narrator",
        claudeVoice: "fable",
        persona: "You are Orion, a calm and meditative American male narrator. Speak slowly, with intentional pauses, a soothing low register, and a sense of peaceful authority. Like a mindfulness guide or nature documentary voice.",
        sampleText: "Orion. Slow, calm, and measured.",
        flag: "",
      },
      {
        id: "sage", label: "Sage", gender: "female", style: "Energetic", accent: "Irish",
        emoji: "", desc: "Bright and lively with an Irish lilt",
        claudeVoice: "shimmer",
        persona: "You are Sage, an energetic young Irish woman. Speak with a bright Dublin accent, fast-paced rhythm, natural Irish musicality in your intonation, and contagious enthusiasm. Lively and fun.",
        sampleText: "Sage here  upbeat and full of energy!",
        flag: "",
      },
      {
        id: "atlas", label: "Atlas", gender: "male", style: "Storyteller", accent: "Scottish",
        emoji: "", desc: "Rich Scottish character voice",
        claudeVoice: "echo",
        persona: "You are Atlas, a Scottish male storyteller with a rich, expressive voice. Speak with a warm Scottish burr, rolling Rs, expressive cadence, and the soulful depth of a Highland bard. Every sentence feels like a story.",
        sampleText: "Atlas. Every word tells a story.",
        flag: "",
      },
    ],
  },
];

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY?.trim();
const SAMPLE_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const GEMINI_VOICE = null;

/** Maps persona voice ids to high-quality MiniMax preset voices (human-like, not robotic). */
const FAL_VOICE_PRESETS = {
  priya: "English_CalmWoman",
  arjun: "English_Trustworthy_Man",
  kavya: "English_FriendlyPerson",
  vikram: "English_Deep_Voice_Man",
  lakshmi: "English_CalmWoman",
  krishna: "English_Trustworthy_Man",
  divya: "English_FriendlyPerson",
  meenakshi: "Wise_Woman",
  murugan: "English_Deep_Voice_Man",
  kavitha: "English_CalmWoman",
  ananya: "English_FriendlyPerson",
  rohan: "English_Trustworthy_Man",
  nova: "English_FriendlyPerson",
  echo: "English_WiseScholar",
  aria: "English_Aussie_Bloke",
  orion: "English_Deep_Voice_Man",
  sage: "English_PassionateWarrior",
  atlas: "English_WiseScholar",
};

function attachNaturalTts(voice, falVoiceId, options = {}) {
  const isMale = voice.gender === "male";
  const fallbackVoiceName = options.fallbackVoiceName || (isMale ? "Microsoft Guy" : "Microsoft Jenny");
  return {
    ...voice,
    provider: "fal-minimax",
    falVoiceId,
    pitch: options.pitch ?? 0,
    speed: options.speed ?? 0.98,
    languageBoost: options.languageBoost ?? "English",
    voiceName: fallbackVoiceName,
    rate: options.rate ?? -3,
    flag: voice.flag || "AI",
    sampleText: voice.sampleText || `Hi, I'm ${voice.label}. This is my natural speaking voice.`,
  };
}

const PERSONA_VOICES = VOICE_GROUPS.flatMap(g => g.voices).map(v =>
  attachNaturalTts(v, FAL_VOICE_PRESETS[v.id] || "English_FriendlyPerson")
);

const PREMIUM_NATURAL_VOICES = [
  attachNaturalTts(
    {
      id: "emma-calm",
      label: "Emma",
      gender: "female",
      style: "Soft & Conversational",
      accent: "US English",
      desc: "Relaxed, warm narrator ideal for explainers and tutorials.",
    },
    "English_CalmWoman",
    { speed: 0.96 }
  ),
  attachNaturalTts(
    {
      id: "james-trust",
      label: "James",
      gender: "male",
      style: "Clear & Trustworthy",
      accent: "US English",
      desc: "Steady professional tone for business and product videos.",
    },
    "English_Trustworthy_Man"
  ),
  attachNaturalTts(
    {
      id: "olivia-warm",
      label: "Olivia",
      gender: "female",
      style: "Friendly & Bright",
      accent: "US English",
      desc: "Approachable, upbeat delivery for marketing and social content.",
    },
    "English_FriendlyPerson",
    { speed: 1.02 }
  ),
  attachNaturalTts(
    {
      id: "henry-wise",
      label: "Henry",
      gender: "male",
      style: "Documentary",
      accent: "British",
      desc: "Measured, authoritative read for storytelling and education.",
    },
    "English_WiseScholar",
    { speed: 0.94 }
  ),
  attachNaturalTts(
    {
      id: "liam-aussie",
      label: "Liam",
      gender: "male",
      style: "Casual Australian",
      accent: "Australian",
      desc: "Easy-going conversational Australian tone.",
    },
    "English_Aussie_Bloke",
    { speed: 1.0 }
  ),
  attachNaturalTts(
    {
      id: "sophia-bold",
      label: "Sophia",
      gender: "female",
      style: "Energetic Presenter",
      accent: "US English",
      desc: "Dynamic, expressive voice for launches and hype reels.",
    },
    "English_PassionateWarrior",
    { speed: 1.05 }
  ),
  attachNaturalTts(
    {
      id: "marcus-deep",
      label: "Marcus",
      gender: "male",
      style: "Rich Baritone",
      accent: "US English",
      desc: "Deep, cinematic voice for trailers and dramatic reads.",
    },
    "English_Deep_Voice_Man",
    { speed: 0.92 }
  ),
  attachNaturalTts(
    {
      id: "grace-narrator",
      label: "Grace",
      gender: "female",
      style: "Elegant Narrator",
      accent: "Global English",
      desc: "Polished, audiobook-quality narration with natural flow.",
    },
    "Wise_Woman",
    { speed: 0.95 }
  ),
];

const WINDOWS_NATURAL_VOICES = [
  {
    id: "win-jenny",
    label: "Jenny (Neural)",
    gender: "female",
    style: "Natural US Female",
    accent: "US English",
    provider: "windows-speech",
    voiceName: "Microsoft Jenny",
    rate: -3,
    desc: "Windows neural voice — smooth and human-like when offline.",
    sampleText: "Hi, I'm Jenny. I sound natural and clear for everyday narration.",
    flag: "LOCAL",
  },
  {
    id: "win-guy",
    label: "Guy (Neural)",
    gender: "male",
    style: "Natural US Male",
    accent: "US English",
    provider: "windows-speech",
    voiceName: "Microsoft Guy",
    rate: -3,
    desc: "Windows neural male voice for offline previews and generation.",
    sampleText: "Hello, I'm Guy. I deliver calm, natural speech for your videos.",
    flag: "LOCAL",
  },
  {
    id: "win-aria",
    label: "Aria (Neural)",
    gender: "female",
    style: "Expressive US Female",
    accent: "US English",
    provider: "windows-speech",
    voiceName: "Microsoft Aria",
    rate: -2,
    desc: "Expressive neural voice with a lively, natural cadence.",
    sampleText: "Hi there, I'm Aria — expressive, warm, and easy to listen to.",
    flag: "LOCAL",
  },
];

const ACTIVE_VOICES = [
  ...PREMIUM_NATURAL_VOICES,
  ...PERSONA_VOICES,
  ...WINDOWS_NATURAL_VOICES,
];

const ACTIVE_VOICE_GROUPS = [
  {
    group: "Premium Natural Voices",
    color: "#a78bfa",
    voices: PREMIUM_NATURAL_VOICES,
  },
  ...VOICE_GROUPS.map(g => ({
    ...g,
    voices: g.voices.map(v => PERSONA_VOICES.find(p => p.id === v.id)).filter(Boolean),
  })),
  {
    group: "Local Natural Voices (Offline)",
    color: "#10b981",
    voices: WINDOWS_NATURAL_VOICES,
  },
];

const ALL_VOICES = ACTIVE_VOICES;

const EMOTIONS = ["Neutral", "Happy", "Serious", "Excited", "Calm", "Inspirational"];

const STEPS = ["Upload", "Script", "Voice", "Music", "Generate"];

const CLONED_VOICES_KEY = "voicesync-cloned-voices";

const loadStoredClonedVoices = () => {
  try {
    const raw = localStorage.getItem(CLONED_VOICES_KEY);
    if (!raw) return [];
    return JSON.parse(raw).filter(v => v?.isCloned && v?.id);
  } catch {
    return [];
  }
};

const saveStoredClonedVoices = (voices) => {
  const slim = voices.map(({ id, label, customVoiceId, pitch, speed, emoji, accent, flag }) => ({
    id,
    label,
    isCloned: true,
    customVoiceId: customVoiceId || null,
    pitch: pitch ?? 0,
    speed: speed ?? 1,
    emoji: emoji || "🎙️",
    accent: accent || "Custom upload",
    flag: flag || "✨",
  }));
  localStorage.setItem(CLONED_VOICES_KEY, JSON.stringify(slim));
};

// --- Animated waveform for lipsync preview ---
function Waveform({ active, color = "#a78bfa" }) {
  const bars = 32;
  // BUG FIX: Math.random() was inlined in JSX style  called on every render,
  // causing non-deterministic heights that reset on every parent re-render.
  // Fix: seed heights once per mount with useMemo.
  const [heights] = useState(() => Array.from({ length: bars }, () => 10 + Math.random() * 30));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            background: color,
            borderRadius: 2,
            height: active ? `${heights[i]}px` : "4px",
            transition: active ? `height ${0.1 + (i % 3) * 0.05}s ease` : "height 0.3s ease",
            animation: active ? `wave-${i % 4} ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

// --- Fallback talking-photo preview ---
// This is only a lightweight local preview for when a generated lipsync video is
// not available yet. The real lipsync result is rendered by the fal video output.
const LIP_FRAMES = [0, 1, 2, 3, 2, 1];

function LipSyncFace({ speaking, imageUrl }) {
  const [frame, setFrame] = useState(0);
  const [motionFrame, setMotionFrame] = useState(0);

  useEffect(() => {
    if (!speaking) return;
    const id = setInterval(() => {
      setFrame(f => (f + 1) % LIP_FRAMES.length);
      setMotionFrame(b => b + 1);
    }, 80); // ~12fps for mouth animation
    return () => {
      clearInterval(id);
      setFrame(0);
      setMotionFrame(0);
    };
  }, [speaking]);

  const mouthOpen = LIP_FRAMES[frame];
  const mouthHeight = [3, 6, 10, 14, 10, 6][mouthOpen] || 3;
  const mouthWidth = [34, 36, 38, 40, 38, 36][mouthOpen] || 34;

  // Keep movement tiny so it does not look like the whole photo is wobbling.
  const headBob = speaking ? Math.sin(motionFrame * 0.1) * 0.8 : 0;
  const breathScale = speaking ? 1 + Math.sin(motionFrame * (2 * Math.PI / 80)) * 0.0015 : 1;

  const containerStyle = {
    transform: `translateY(${headBob.toFixed(2)}px) scale(${breathScale.toFixed(5)})`,
    transition: speaking ? "transform 0.08s ease" : "none",
  };

  const faceCircleStyle = {
    width: 180, height: 180, borderRadius: "50%",
    overflow: "hidden", border: "3px solid rgba(167,139,250,0.5)",
    boxShadow: speaking ? "0 0 18px rgba(167,139,250,0.35)" : "0 0 10px rgba(167,139,250,0.2)",
    transition: "box-shadow 0.2s",
    position: "relative",
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={containerStyle}>
        {imageUrl ? (
          <div style={faceCircleStyle}>
            <img src={imageUrl} alt="Avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

            {/* Subtle fallback mouth mask: lower-face only, no eye or waveform overlays. */}
            <div style={{
              position: "absolute",
              bottom: "22%",
              left: "50%",
              transform: "translateX(-50%)",
              width: mouthWidth,
              height: mouthHeight,
              background: "radial-gradient(ellipse at center, rgba(20,10,18,0.72) 0%, rgba(20,10,18,0.58) 55%, rgba(90,42,60,0.4) 100%)",
              border: "1px solid rgba(255,190,190,0.2)",
              borderRadius: "45% 45% 55% 55%",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.25)",
              opacity: speaking ? 1 : 0.45,
              transition: "width 0.07s ease, height 0.07s ease, opacity 0.12s ease",
            }} />
          </div>
        ) : (
          <div style={{
            ...faceCircleStyle,
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            border: "3px solid rgba(167,139,250,0.4)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            boxShadow: speaking ? "0 0 18px rgba(167,139,250,0.35)" : "none",
          }}>
            {/* Emoji face */}
            <div style={{ fontSize: 64 }}></div>

            {/* Animated mouth on placeholder face */}
            <div style={{
              position: "absolute",
              bottom: "28%",
              width: mouthWidth,
              height: mouthHeight,
              background: "rgba(167,139,250,0.7)",
              borderRadius: "45% 45% 55% 55%",
              transition: "width 0.07s ease, height 0.07s ease",
            }} />
          </div>
        )}
      </div>

      {speaking && (
        <div style={{
          position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
          background: "#7c3aed", color: "white", fontSize: 10, padding: "2px 10px",
          borderRadius: 20, letterSpacing: 1, fontFamily: "monospace", fontWeight: 700,
        }}>SPEAKING</div>
      )}
    </div>
  );
}

// --- Progress ring ---
function ProgressRing({ progress, size = 120, stroke = 8, color = "#7c3aed" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s ease" }} />
    </svg>
  );
}

// --- Main App ---
export default function App() {
  const [step, setStep] = useState(0);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [sourceMode, setSourceMode] = useState("photo");
  const [videoUrl, setVideoUrl] = useState("");
  const [lipSyncVideoUrl, setLipSyncVideoUrl] = useState(null);
  const [lipSyncLoading, setLipSyncLoading] = useState(false);
  const [script, setScript] = useState("");
  const [scriptSource, setScriptSource] = useState("text"); // "text" | "audio" | "deck"
  const [deckSlides, setDeckSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [deckFileName, setDeckFileName] = useState("");
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckError, setDeckError] = useState(null);
  const [generatingSlideScripts, setGeneratingSlideScripts] = useState(false);
  const [generatingSlideVoices, setGeneratingSlideVoices] = useState(false);
  const [scriptAudioUrl, setScriptAudioUrl] = useState(null);
  const [scriptAudioName, setScriptAudioName] = useState("");
  const [scriptAudioError, setScriptAudioError] = useState(null);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ACTIVE_VOICES[0]);
  const [clonedVoices, setClonedVoices] = useState(() => loadStoredClonedVoices());
  const [voiceUploadName, setVoiceUploadName] = useState("");
  const [voiceUploadLoading, setVoiceUploadLoading] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState("Neutral");
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_GENRES[0]);
  const [musicVolume, setMusicVolume] = useState(30);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceSmoothness] = useState(72);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStage, setGenStage] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generatedFallback, setGeneratedFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const fileInputRef = useRef();
  const scriptAudioInputRef = useRef();
  const voiceFileInputRef = useRef();
  const voiceReplaceInputRef = useRef();
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const audioRef = useRef(null);   // holds the currently-playing HTMLAudioElement
  const speechUtteranceRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioGraphCleanupRef = useRef(null);

  // Local/free TTS and rewrite state.
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsCache, setTtsCache] = useState({});   // key  objectURL, avoid re-fetching
  const [rewritingScript, setRewritingScript] = useState(false);
  const [rewriteError, setRewriteError] = useState(null);
  const [rewriteProvider, setRewriteProvider] = useState(null);

  // Emotion-based script rewriter (free AI: Hugging Face → Ollama → Groq → offline rules).
  const handleRewriteScript = useCallback(async () => {
    if (!script.trim() || selectedEmotion === "Neutral") return;
    setRewritingScript(true);
    setRewriteError(null);
    setRewriteProvider(null);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script,
          emotion: selectedEmotion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Rewrite failed (${res.status})`);
      }
      const newScript = data.script?.trim();
      if (newScript) {
        setScript(newScript);
        setTtsCache({});
        setRewriteProvider(data.provider || null);
      } else {
        throw new Error("Empty response from rewrite service");
      }
    } catch (err) {
      const message = err.message === "fetch failed"
        ? "Could not reach the rewrite service. Add HF_API_TOKEN (free tier) or run Ollama locally."
        : err.message;
      setRewriteError(`Rewrite failed: ${message}`);
      setTimeout(() => setRewriteError(null), 6000);
    } finally {
      setRewritingScript(false);
    }
  }, [script, selectedEmotion]);

  const callOpenTTS = useCallback(async (text, voice) => {
    const cacheKey = voice.isCloned
      ? `cloned::${voice.id}::${voice.customVoiceId || "local"}::${voice.pitch ?? 0}::${voice.speed ?? 1}::${selectedEmotion}::${text.slice(0, 120)}`
      : `${voice.id}::${voice.provider || "huggingface"}::${selectedEmotion}::${voiceSmoothness}::${voiceSpeed}::${text.slice(0, 120)}`;
    if (ttsCache[cacheKey]) return ttsCache[cacheKey];

    const payload = voice.isCloned
      ? {
          text,
          provider: "cloned-voice",
          customVoiceId: voice.customVoiceId,
          pitch: voice.pitch ?? 0,
          speed: voice.speed ?? 1,
          emotion: selectedEmotion,
        }
      : {
          text,
          provider: voice.provider || "fal-minimax",
          falVoiceId: voice.falVoiceId,
          voiceName: voice.voiceName,
          rate: voice.rate ?? -3,
          pitch: voice.pitch ?? 0,
          speed: voice.speed ?? voiceSpeed,
          emotion: selectedEmotion,
          languageBoost: voice.languageBoost || "English",
        };

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `TTS API ${res.status}`);
    }

    const data = await res.json();
    if (!data.audioUrl) throw new Error("No audio returned");

    setTtsCache((prev) => ({ ...prev, [cacheKey]: data.audioUrl }));
    return data.audioUrl;
  }, [ttsCache, selectedEmotion, voiceSmoothness, voiceSpeed]);

  const transcribeScriptAudio = useCallback(async (audioDataUrl) => {
    let res;
    try {
      res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioDataUrl: audioDataUrl || scriptAudioUrl }),
      });
    } catch (err) {
      throw new Error(
        err.message === "fetch failed"
          ? "Could not reach the transcription service. Is the dev server running?"
          : err.message
      );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Transcription failed (${res.status})`);
    const text = data.text?.trim();
    if (!text) throw new Error("Transcription returned empty text");
    return text;
  }, [scriptAudioUrl]);

  /** Text TTS, or transcribe audio script then re-voice with the selected voice. */
  const resolveSpeechAudio = useCallback(async () => {
    if (scriptSource !== "audio" || !scriptAudioUrl) {
      return callOpenTTS(script, selectedVoice);
    }

    let text = script.trim();
    if (text.length <= 10) {
      setTranscribingAudio(true);
      try {
        text = await transcribeScriptAudio(scriptAudioUrl);
        setScript(text);
        setTtsCache({});
      } finally {
        setTranscribingAudio(false);
      }
    }

    if (text.length > 10) {
      return callOpenTTS(text, selectedVoice);
    }

    return scriptAudioUrl;
  }, [
    scriptSource,
    scriptAudioUrl,
    script,
    selectedVoice,
    callOpenTTS,
    transcribeScriptAudio,
  ]);

  const runLipsync = useCallback(async (audioDataUrl) => {
    setLipSyncLoading(true);
    try {
      const payload = { audioDataUrl, syncMode: "cut_off" };
      if (sourceMode === "video") {
        if (!videoUrl.trim()) throw new Error("Video URL is required");
        payload.videoUrl = videoUrl.trim();
      } else {
        if (!imageUrl) throw new Error("Photo is required");
        payload.imageDataUrl = imageUrl;
        payload.prompt = "Create a realistic Kling-style talking head from this portrait. Use natural facial movements, accurate lip sync, subtle head motion, eye blinks, and human expression. Keep the original face identity and avoid cartoon effects.";
      }
      const res = await fetch("/api/lipsync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Lipsync API ${res.status}`);
      setLipSyncVideoUrl(data.videoUrl);
      setGeneratedFallback(false);
      setGenerated(true);
    } catch (err) {
      setVoiceError(err.message || "Lip sync failed.");
      throw err;
    } finally {
      setLipSyncLoading(false);
    }
  }, [videoUrl, imageUrl, sourceMode]);

  const connectSmoothedAudio = useCallback(async (audio) => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return () => { };

    const ctx = audioContextRef.current || new AudioContextCtor();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const source = ctx.createMediaElementSource(audio);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = Math.max(3200, 14000 - voiceSmoothness * 90);
    lowpass.Q.value = 0.35;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24 + voiceSmoothness * 0.08;
    compressor.knee.value = 18;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - (voiceSmoothness / 100) * 0.35;

    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.15 + (voiceSmoothness / 100) * 0.55;

    source.connect(dryGain);
    dryGain.connect(ctx.destination);
    source.connect(lowpass);
    lowpass.connect(compressor);
    compressor.connect(wetGain);
    wetGain.connect(ctx.destination);

    return () => {
      try { source.disconnect(); } catch { /* ignore */ }
      try { dryGain.disconnect(); } catch { /* ignore */ }
      try { lowpass.disconnect(); } catch { /* ignore */ }
      try { compressor.disconnect(); } catch { /* ignore */ }
      try { wetGain.disconnect(); } catch { /* ignore */ }
    };
  }, [voiceSmoothness]);

  // Stop any currently playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioGraphCleanupRef.current) {
      audioGraphCleanupRef.current();
      audioGraphCleanupRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speechUtteranceRef.current = null;
    }
    setPreviewActive(false);
    setSpeaking(false);
  }, []);

  const playBrowserSpeechPreview = useCallback((text, voice) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      throw new Error("Browser speech preview is unavailable.");
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const browserVoices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice = browserVoices.find(v =>
      /english|en-/i.test(`${v.lang} ${v.name}`) &&
      (voice.gender === "female"
        ? /jenny|aria|zira|samantha|susan|karen|female|woman/i.test(v.name)
        : voice.gender === "male"
          ? /guy|david|mark|daniel|alex|male|man/i.test(v.name)
          : true)
    ) || browserVoices.find(v => /english|en-/i.test(`${v.lang} ${v.name}`));

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = Math.max(0.5, Math.min(2, voiceSpeed));
    utterance.pitch = voice.gender === "male" ? 0.9 : 1.05;
    utterance.onend = () => {
      speechUtteranceRef.current = null;
      setPreviewActive(false);
      setSpeaking(false);
    };
    utterance.onerror = utterance.onend;

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceSpeed]);

  const handlePreview = useCallback(async (textOverride, voiceOverride) => {
  // Toggle off if already speaking
  if (previewActive) { stopAudio(); return; }

  const text = textOverride || script;
  const voice = voiceOverride || selectedVoice;
  if (!text.trim() && !(scriptSource === "audio" && scriptAudioUrl)) return;
  if (sourceMode === "photo" && !imageUrl) {
    setVoiceError("Upload a photo to preview.");
    return;
  }
  if (sourceMode === "video" && !videoUrl.trim()) {
    setVoiceError("Provide a video URL to preview.");
    return;
  }

  // Support uploaded voice sample playback when AI clone is unavailable
  if (voice?.isCloned && voice.audioUrl && !voice.customVoiceId) {
    const audio = new Audio(voice.audioUrl);
    audioRef.current = audio;
    audio.playbackRate = voice.speed ?? voiceSpeed;
    audio.preservesPitch = true;
    const cleanup = () => {
      audioRef.current = null;
      setPreviewActive(false);
      setSpeaking(false);
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    setPreviewActive(true);
    setSpeaking(true);
    setVoiceError(null);
    await audio.play();
    return;
  }

  setVoiceError(null);
  setTtsLoading(true);
  setPreviewActive(true);
  setSpeaking(true);
  setLipSyncVideoUrl(null);

  try {
    let previewText = text.trim();
    if (previewText.length <= 10 && scriptSource === "audio" && scriptAudioUrl) {
      setTranscribingAudio(true);
      try {
        previewText = await transcribeScriptAudio(scriptAudioUrl);
        if (!textOverride) setScript(previewText);
      } finally {
        setTranscribingAudio(false);
      }
    }
    const audioUrl = voiceOverride
      ? await callOpenTTS(previewText.length > 10 ? previewText : script, voice)
      : await resolveSpeechAudio();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = voiceSpeed;
    audio.preservesPitch = true;

    audioGraphCleanupRef.current = await connectSmoothedAudio(audio);

    const cleanup = () => {
      if (audioGraphCleanupRef.current) {
        audioGraphCleanupRef.current();
        audioGraphCleanupRef.current = null;
      }
      audioRef.current = null;
      setPreviewActive(false);
      setSpeaking(false);
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await audio.play();
    runLipsync(audioUrl).catch(() => {});
  } catch (err) {
    console.error("TTS error:", err);
    try {
      playBrowserSpeechPreview(text, voice);
      setVoiceError(null);
    } catch (fallbackErr) {
      setPreviewActive(false);
      setSpeaking(false);
      setVoiceError(fallbackErr.message || err.message || "Voice preview failed.");
    }
  } finally {
    setTtsLoading(false);
  }
}, [previewActive, script, scriptSource, scriptAudioUrl, selectedVoice, voiceSpeed, callOpenTTS, resolveSpeechAudio, transcribeScriptAudio, connectSmoothedAudio, stopAudio, runLipsync, playBrowserSpeechPreview, sourceMode, imageUrl, videoUrl]);

  useEffect(() => { setCharCount(script.length); }, [script]);

  useEffect(() => {
    if (scriptSource === "deck" && deckSlides[activeSlideIndex]) {
      setScript(deckSlides[activeSlideIndex].script || "");
    }
  }, [scriptSource, activeSlideIndex, deckSlides]);

  const updateSlideScript = useCallback((slideIdx, text) => {
    setDeckSlides(prev =>
      prev.map((s, i) => (i === slideIdx ? { ...s, script: text } : s))
    );
    if (slideIdx === activeSlideIndex) setScript(text);
  }, [activeSlideIndex]);

  const handleDeckFile = useCallback(async (file) => {
    if (!file) return;
    setDeckLoading(true);
    setDeckError(null);
    try {
      const deck = await parseDeckFile(file);
      setDeckSlides(deck.slides);
      setDeckFileName(deck.fileName);
      setActiveSlideIndex(0);
      setScriptSource("deck");
      setScript(deck.slides[0]?.script || "");
      clearScriptAudio();
      setTtsCache({});
    } catch (err) {
      setDeckError(err.message || "Could not parse deck.");
    } finally {
      setDeckLoading(false);
    }
  }, []);

  const generateDeckScripts = useCallback(async (onlyIndex = null) => {
    if (!deckSlides.length) return;
    setGeneratingSlideScripts(true);
    setDeckError(null);
    try {
      const res = await fetch("/api/slide-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: deckSlides,
          emotion: selectedEmotion,
          slideIndex: onlyIndex != null ? deckSlides[onlyIndex]?.index : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Slide script generation failed");
      if (data.hint) {
        setDeckError(data.hint);
      } else if (data.warning) {
        setDeckError(data.warning);
      } else if (data.provider === "rules" || data.providers?.includes("rules")) {
        setDeckError(
          "AI narration was unavailable — scripts were built from slide text only. Add a free GROQ_API_KEY (console.groq.com) or fix your Hugging Face token permissions."
        );
      }
      const byIndex = new Map((data.slides || []).map(s => [s.index, s.script]));
      setDeckSlides(prev =>
        prev.map(s => ({
          ...s,
          script: byIndex.get(s.index) ?? s.script,
        }))
      );
      if (onlyIndex != null) {
        setScript(byIndex.get(deckSlides[onlyIndex].index) || "");
      } else if (deckSlides[activeSlideIndex]) {
        setScript(byIndex.get(deckSlides[activeSlideIndex].index) || deckSlides[activeSlideIndex].script || "");
      }
    } catch (err) {
      setDeckError(err.message);
    } finally {
      setGeneratingSlideScripts(false);
    }
  }, [deckSlides, selectedEmotion, activeSlideIndex]);

  const generateVoicesForAllSlides = useCallback(async () => {
    if (!deckSlides.length) return;
    setGeneratingSlideVoices(true);
    setVoiceError(null);
    try {
      const updated = [];
      for (const slide of deckSlides) {
        const text = (slide.script || "").trim();
        if (text.length <= 10) {
          updated.push(slide);
          continue;
        }
        const audioUrl = await callOpenTTS(text, selectedVoice);
        updated.push({ ...slide, audioUrl });
      }
      setDeckSlides(updated);
    } catch (err) {
      setVoiceError(err.message || "Failed to generate slide voices.");
    } finally {
      setGeneratingSlideVoices(false);
    }
  }, [deckSlides, selectedVoice, callOpenTTS]);

  const previewSlideVoice = useCallback(async (slideIdx) => {
    const slide = deckSlides[slideIdx];
    if (!slide?.script?.trim()) return;
    setActiveSlideIndex(slideIdx);
    setScript(slide.script);
    await handlePreview(slide.script, selectedVoice);
  }, [deckSlides, selectedVoice, handlePreview]);
  useEffect(() => { setLipSyncVideoUrl(null); }, [videoUrl, imageUrl, script, scriptAudioUrl, scriptSource, selectedVoice, sourceMode]);
  useEffect(() => { saveStoredClonedVoices(clonedVoices); }, [clonedVoices]);

  const updateClonedVoice = useCallback((id, updates) => {
    setClonedVoices(prev => prev.map(v => (v.id === id ? { ...v, ...updates } : v)));
    setSelectedVoice(prev => (prev.id === id ? { ...prev, ...updates } : prev));
    setTtsCache({});
  }, []);

  const deleteClonedVoice = useCallback((id) => {
    setClonedVoices(prev => prev.filter(v => v.id !== id));
    setSelectedVoice(prev => (prev.id === id ? ACTIVE_VOICES[0] : prev));
    setTtsCache({});
  }, []);

  const handleImageUpload = (file) => {
    if (!file) return;
    setImage(file);
    // Use FileReader to get a base64 data URL  this works for both <img> display
    // AND canvas drawImage() without triggering cross-origin taint or "broken" state.
    // URL.createObjectURL() causes canvas taint in sandboxed iframe environments.
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleVoiceUpload = (file, replaceVoiceId = null) => {
    if (!file) return;
    const name = voiceUploadName.trim() || file.name.replace(/\.[^.]+$/, "");
    if (!name) {
      setVoiceError("Enter a name for your uploaded voice.");
      return;
    }

    setVoiceUploadLoading(true);
    setVoiceError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      try {
        const res = await fetch("/api/voice-clone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            dataUrl,
            previewText: script.trim() || "Hello, this is a preview of my uploaded voice.",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        const existing = replaceVoiceId ? clonedVoices.find(v => v.id === replaceVoiceId) : null;
        const voice = {
          ...data,
          id: replaceVoiceId || data.id,
          pitch: existing?.pitch ?? 0,
          speed: existing?.speed ?? 1,
        };

        setClonedVoices(prev => {
          if (replaceVoiceId) return prev.map(v => (v.id === replaceVoiceId ? voice : v));
          return [...prev, voice];
        });
        setSelectedVoice(voice);
        setVoiceUploadName("");
        if (data.cloneWarning) setVoiceError(data.cloneWarning);
      } catch (err) {
        console.error("Voice clone upload error:", err);
        setVoiceError(err.message || "Voice upload failed.");
      } finally {
        setVoiceUploadLoading(false);
        if (voiceFileInputRef.current) voiceFileInputRef.current.value = "";
        if (voiceReplaceInputRef.current) voiceReplaceInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const clearScriptAudio = useCallback(() => {
    setScriptAudioUrl(null);
    setScriptAudioName("");
    setScriptAudioError(null);
    if (scriptAudioInputRef.current) scriptAudioInputRef.current.value = "";
  }, []);

  const handleScriptAudioFile = useCallback((file) => {
    if (!file) return;
    setScriptAudioError(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target.result;
      setScriptAudioName(file.name);
      setScriptSource("audio");
      setTtsCache({});
      setTranscribingAudio(true);
      try {
        const dataUrl = await prepareAudioDataUrl(file, rawDataUrl);
        setScriptAudioUrl(dataUrl);
        const text = await transcribeScriptAudio(dataUrl);
        setScript(text);
        setScriptAudioError(null);
      } catch (err) {
        if (rawDataUrl) setScriptAudioUrl(rawDataUrl);
        setScriptAudioError(
          err.message.includes("continue")
            ? err.message
            : `${err.message} Audio is saved — type the script below, or we'll retry when you generate.`
        );
      } finally {
        setTranscribingAudio(false);
      }
    };
    reader.onerror = () => setScriptAudioError("Could not read audio file.");
    reader.readAsDataURL(file);
  }, [transcribeScriptAudio]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setScriptAudioError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setScriptAudioError("Microphone recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        handleScriptAudioFile(
          new File([blob], `recording-${Date.now()}.webm`, { type: mimeType })
        );
      };
      recorder.start();
      setIsRecording(true);
      setScriptSource("audio");
    } catch (err) {
      setScriptAudioError(err.message || "Microphone access denied.");
    }
  }, [handleScriptAudioFile]);

  const handleGenerate = async () => {
    if (sourceMode === "photo" && !imageUrl) {
      setGenerationError("Upload a photo to generate.");
      return;
    }
    if (sourceMode === "video" && !videoUrl.trim()) {
      setGenerationError("Provide a video URL to generate.");
      return;
    }
    setGenerating(true);
    setGenProgress(0);
    setGenStage(
      scriptSource === "deck"
        ? "Preparing slide narration audio..."
        : scriptSource === "audio" && scriptAudioUrl
          ? "Transcribing and re-voicing your audio script..."
          : "Generating speech audio..."
    );
    setLipSyncVideoUrl(null);
    setGeneratedFallback(false);
    setFallbackReason("");
    setVoiceError(null);
    setGenerationError(null);
    try {
      let audioUrl;
      if (scriptSource === "deck") {
        let slides = deckSlides;
        const needsVoice = slides.filter(
          s => (s.script || "").trim().length > 10 && !s.audioUrl
        );
        if (needsVoice.length) {
          setGenStage(`Generating speech for ${needsVoice.length} slide(s)...`);
          const updated = [];
          for (const slide of slides) {
            const text = (slide.script || "").trim();
            if (text.length <= 10) {
              updated.push(slide);
              continue;
            }
            if (slide.audioUrl) {
              updated.push(slide);
              continue;
            }
            const url = await callOpenTTS(text, selectedVoice);
            updated.push({ ...slide, audioUrl: url });
            setGenProgress(Math.min(30, Math.round((updated.length / slides.length) * 30)));
          }
          setDeckSlides(updated);
          slides = updated;
        }
        const active = slides[activeSlideIndex];
        audioUrl = active?.audioUrl;
        if (!audioUrl) {
          throw new Error(
            "No voice audio for the selected slide. Generate scripts and voices first."
          );
        }
      } else {
        audioUrl = await resolveSpeechAudio();
      }
      setGenProgress(35);
      setGenStage(sourceMode === "photo" ? "Generating realistic face movement..." : "Running real lip sync AI...");
      await runLipsync(audioUrl);
    } catch (err) {
      try {
        setGenStage("Rendering local fallback preview...");
        setGenProgress(55);
        const fallbackVideoUrl = await createFallbackVideoUrl();
        setLipSyncVideoUrl(fallbackVideoUrl);
        setGeneratedFallback(true);
        setFallbackReason(err.message || "Cloud AI generation was unavailable.");
      } catch (fallbackErr) {
        setGenerationError(fallbackErr.message || err.message || "Generation failed.");
        setGenerating(false);
        setGenProgress(0);
        setGenStage("");
        return;
      }
    }
    const stages = [
      { label: "Compositing background music...", duration: 1500 },
      { label: "Rendering final video...", duration: 2000 },
      { label: "Encoding output...", duration: 1000 },
    ];
    let progress = 65;
    setGenProgress(progress);
    for (let i = 0; i < stages.length; i++) {
      setGenStage(stages[i].label);
      const target = Math.round(65 + (((i + 1) / stages.length) * 35));
      const steps = 20;
      for (let s = 0; s <= steps; s++) {
        await new Promise(r => setTimeout(r, stages[i].duration / steps));
        setGenProgress(Math.round(progress + (target - progress) * (s / steps)));
      }
      progress = target;
    }
    setGenerating(false);
    setGenerated(true);
  };

  const canProceed = [
    sourceMode === "video" ? videoUrl.trim().length > 0 : !!imageUrl,
    scriptSource === "audio"
      ? !!scriptAudioUrl
      : scriptSource === "deck"
        ? deckSlides.length > 0
          && deckSlides.every(s => (s.script || "").trim().length > 10)
        : script.trim().length > 10,
    true,
    true,
    true,
  ];

  const styles = {
    app: {
      minHeight: "100vh",
      background: "#080612",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    },
    bg: {
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(109,40,217,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(16,185,129,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 50% 50%, rgba(167,139,250,0.06) 0%, transparent 70%)",
    },
    grid: {
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: "linear-gradient(rgba(167,139,250,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.04) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    },
    container: {
      maxWidth: 1080, margin: "0 auto", padding: "0 20px 60px",
      position: "relative", zIndex: 1,
    },
    modernHeader: {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "30px 40px", borderRadius: 24, background: "rgba(8,10,24,0.7)",
      border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 35px 120px rgba(15,23,42,0.45)",
      marginBottom: 24, backdropFilter: "blur(20px)",
    },
    headerBadge: {
      fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase",
      padding: "6px 16px", borderRadius: 999,
      border: "1px solid rgba(124,58,237,0.6)", color: "#d1d5db",
    },
    navButtonsRow: {
      display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
    },
    featureRow: {
      display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18,
    },
    featureBadge: {
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderRadius: 18,
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      fontSize: 13, color: "#94a3b8",
    },
    navButton: (active) => ({
      padding: "10px 16px", borderRadius: 18, border: "none", cursor: "pointer",
      fontWeight: 600, fontSize: 13, letterSpacing: 0.4,
      color: active ? "#fff" : "#94a3b8",
      background: active ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.04)",
      boxShadow: active ? "0 10px 25px rgba(124,58,237,0.35)" : "none",
      transition: "all 0.2s",
    }),
    bodyGrid: {
      display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start",
    },
    sidebar: {
      background: "rgba(15,23,42,0.8)",
      borderRadius: 22,
      padding: 24,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 20px 60px rgba(15,23,42,0.45)",
    },
    sidebarTitle: {
      fontSize: 14, color: "#94a3b8", letterSpacing: 0.5, textTransform: "uppercase",
      marginBottom: 10,
    },
    sidebarNav: {
      display: "flex", flexDirection: "column", gap: 14, marginBottom: 18,
    },
    sidebarNavItem: (active) => ({
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 14px", borderRadius: 16, cursor: "pointer", background: active ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.03)",
      border: active ? "1px solid rgba(124,58,237,0.6)" : "1px solid transparent",
      transition: "all 0.2s",
    }),
    sidebarStat: {
      display: "flex", justifyContent: "space-between", marginTop: 10,
      fontSize: 13, color: "#94a3b8",
    },
    smoothCard: {
      marginTop: 18, padding: 16, borderRadius: 18,
      background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(124,58,237,0.1))",
      border: "1px solid rgba(255,255,255,0.1)",
    },
    header: {
      padding: "40px 0 32px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    },
    logo: {
      display: "flex", alignItems: "center", gap: 12,
    },
    logoIcon: {
      width: 44, height: 44, borderRadius: 12,
      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 22, boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
    },
    logoText: {
      fontSize: 22, fontWeight: 800,
      background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      letterSpacing: -0.5,
    },
    badge: {
      background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.3)",
      color: "#c4b5fd", fontSize: 11, padding: "4px 10px", borderRadius: 20,
      letterSpacing: 1, fontWeight: 600, textTransform: "uppercase",
    },
    stepper: {
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 0, marginBottom: 40,
    },
    stepDot: (active, done) => ({
      width: done ? 32 : 32, height: 32,
      borderRadius: "50%",
      background: done ? "#7c3aed" : active ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
      border: `2px solid ${done ? "#7c3aed" : active ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, color: done || active ? "#fff" : "#64748b",
      cursor: "pointer", transition: "all 0.2s",
      flexShrink: 0,
    }),
    stepLine: (done) => ({
      height: 2, width: 60, flexShrink: 0,
      background: done ? "#7c3aed" : "rgba(255,255,255,0.08)",
      transition: "background 0.3s",
    }),
    card: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20, padding: 32,
      backdropFilter: "blur(12px)",
    },
    sectionTitle: {
      fontSize: 24, fontWeight: 700,
      marginBottom: 8, letterSpacing: -0.5,
    },
    sectionSub: {
      fontSize: 14, color: "#94a3b8", marginBottom: 28,
    },
    dropzone: (hover) => ({
      border: `2px dashed ${hover ? "#7c3aed" : "rgba(167,139,250,0.25)"}`,
      borderRadius: 16, padding: "48px 24px",
      textAlign: "center", cursor: "pointer",
      background: hover ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
      transition: "all 0.2s",
      position: "relative",
    }),
    textarea: {
      width: "100%", minHeight: 140,
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "16px", color: "#e2e8f0",
      fontSize: 15, lineHeight: 1.7, resize: "vertical",
      outline: "none", fontFamily: "inherit",
      boxSizing: "border-box",
      transition: "border-color 0.2s",
    },
    voiceCard: (sel) => ({
      background: sel ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${sel ? "#7c3aed" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14, padding: "16px 18px",
      cursor: "pointer", transition: "all 0.2s",
    }),
    musicCard: (sel) => ({
      background: sel ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${sel ? "#7c3aed" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 14, padding: "16px",
      cursor: "pointer", transition: "all 0.2s",
      textAlign: "center",
    }),
    slider: {
      WebkitAppearance: "none", width: "100%", height: 4,
      background: "rgba(255,255,255,0.1)", borderRadius: 4, outline: "none",
      cursor: "pointer",
    },
    primaryBtn: {
      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
      color: "white", border: "none", borderRadius: 12,
      padding: "14px 32px", fontSize: 15, fontWeight: 700,
      cursor: "pointer", letterSpacing: 0.3,
      boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
      transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
    },
    secondaryBtn: {
      background: "rgba(255,255,255,0.06)",
      color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 600,
      cursor: "pointer", transition: "all 0.2s",
    },
    tag: {
      background: "rgba(124,58,237,0.2)", color: "#c4b5fd",
      borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600,
    },
  };

  // STEP 0: Upload
  const renderUpload = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Choose a Source</div>
      <div style={styles.sectionSub}>Upload a photo to animate, or provide a video URL for direct lipsync.</div>

      <div style={{ display: "flex", gap: 8, margin: "12px 0 16px" }}>
        <button
          style={{
            ...styles.secondaryBtn,
            padding: "8px 16px",
            background: sourceMode === "photo" ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)",
            border: sourceMode === "photo" ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={() => setSourceMode("photo")}
        >Photo</button>
        <button
          style={{
            ...styles.secondaryBtn,
            padding: "8px 16px",
            background: sourceMode === "video" ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)",
            border: sourceMode === "video" ? "1px solid rgba(124,58,237,0.6)" : "1px solid rgba(255,255,255,0.1)",
          }}
          onClick={() => setSourceMode("video")}
        >Video URL</button>
      </div>

      {sourceMode === "photo" ? (
        <div
          style={styles.dropzone(dragOver)}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => handleImageUpload(e.target.files[0])} />
          {imageUrl ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <img src={imageUrl} alt="Uploaded" style={{
                width: 160, height: 160, borderRadius: "50%", objectFit: "cover",
                border: "3px solid rgba(167,139,250,0.5)",
                boxShadow: "0 0 30px rgba(124,58,237,0.3)",
              }} />
              <div style={{ color: "#a78bfa", fontWeight: 700 }}>Photo uploaded</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Click to replace</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Drop your photo here</div>
              <div style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>or click to browse</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {["JPG", "PNG", "WEBP", "HEIC"].map(f => (
                  <span key={f} style={styles.tag}>{f}</span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          <input
            type="url"
            placeholder="https://example.com/face-shot.mp4"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(255,255,255,0.02)",
              color: "#e2e8f0",
              fontSize: 15,
            }}
          />
          <div style={{ color: "#94a3b8", fontSize: 12 }}>
            Tip: use a short, front-facing clip hosted on Cloudflare R2/S3/Dropbox/etc. The URL must be reachable without auth.
          </div>
          <button
            style={{ ...styles.secondaryBtn, padding: "8px 16px", alignSelf: "flex-start" }}
            onClick={() => setVideoUrl(SAMPLE_VIDEO_URL)}
          >Use demo clip</button>
        </div>
      )}
    </div>
  );

  // STEP 1: Script
  const renderScript = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Write Your Script</div>
      <div style={styles.sectionSub}>
        Type a script, upload audio, or import a PDF/PPTX deck — we analyze slides and write narration for each.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "text", label: "Type script" },
          { id: "audio", label: "Upload / record audio" },
          { id: "deck", label: "PDF / PowerPoint" },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            style={{
              ...styles.secondaryBtn,
              padding: "8px 16px",
              background: scriptSource === id ? "rgba(124,58,237,0.28)" : "rgba(255,255,255,0.04)",
              border: scriptSource === id ? "1px solid rgba(124,58,237,0.55)" : "1px solid rgba(255,255,255,0.1)",
              color: scriptSource === id ? "#e9d5ff" : "#94a3b8",
            }}
            onClick={() => {
              setScriptSource(id);
              if (id === "text") clearScriptAudio();
              if (id === "deck" && deckSlides[activeSlideIndex]) {
                setScript(deckSlides[activeSlideIndex].script || "");
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {scriptSource === "deck" && (
        <DeckScriptSection
          styles={styles}
          deckSlides={deckSlides}
          activeSlideIndex={activeSlideIndex}
          setActiveSlideIndex={setActiveSlideIndex}
          deckFileName={deckFileName}
          deckLoading={deckLoading}
          deckError={deckError}
          generatingSlideScripts={generatingSlideScripts}
          onDeckFile={handleDeckFile}
          onGenerateScripts={() => generateDeckScripts()}
          onUpdateSlideScript={updateSlideScript}
          onPreviewSlideVoice={previewSlideVoice}
          previewLoading={ttsLoading}
        />
      )}

      {scriptSource === "audio" && (
        <div style={{
          marginBottom: 16, padding: 16, borderRadius: 14,
          background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.22)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 10 }}>
            Audio script
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={() => scriptAudioInputRef.current?.click()}
              disabled={isRecording || transcribingAudio}
            >
              Upload audio file
            </button>
            <button
              type="button"
              style={{
                ...styles.secondaryBtn,
                color: isRecording ? "#f87171" : "#e2e8f0",
                borderColor: isRecording ? "rgba(248,113,113,0.4)" : undefined,
              }}
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={transcribingAudio}
            >
              {isRecording ? "Stop recording" : "Record voice"}
            </button>
            {scriptAudioUrl && (
              <>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  disabled={transcribingAudio}
                  onClick={async () => {
                    setScriptAudioError(null);
                    setTranscribingAudio(true);
                    try {
                      const text = await transcribeScriptAudio(scriptAudioUrl);
                      setScript(text);
                    } catch (err) {
                      setScriptAudioError(err.message);
                    } finally {
                      setTranscribingAudio(false);
                    }
                  }}
                >
                  {transcribingAudio ? "Transcribing…" : "Transcribe again"}
                </button>
                <button type="button" style={styles.secondaryBtn} onClick={clearScriptAudio}>
                  Remove audio
                </button>
              </>
            )}
          </div>
          <input
            ref={scriptAudioInputRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={e => handleScriptAudioFile(e.target.files[0])}
          />
          {scriptAudioUrl && (
            <div style={{ marginBottom: 10 }}>
              <audio controls src={scriptAudioUrl} style={{ width: "100%", height: 40 }} />
              {scriptAudioName && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{scriptAudioName}</div>
              )}
            </div>
          )}
          {transcribingAudio && (
            <div style={{ fontSize: 12, color: "#a78bfa" }}>Transcribing audio to text…</div>
          )}
          {scriptAudioError && (
            <div style={{
              marginTop: 8, padding: "10px 12px", borderRadius: 10, fontSize: 12,
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
              color: "#fca5a5",
            }}>
              {scriptAudioError}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginTop: 8 }}>
            On the next step, pick a voice to re-voice this recording. We transcribe your audio, then generate speech in the voice you choose.
          </div>
        </div>
      )}

      {scriptSource !== "deck" && (
      <>
      {/* Template starters */}
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Greeting", "Product pitch", "Tutorial", "Announcement"].map(t => (
          <button key={t} style={{
            ...styles.tag, cursor: "pointer", border: "1px solid rgba(167,139,250,0.3)",
            background: "rgba(124,58,237,0.15)",
          }}
            onClick={() => {
              const examples = {
                "Greeting": "Hello there! Welcome to our platform. I'm so excited to have you here today. Let's get started on this amazing journey together.",
                "Product pitch": "Introducing the most revolutionary AI-powered tool of 2025. Our platform helps you create stunning videos in minutes, not hours. [pause] Try it free today.",
                "Tutorial": "In this tutorial, I'll walk you through the key features step by step. First, upload your photo. Then write your script. Finally, click generate and watch the magic happen!",
                "Announcement": "We have an *exciting* announcement to make. After months of development, our new feature is finally here. Get ready to transform the way you communicate.",
              };
              setScript(examples[t] || "");
            }}
          >{t}</button>
        ))}
      </div>

      {/* Script textarea — editable transcript (from typing or transcription) */}
      <textarea
        style={{
          ...styles.textarea,
          borderColor: rewritingScript || transcribingAudio ? "rgba(167,139,250,0.6)" : undefined,
          opacity: rewritingScript || transcribingAudio ? 0.7 : 1,
          transition: "all 0.3s",
        }}
        placeholder={
          scriptSource === "audio"
            ? "Transcript appears here after upload/record — edit before choosing a new voice."
            : "Type your script here... Use [pause] for breaks and *word* for emphasis."
        }
        value={rewritingScript ? " Rewriting with AI" : transcribingAudio ? " Transcribing audio…" : script}
        onChange={e => !rewritingScript && !transcribingAudio && setScript(e.target.value)}
        maxLength={1000}
        readOnly={rewritingScript || transcribingAudio}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#64748b", fontSize: 13 }}>
        <span>{charCount}/1000 characters</span>
        <span>
          {scriptSource === "audio" && scriptAudioUrl
            ? "Audio script ready — voice changes on next step"
            : `~${Math.max(1, Math.round(charCount / 15))}s estimated duration`}
        </span>
      </div>
      </>
      )}

      {/* Error message */}
      {rewriteError && (
        <div style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171", fontSize: 13,
        }}> {rewriteError}</div>
      )}

      {/* Emotion Tone + Rewrite section */}
      <div style={{
        marginTop: 20, padding: "20px", borderRadius: 14,
        background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 2, fontWeight: 700, letterSpacing: 0.5 }}> EMOTION TONE</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Free AI rewrite: Hugging Face → Ollama → Groq → built-in fallback
            </div>
          </div>
        </div>

        {/* Emotion pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {EMOTIONS.map(e => {
            const emotionConfig = {
              Neutral: { icon: "", color: "#94a3b8" },
              Happy: { icon: "", color: "#f59e0b" },
              Serious: { icon: "", color: "#64748b" },
              Excited: { icon: "", color: "#f97316" },
              Calm: { icon: "", color: "#06b6d4" },
              Inspirational: { icon: "", color: "#a78bfa" },
            };
            const cfg = emotionConfig[e] || { icon: "", color: "#94a3b8" };
            const isActive = selectedEmotion === e;
            return (
              <button key={e}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 24, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  borderColor: isActive ? cfg.color : "rgba(255,255,255,0.1)",
                  background: isActive ? `${cfg.color}22` : "rgba(255,255,255,0.03)",
                  color: isActive ? cfg.color : "#94a3b8",
                  transition: "all 0.15s",
                  boxShadow: isActive ? `0 0 12px ${cfg.color}33` : "none",
                }}
                onClick={() => setSelectedEmotion(e)}
              >
                <span>{cfg.icon}</span>
                <span>{e}</span>
              </button>
            );
          })}
        </div>

        {/* Rewrite button */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 22px", borderRadius: 11, fontSize: 13, fontWeight: 700,
              border: "none", cursor: rewritingScript || !script.trim() || selectedEmotion === "Neutral" ? "not-allowed" : "pointer",
              background: rewritingScript ? "rgba(124,58,237,0.3)" :
                selectedEmotion === "Neutral" || !script.trim() ? "rgba(255,255,255,0.05)" :
                  "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: selectedEmotion === "Neutral" || !script.trim() ? "#475569" : "#fff",
              opacity: rewritingScript ? 0.8 : 1,
              boxShadow: !rewritingScript && selectedEmotion !== "Neutral" && script.trim() ? "0 4px 16px rgba(124,58,237,0.35)" : "none",
              transition: "all 0.2s",
            }}
            onClick={handleRewriteScript}
            disabled={rewritingScript || !script.trim() || selectedEmotion === "Neutral"}
          >
            {rewritingScript ? (
              <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}></span> Rewriting</>
            ) : (
              <><span></span> Rewrite Script as {selectedEmotion}</>
            )}
          </button>
          {selectedEmotion === "Neutral" && (
            <span style={{ fontSize: 12, color: "#475569" }}> Select an emotion to enable AI rewrite</span>
          )}
          {!script.trim() && selectedEmotion !== "Neutral" && (
            <span style={{ fontSize: 12, color: "#475569" }}> Write a script first</span>
          )}
          {rewriteProvider && (
            <span style={{ fontSize: 12, color: "#6ee7b7" }}>
              Rewritten via {rewriteProvider === "rules" ? "built-in fallback" : rewriteProvider}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // STEP 2: Voice
  const renderVoice = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Choose Your Voice</div>
      <div style={styles.sectionSub}>
        {scriptSource === "deck"
          ? `${deckSlides.length} slide(s) — pick a voice, then generate narration audio for each slide.`
          : `${ACTIVE_VOICES.length} natural AI voices across accents — no robotic presets. Click Test on any voice to preview.`}
      </div>

      {scriptSource === "deck" && deckSlides.length > 0 && (
        <div style={{
          marginBottom: 20, padding: 16, borderRadius: 14,
          background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.22)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6ee7b7", marginBottom: 10 }}>
            Deck voices ({deckSlides.filter(s => s.audioUrl).length}/{deckSlides.length} ready)
          </div>
          <button
            type="button"
            style={styles.secondaryBtn}
            disabled={generatingSlideVoices}
            onClick={generateVoicesForAllSlides}
          >
            {generatingSlideVoices ? "Generating slide voices…" : "Generate voice for all slides"}
          </button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {deckSlides.map((slide, i) => (
              <button
                key={slide.index}
                type="button"
                style={{
                  ...styles.secondaryBtn,
                  padding: "6px 12px",
                  fontSize: 12,
                  borderColor: slide.audioUrl
                    ? "rgba(16,185,129,0.45)"
                    : "rgba(255,255,255,0.1)",
                  color: slide.audioUrl ? "#a7f3d0" : "#94a3b8",
                }}
                onClick={() => {
                  setActiveSlideIndex(i);
                  setScript(slide.script || "");
                }}
              >
                Slide {slide.index}{slide.audioUrl ? " ✓" : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {voiceError && (
        <div style={{
          marginBottom: 18,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.2)",
          color: "#fca5a5",
          fontSize: 13,
        }}>
          Voice preview failed: {voiceError}
        </div>
      )}

      {ACTIVE_VOICE_GROUPS.map(group => (
        <div key={group.group} style={{ marginBottom: 28 }}>
          {/* Group header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
            paddingBottom: 10, borderBottom: `1px solid ${group.color}30`,
          }}>
            <div style={{
              width: 3, height: 20, borderRadius: 2,
              background: group.color, flexShrink: 0,
            }} />
            <span style={{ fontWeight: 800, fontSize: 14, color: group.color, letterSpacing: 0.3 }}>
              {group.group}
            </span>
            <span style={{
              fontSize: 11, color: "#475569", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
              padding: "2px 8px",
            }}>
              {group.voices.length} voices
            </span>
          </div>

          {/* Voice cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {group.voices.map(v => {
              const isActive = selectedVoice.id === v.id && !selectedVoice.isCloned;
              return (
                <div key={v.id} style={styles.voiceCard(isActive)} onClick={() => setSelectedVoice(v)}>
                  <div style={{ fontWeight: 600, color: isActive ? "#fff" : "#e2e8f0" }}>{v.label}</div>
                  <div style={{ fontSize: 12, color: isActive ? "#d1d5db" : "#94a3b8" }}>{v.style}</div>
                  <button style={{ marginTop: 6, fontSize: 12, background: "rgba(255,255,255,0.1)", border: "none", padding: "4px 8px", cursor: "pointer" }} onClick={e => { e.stopPropagation(); handlePreview(null, v); }} disabled={previewActive}>Test</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Uploaded / Cloned Voices */}
      <div style={{ marginTop: 24 }}>
        <div style={styles.sectionTitle}>Your Uploaded Voices</div>
        <div style={styles.sectionSub}>
          Upload a 10+ second voice sample, then adjust pitch and speed. Requires FAL_KEY for AI cloning that speaks your script.
        </div>

        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          marginBottom: 16, padding: 14, borderRadius: 14,
          background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)",
        }}>
          <input
            type="text"
            placeholder="Voice name (e.g. My Narrator)"
            value={voiceUploadName}
            onChange={e => setVoiceUploadName(e.target.value)}
            style={{
              flex: "1 1 180px", minWidth: 180, padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)",
              color: "#e2e8f0", fontSize: 13,
            }}
          />
          <button
            style={{
              ...styles.secondaryBtn,
              opacity: voiceUploadLoading ? 0.7 : 1,
              cursor: voiceUploadLoading ? "wait" : "pointer",
            }}
            disabled={voiceUploadLoading}
            onClick={() => voiceFileInputRef.current?.click()}
          >
            {voiceUploadLoading ? "Uploading..." : "+ Upload Voice Sample"}
          </button>
          <input
            type="file"
            accept="audio/*"
            ref={voiceFileInputRef}
            style={{ display: "none" }}
            onChange={e => handleVoiceUpload(e.target.files[0])}
          />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {clonedVoices.map(v => {
            const isActive = selectedVoice.id === v.id && selectedVoice.isCloned;
            return (
              <div key={v.id} style={styles.voiceCard(isActive)} onClick={() => setSelectedVoice(v)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: isActive ? "#fff" : "#e2e8f0" }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      {v.customVoiceId ? "AI cloned" : "Sample only"}
                    </div>
                  </div>
                  <button
                    style={{ fontSize: 11, background: "transparent", border: "none", color: "#f87171", cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); deleteClonedVoice(v.id); }}
                    title="Delete voice"
                  >
                    Delete
                  </button>
                </div>
                <button
                  style={{ marginTop: 8, fontSize: 12, background: "rgba(255,255,255,0.1)", border: "none", padding: "4px 8px", cursor: "pointer" }}
                  onClick={e => { e.stopPropagation(); handlePreview(null, v); }}
                  disabled={previewActive || ttsLoading}
                >
                  Test
                </button>
              </div>
            );
          })}
        </div>

        {selectedVoice.isCloned && (
          <div style={{
            marginTop: 18, padding: 16, borderRadius: 14,
            background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#c4b5fd" }}>
              Modify "{selectedVoice.label}"
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 14 }}>
              {[
                { label: "Pitch", key: "pitch", min: -12, max: 12, step: 1, display: `${selectedVoice.pitch ?? 0}` },
                { label: "Speed", key: "speed", min: 0.5, max: 2, step: 0.05, display: `${(selectedVoice.speed ?? 1).toFixed(2)}x` },
              ].map(({ label, key, min, max, step, display }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>{display}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={selectedVoice[key] ?? (key === "speed" ? 1 : 0)}
                    onChange={e => updateClonedVoice(selectedVoice.id, { [key]: parseFloat(e.target.value) })}
                    style={styles.slider}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="text"
                value={selectedVoice.label}
                onChange={e => updateClonedVoice(selectedVoice.id, { label: e.target.value })}
                style={{
                  flex: "1 1 160px", padding: "8px 10px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.2)", color: "#e2e8f0",
                }}
              />
              <button
                style={styles.secondaryBtn}
                disabled={voiceUploadLoading}
                onClick={() => voiceReplaceInputRef.current?.click()}
              >
                Replace Sample
              </button>
              <input
                type="file"
                accept="audio/*"
                ref={voiceReplaceInputRef}
                style={{ display: "none" }}
                onChange={e => handleVoiceUpload(e.target.files[0], selectedVoice.id)}
              />
            </div>
          </div>
        )}
      </div>

      {GEMINI_VOICE && <div style={{ marginBottom: 28 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
          paddingBottom: 10, borderBottom: "1px solid rgba(96,165,250,0.2)",
        }}>
          <div style={{
            width: 3, height: 20, borderRadius: 2,
            background: "#60a5fa", flexShrink: 0,
          }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: "#60a5fa", letterSpacing: 0.3 }}>
            Google Gemini
          </span>
          <span style={{
            fontSize: 11, color: "#475569", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20,
            padding: "2px 8px",
          }}>
            1 voice
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {(() => {
            const v = GEMINI_VOICE;
            const isSelected = selectedVoice.id === v.id;
            return (
              <div
                key={v.id}
                style={{
                  ...styles.voiceCard(isSelected),
                  borderColor: isSelected ? "#60a5fa" : "rgba(255,255,255,0.08)",
                  background: isSelected ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)",
                }}
                onClick={() => setSelectedVoice(v)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 18 }}>{v.emoji}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{v.label}</span>
                        <span style={{ fontSize: 13 }}>{v.flag}</span>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 10 }}>{v.accent}  {v.gender}</div>
                    </div>
                  </div>
                  <span style={{
                    ...styles.tag,
                    background: "rgba(96,165,250,0.14)",
                    color: "#60a5fa",
                    border: "1px solid rgba(96,165,250,0.3)",
                    fontSize: 10,
                  }}>{v.style}</span>
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                  {v.desc}
                </div>

                <div style={{ fontSize: 10, color: "#475569", marginBottom: isSelected ? 6 : 8, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: "#60a5fa" }}></span>
                  <span>Gemini TTS  {v.geminiVoice}</span>
                </div>

                {isSelected && (
                  <div style={{ marginBottom: 8 }}>
                    <Waveform active={previewActive && !ttsLoading} color="#60a5fa" />
                  </div>
                )}

                <button
                  style={{
                    width: "100%", padding: "6px 0", fontSize: 11, fontWeight: 700,
                    borderRadius: 8, border: "1px solid rgba(96,165,250,0.35)",
                    background: "rgba(96,165,250,0.12)", color: "#60a5fa",
                    cursor: ttsLoading ? "wait" : "pointer", letterSpacing: 0.3,
                    transition: "all 0.15s",
                    opacity: ttsLoading ? 0.6 : 1,
                  }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    stopAudio();
                    setSelectedVoice(v);
                    setTimeout(() => handlePreview(v.sampleText, v), 50);
                  }}
                >{ttsLoading && selectedVoice.id === v.id ? " Loading" : " Test Gemini Voice"}</button>
              </div>
            );
          })()}
        </div>
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 4 }}>
        {!selectedVoice.isCloned && [
          { label: "Playback Speed", val: voiceSpeed, set: setVoiceSpeed, min: 0.5, max: 2, step: 0.05, display: `${voiceSpeed.toFixed(2)}` },
        ].map(({ label, val, set, min, max, step, display }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>{display}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={val}
              onChange={e => set(parseFloat(e.target.value))}
              style={styles.slider} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button style={{
          ...styles.secondaryBtn,
          display: "flex", alignItems: "center", gap: 8,
          color: previewActive ? "#f87171" : "#e2e8f0",
          borderColor: previewActive ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.1)",
          opacity: ttsLoading ? 0.7 : 1,
          cursor: ttsLoading ? "wait" : "pointer",
        }} onClick={() => handlePreview()}>
          {ttsLoading ? " Generating" : previewActive ? " Stop" : " Preview with Script"}
        </button>
        <span style={{ fontSize: 12, color: "#a78bfa", display: "flex", alignItems: "center", gap: 5 }}>
          <span></span> {selectedVoice.isCloned ? "Powered by fal.ai voice cloning" : "Powered by fal.ai MiniMax natural speech"}
        </span>
      </div>
    </div>
  );

  // STEP 3: Music
  const renderMusic = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Background Music</div>
      <div style={styles.sectionSub}>Choose ambient music to accompany your video</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {MUSIC_GENRES.map(g => (
          <div key={g.id} style={styles.musicCard(selectedMusic.id === g.id)}
            onClick={() => setSelectedMusic(g)}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{g.label}</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{g.desc}</div>
            {selectedMusic.id === g.id && (
              <div style={{ marginTop: 8 }}>
                <Waveform active={selectedMusic.id !== "none"} color="#60a5fa" />
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedMusic.id !== "none" && (
        <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>MUSIC VOLUME</span>
            <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 700 }}>{musicVolume}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={musicVolume}
            onChange={e => setMusicVolume(parseInt(e.target.value))}
            style={styles.slider} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#475569", fontSize: 11 }}>
            <span>Subtle</span><span>Balanced</span><span>Prominent</span>
          </div>
        </div>
      )}

      <div style={{
        marginTop: 20, padding: "16px 20px", borderRadius: 12,
        background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)",
        fontSize: 13, color: "#93c5fd",
      }}>
         Music is AI-generated, royalty-free, and synced to your video duration
      </div>
    </div>
  );

  //  canvas-based MP4 export (renders avatar + waveform frames to canvas, exports via MediaRecorder) 
  const [shareToast, setShareToast] = useState(null); // {type:"success"|"error", msg}
  const [downloading, setDownloading] = useState(false);
  const [editingSection, setEditingSection] = useState(null); // "photo"|"script"|"voice"|"music"|null

  const showToast = (type, msg) => {
    setShareToast({ type, msg });
    setTimeout(() => setShareToast(null), 3500);
  };

  // Render a single frame of the avatar onto an offscreen canvas
  const drawFrame = (ctx, w, h, imgEl, mouthH, frameIdx, label) => {
    // Background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#0f0a1e");
    bg.addColorStop(1, "#1a0533");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, r = 110;

    const headBob = Math.sin(frameIdx * 0.08) * 0.8;
    const breathScale = 1 + Math.sin(frameIdx * (2 * Math.PI / 80)) * 0.0015;

    // Apply head bob to the face center Y
    const cy = h / 2 - 30 + headBob;

    // Glow ring (scales with breathing)
    ctx.save();
    ctx.shadowColor = "rgba(167,139,250,0.6)";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, (r + 4) * breathScale, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(167,139,250,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Avatar circle clip (with breathing scale)
    const scaledR = r * breathScale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, scaledR, 0, Math.PI * 2);
    ctx.clip();
    if (imgEl && imgEl.naturalWidth > 0) {
      ctx.drawImage(imgEl, cx - scaledR, cy - scaledR, scaledR * 2, scaledR * 2);
    } else {
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(cx - scaledR, cy - scaledR, scaledR * 2, scaledR * 2);
      ctx.font = `${Math.round(scaledR * 0.73)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("", cx, cy);
    }

    const scaledMouthH = Math.max(3, mouthH * 1.2);
    if (scaledMouthH > 0) {
      const mouthW = 34 + mouthH * 0.5;
      const mouthX = cx - mouthW / 2;
      const mouthY = cy + scaledR * 0.48;
      ctx.fillStyle = "rgba(20,10,18,0.66)";
      ctx.beginPath();
      ctx.roundRect(mouthX, mouthY, mouthW, scaledMouthH, 10);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,190,190,0.24)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mouthX + 4, mouthY + 1);
      ctx.lineTo(mouthX + mouthW - 4, mouthY + 1);
      ctx.stroke();
    }
    ctx.restore();

    // Label bar at bottom
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, h - 36, w, 36);
    ctx.font = "600 12px DM Sans, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, h - 18);
  };

  const createFallbackVideoUrl = async () => {
    const W = 960, H = 540, FPS = 24;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering is unavailable.");

    let imgEl = null;
    if (imageUrl) {
      imgEl = await new Promise(res => {
        const el = new Image();
        el.onload = () => res(el);
        el.onerror = () => res(null);
        el.src = imageUrl;
      });
      if (!imgEl || imgEl.naturalWidth === 0) imgEl = null;
    }

    const stream = canvas.captureStream(FPS);
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    const chunks = [];

    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onerror = e => reject(e.error || new Error("Fallback video render failed."));
      recorder.onstop = resolve;
    });

    recorder.start(100);

    const MOUTH_MAP = [3, 6, 10, 14, 10, 6];
    const FRAMES = [0, 1, 2, 3, 2, 1];
    const durationSec = Math.max(3, Math.round(charCount / 15) + 1);
    const totalFrames = durationSec * FPS;
    const label = `Fallback preview - ${selectedVoice.label} - ${selectedEmotion}`;

    for (let f = 0; f < totalFrames; f++) {
      const mouthFrameIdx = Math.floor(f / 2) % FRAMES.length;
      drawFrame(ctx, W, H, imgEl, MOUTH_MAP[FRAMES[mouthFrameIdx]], f, label);
      if (f % 12 === 0) await new Promise(r => setTimeout(r, 0));
    }

    recorder.stop();
    await stopped;
    stream.getTracks?.().forEach(t => t.stop());

    const blob = new Blob(chunks, { type: mime });
    return URL.createObjectURL(blob);
  };

  const handleDownloadMP4 = async () => {
    if (downloading) return;
    setDownloading(true);
    showToast("success", "Rendering video this may take a moment");

    try {
      const W = 960, H = 540, FPS = 24;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");

      // Pre-load avatar image  imageUrl is now a base64 data URL (set by FileReader),
      // so no crossOrigin attribute needed and canvas drawImage won't taint or break.
      let imgEl = null;
      if (imageUrl) {
        imgEl = await new Promise(res => {
          const el = new Image();
          el.onload = () => res(el);
          el.onerror = () => res(null);   // gracefully fall back to placeholder
          el.src = imageUrl;              // data: URL  safe for canvas
        });
        // Extra guard: confirm image actually decoded (naturalWidth=0 means broken)
        if (!imgEl || imgEl.naturalWidth === 0) imgEl = null;
      }

      // Set up MediaRecorder
      const stream = canvas.captureStream(FPS);
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.start(100);

      // Mouth animation frames cycling at ~12fps sync
      const MOUTH_MAP = [0, 4, 8, 12, 8, 4];
      const FRAMES = [0, 1, 2, 3, 2, 1];
      const durationSec = Math.max(3, Math.round(charCount / 15) + 1);
      const totalFrames = durationSec * FPS;
      const label = `${selectedVoice.label}  ${selectedMusic.label} music  ${selectedEmotion}`;

      for (let f = 0; f < totalFrames; f++) {
        const mouthFrameIdx = Math.floor(f / 2) % FRAMES.length;
        const mouthH = MOUTH_MAP[FRAMES[mouthFrameIdx]];
        drawFrame(ctx, W, H, imgEl, mouthH, f, label);
        // Yield to browser every 12 frames to keep UI responsive
        if (f % 12 === 0) await new Promise(r => setTimeout(r, 0));
      }

      recorder.stop();
      await new Promise(res => { recorder.onstop = res; });

      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VoiceSync_${selectedVoice.label}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("success", " Video downloaded!");
    } catch (err) {
      showToast("error", " Download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "VoiceSync AI  My AI Avatar Video",
      text: `Check out my AI lip sync video made with VoiceSync AI!\nVoice: ${selectedVoice.label} (${selectedVoice.accent})\nScript: "${script.slice(0, 80)}${script.length > 80 ? "" : ""}"`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        showToast("success", " Shared successfully!");
      } catch (e) {
        if (e.name !== "AbortError") showToast("error", "Share failed. Link copied instead.");
      }
    } else {
      // Fallback: copy rich text to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showToast("success", " Link & details copied to clipboard!");
      } catch {
        showToast("error", " Could not copy to clipboard.");
      }
    }
  };

  const handleExportAudio = async () => {
    showToast("success", " Generating audio with Hugging Face TTS");
    await handlePreview(script || "No script provided.");
  };

  // STEP 4: Generate / Preview
  const renderGenerate = () => (
    <div>
      {/*  Toast notification  */}
      {shareToast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          background: shareToast.type === "success" ? "rgba(16,185,129,0.95)" : "rgba(239,68,68,0.95)",
          color: "#fff", padding: "12px 20px", borderRadius: 12,
          fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)", maxWidth: 320,
          animation: "slideIn 0.3s ease",
        }}>{shareToast.msg}</div>
      )}

      {/*  Review & Edit panel  */}
      {!generating && !generated && (
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div style={styles.sectionTitle}>Review & Edit</div>
          <div style={styles.sectionSub}>Click any section to edit inline before generating</div>

          {generationError && (
            <div style={{
              marginBottom: 18,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.22)",
              color: "#fecaca",
              fontSize: 13,
              lineHeight: 1.5,
            }}>
              <div style={{ color: "#fca5a5", fontWeight: 800, marginBottom: 4 }}>Generation failed</div>
              <div>{generationError}</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>

            {/* Photo row */}
            <div style={reviewRowStyle(editingSection === "photo")}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {imageUrl
                  ? <img src={imageUrl} alt="Avatar" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(167,139,250,0.4)" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}></div>
                }
                <div style={{ flex: 1 }}>
                  <div style={reviewLabelStyle}>PHOTO / AVATAR</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{image?.name || "No photo"}</div>
                </div>
                <button style={editBtnStyle} onClick={() => { fileInputRef.current?.click(); }}>
                   Change Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { handleImageUpload(e.target.files[0]); }} />
              </div>
            </div>

            {/* Script row */}
            <div style={reviewRowStyle(editingSection === "script")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: editingSection === "script" ? 10 : 0 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={reviewLabelStyle}>SCRIPT</div>
                  {editingSection === "script"
                    ? <textarea
                      style={{ ...styles.textarea, minHeight: 90, marginTop: 6 }}
                      value={script}
                      onChange={e => setScript(e.target.value)}
                      maxLength={1000}
                      autoFocus
                    />
                    : <div style={{ fontWeight: 500, fontSize: 13, color: "#94a3b8", lineHeight: 1.5, maxHeight: 40, overflow: "hidden" }}>
                      {script || <span style={{ color: "#475569" }}>No script written</span>}
                    </div>
                  }
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{charCount}/1000 chars  ~{Math.max(1, Math.round(charCount / 15))}s</div>
                </div>
                <button style={editBtnStyle} onClick={() => setEditingSection(editingSection === "script" ? null : "script")}>
                  {editingSection === "script" ? " Done" : " Edit"}
                </button>
              </div>
            </div>

            {/* Voice row */}
            <div style={reviewRowStyle(editingSection === "voice")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={reviewLabelStyle}>VOICE</div>
                  {editingSection === "voice" ? (
                    <div style={{ marginTop: 10 }}>
                      {clonedVoices.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, marginBottom: 8 }}>UPLOADED VOICES</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            {clonedVoices.map(v => (
                              <button key={v.id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  padding: "6px 12px", borderRadius: 10, cursor: "pointer",
                                  border: `1px solid ${selectedVoice.id === v.id ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
                                  background: selectedVoice.id === v.id ? "rgba(167,139,250,0.22)" : "rgba(255,255,255,0.03)",
                                  color: selectedVoice.id === v.id ? "#e9d5ff" : "#94a3b8",
                                  fontSize: 12, fontWeight: 600,
                                }}
                                onClick={() => setSelectedVoice(v)}
                              >
                                <span>{v.emoji || "🎙️"}</span>
                                <span>{v.label}</span>
                              </button>
                            ))}
                          </div>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={e => handleVoiceUpload(e.target.files[0])}
                            style={{ fontSize: 12, color: "#94a3b8" }}
                          />
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                        {ALL_VOICES.map(v => (
                          <button key={v.id}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 12px", borderRadius: 10, cursor: "pointer",
                              border: `1px solid ${selectedVoice.id === v.id ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
                              background: selectedVoice.id === v.id ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
                              color: selectedVoice.id === v.id ? "#c4b5fd" : "#94a3b8",
                              fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                            }}
                            onClick={() => setSelectedVoice(v)}
                          >
                            <span>{v.emoji}</span>
                            <span>{v.label}</span>
                            <span style={{ fontSize: 10, opacity: 0.7 }}>{v.flag}</span>
                          </button>
                        ))}
                      </div>
                      {selectedVoice.isCloned ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          {[
                            { label: "Pitch", key: "pitch", min: -12, max: 12, step: 1, display: `${selectedVoice.pitch ?? 0}` },
                            { label: "Speed", key: "speed", min: 0.5, max: 2, step: 0.05, display: `${(selectedVoice.speed ?? 1).toFixed(2)}x` },
                          ].map(({ label, key, min, max, step, display }) => (
                            <div key={key}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{label}</span>
                                <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>{display}</span>
                              </div>
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={step}
                                value={selectedVoice[key] ?? (key === "speed" ? 1 : 0)}
                                onChange={e => updateClonedVoice(selectedVoice.id, { [key]: parseFloat(e.target.value) })}
                                style={styles.slider}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          {[
                            { label: "Speed", val: voiceSpeed, set: setVoiceSpeed, min: 0.5, max: 2, step: 0.05, display: `${voiceSpeed.toFixed(2)}` },
                          ].map(({ label, val, set, min, max, step, display }) => (
                            <div key={label}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{label}</span>
                                <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>{display}</span>
                              </div>
                              <input type="range" min={min} max={max} step={step} value={val}
                                onChange={e => set(parseFloat(e.target.value))} style={styles.slider} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{selectedVoice.emoji || (selectedVoice.isCloned ? "🎙️" : "")}</span>
                      <span>{selectedVoice.label}</span>
                      <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}>
                        {selectedVoice.isCloned
                          ? ` custom  pitch ${selectedVoice.pitch ?? 0}  ${(selectedVoice.speed ?? 1).toFixed(1)}x speed`
                          : ` ${selectedVoice.accent || ""}  ${voiceSpeed.toFixed(1)} speed`}
                      </span>
                      {selectedVoice.flag && <span style={{ fontSize: 12 }}>{selectedVoice.flag}</span>}
                    </div>
                  )}
                </div>
                <button style={{ ...editBtnStyle, marginLeft: 12, flexShrink: 0 }} onClick={() => setEditingSection(editingSection === "voice" ? null : "voice")}>
                  {editingSection === "voice" ? " Done" : " Edit"}
                </button>
              </div>
            </div>

            {/* Emotion row */}
            <div style={reviewRowStyle(editingSection === "emotion")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={reviewLabelStyle}>EMOTION TONE</div>
                  {editingSection === "emotion" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {EMOTIONS.map(e => (
                        <button key={e}
                          style={{
                            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", border: "1px solid",
                            borderColor: selectedEmotion === e ? "#7c3aed" : "rgba(255,255,255,0.1)",
                            background: selectedEmotion === e ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)",
                            color: selectedEmotion === e ? "#c4b5fd" : "#94a3b8",
                          }}
                          onClick={() => setSelectedEmotion(e)}>{e}</button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{selectedEmotion}</div>
                  )}
                </div>
                <button style={{ ...editBtnStyle, marginLeft: 12, flexShrink: 0 }} onClick={() => setEditingSection(editingSection === "emotion" ? null : "emotion")}>
                  {editingSection === "emotion" ? " Done" : " Edit"}
                </button>
              </div>
            </div>

            {/* Music row */}
            <div style={reviewRowStyle(editingSection === "music")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={reviewLabelStyle}>BACKGROUND MUSIC</div>
                  {editingSection === "music" ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                        {MUSIC_GENRES.map(g => (
                          <button key={g.id}
                            style={{
                              display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 12px", borderRadius: 10, cursor: "pointer",
                              border: `1px solid ${selectedMusic.id === g.id ? "#60a5fa" : "rgba(255,255,255,0.1)"}`,
                              background: selectedMusic.id === g.id ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.03)",
                              color: selectedMusic.id === g.id ? "#93c5fd" : "#94a3b8",
                              fontSize: 12, fontWeight: 600,
                            }}
                            onClick={() => setSelectedMusic(g)}
                          >{g.icon} {g.label}</button>
                        ))}
                      </div>
                      {selectedMusic.id !== "none" && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>VOLUME</span>
                            <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700 }}>{musicVolume}%</span>
                          </div>
                          <input type="range" min={0} max={100} step={5} value={musicVolume}
                            onChange={e => setMusicVolume(parseInt(e.target.value))} style={styles.slider} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
                      {selectedMusic.icon} {selectedMusic.label}
                      {selectedMusic.id !== "none" && <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}>  {musicVolume}% volume</span>}
                    </div>
                  )}
                </div>
                <button style={{ ...editBtnStyle, marginLeft: 12, flexShrink: 0 }} onClick={() => setEditingSection(editingSection === "music" ? null : "music")}>
                  {editingSection === "music" ? " Done" : " Edit"}
                </button>
              </div>
            </div>
          </div>

          <button
            style={{ ...styles.primaryBtn, width: "100%", justifyContent: "center", fontSize: 16 }}
            onClick={handleGenerate}
            disabled={generating}
          >
            Generate AI Video
          </button>
        </div>
      )}

      {/*  Generation progress  */}
      {generating && (
        <div style={{ ...styles.card, textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <ProgressRing progress={genProgress} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{genProgress}%</div>
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{genStage}</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Please wait while your video is being generated</div>
        </div>
      )}

      {/*  Result screen  */}
      {generated && !generating && (
        <div>
          {/* Video player card */}
          <div style={{ ...styles.card, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {generatedFallback ? "Fallback Preview is Ready" : "Your Video is Ready!"}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                  {generatedFallback
                    ? `${fallbackReason || "Cloud AI generation was unavailable."} A local talking-photo preview was rendered.`
                    : "Real AI lip sync video generated  Click play to preview"}
                </div>
              </div>
              <button style={{
                ...styles.secondaryBtn, fontSize: 13, padding: "8px 16px",
              }} onClick={() => { setGenerated(false); setGeneratedFallback(false); setFallbackReason(""); setGenerating(false); setEditingSection(null); }}>
                 Edit Settings
              </button>
            </div>

            {/* Video viewport */}
            <div style={{
              background: "#000", borderRadius: 16, overflow: "hidden",
              aspectRatio: "16/9", display: "flex", alignItems: "center",
              justifyContent: "center", marginBottom: 20, position: "relative",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              {lipSyncVideoUrl ? (
                <>
                  <video src={lipSyncVideoUrl} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {generatedFallback && (
                    <div style={{
                      position: "absolute", left: 12, bottom: 12,
                      background: "rgba(15,23,42,0.78)", color: "#c4b5fd",
                      border: "1px solid rgba(167,139,250,0.25)",
                      borderRadius: 8, padding: "6px 10px", fontSize: 12,
                      backdropFilter: "blur(8px)",
                    }}>
                      Local fallback preview
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f0a1e 0%, #1a0533 100%)" }} />
                  <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                    <LipSyncFace speaking={speaking || lipSyncLoading} imageUrl={imageUrl} />
                    <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
                      {selectedVoice.emoji} {selectedVoice.label}  {selectedMusic.icon} {selectedMusic.label}  {selectedEmotion}
                    </div>
                    <div style={{ marginTop: 8, color: "#a78bfa", fontSize: 12 }}>
                      {lipSyncLoading ? "Real lip sync is rendering..." : "Fallback preview only. Generate a real lip sync video for realistic mouth movement."}
                    </div>
                  </div>
                  {/* Play/Stop overlay */}
                  <button onClick={() => handlePreview()}
                    style={{
                      position: "absolute", inset: 0, width: "100%", background: speaking ? "transparent" : "rgba(0,0,0,0.3)",
                      border: "none", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", transition: "background 0.2s",
                    }}>
                    {!speaking && (
                      <div style={{
                        width: 64, height: 64, borderRadius: "50%",
                        background: "rgba(124,58,237,0.85)", display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 24,
                        backdropFilter: "blur(8px)", boxShadow: "0 0 30px rgba(124,58,237,0.5)",
                      }}></div>
                    )}
                    {speaking && (
                      <div style={{
                        position: "absolute", bottom: 14, right: 14,
                        background: "rgba(239,68,68,0.85)", borderRadius: 8,
                        padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff",
                        backdropFilter: "blur(8px)",
                      }}> Stop</div>
                    )}
                  </button>
                </>
              )}
            </div>
            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <button
                style={{
                  ...styles.primaryBtn, justifyContent: "center", flexDirection: "column",
                  padding: "14px 12px", gap: 4, opacity: downloading ? 0.7 : 1,
                }}
                onClick={handleDownloadMP4}
                disabled={downloading}
              >
                <span style={{ fontSize: 20 }}></span>
                <span style={{ fontSize: 12 }}>{downloading ? "Rendering" : "Download Video"}</span>
              </button>
              <button
                style={{
                  ...styles.secondaryBtn, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 12px",
                }}
                onClick={handleShare}
              >
                <span style={{ fontSize: 20 }}></span>
                <span style={{ fontSize: 12 }}>Share Link</span>
              </button>
              <button
                style={{
                  ...styles.secondaryBtn, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 12px",
                }}
                onClick={handleExportAudio}
              >
                <span style={{ fontSize: 20 }}></span>
                <span style={{ fontSize: 12 }}>Play Audio</span>
              </button>
            </div>

            {/* Copy script button */}
            <button
              style={{ ...styles.secondaryBtn, width: "100%", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(script);
                  showToast("success", " Script copied to clipboard!");
                } catch { showToast("error", " Could not copy script."); }
              }}
            > Copy Script to Clipboard</button>
          </div>

          {/* Metadata badges */}
          <div style={{ ...styles.card, padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { icon: "", label: "WebM / VP9", sub: "Best browser quality" },
                { icon: "", label: selectedVoice.label, sub: selectedVoice.accent },
                { icon: "", label: selectedMusic.label, sub: `${selectedMusic.id !== "none" ? musicVolume + "% vol" : "Off"}` },
                { icon: "", label: "Private", sub: "Stored locally" },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{
                  textAlign: "center", padding: "10px 8px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                style={{ ...styles.secondaryBtn, flex: 1, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={() => {
                  stopAudio();
                  setGenerated(false); setGeneratedFallback(false); setFallbackReason(""); setStep(0);
                  setImage(null); setImageUrl(null); setVideoUrl(""); setLipSyncVideoUrl(null);
                  setSourceMode("photo");
                  setScript("");
                  setScriptSource("text");
                  clearScriptAudio();
                  setSpeaking(false); setPreviewActive(false);
                  setSelectedVoice(ACTIVE_VOICES[0]); setVoiceSpeed(1.0);
                  setEditingSection(null); setTtsCache({});
                }}
              > Start New Video</button>
              <button
                style={{ ...styles.secondaryBtn, flex: 1, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={() => { setGenerated(false); setGeneratedFallback(false); setFallbackReason(""); setGenerating(false); setEditingSection(null); }}
              > Edit & Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  //  Inline review row helpers 
  const reviewRowStyle = (active) => ({
    padding: "14px 16px", borderRadius: 12,
    background: active ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${active ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`,
    transition: "all 0.2s",
  });
  const reviewLabelStyle = {
    fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: 0.8,
    textTransform: "uppercase", marginBottom: 4,
  };
  const editBtnStyle = {
    padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8,
    border: "1px solid rgba(167,139,250,0.35)", background: "rgba(124,58,237,0.15)",
    color: "#c4b5fd", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
    transition: "all 0.15s",
  };

  const stepContent = [renderUpload, renderScript, renderVoice, renderMusic, renderGenerate];

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 16px; height: 16px;
          border-radius: 50%; background: #7c3aed; cursor: pointer;
          box-shadow: 0 0 8px rgba(124,58,237,0.5);
        }
        textarea:focus { border-color: rgba(167,139,250,0.5) !important; }
        button:hover { opacity: 0.92; transform: translateY(-1px); }
        @keyframes wave-0 { from { height: 6px; } to { height: 30px; } }
        @keyframes wave-1 { from { height: 10px; } to { height: 24px; } }
        @keyframes wave-2 { from { height: 4px; } to { height: 20px; } }
        @keyframes wave-3 { from { height: 8px; } to { height: 28px; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={styles.bg} />
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}></div>
            <div>
              <div style={styles.logoText}>VoiceSync AI</div>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: 0.5 }}>Powered by Hugging Face TTS</div>
            </div>
          </div>
          <span style={styles.badge}>Beta</span>
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { icon: "", label: "Lip Sync AI" },
            { icon: "", label: "Voice Clone" },
            { icon: "", label: "AI Music" },
            { icon: "", label: "Real-time Gen" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 13, color: "#94a3b8",
            }}>
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>

        {/* Stepper */}
        <div style={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div style={styles.stepDot(step === i, step > i)}
                onClick={() => step > i && setStep(i)}>
                {step > i ? "" : i + 1}
              </div>
              {i < STEPS.length - 1 && <div style={styles.stepLine(step > i)} />}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 24, color: "#a78bfa", fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>
          Step {step + 1}  {STEPS[step]}
        </div>

        {/* Step content */}
        {stepContent[step]()}

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button
            style={{ ...styles.secondaryBtn, visibility: step === 0 ? "hidden" : "visible" }}
            onClick={() => setStep(s => s - 1)}
          > Back</button>
          {step < STEPS.length - 1 && (
            <button
              style={{
                ...styles.primaryBtn,
                opacity: canProceed[step] ? 1 : 0.4,
                cursor: canProceed[step] ? "pointer" : "not-allowed",
              }}
              onClick={() => canProceed[step] && setStep(s => s + 1)}
            >Continue </button>
          )}
        </div>
      </div>
    </div>
  );
}









