import React, { useRef } from 'react';
import {
  Mic,
  Code2,
  Sparkles,
  TrendingUp,
  Image as ImageIcon,
  Sliders,
  Volume2,
  Users,
  Download,
  ArrowDown,
  ArrowRight,
  ExternalLink,
  Flame,
  CheckCircle2,
  User as UserIcon,
  Shield,
  Cloud,
  FolderDown,
} from 'lucide-react';
import { PERSONAS } from '../constants/personas';
import { Artifact } from '../types';

interface WelcomeFeatureTourProps {
  onStartVoiceChat: () => void;
  onSelectPrompt: (prompt: string) => void;
  onPreviewDemoArtifact: (demo: Artifact) => void;
  onOpenSettings: () => void;
  onOpenAccount?: () => void;
  onOpenExport?: () => void;
  currentUser?: any;
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
  heroImage: string;
}

const DEMO_ARTIFACT: Artifact = {
  id: 'demo-interactive-particles',
  title: 'Interactive Physics Particle Field',
  type: 'html',
  language: 'html',
  content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #09090b;
      overflow: hidden;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      color: #fafafa;
    }
    #header {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
      pointer-events: none;
      background: rgba(18, 18, 22, 0.7);
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
    }
    h1 { font-size: 14px; font-weight: 600; color: #38bdf8; margin-bottom: 2px; }
    p { font-size: 11px; color: #a1a1aa; }
    canvas { width: 100vw; height: 100vh; display: block; cursor: crosshair; }
  </style>
</head>
<body>
  <div id="header">
    <h1>Chat AI Live Artifact Canvas</h1>
    <p>Move mouse / touch to attract dynamic glowing particles</p>
  </div>
  <canvas id="c"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 90;
    const mouse = { x: width / 2, y: height / 2, active: false };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    });

    window.addEventListener('mouseleave', () => { mouse.active = false; });

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2.5 + 1.5,
        color: i % 3 === 0 ? '#06b6d4' : i % 3 === 1 ? '#3b82f6' : '#a855f7'
      });
    }

    function loop() {
      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)';
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            p.vx += (dx / dist) * 0.2;
            p.vy += (dy / dist) * 0.2;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 85) {
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = 1 - (dist / 85);
            ctx.lineWidth = 0.6;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      });

      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>`
};

export const WelcomeFeatureTour: React.FC<WelcomeFeatureTourProps> = ({
  onStartVoiceChat,
  onSelectPrompt,
  onPreviewDemoArtifact,
  onOpenSettings,
  onOpenAccount,
  onOpenExport,
  currentUser,
  activePersonaId,
  onSelectPersona,
  heroImage,
}) => {
  const featuresRef = useRef<HTMLDivElement | null>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-12 animate-fade-in select-none">
      {/* 1. FLOATING WELCOME SIGN */}
      <div className="relative group">
        {/* Ambient atmospheric pulsing glow behind floating card */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-purple-500/20 blur-xl opacity-70 animate-pulse-glow pointer-events-none" />

        {/* Floating Hero Card */}
        <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/90 shadow-2xl backdrop-blur-md animate-floating transition-all">
          {/* Subtle Hero Header Graphic */}
          <div className="relative h-44 md:h-56 overflow-hidden">
            <img
              src={heroImage}
              alt="Chat AI Workspace"
              className="w-full h-full object-cover object-center opacity-70 group-hover:scale-102 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />
          </div>

          {/* Welcome Sign Content */}
          <div className="p-6 md:p-8 -mt-16 relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-400">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                <Sparkles className="h-3.5 w-3.5 animate-spin-slow" />
                <span>Google Gemini 3.8 Flash Powered</span>
              </span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400">Next-Gen Multimodal Studio</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Welcome to Chat AI
              </h1>
              <p className="text-sm md:text-base text-neutral-300 max-w-2xl leading-relaxed">
                Your intelligent, trend-aware multimodal partner. Engineered for real-time voice conversations,
                interactive UI artifacts, deep visual reasoning, and community-grounded insights.
              </p>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onStartVoiceChat}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
              >
                <Mic className="h-4 w-4" />
                <span>Start Live Voice Chat</span>
              </button>

              {onOpenAccount && (
                <button
                  onClick={onOpenAccount}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-100 text-xs font-semibold border border-neutral-700/80 shadow-md hover:border-cyan-500/50 transition-all cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 text-cyan-400" />
                  <span>{currentUser ? 'Manage Account' : 'Create Free Account'}</span>
                </button>
              )}

              {onOpenExport && (
                <button
                  onClick={onOpenExport}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold border border-neutral-700/80 shadow-md hover:border-cyan-500/50 transition-all cursor-pointer"
                  title="Download and save your conversations or code to your computer folder"
                >
                  <FolderDown className="h-4 w-4 text-cyan-400" />
                  <span>Save to Folder</span>
                </button>
              )}

              <button
                onClick={scrollToFeatures}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
              >
                <ArrowDown className="h-4 w-4 text-cyan-400 animate-bounce" />
                <span>Scroll to Discover Features</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SCROLL DOWN DISCOVERY BANNER */}
      <div
        ref={featuresRef}
        className="flex items-center justify-between border-b border-neutral-800 pb-3 pt-4"
      >
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Explore All Studio Features</span>
            <span className="text-xs font-mono font-normal text-cyan-400 px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/60 rounded">
              8 Real Capabilities
            </span>
          </h2>
          <p className="text-xs text-neutral-400">
            Scroll down to test each capability directly with ready-to-run interactive actions.
          </p>
        </div>
      </div>

      {/* 3. FEATURE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Feature 1: Real-Time Hands-Free Voice Mode */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-cyan-500/40 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Mic className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Voice Studio</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Hands-Free Continuous Voice Mode
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Interactive Web Audio visualizer, ambient soundwave frequencies, auto-listening loop, and Gemini 3.8 Flash Lite TTS audio synthesis.
            </p>
          </div>
          <button
            onClick={onStartVoiceChat}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium pt-1 transition-colors cursor-pointer"
          >
            <span>Launch Live Voice Chat</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Feature 2: Interactive Code & Artifact Canvas */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/40 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Code2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Live Sandbox</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Interactive Code & Artifact Canvas
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Side-by-side executable previews for self-contained HTML/CSS/JS, React widgets, SVG animations, and dashboards.
            </p>
          </div>
          <button
            onClick={() => onPreviewDemoArtifact(DEMO_ARTIFACT)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium pt-1 transition-colors cursor-pointer"
          >
            <span>Preview Interactive Canvas Demo</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Feature 3: Social & Trend Intelligence */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-amber-500/40 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Social Pulse</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
              Community Pulse & Trend Intelligence
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Synthesizes real-world consensus, controversies, and debates from Twitter/X, Reddit r/webdev, and Hacker News instead of dry generic code dumps.
            </p>
          </div>
          <button
            onClick={() => onSelectPrompt("What tech and web design trends are blowing up on Twitter/X and Reddit right now?")}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium pt-1 transition-colors cursor-pointer"
          >
            <span>Ask: "What's trending right now?"</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Feature 4: Multimodal Vision & Image Inspection */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-purple-500/40 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <ImageIcon className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Vision Engine</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
              Multimodal Vision & UI Analysis
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Attach screenshots, architecture charts, UI mockups, or photos. Aura inspects structure, UX contrast, and writes matching code.
            </p>
          </div>
          <button
            onClick={() => onSelectPrompt("Review my UI design screenshot for UX hierarchy, accessibility, and modern aesthetics.")}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium pt-1 transition-colors cursor-pointer"
          >
            <span>Try Vision Review Prompt</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Feature 5: Configurable Thinking & Reasoning */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-cyan-500/40 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Sliders className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Reasoning</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
              Configurable Thinking Budgets
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Switch reasoning effort between Low, Medium, and High to control cognitive depth for complex algorithmic and mathematical tasks.
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium pt-1 transition-colors cursor-pointer"
          >
            <span>Open Model Settings</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Feature 6: Auto-Speak & Voice Narration */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-sky-500/40 transition-all space-y-3 group">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Volume2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Audio TTS</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
              Automatic Voice Narration
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Aura reads responses aloud automatically with 5 distinct studio voices (Kore, Puck, Fenrir, Zephyr, Charon), or toggled on-demand per message.
            </p>
          </div>
          <button
            onClick={() => onSelectPrompt("Give me a quick 3-sentence summary of why Tailwind CSS v4 is changing the game.")}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium pt-1 transition-colors cursor-pointer"
          >
            <span>Test Spoken Response</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Feature 7: User Accounts & Cloud Backup */}
        <div className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/40 transition-all space-y-3 group md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Firebase Auth & Cloud Firestore
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
              User Accounts & Multi-Device Cloud Sync
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-2xl">
              Create a free account using secure Google Authentication to back up your chat history, voice transcripts, and custom preferences in real-time. Pick up right where you left off on any phone, tablet, or desktop.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            {onOpenAccount && (
              <button
                onClick={onOpenAccount}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span>{currentUser ? 'Manage Your Account' : 'Create an Account Now'}</span>
              </button>
            )}
            <span className="text-[11px] text-neutral-500">
              {currentUser ? `Signed in as ${currentUser.email}` : 'No password needed · One-click sign-in'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. CURATED SPECIALIST PERSONA MODES */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <span>Specialized Intelligence Modes</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Select any mode to tune system instructions and default workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PERSONAS.map((persona) => {
            const isSelected = persona.id === activePersonaId;
            return (
              <div
                key={persona.id}
                onClick={() => onSelectPersona(persona.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-850 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-neutral-900/50 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: persona.accentColor }}
                    />
                    {persona.name}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {persona.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SUGGESTED CONVERSATION PROMPTS */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Jump In with a Prompt
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            'What tech and web design trends are blowing up on Twitter/X and Reddit right now?',
            'Build an interactive Pomodoro timer with sound alerts in standalone HTML/CSS/JS',
            'Compare Next.js App Router vs Vite SPA in 2026: give me your raw, honest take',
            'Create an interactive SVG diagram showing how OAuth 2.0 PKCE flow works',
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(prompt)}
              className="text-left p-3.5 rounded-xl bg-neutral-900/70 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-white transition-all flex items-start justify-between gap-3 group cursor-pointer"
            >
              <span className="leading-relaxed">{prompt}</span>
              <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-cyan-400 shrink-0 mt-0.5 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
