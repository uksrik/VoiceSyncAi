import React, { useState, useRef, useEffect, useCallback } from "react";

const MUSIC_GENRES = [
  { id: "cinematic", label: "Cinematic", icon: "🎬", desc: "Epic orchestral" },
  { id: "ambient", label: "Ambient", icon: "🌌", desc: "Calm & atmospheric" },
  { id: "corporate", label: "Corporate", icon: "💼", desc: "Professional & clean" },
  { id: "upbeat", label: "Upbeat", icon: "⚡", desc: "Energetic & lively" },
  { id: "emotional", label: "Emotional", icon: "💫", desc: "Warm & heartfelt" },
  { id: "none", label: "No Music", icon: "🔇", desc: "Voice only" },
];

// ─── Claude TTS Voice Engine ───────────────────────────────────────────────
// Uses Anthropic's native audio output (claude-sonnet-4-20250514) for
// genuinely natural, human-sounding speech — not browser synthesis.
//
// Each profile maps to one of Claude's built-in TTS voices plus a persona
// system prompt that shapes accent, pace, and emotional colour.
//
// Available Claude TTS voices: alloy · echo · fable · onyx · nova · shimmer
// ─────────────────────────────────────────────────────────────────────────────
const VOICE_GROUPS = [
  {
    group: "🌏 Indian Voices",
    color: "#f97316",
    voices: [
      {
        id: "priya", label: "Priya", gender: "female", style: "Warm & Melodic", accent: "Indian",
        emoji: "🌸", desc: "Soft, melodic tone with a natural Indian lilt",
        claudeVoice: "shimmer",
        persona: "You are Priya, a warm and melodic Indian woman. Speak with a gentle South Asian lilt, soft consonants, a naturally musical rhythm, and heartfelt warmth. Your pace is unhurried and expressive.",
        sampleText: "Namaste! I'm Priya — warm, melodic, and expressive.",
        flag: "🇮🇳",
      },
      {
        id: "arjun", label: "Arjun", gender: "male", style: "Confident & Clear", accent: "Indian",
        emoji: "🎯", desc: "Crisp, professional delivery with authoritative presence",
        claudeVoice: "onyx",
        persona: "You are Arjun, a confident and articulate Indian professional. Speak with a crisp North Indian English accent, clear enunciation, measured authority, and an assured, forward-leaning energy.",
        sampleText: "Hello, Arjun here — confident and articulate.",
        flag: "🇮🇳",
      },
      {
        id: "kavya", label: "Kavya", gender: "female", style: "Bright & Expressive", accent: "South Indian",
        emoji: "✨", desc: "Vibrant and expressive with a South Indian cadence",
        claudeVoice: "nova",
        persona: "You are Kavya, a bright and expressive young woman from South India. Speak with a vibrant Kannada-influenced English cadence, slightly faster pace, rising intonation, and genuine enthusiasm.",
        sampleText: "Hi! I'm Kavya — bright, expressive and full of life!",
        flag: "🇮🇳",
      },
      {
        id: "vikram", label: "Vikram", gender: "male", style: "Deep & Narrative", accent: "North Indian",
        emoji: "🏔️", desc: "Rich baritone with a deliberate storytelling pace",
        claudeVoice: "fable",
        persona: "You are Vikram, a deep-voiced storyteller from North India. Speak with a resonant Hindi-accented baritone, deliberate pacing, strong consonants, and the gravitas of a seasoned narrator.",
        sampleText: "Vikram speaking. Every word carries weight and depth.",
        flag: "🇮🇳",
      },
    ],
  },
  {
    group: "🌺 Telugu Voices",
    color: "#10b981",
    voices: [
      {
        id: "lakshmi", label: "Lakshmi", gender: "female", style: "Graceful & Warm", accent: "Telugu",
        emoji: "🌺", desc: "Melodious Telugu lilt with graceful South Indian warmth",
        claudeVoice: "shimmer",
        persona: "You are Lakshmi, a graceful Telugu woman from Andhra Pradesh. Speak English with a beautiful Telugu-influenced cadence — soft retroflex consonants, gently musical intonation, warm vowels, and the dignified poise of a classical South Indian speaker. Your tone is sincere and heartfelt.",
        sampleText: "Namaskaram! I am Lakshmi — graceful, warm, and deeply expressive.",
        flag: "🇮🇳",
      },
      {
        id: "krishna", label: "Krishna", gender: "male", style: "Strong & Resonant", accent: "Telugu",
        emoji: "🏺", desc: "Deep, authoritative Telugu male with commanding presence",
        claudeVoice: "onyx",
        persona: "You are Krishna, a confident Telugu man from Hyderabad. Speak English with a strong Telugu-accented baritone — distinct retroflex sounds, measured authority, slightly elongated vowels, and the commanding presence of a Telangana professional. Clear, direct, and trustworthy.",
        sampleText: "Hello! Krishna here — strong, clear, and confident.",
        flag: "🇮🇳",
      },
      {
        id: "divya", label: "Divya", gender: "female", style: "Bright & Youthful", accent: "Telugu",
        emoji: "✨", desc: "Energetic young Telugu woman, modern and expressive",
        claudeVoice: "nova",
        persona: "You are Divya, a bright and enthusiastic young Telugu woman from Hyderabad. Speak with vibrant energy, a modern Hyderabadi English accent with Telugu cadence, fast-paced rhythm, naturally rising intonation, and infectious positivity. You blend tech-city confidence with traditional warmth.",
        sampleText: "Hi everyone! Divya here — energetic, modern, and ready to inspire!",
        flag: "🇮🇳",
      },
    ],
  },
  {
    group: "🎶 Tamil Voices",
    color: "#f43f5e",
    voices: [
      {
        id: "meenakshi", label: "Meenakshi", gender: "female", style: "Classical & Elegant", accent: "Tamil",
        emoji: "🪷", desc: "Elegant Tamil cadence with classical poise",
        claudeVoice: "shimmer",
        persona: "You are Meenakshi, an elegant Tamil woman from Chennai. Speak English with a refined Tamil Nadu accent — distinct Tamil consonants, a beautifully rhythmic cadence, precise articulation, and the dignified warmth of a Chennai professional. Your speech has the grace of classical South Indian culture.",
        sampleText: "Vanakkam! I am Meenakshi — elegant, precise, and warmly expressive.",
        flag: "🇮🇳",
      },
      {
        id: "murugan", label: "Murugan", gender: "male", style: "Bold & Expressive", accent: "Tamil",
        emoji: "🦁", desc: "Spirited Tamil male with bold expressive delivery",
        claudeVoice: "fable",
        persona: "You are Murugan, a bold and expressive Tamil man from Tamil Nadu. Speak English with a strong Tamil accent — distinctive Tamil retroflex consonants, emphatic stress patterns, passionate delivery, and the spirited energy of a Chennai storyteller. Your voice carries deep cultural pride.",
        sampleText: "Hello! Murugan speaking — bold, expressive, and full of spirit.",
        flag: "🇮🇳",
      },
      {
        id: "kavitha", label: "Kavitha", gender: "female", style: "Soft & Poetic", accent: "Tamil",
        emoji: "🌸", desc: "Gentle and poetic Tamil voice with lyrical quality",
        claudeVoice: "alloy",
        persona: "You are Kavitha, a soft-spoken and poetic Tamil woman from Coimbatore. Speak English with a gentle Tamil lilt — melodious intonation, thoughtful pacing, soft consonants, and the lyrical quality of Tamil literature brought to life. Your voice is like poetry in motion.",
        sampleText: "Hello! I am Kavitha — soft, poetic, and lyrical in every word.",
        flag: "🇮🇳",
      },
    ],
  },
  {
    group: "🗽 Indian-American Voices",
    color: "#06b6d4",
    voices: [
      {
        id: "ananya", label: "Ananya", gender: "female", style: "Polished & Modern", accent: "Indian-American",
        emoji: "💫", desc: "Smooth American fluency with a subtle South Asian warmth",
        claudeVoice: "shimmer",
        persona: "You are Ananya, a first-generation Indian-American woman. Speak with polished American fluency but with a subtle South Asian warmth in your vowels. You are modern, articulate, and culturally confident.",
        sampleText: "Hey! Ananya here — polished, modern, and culturally fluid.",
        flag: "🇺🇸🇮🇳",
      },
      {
        id: "rohan", label: "Rohan", gender: "male", style: "Smooth & Dynamic", accent: "Indian-American",
        emoji: "🚀", desc: "Energetic American cadence with a hint of Indian heritage",
        claudeVoice: "echo",
        persona: "You are Rohan, a dynamic Indian-American man in his 30s. Speak with energetic American cadence, confident rhythm, and a very subtle Indian-heritage warmth. You sound sharp, modern, and inspiring.",
        sampleText: "Rohan here — dynamic, sharp, and ready to inspire.",
        flag: "🇺🇸🇮🇳",
      },
    ],
  },
  {
    group: "🌍 International Voices",
    color: "#a78bfa",
    voices: [
      {
        id: "nova", label: "Nova", gender: "female", style: "Professional", accent: "American",
        emoji: "👩‍💼", desc: "Clear, confident American newsreader",
        claudeVoice: "nova",
        persona: "You are Nova, a professional American female broadcaster. Speak with clear, crisp American English, confident pacing, and a polished newsreader tone. Authoritative yet approachable.",
        sampleText: "Hello! I'm Nova — professional and clear.",
        flag: "🇺🇸",
      },
      {
        id: "echo", label: "Echo", gender: "male", style: "Deep & Rich", accent: "British",
        emoji: "🎙️", desc: "Warm baritone with British authority",
        claudeVoice: "onyx",
        persona: "You are Echo, a British male with a deep, resonant voice. Speak with a refined RP British accent, measured pace, warm baritone depth, and understated authority. Think BBC documentary narrator.",
        sampleText: "Echo here. Deep, British, and authoritative.",
        flag: "🇬🇧",
      },
      {
        id: "aria", label: "Aria", gender: "female", style: "Warm & Natural", accent: "Australian",
        emoji: "🌿", desc: "Conversational, friendly Australian",
        claudeVoice: "alloy",
        persona: "You are Aria, a warm and friendly Australian woman. Speak with a natural Australian accent — slightly upward inflection, relaxed and conversational, genuinely warm and inviting. Never stiff.",
        sampleText: "Hi there! Aria speaking — warm and natural.",
        flag: "🇦🇺",
      },
      {
        id: "orion", label: "Orion", gender: "male", style: "Calm & Measured", accent: "American",
        emoji: "🌌", desc: "Soothing, meditative American narrator",
        claudeVoice: "fable",
        persona: "You are Orion, a calm and meditative American male narrator. Speak slowly, with intentional pauses, a soothing low register, and a sense of peaceful authority. Like a mindfulness guide or nature documentary voice.",
        sampleText: "Orion. Slow, calm, and measured.",
        flag: "🇺🇸",
      },
      {
        id: "sage", label: "Sage", gender: "female", style: "Energetic", accent: "Irish",
        emoji: "⚡", desc: "Bright and lively with an Irish lilt",
        claudeVoice: "shimmer",
        persona: "You are Sage, an energetic young Irish woman. Speak with a bright Dublin accent, fast-paced rhythm, natural Irish musicality in your intonation, and contagious enthusiasm. Lively and fun.",
        sampleText: "Sage here — upbeat and full of energy!",
        flag: "🇮🇪",
      },
      {
        id: "atlas", label: "Atlas", gender: "male", style: "Storyteller", accent: "Scottish",
        emoji: "📖", desc: "Rich Scottish character voice",
        claudeVoice: "echo",
        persona: "You are Atlas, a Scottish male storyteller with a rich, expressive voice. Speak with a warm Scottish burr, rolling Rs, expressive cadence, and the soulful depth of a Highland bard. Every sentence feels like a story.",
        sampleText: "Atlas. Every word tells a story.",
        flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
      },
    ],
  },
];

// Flat list for easy lookup by id
const VOICES = VOICE_GROUPS.flatMap(g => g.voices);

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const GEMINI_VOICE_NAME = "Kore";

function pcmToWavBlob(base64Pcm, sampleRate = 24000) {
  const pcmBytes = Uint8Array.from(atob(base64Pcm), (char) => char.charCodeAt(0));
  const wavBuffer = new ArrayBuffer(44 + pcmBytes.length);
  const view = new DataView(wavBuffer);
  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcmBytes.length, true);

  new Uint8Array(wavBuffer, 44).set(pcmBytes);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

const GEMINI_VOICE = {
  id: "gemini-kore",
  label: "Gemini Kore",
  gender: "neutral",
  style: "Firm & Natural",
  accent: "American",
  emoji: "🤖",
  desc: "Google Gemini TTS voice with a clean, natural studio sound",
  provider: "gemini",
  geminiVoice: GEMINI_VOICE_NAME,
  sampleText: "This is Gemini Kore. Firm, clear, and naturally expressive.",
  flag: "AI",
};

const ALL_VOICES = [...VOICES, GEMINI_VOICE];

const NATURAL_GEMINI_VOICES = [
  {
    id: "gemini-despina",
    label: "Despina",
    gender: "neutral",
    style: "Smooth",
    accent: "American",
    emoji: "🎙",
    desc: "Smooth and polished for product demos, explainers, and premium narration",
    provider: "gemini",
    geminiVoice: "Despina",
    sampleText: "Despina here. Smooth, polished, and naturally easy to listen to.",
    flag: "G",
  },
  {
    id: "gemini-algieba",
    label: "Algieba",
    gender: "neutral",
    style: "Smooth",
    accent: "Neutral",
    emoji: "✨",
    desc: "Balanced studio delivery with a rounded, refined tone",
    provider: "gemini",
    geminiVoice: "Algieba",
    sampleText: "Algieba here. Rounded, refined, and steady from start to finish.",
    flag: "G",
  },
  {
    id: "gemini-sulafat",
    label: "Sulafat",
    gender: "female",
    style: "Warm",
    accent: "Neutral",
    emoji: "🌿",
    desc: "Warm and rich voice that feels more human and less synthetic",
    provider: "gemini",
    geminiVoice: "Sulafat",
    sampleText: "Sulafat speaking. Warm, rich, and natural without sounding forced.",
    flag: "G",
  },
  {
    id: "gemini-vindemiatrix",
    label: "Vindemiatrix",
    gender: "female",
    style: "Gentle",
    accent: "Neutral",
    emoji: "🌊",
    desc: "Gentle, soft delivery for calm storytelling and intimate reads",
    provider: "gemini",
    geminiVoice: "Vindemiatrix",
    sampleText: "Vindemiatrix here. Gentle, calm, and softly expressive.",
    flag: "G",
  },
  {
    id: "gemini-achernar",
    label: "Achernar",
    gender: "male",
    style: "Soft",
    accent: "Neutral",
    emoji: "🌙",
    desc: "Soft-spoken voice with reduced harshness and a lighter touch",
    provider: "gemini",
    geminiVoice: "Achernar",
    sampleText: "Achernar speaking. Soft-spoken, measured, and comfortably natural.",
    flag: "G",
  },
  {
    id: "gemini-achird",
    label: "Achird",
    gender: "neutral",
    style: "Friendly",
    accent: "American",
    emoji: "🤝",
    desc: "Friendly voice with easy phrasing and conversational warmth",
    provider: "gemini",
    geminiVoice: "Achird",
    sampleText: "Achird here. Friendly, relaxed, and easy to listen to.",
    flag: "G",
  },
  {
    id: "gemini-schedar",
    label: "Schedar",
    gender: "neutral",
    style: "Even",
    accent: "Neutral",
    emoji: "🧊",
    desc: "Even and composed voice for steady narration without choppiness",
    provider: "gemini",
    geminiVoice: "Schedar",
    sampleText: "Schedar here. Even, composed, and steady all the way through.",
    flag: "G",
  },
  {
    id: "gemini-aoede",
    label: "Aoede",
    gender: "female",
    style: "Breezy",
    accent: "Neutral",
    emoji: "🌤",
    desc: "Breezy delivery with natural flow and lighter articulation",
    provider: "gemini",
    geminiVoice: "Aoede",
    sampleText: "Aoede speaking. Breezy, flowing, and light without sounding robotic.",
    flag: "G",
  },
];

const ACTIVE_VOICES = NATURAL_GEMINI_VOICES.length ? NATURAL_GEMINI_VOICES : ALL_VOICES;

const ACTIVE_VOICE_GROUPS = [
  {
    group: "Gemini Natural Voices",
    color: "#60a5fa",
    voices: ACTIVE_VOICES,
  },
];

function getSmoothnessLabel(value) {
  if (value < 30) return "Natural";
  if (value < 60) return "Soft";
  if (value < 80) return "Smooth";
  return "Ultra Smooth";
}

function getSmoothnessInstruction(value) {
  if (value < 30) return "Keep the delivery natural and realistic.";
  if (value < 60) return "Keep the delivery natural with softer consonants and gentler transitions.";
  if (value < 80) return "Use a smooth, human cadence with rounded consonants, less harsh attack, and flowing transitions.";
  return "Use an ultra-smooth studio cadence with rounded consonants, soft transitions, subtle breath flow, and avoid robotic pacing or metallic sharpness.";
}

const EMOTIONS = ["Neutral", "Happy", "Serious", "Excited", "Calm", "Inspirational"];

const STEPS = ["Upload", "Script", "Voice", "Music", "Generate"];

// --- Animated waveform for lipsync preview ---
function Waveform({ active, color = "#a78bfa" }) {
  const bars = 32;
  // BUG FIX: Math.random() was inlined in JSX style → called on every render,
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

// --- Lip sync face animation ---
// FIXES:
//   • Head bob: subtle sine-wave vertical movement (±3px) tied to speaking frame
//   • Blink: eyes close for 4 frames every 72 frames (~3s at 24fps)
//   • Breathing: gentle scale pulse (±0.3%) on a 60-frame cycle
//   • Mouth position: moved to 62% down the face (was 38% — was placing it on the forehead)
const LIP_FRAMES = [0, 1, 2, 3, 2, 1];

function LipSyncFace({ speaking, imageUrl }) {
  const [frame, setFrame] = useState(0);
  const [blinkFrame, setBlinkFrame] = useState(0);

  useEffect(() => {
    if (!speaking) return;
    const id = setInterval(() => {
      setFrame(f => (f + 1) % LIP_FRAMES.length);
      setBlinkFrame(b => b + 1);
    }, 80); // ~12fps for mouth animation
    return () => {
      clearInterval(id);
      setFrame(0);
      setBlinkFrame(0);
    };
  }, [speaking]);

  const mouthOpen = LIP_FRAMES[frame];
  const mouthHeight = [0, 4, 8, 12, 8, 4][mouthOpen] || 0;

  // Natural face movement — only animate when speaking
  const headBob = speaking ? Math.sin(blinkFrame * 0.08) * 3 : 0;         // ±3px vertical bob
  const isBlinking = speaking && (blinkFrame % 72) < 4;                       // blink every ~3s
  const breathScale = speaking ? 1 + Math.sin(blinkFrame * (2 * Math.PI / 60)) * 0.003 : 1; // subtle breathing

  const containerStyle = {
    transform: `translateY(${headBob.toFixed(2)}px) scale(${breathScale.toFixed(5)})`,
    transition: speaking ? "transform 0.08s ease" : "none",
  };

  const faceCircleStyle = {
    width: 180, height: 180, borderRadius: "50%",
    overflow: "hidden", border: "3px solid rgba(167,139,250,0.5)",
    boxShadow: speaking ? "0 0 30px rgba(167,139,250,0.6)" : "0 0 10px rgba(167,139,250,0.2)",
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

            {/* Blink overlay — darkens eye region */}
            {isBlinking && (
              <div style={{
                position: "absolute", top: "22%", left: "10%", width: "80%", height: "20%",
                background: "rgba(0,0,0,0.55)", borderRadius: "0 0 50% 50%",
                transition: "opacity 0.05s",
              }} />
            )}

            {/* Lip sync mouth overlay — FIXED position: 62% down (was 38% = forehead) */}
            <div style={{
              position: "absolute",
              bottom: "18%",             // 18% from bottom ≈ chin area
              left: "50%",
              transform: "translateX(-50%)",
              width: 36,
              height: mouthHeight,
              background: "rgba(0,0,0,0.75)",
              borderRadius: "0 0 20px 20px",
              transition: "height 0.07s ease",
            }} />
          </div>
        ) : (
          <div style={{
            ...faceCircleStyle,
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            border: "3px solid rgba(167,139,250,0.4)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            boxShadow: speaking ? "0 0 30px rgba(167,139,250,0.5)" : "none",
          }}>
            {/* Emoji face */}
            <div style={{ fontSize: 64 }}>👤</div>

            {/* Blink — covers eye area of emoji */}
            {isBlinking && (
              <div style={{
                position: "absolute", top: "28%", left: "20%", width: "60%", height: "16%",
                background: "rgba(30,27,75,0.8)", borderRadius: "0 0 40% 40%",
              }} />
            )}

            {/* Animated mouth on placeholder face */}
            <div style={{
              position: "absolute",
              bottom: "28%",
              width: 32,
              height: mouthHeight,
              background: "rgba(167,139,250,0.7)",
              borderRadius: "0 0 16px 16px",
              transition: "height 0.07s ease",
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
  const [script, setScript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(ACTIVE_VOICES[0]);
  const [selectedEmotion, setSelectedEmotion] = useState("Neutral");
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_GENRES[0]);
  const [musicVolume, setMusicVolume] = useState(30);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceSmoothness, setVoiceSmoothness] = useState(72);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStage, setGenStage] = useState("");
  const [generated, setGenerated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

  const fileInputRef = useRef();
  const audioRef = useRef(null);   // holds the currently-playing HTMLAudioElement
  const audioContextRef = useRef(null);
  const audioGraphCleanupRef = useRef(null);

  // ── Claude TTS engine ────────────────────────────────────────────────────
  // Calls Anthropic /v1/messages with output_audio to get natural speech.
  // Returns a base64 PCM audio blob URL, or null on failure.
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsCache, setTtsCache] = useState({});   // key → objectURL, avoid re-fetching
  const [rewritingScript, setRewritingScript] = useState(false);
  const [rewriteError, setRewriteError] = useState(null);

  // ── Emotion-based script rewriter ─────────────────────────────────────────
  // Calls Claude text API to rewrite the current script matching the chosen emotion.
  const handleRewriteScript = useCallback(async () => {
    if (!script.trim() || selectedEmotion === "Neutral") return;
    setRewritingScript(true);
    setRewriteError(null);
    try {
      const emotionPrompts = {
        Happy: "rewrite it to sound joyful, upbeat, and celebratory — use warm, positive language and an energetic rhythm",
        Serious: "rewrite it to sound authoritative, measured, and gravely sincere — use precise language and a composed, weighty tone",
        Excited: "rewrite it to sound thrilling and enthusiastic — use exclamations, energetic phrasing, and a sense of building momentum",
        Calm: "rewrite it to sound peaceful, soothing, and reassuring — use gentle language, smooth transitions, and a meditative flow",
        Inspirational: "rewrite it to sound motivating and uplifting — use powerful imagery, strong calls to action, and an emotionally resonant narrative arc",
      };
      const instruction = emotionPrompts[selectedEmotion] || `rewrite it with a ${selectedEmotion.toLowerCase()} tone`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system: `You are a professional scriptwriter. The user will give you a spoken script. ${instruction}. 
Keep the same core message and roughly the same length. 
Return ONLY the rewritten script text — no preamble, no quotes, no explanation.`,
          messages: [{ role: "user", content: script }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const newScript = data.content?.find(b => b.type === "text")?.text?.trim();
      if (newScript) {
        setScript(newScript);
        // Invalidate TTS cache for this script since content changed
        setTtsCache({});
      } else {
        throw new Error("Empty response");
      }
    } catch (err) {
      setRewriteError("Rewrite failed — " + err.message);
      setTimeout(() => setRewriteError(null), 4000);
    } finally {
      setRewritingScript(false);
    }
  }, [script, selectedEmotion]);

  const callClaudeTTS = useCallback(async (text, voice) => {
    const cacheKey = `${voice.id}::${selectedEmotion}::${voiceSmoothness}::${text.slice(0, 120)}`;
    if (ttsCache[cacheKey]) return ttsCache[cacheKey];

    if (voice.provider === "gemini") {
      if (!GEMINI_API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY for Gemini voice preview");

      const emotionHint = selectedEmotion === "Neutral"
        ? "Keep the emotion grounded and realistic."
        : `Lean into a ${selectedEmotion.toLowerCase()} emotional tone, but stay human and believable.`;
      const smoothingHint = getSmoothnessInstruction(voiceSmoothness);
      const geminiPrompt = [
        "Read the SCRIPT aloud exactly as written.",
        emotionHint,
        smoothingHint,
        "Avoid robotic pacing, metallic resonance, clipped consonants, and exaggerated pauses.",
        `SCRIPT: ${text}`,
      ].join("\n");

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: geminiPrompt }],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voice.geminiVoice || GEMINI_VOICE_NAME,
                },
              },
            },
          },
        }),
      });

      if (!res.ok) throw new Error(`Gemini TTS API ${res.status}`);
      const data = await res.json();
      const audioPart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
      if (!audioPart?.inlineData?.data) throw new Error("No Gemini audio returned");

      const blob = pcmToWavBlob(audioPart.inlineData.data);
      const url = URL.createObjectURL(blob);
      setTtsCache((prev) => ({ ...prev, [cacheKey]: url }));
      return url;
    }

    const emotionHint = selectedEmotion !== "Neutral"
      ? ` Speak with a ${selectedEmotion.toLowerCase()} emotional tone.` : "";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: voice.persona + emotionHint,
        messages: [{ role: "user", content: text }],
        output_audio: { voice: voice.claudeVoice, format: "mp3" },
      }),
    });

    if (!res.ok) throw new Error(`TTS API ${res.status}`);
    const data = await res.json();
    const audioBlock = data.content?.find((block) => block.type === "audio" || block.audio_data);
    if (!audioBlock) throw new Error("No audio in response");

    const b64 = audioBlock.audio_data ?? audioBlock.data;
    const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    setTtsCache((prev) => ({ ...prev, [cacheKey]: url }));
    return url;
  }, [ttsCache, selectedEmotion, voiceSmoothness]);

  const connectSmoothedAudio = useCallback(async (audio) => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return () => {};

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
      try { source.disconnect(); } catch {}
      try { dryGain.disconnect(); } catch {}
      try { lowpass.disconnect(); } catch {}
      try { compressor.disconnect(); } catch {}
      try { wetGain.disconnect(); } catch {}
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
    setPreviewActive(false);
    setSpeaking(false);
  }, []);

  const handlePreview = useCallback(async (textOverride, voiceOverride) => {
    // Toggle off if already speaking
    if (previewActive) { stopAudio(); return; }

    const text = textOverride || script;
    const voice = voiceOverride || selectedVoice;
    if (!text.trim()) return;

    setVoiceError(null);
    setTtsLoading(true);
    setPreviewActive(true);
    setSpeaking(true);

    try {
      const audioUrl = await callClaudeTTS(text, voice);
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
    } catch (err) {
      console.error("TTS error:", err);
      setPreviewActive(false);
      setSpeaking(false);
      setVoiceError(err.message || "Voice preview failed.");
    } finally {
      setTtsLoading(false);
    }
  }, [previewActive, script, selectedVoice, voiceSpeed, callClaudeTTS, connectSmoothedAudio, stopAudio]);

  useEffect(() => { setCharCount(script.length); }, [script]);

  const handleImageUpload = (file) => {
    if (!file) return;
    setImage(file);
    // Use FileReader to get a base64 data URL — this works for both <img> display
    // AND canvas drawImage() without triggering cross-origin taint or "broken" state.
    // URL.createObjectURL() causes canvas taint in sandboxed iframe environments.
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageUpload(file);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenProgress(0);
    const stages = [
      { label: "Analyzing face structure...", duration: 1200 },
      { label: "Cloning voice from model...", duration: 1500 },
      { label: "Generating speech audio...", duration: 2000 },
      { label: "Running lip sync AI...", duration: 2500 },
      { label: "Compositing background music...", duration: 1500 },
      { label: "Rendering final video...", duration: 2000 },
      { label: "Encoding output...", duration: 1000 },
    ];
    let progress = 0;
    for (let i = 0; i < stages.length; i++) {
      setGenStage(stages[i].label);
      const target = Math.round(((i + 1) / stages.length) * 100);
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
    !!imageUrl,
    script.trim().length > 10,
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
      maxWidth: 980, margin: "0 auto", padding: "0 20px 60px",
      position: "relative", zIndex: 1,
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
      <div style={styles.sectionTitle}>Upload Your Photo</div>
      <div style={styles.sectionSub}>Upload a clear front-facing portrait for best lip sync results</div>

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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <img src={imageUrl} alt="Uploaded" style={{
              width: 160, height: 160, borderRadius: "50%", objectFit: "cover",
              border: "3px solid rgba(167,139,250,0.5)",
              boxShadow: "0 0 30px rgba(124,58,237,0.3)",
            }} />
            <div style={{ color: "#a78bfa", fontWeight: 700 }}>✓ Photo uploaded successfully</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Click to replace</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
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

      {imageUrl && (
        <div style={{
          marginTop: 20, padding: "16px 20px", borderRadius: 12,
          background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: "#34d399", fontSize: 14 }}>Face Detection Ready</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>68 facial landmarks mapped · Lip region extracted</div>
          </div>
        </div>
      )}
    </div>
  );

  // STEP 1: Script
  const renderScript = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Write Your Script</div>
      <div style={styles.sectionSub}>Enter the text your avatar will speak — then pick an emotion and let AI rewrite it to match</div>

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

      {/* Script textarea */}
      <textarea
        style={{
          ...styles.textarea,
          borderColor: rewritingScript ? "rgba(167,139,250,0.6)" : undefined,
          opacity: rewritingScript ? 0.7 : 1,
          transition: "all 0.3s",
        }}
        placeholder="Type your script here... Use [pause] for breaks and *word* for emphasis."
        value={rewritingScript ? "✦ Rewriting with AI…" : script}
        onChange={e => !rewritingScript && setScript(e.target.value)}
        maxLength={1000}
        readOnly={rewritingScript}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#64748b", fontSize: 13 }}>
        <span>{charCount}/1000 characters</span>
        <span>~{Math.max(1, Math.round(charCount / 15))}s estimated duration</span>
      </div>

      {/* Error message */}
      {rewriteError && (
        <div style={{
          marginTop: 10, padding: "10px 14px", borderRadius: 10,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#f87171", fontSize: 13,
        }}>❌ {rewriteError}</div>
      )}

      {/* Emotion Tone + Rewrite section */}
      <div style={{
        marginTop: 20, padding: "20px", borderRadius: 14,
        background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, color: "#a78bfa", marginBottom: 2, fontWeight: 700, letterSpacing: 0.5 }}>✦ EMOTION TONE</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Select a tone, then rewrite your script with AI to match it perfectly</div>
          </div>
        </div>

        {/* Emotion pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {EMOTIONS.map(e => {
            const emotionConfig = {
              Neutral: { icon: "😐", color: "#94a3b8" },
              Happy: { icon: "😊", color: "#f59e0b" },
              Serious: { icon: "🎯", color: "#64748b" },
              Excited: { icon: "⚡", color: "#f97316" },
              Calm: { icon: "🌊", color: "#06b6d4" },
              Inspirational: { icon: "🌟", color: "#a78bfa" },
            };
            const cfg = emotionConfig[e] || { icon: "💬", color: "#94a3b8" };
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
              <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>✦</span> Rewriting…</>
            ) : (
              <><span>✦</span> Rewrite Script as {selectedEmotion}</>
            )}
          </button>
          {selectedEmotion === "Neutral" && (
            <span style={{ fontSize: 12, color: "#475569" }}>← Select an emotion to enable AI rewrite</span>
          )}
          {!script.trim() && selectedEmotion !== "Neutral" && (
            <span style={{ fontSize: 12, color: "#475569" }}>← Write a script first</span>
          )}
        </div>
      </div>
    </div>
  );

  // STEP 2: Voice
  const renderVoice = () => (
    <div style={styles.card}>
      <div style={styles.sectionTitle}>Choose Your Voice</div>
      <div style={styles.sectionSub}>12 distinct voices across accents — Indian, Indian-American & International. Click ▶ Test to hear each one.</div>

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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {group.voices.map(v => {
              const isSelected = selectedVoice.id === v.id;
              return (
                <div key={v.id}
                  style={{
                    ...styles.voiceCard(isSelected),
                    borderColor: isSelected ? group.color : "rgba(255,255,255,0.08)",
                    background: isSelected ? `${group.color}18` : "rgba(255,255,255,0.03)",
                  }}
                  onClick={() => setSelectedVoice(v)}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 18 }}>{v.emoji}</span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{v.label}</span>
                          <span style={{ fontSize: 13 }}>{v.flag}</span>
                        </div>
                        <div style={{ color: "#64748b", fontSize: 10 }}>{v.accent} · {v.gender}</div>
                      </div>
                    </div>
                    <span style={{
                      ...styles.tag,
                      background: `${group.color}22`,
                      color: group.color,
                      border: `1px solid ${group.color}44`,
                      fontSize: 10,
                    }}>{v.style}</span>
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontStyle: "italic", lineHeight: 1.4 }}>
                    {v.desc}
                  </div>

                  {/* Claude TTS voice badge */}
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: isSelected ? 6 : 8, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#a78bfa" }}>✦</span>
                    <span>Claude TTS · {v.claudeVoice}</span>
                  </div>

                  {/* Waveform when selected */}
                  {isSelected && (
                    <div style={{ marginBottom: 8 }}>
                      <Waveform active={previewActive && !ttsLoading} color={group.color} />
                    </div>
                  )}

                  {/* Test button */}
                  <button
                    style={{
                      width: "100%", padding: "6px 0", fontSize: 11, fontWeight: 700,
                      borderRadius: 8, border: `1px solid ${group.color}55`,
                      background: `${group.color}18`, color: group.color,
                      cursor: ttsLoading ? "wait" : "pointer", letterSpacing: 0.3,
                      transition: "all 0.15s",
                      opacity: ttsLoading ? 0.6 : 1,
                    }}
                    onClick={async e => {
                      e.stopPropagation();
                      stopAudio();
                      setSelectedVoice(v);
                      setTimeout(() => handlePreview(v.sampleText, v), 50);
                    }}
                  >{ttsLoading && selectedVoice.id === v.id ? "⏳ Loading…" : "▶ Test Voice"}</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 28 }}>
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
                      <div style={{ color: "#64748b", fontSize: 10 }}>{v.accent} · {v.gender}</div>
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
                  <span style={{ color: "#60a5fa" }}>✦</span>
                  <span>Gemini TTS · {v.geminiVoice}</span>
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
                >{ttsLoading && selectedVoice.id === v.id ? "⏳ Loading…" : "▶ Test Gemini Voice"}</button>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 4 }}>
        {[
          { label: "Playback Speed", val: voiceSpeed, set: setVoiceSpeed, min: 0.5, max: 2, step: 0.05, display: `${voiceSpeed.toFixed(2)}×` },
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
          {ttsLoading ? "⏳ Generating…" : previewActive ? "⏹ Stop" : "▶ Preview with Script"}
        </button>
        <span style={{ fontSize: 12, color: "#a78bfa", display: "flex", alignItems: "center", gap: 5 }}>
          <span>✦</span> Powered by Claude AI TTS — natural human voices
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
        🎵 Music is AI-generated, royalty-free, and synced to your video duration
      </div>
    </div>
  );

  // ── canvas-based MP4 export (renders avatar + waveform frames to canvas, exports via MediaRecorder) ──
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

    // ── Natural face movement ──────────────────────────────────
    // Head bob: ±3px vertical sine tied to frame index
    const headBob = Math.sin(frameIdx * 0.08) * 3;
    // Breathing: gentle scale ±0.3%
    const breathScale = 1 + Math.sin(frameIdx * (2 * Math.PI / 60)) * 0.003;
    // Blink: eyes close for 4 frames out of every 72
    const isBlinking = (frameIdx % 72) < 4;

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
      ctx.fillText("👤", cx, cy);
    }

    // ── Blink overlay ──────────────────────────────────────────
    if (isBlinking) {
      // Dark band across upper-face (eye) region
      const eyeTop = cy - scaledR * 0.1;
      const eyeH = scaledR * 0.25;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.ellipse(cx, eyeTop + eyeH * 0.5, scaledR * 0.65, eyeH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Lip sync mouth overlay ─────────────────────────────────
    // FIX 1: scale mouthH by 6x so it's visible on canvas (was 12px max → 72px now)
    // FIX 2: position at 62% down the face circle (was 38% = forehead area)
    const scaledMouthH = mouthH * 6;
    if (scaledMouthH > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      const mouthW = 48;
      const mouthX = cx - mouthW / 2;
      const mouthY = cy + scaledR * 0.62; // 62% down inside face = chin area
      ctx.beginPath();
      ctx.roundRect(mouthX, mouthY, mouthW, scaledMouthH, [0, 0, 14, 14]);
      ctx.fill();

      // Lip lines for realism
      ctx.strokeStyle = "rgba(180,100,100,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mouthX + 4, mouthY + 1);
      ctx.lineTo(mouthX + mouthW - 4, mouthY + 1);
      ctx.stroke();
    }
    ctx.restore();

    // ── Organic waveform ──────────────────────────────────────
    // FIX: was single sin(frameIdx * 0.4 + i * 0.4) — all bars move in lockstep
    // FIX: now per-bar phase offset + secondary frequency creates organic variance
    const bars = 32, barW = 5, gap = 4;
    const totalBarW = bars * (barW + gap) - gap;
    const waveY = cy + scaledR + 32;
    for (let i = 0; i < bars; i++) {
      const primary = Math.abs(Math.sin(frameIdx * 0.15 + i * 0.7)) * 22;
      const secondary = Math.abs(Math.sin(i * 2.3 + frameIdx * 0.07)) * 8;
      const bh = Math.min(36, 6 + primary + secondary);
      const bx = cx - totalBarW / 2 + i * (barW + gap);
      // Gradient colour per bar: brighter in middle
      const intensity = 0.5 + 0.5 * Math.abs(Math.sin(i * 0.2 + frameIdx * 0.1));
      ctx.fillStyle = `rgba(167,139,250,${(0.5 + intensity * 0.4).toFixed(2)})`;
      ctx.beginPath();
      ctx.roundRect(bx, waveY - bh / 2, barW, bh, 2);
      ctx.fill();
    }

    // Label bar at bottom
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, h - 36, w, 36);
    ctx.font = "600 12px DM Sans, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, h - 18);
  };

  const handleDownloadMP4 = async () => {
    if (downloading) return;
    setDownloading(true);
    showToast("success", "Rendering video… this may take a moment");

    try {
      const W = 960, H = 540, FPS = 24;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");

      // Pre-load avatar image — imageUrl is now a base64 data URL (set by FileReader),
      // so no crossOrigin attribute needed and canvas drawImage won't taint or break.
      let imgEl = null;
      if (imageUrl) {
        imgEl = await new Promise(res => {
          const el = new Image();
          el.onload = () => res(el);
          el.onerror = () => res(null);   // gracefully fall back to placeholder
          el.src = imageUrl;              // data: URL — safe for canvas
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
      const label = `${selectedVoice.label} · ${selectedMusic.label} music · ${selectedEmotion}`;

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
      showToast("success", "✅ Video downloaded!");
    } catch (err) {
      showToast("error", "❌ Download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "VoiceSync AI — My AI Avatar Video",
      text: `Check out my AI lip sync video made with VoiceSync AI!\nVoice: ${selectedVoice.label} (${selectedVoice.accent})\nScript: "${script.slice(0, 80)}${script.length > 80 ? "…" : ""}"`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        showToast("success", "✅ Shared successfully!");
      } catch (e) {
        if (e.name !== "AbortError") showToast("error", "Share failed. Link copied instead.");
      }
    } else {
      // Fallback: copy rich text to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        showToast("success", "📋 Link & details copied to clipboard!");
      } catch {
        showToast("error", "❌ Could not copy to clipboard.");
      }
    }
  };

  const handleExportAudio = async () => {
    showToast("success", "🎵 Generating natural audio with Claude TTS…");
    await handlePreview(script || "No script provided.");
  };

  // STEP 4: Generate / Preview
  const renderGenerate = () => (
    <div>
      {/* ── Toast notification ── */}
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

      {/* ── Review & Edit panel ── */}
      {!generating && !generated && (
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div style={styles.sectionTitle}>Review & Edit</div>
          <div style={styles.sectionSub}>Click any section to edit inline before generating</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>

            {/* Photo row */}
            <div style={reviewRowStyle(editingSection === "photo")}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {imageUrl
                  ? <img src={imageUrl} alt="Avatar" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(167,139,250,0.4)" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👤</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={reviewLabelStyle}>PHOTO / AVATAR</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{image?.name || "No photo"}</div>
                </div>
                <button style={editBtnStyle} onClick={() => { fileInputRef.current?.click(); }}>
                  ✏ Change Photo
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
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{charCount}/1000 chars · ~{Math.max(1, Math.round(charCount / 15))}s</div>
                </div>
                <button style={editBtnStyle} onClick={() => setEditingSection(editingSection === "script" ? null : "script")}>
                  {editingSection === "script" ? "✓ Done" : "✏ Edit"}
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
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          { label: "Speed", val: voiceSpeed, set: setVoiceSpeed, min: 0.5, max: 2, step: 0.05, display: `${voiceSpeed.toFixed(2)}×` },
                          { label: "Pitch", val: voicePitch, set: setVoicePitch, min: -5, max: 5, step: 0.5, display: voicePitch > 0 ? `+${voicePitch}` : `${voicePitch}` },
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
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{selectedVoice.emoji}</span>
                      <span>{selectedVoice.label}</span>
                      <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}>· {selectedVoice.accent} · {voiceSpeed.toFixed(1)}× speed</span>
                      <span style={{ fontSize: 12 }}>{selectedVoice.flag}</span>
                    </div>
                  )}
                </div>
                <button style={{ ...editBtnStyle, marginLeft: 12, flexShrink: 0 }} onClick={() => setEditingSection(editingSection === "voice" ? null : "voice")}>
                  {editingSection === "voice" ? "✓ Done" : "✏ Edit"}
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
                  {editingSection === "emotion" ? "✓ Done" : "✏ Edit"}
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
                      {selectedMusic.id !== "none" && <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12 }}> · {musicVolume}% volume</span>}
                    </div>
                  )}
                </div>
                <button style={{ ...editBtnStyle, marginLeft: 12, flexShrink: 0 }} onClick={() => setEditingSection(editingSection === "music" ? null : "music")}>
                  {editingSection === "music" ? "✓ Done" : "✏ Edit"}
                </button>
              </div>
            </div>
          </div>

          <button style={{ ...styles.primaryBtn, width: "100%", justifyContent: "center", fontSize: 16 }} onClick={handleGenerate}>
            ✨ Generate AI Video
          </button>
        </div>
      )}

      {/* ── Generation progress ── */}
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
          <div style={{ color: "#64748b", fontSize: 13 }}>Please wait while your video is being generated…</div>
        </div>
      )}

      {/* ── Result screen ── */}
      {generated && !generating && (
        <div>
          {/* Video player card */}
          <div style={{ ...styles.card, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>🎉 Your Video is Ready!</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>AI lip sync video generated · Click play to preview</div>
              </div>
              <button style={{
                ...styles.secondaryBtn, fontSize: 13, padding: "8px 16px",
              }} onClick={() => { setGenerated(false); setGenerating(false); setEditingSection(null); }}>
                ✏ Edit Settings
              </button>
            </div>

            {/* Video viewport */}
            <div style={{
              background: "#000", borderRadius: 16, overflow: "hidden",
              aspectRatio: "16/9", display: "flex", alignItems: "center",
              justifyContent: "center", marginBottom: 20, position: "relative",
              border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f0a1e 0%, #1a0533 100%)" }} />
              <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
                <LipSyncFace speaking={speaking} imageUrl={imageUrl} />
                <div style={{ marginTop: 16 }}><Waveform active={speaking} color="#a78bfa" /></div>
                <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
                  {selectedVoice.emoji} {selectedVoice.label} · {selectedMusic.icon} {selectedMusic.label} · {selectedEmotion}
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
                  }}>▶</div>
                )}
                {speaking && (
                  <div style={{
                    position: "absolute", bottom: 14, right: 14,
                    background: "rgba(239,68,68,0.85)", borderRadius: 8,
                    padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff",
                    backdropFilter: "blur(8px)",
                  }}>⏹ Stop</div>
                )}
              </button>
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
                <span style={{ fontSize: 20 }}>⬇</span>
                <span style={{ fontSize: 12 }}>{downloading ? "Rendering…" : "Download Video"}</span>
              </button>
              <button
                style={{
                  ...styles.secondaryBtn, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 12px",
                }}
                onClick={handleShare}
              >
                <span style={{ fontSize: 20 }}>🔗</span>
                <span style={{ fontSize: 12 }}>Share Link</span>
              </button>
              <button
                style={{
                  ...styles.secondaryBtn, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4, padding: "14px 12px",
                }}
                onClick={handleExportAudio}
              >
                <span style={{ fontSize: 20 }}>🎵</span>
                <span style={{ fontSize: 12 }}>Play Audio</span>
              </button>
            </div>

            {/* Copy script button */}
            <button
              style={{ ...styles.secondaryBtn, width: "100%", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(script);
                  showToast("success", "📋 Script copied to clipboard!");
                } catch { showToast("error", "❌ Could not copy script."); }
              }}
            >📋 Copy Script to Clipboard</button>
          </div>

          {/* Metadata badges */}
          <div style={{ ...styles.card, padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { icon: "📹", label: "WebM / VP9", sub: "Best browser quality" },
                { icon: "🎙", label: selectedVoice.label, sub: selectedVoice.accent },
                { icon: "🎵", label: selectedMusic.label, sub: `${selectedMusic.id !== "none" ? musicVolume + "% vol" : "Off"}` },
                { icon: "🔒", label: "Private", sub: "Stored locally" },
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
                  setGenerated(false); setStep(0);
                  setImage(null); setImageUrl(null); setScript("");
                  setSpeaking(false); setPreviewActive(false);
                  setSelectedVoice(VOICES[0]); setVoiceSpeed(1.0); setVoicePitch(0);
                  setEditingSection(null); setTtsCache({});
                }}
              >🔄 Start New Video</button>
              <button
                style={{ ...styles.secondaryBtn, flex: 1, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={() => { setGenerated(false); setGenerating(false); setEditingSection(null); }}
              >✏ Edit & Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Inline review row helpers ──
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
            <div style={styles.logoIcon}>🎙</div>
            <div>
              <div style={styles.logoText}>VoiceSync AI</div>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: 0.5 }}>Powered by Claude</div>
            </div>
          </div>
          <span style={styles.badge}>Beta</span>
        </div>

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { icon: "🧬", label: "Lip Sync AI" },
            { icon: "🎙", label: "Voice Clone" },
            { icon: "🎵", label: "AI Music" },
            { icon: "⚡", label: "Real-time Gen" },
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
                {step > i ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && <div style={styles.stepLine(step > i)} />}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginBottom: 24, color: "#a78bfa", fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>
          Step {step + 1} — {STEPS[step]}
        </div>

        {/* Step content */}
        {stepContent[step]()}

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button
            style={{ ...styles.secondaryBtn, visibility: step === 0 ? "hidden" : "visible" }}
            onClick={() => setStep(s => s - 1)}
          >← Back</button>
          {step < STEPS.length - 1 && (
            <button
              style={{
                ...styles.primaryBtn,
                opacity: canProceed[step] ? 1 : 0.4,
                cursor: canProceed[step] ? "pointer" : "not-allowed",
              }}
              onClick={() => canProceed[step] && setStep(s => s + 1)}
            >Continue →</button>
          )}
        </div>
      </div>
    </div>
  );
}
