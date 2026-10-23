import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  MessageSquare,
  AlertCircle,
  Check,
  Globe,
} from 'lucide-react';
import { Persona, Message } from '../types';
import { WORLD_LANGUAGES, getLanguageByCode } from '../constants/languages';
import { detectScriptLanguageCode } from '../utils/audio';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: (newMessages?: Message[]) => void;
  activePersona: Persona;
  defaultVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  defaultLanguage?: string;
}

interface VoiceTurn {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// Silence duration (ms) after human speaks to trigger the AI response automatically
const SILENCE_TRIGGER_MS = 1350;
// Volume threshold to consider human voice active
const VOICE_VOLUME_THRESHOLD = 0.075;
// Volume threshold to interrupt AI when it is speaking (barge-in)
const BARGE_IN_THRESHOLD = 0.17;
// Minimum speech duration before a pause triggers AI answer
const MIN_SPEECH_DURATION_MS = 450;

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  activePersona,
  defaultVoice,
  defaultLanguage = 'auto',
}) => {
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(defaultVoice);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isMuted, setIsMuted] = useState(false);
  const [silenceProgress, setSilenceProgress] = useState(0); // 0 to 1 progress of silence timer

  const statusRef = useRef<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  statusRef.current = status;

  const isMutedRef = useRef<boolean>(false);
  isMutedRef.current = isMuted;

  const selectedLanguageRef = useRef<string>(selectedLanguage);
  selectedLanguageRef.current = selectedLanguage;

  const liveTranscriptRef = useRef<string>('');

  // Voice activity tracking
  const hasSpokenInTurnRef = useRef<boolean>(false);
  const speechStartTimeRef = useRef<number>(0);
  const lastVoiceActivityTimeRef = useRef<number>(0);
  const isSubmittingTurnRef = useRef<boolean>(false);
  const bargeInCounterRef = useRef<number>(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);
  const turnsRef = useRef<VoiceTurn[]>([]);
  turnsRef.current = turns;

  // Check microphone permissions
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((res) => {
          setPermissionStatus(res.state as any);
          res.onchange = () => setPermissionStatus(res.state as any);
        })
        .catch(() => {});
    }
  }, []);

  // Sync defaultLanguage if updated externally
  useEffect(() => {
    if (defaultLanguage) {
      setSelectedLanguage(defaultLanguage);
    }
  }, [defaultLanguage]);

  // Lifecycle on modal open/close
  useEffect(() => {
    if (!isOpen) {
      stopEverything();
    } else {
      setTurns([]);
      turnsRef.current = [];
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      setPermissionError(null);
      setIsMuted(false);
      startListeningWorkflow();
    }
    return () => {
      stopEverything();
    };
  }, [isOpen]);

  const stopEverything = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setStatus('idle');
    setAudioVolume(0);
    setSilenceProgress(0);
    hasSpokenInTurnRef.current = false;
    isSubmittingTurnRef.current = false;
  };

  // Acquire mic and start analyser
  const ensureMicrophone = async (): Promise<MediaStream | null> => {
    try {
      if (micStreamRef.current && micStreamRef.current.active) {
        return micStreamRef.current;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      micStreamRef.current = stream;
      setPermissionStatus('granted');
      setPermissionError(null);

      // Setup Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 90);
        setAudioVolume(normalized);

        const now = Date.now();

        // 1. BARGE-IN INTERRUPTION: If AI is speaking and user starts talking, stop AI talk instantly!
        if (statusRef.current === 'speaking' && !isMutedRef.current) {
          if (normalized > BARGE_IN_THRESHOLD) {
            bargeInCounterRef.current += 1;
            if (bargeInCounterRef.current >= 2) {
              bargeInCounterRef.current = 0;
              handleAutoInterrupt();
            }
          } else {
            bargeInCounterRef.current = 0;
          }
        }

        // 2. AUTOMATIC NATURAL VOICE TURN-TAKING:
        // When in 'listening' state: detect when human speaks, and when they stop talking, trigger AI response!
        if (statusRef.current === 'listening' && !isMutedRef.current) {
          const isSoundDetected = normalized > VOICE_VOLUME_THRESHOLD;
          const hasTranscriptText = liveTranscriptRef.current.trim().length > 0;

          if (isSoundDetected || hasTranscriptText) {
            if (!hasSpokenInTurnRef.current) {
              hasSpokenInTurnRef.current = true;
              speechStartTimeRef.current = now;
            }
            if (isSoundDetected) {
              lastVoiceActivityTimeRef.current = now;
              setSilenceProgress(0);
            }
          }

          // If user has spoken something and reached minimum speech duration:
          if (
            hasSpokenInTurnRef.current &&
            !isSubmittingTurnRef.current &&
            now - speechStartTimeRef.current >= MIN_SPEECH_DURATION_MS
          ) {
            const silenceElapsed = now - lastVoiceActivityTimeRef.current;
            const progress = Math.min(1, silenceElapsed / SILENCE_TRIGGER_MS);
            setSilenceProgress(progress);

            // Once human silence reaches SILENCE_TRIGGER_MS, the human has stopped talking -> AI talks!
            if (silenceElapsed >= SILENCE_TRIGGER_MS) {
              const currentText = liveTranscriptRef.current.trim();
              if (currentText.length > 0 || recordedAudioChunksRef.current.length > 0) {
                triggerAutoSubmit();
              }
            }
          } else {
            setSilenceProgress(0);
          }
        }

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      return stream;
    } catch (err: any) {
      console.error('Failed to get microphone stream:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(
          'Microphone access is blocked. Please click the lock or tune icon in your browser address bar and set Microphone to "Allow", then click Try Again.'
        );
        setPermissionStatus('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No microphone detected on your system. Please connect a microphone and try again.');
      } else {
        setPermissionError(`Microphone error: ${err.message || 'Unable to access audio device.'}`);
      }
      return null;
    }
  };

  // Automatic voice-activated interruption (user speaks over AI)
  const handleAutoInterrupt = () => {
    // Instantly stop playing audio and speech synthesis
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Switch straight to listening for what the human is saying
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    hasSpokenInTurnRef.current = true;
    speechStartTimeRef.current = Date.now();
    lastVoiceActivityTimeRef.current = Date.now();
    isSubmittingTurnRef.current = false;
    startListeningWorkflow();
  };

  // Trigger submission when human finishes speaking
  const triggerAutoSubmit = () => {
    if (isSubmittingTurnRef.current || statusRef.current !== 'listening') return;
    isSubmittingTurnRef.current = true;
    hasSpokenInTurnRef.current = false;
    setSilenceProgress(0);
    handleSpeechDone();
  };

  // Start listening with SpeechRecognition & MediaRecorder fallback
  const startListeningWorkflow = async (overrideLang?: string) => {
    setPermissionError(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    hasSpokenInTurnRef.current = false;
    isSubmittingTurnRef.current = false;
    setSilenceProgress(0);

    const stream = await ensureMicrophone();
    if (!stream) {
      setStatus('idle');
      return;
    }

    // Start MediaRecorder fallback
    recordedAudioChunksRef.current = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedAudioChunksRef.current.push(e.data);
        }
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn('MediaRecorder init notice:', e);
    }

    // Setup Browser Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const langObj = getLanguageByCode(overrideLang || selectedLanguageRef.current);
      recognition.lang = langObj.code === 'auto' ? 'en-US' : langObj.speechCode;

      recognition.onresult = (event: any) => {
        // If AI was speaking, user voice interrupts it immediately!
        if (statusRef.current === 'speaking') {
          handleAutoInterrupt();
        }

        let accumulated = '';
        let interim = '';
        for (let i = 0; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulated += (accumulated ? ' ' : '') + text;
          } else {
            interim += text;
          }
        }

        const fullText = (accumulated + (interim ? ' ' + interim : '')).trim();
        if (fullText) {
          hasSpokenInTurnRef.current = true;
          lastVoiceActivityTimeRef.current = Date.now();
          liveTranscriptRef.current = fullText;
          setLiveTranscript(fullText);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setPermissionError(
            'Microphone access is blocked. Please click the lock or tune icon in your browser address bar and choose "Allow" for Microphone.'
          );
          setStatus('idle');
        }
      };

      recognition.onend = () => {
        // If human stopped speaking and browser fired onend:
        if (
          statusRef.current === 'listening' &&
          hasSpokenInTurnRef.current &&
          liveTranscriptRef.current.trim().length > 0
        ) {
          triggerAutoSubmit();
          return;
        }

        // Resume continuous listening if still in listening state
        if (statusRef.current === 'listening' && recognitionRef.current && !isSubmittingTurnRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    }

    setStatus('listening');
  };

  // Human has stopped speaking -> process audio / transcript
  const handleSpeechDone = async () => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    let audioBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        if (recordedAudioChunksRef.current.length > 0) {
          audioBlob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm' });
        }
      } catch {}
      mediaRecorderRef.current = null;
    }

    const currentText = liveTranscriptRef.current.trim();

    // If browser speech recognition captured text, use it directly!
    if (currentText.length > 0) {
      sendVoicePrompt(currentText);
      return;
    }

    // Fallback: transcribe recorded audio blob via Gemini AI audio model
    if (audioBlob && audioBlob.size > 2000) {
      setStatus('thinking');
      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm',
                language: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
              }),
            });
            const data = await res.json();
            if (data.transcript && data.transcript.trim()) {
              sendVoicePrompt(data.transcript.trim());
            } else {
              // No clear speech detected, resume listening seamlessly
              resumeListening();
            }
          } catch {
            resumeListening();
          }
        };
      } catch {
        resumeListening();
      }
      return;
    }

    // No speech detected, resume listening seamlessly
    resumeListening();
  };

  const resumeListening = () => {
    isSubmittingTurnRef.current = false;
    hasSpokenInTurnRef.current = false;
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    startListeningWorkflow();
  };

  // Send prompt to conversational voice endpoint
  const sendVoicePrompt = async (promptText: string) => {
    setStatus('thinking');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setPermissionError(null);

    const newTurn: VoiceTurn = {
      role: 'user',
      text: promptText,
      timestamp: Date.now(),
    };
    const updatedTurns = [...turnsRef.current, newTurn];
    setTurns(updatedTurns);

    try {
      const messagesPayload = updatedTurns.map((t) => ({
        role: t.role,
        text: t.text,
      }));

      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          voice: selectedVoice,
          personaInstruction: activePersona.systemInstruction,
          language: selectedLanguage !== 'auto' ? selectedLanguage : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Voice endpoint error');
      }

      const data = await res.json();
      const replyText = data.text || 'I understand.';

      const modelTurn: VoiceTurn = {
        role: 'model',
        text: replyText,
        timestamp: Date.now(),
      };
      setTurns((prev) => [...prev, modelTurn]);

      // Speak response out loud!
      playSpokenResponse(replyText, data.audioBase64);
    } catch (err: any) {
      console.error('Voice chat failed:', err);
      const fallbackMsg = "I couldn't hear that clearly. Could you say that again?";
      playSpokenResponse(fallbackMsg, null);
    }
  };

  // Play audio response
  const playSpokenResponse = (text: string, base64Audio: string | null) => {
    setStatus('speaking');
    isSubmittingTurnRef.current = false;

    if (base64Audio) {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      currentAudioRef.current = audio;

      audio.onended = () => {
        handleSpeechFinished();
      };
      audio.onerror = () => {
        fallbackBrowserVoice(text);
      };

      audio.play().catch(() => {
        fallbackBrowserVoice(text);
      });
    } else {
      fallbackBrowserVoice(text);
    }
  };

  const fallbackBrowserVoice = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`~>\[\]]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);

      const targetSpeechCode =
        selectedLanguage !== 'auto'
          ? getLanguageByCode(selectedLanguage).speechCode
          : detectScriptLanguageCode(text);

      utterance.lang = targetSpeechCode;

      const langPrefix = targetSpeechCode.split('-')[0].toLowerCase();
      const matchedVoice = window.speechSynthesis
        .getVoices()
        .find(
          (v) =>
            v.lang.toLowerCase().startsWith(langPrefix) ||
            v.lang.toLowerCase() === targetSpeechCode.toLowerCase()
        );

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.rate = 1.0;
      utterance.onend = () => {
        handleSpeechFinished();
      };
      utterance.onerror = () => {
        handleSpeechFinished();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      handleSpeechFinished();
    }
  };

  // When AI finishes speaking, seamlessly transition back to listening for the human!
  const handleSpeechFinished = () => {
    setStatus('idle');
    if (isOpen) {
      setTimeout(() => {
        startListeningWorkflow();
      }, 300);
    }
  };

  const handleEndSession = () => {
    stopEverything();
    const currentTurns = [...turns];
    setTurns([]);
    turnsRef.current = [];
    const sessionId = Date.now();
    const formattedMessages: Message[] = currentTurns.map((t, idx) => ({
      id: `voice-msg-${sessionId}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      role: t.role,
      text: t.text,
      timestamp: t.timestamp,
    }));
    onClose(formattedMessages);
  };

  // Available Gemini TTS Voices
  const voices = [
    { id: 'Kore', name: 'Kore (Warm & Natural)' },
    { id: 'Puck', name: 'Puck (Lively & Crisp)' },
    { id: 'Charon', name: 'Charon (Deep & Direct)' },
    { id: 'Fenrir', name: 'Fenrir (Energetic)' },
    { id: 'Zephyr', name: 'Zephyr (Bright)' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/95 backdrop-blur-xl text-neutral-100 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-neutral-950/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-cyan-950 border border-cyan-800/80">
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-100">
              Hands-Free Live Voice Conversation
            </h2>
            <p className="text-[11px] text-neutral-400">
              Speak naturally · The AI listens, pauses with you, and speaks automatically
            </p>
          </div>
        </div>

        {/* Global Controls: Language & Voice & Transcript & Close */}
        <div className="flex items-center gap-2.5">
          {/* Universal Language Selector */}
          <div className="relative flex items-center">
            <Globe className="h-3.5 w-3.5 text-cyan-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const newLang = e.target.value;
                setSelectedLanguage(newLang);
                if (status === 'listening') {
                  startListeningWorkflow(newLang);
                }
              }}
              className="bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-700 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[190px] sm:max-w-[240px] truncate"
              title="Select any language in the world or keep Auto-Detect"
            >
              {WORLD_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Voice Selector */}
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as any)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 hover:border-neutral-700 focus:outline-none focus:border-cyan-500 cursor-pointer hidden md:block"
            title="Gemini 3.8 Flash Lite Voice"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Transcript toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
              showTranscript
                ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Transcript</span>
          </button>

          {/* Close & Save Button */}
          <button
            onClick={handleEndSession}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
            title="End voice session and save transcript"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 overflow-hidden">
        {/* Subtle radial ambient background glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 blur-3xl transition-all duration-700"
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(circle at center, rgba(6, 182, 212, 0.45) 0%, transparent 65%)'
                : status === 'listening'
                ? 'radial-gradient(circle at center, rgba(16, 185, 129, 0.45) 0%, transparent 65%)'
                : status === 'thinking'
                ? 'radial-gradient(circle at center, rgba(139, 92, 246, 0.45) 0%, transparent 65%)'
                : 'radial-gradient(circle at center, rgba(38, 38, 38, 0.3) 0%, transparent 65%)',
          }}
        />

        {/* Central Organic Holographic Sphere & Reactive Waveform */}
        <div className="relative flex items-center justify-center my-auto">
          {/* Outer Pulsing Aura Rings */}
          <div
            className={`absolute rounded-full border transition-all duration-300 ${
              status === 'listening'
                ? 'border-emerald-500/30'
                : status === 'speaking'
                ? 'border-cyan-500/40'
                : status === 'thinking'
                ? 'border-purple-500/30'
                : 'border-neutral-800'
            }`}
            style={{
              width: `${180 + audioVolume * 90}px`,
              height: `${180 + audioVolume * 90}px`,
            }}
          />

          <div
            className={`absolute rounded-full border transition-all duration-500 ${
              status === 'listening'
                ? 'border-emerald-500/20'
                : status === 'speaking'
                ? 'border-cyan-500/30'
                : status === 'thinking'
                ? 'border-purple-500/20'
                : 'border-neutral-800/60'
            }`}
            style={{
              width: `${240 + audioVolume * 120}px`,
              height: `${240 + audioVolume * 120}px`,
            }}
          />

          {/* Central Sphere */}
          <div
            className={`relative z-10 w-40 h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${
              status === 'listening'
                ? 'bg-gradient-to-tr from-emerald-950 via-neutral-900 to-emerald-900/40 border border-emerald-500/50 shadow-emerald-500/25'
                : status === 'speaking'
                ? 'bg-gradient-to-tr from-cyan-950 via-neutral-900 to-cyan-900/40 border border-cyan-500/60 shadow-cyan-500/30'
                : status === 'thinking'
                ? 'bg-gradient-to-tr from-purple-950 via-neutral-900 to-purple-900/40 border border-purple-500/50 shadow-purple-500/25 animate-pulse'
                : 'bg-neutral-900 border border-neutral-800 shadow-neutral-950'
            }`}
          >
            {/* Inner dynamic soundwave bars */}
            <div className="flex items-center gap-1.5 h-14">
              {[0.4, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8].map((factor, idx) => {
                let barHeight = 8;
                if (status === 'listening') {
                  barHeight = Math.max(8, (audioVolume * 50 + 10) * factor);
                } else if (status === 'speaking') {
                  barHeight = Math.max(10, Math.sin(Date.now() / 140 + idx) * 22 + 26);
                } else if (status === 'thinking') {
                  barHeight = Math.max(6, Math.sin(Date.now() / 180 + idx) * 14 + 16);
                }

                return (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      status === 'listening'
                        ? 'bg-emerald-400'
                        : status === 'speaking'
                        ? 'bg-cyan-400'
                        : status === 'thinking'
                        ? 'bg-purple-400'
                        : 'bg-neutral-600'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Audio Level & Natural Turn-taking Indicator */}
        <div className="mt-5 flex flex-col items-center gap-2 z-10">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                status === 'speaking'
                  ? 'bg-cyan-400 animate-pulse'
                  : audioVolume > 0.05
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-neutral-600'
              }`}
            />
            <span className="font-medium">
              {status === 'speaking'
                ? 'Aura is speaking · (Speak to interrupt anytime)'
                : status === 'thinking'
                ? 'Aura is thinking...'
                : hasSpokenInTurnRef.current && silenceProgress > 0
                ? 'Heard you · Responding in a moment...'
                : audioVolume > 0.05
                ? 'Hearing your voice · Pause when finished speaking'
                : 'Listening · Speak in any language'}
            </span>
          </div>

          {/* Volume meter + silence countdown meter */}
          <div className="w-48 h-1.5 bg-neutral-850 rounded-full overflow-hidden relative">
            {status === 'speaking' ? (
              <div className="h-full w-full bg-cyan-400 animate-pulse rounded-full" />
            ) : silenceProgress > 0 ? (
              <div
                className="h-full bg-purple-400 transition-all duration-100 rounded-full"
                style={{ width: `${Math.round(silenceProgress * 100)}%` }}
              />
            ) : (
              <div
                className="h-full bg-emerald-400 transition-all duration-75 rounded-full"
                style={{ width: `${Math.round(audioVolume * 100)}%` }}
              />
            )}
          </div>
        </div>

        {/* Live Status Description & Spoken Transcript */}
        <div className="text-center mt-4 max-w-lg px-4 z-10 space-y-2.5">
          {/* Live speech preview */}
          {liveTranscript ? (
            <p className="text-sm md:text-base text-neutral-100 font-medium italic min-h-[32px] bg-neutral-900/80 py-2 px-4 rounded-xl border border-neutral-800 shadow-sm max-w-lg mx-auto">
              "{liveTranscript}"
            </p>
          ) : (
            <p className="text-xs text-neutral-400 min-h-[24px]">
              {status === 'listening'
                ? 'Hands-free active. Just speak — when you stop talking, Aura answers.'
                : status === 'speaking'
                ? 'Aura is talking back. To interrupt, simply start speaking.'
                : ''}
            </p>
          )}

          {/* Permission / Diagnostic Error Banner */}
          {permissionError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left text-xs text-rose-300 space-y-2 max-w-md mx-auto">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{permissionError}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => startListeningWorkflow()}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium transition-colors cursor-pointer"
                >
                  Try Microphone Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Sliding Drawer */}
      {showTranscript && (
        <div className="w-full max-w-2xl mx-auto h-48 border-t border-neutral-900 bg-neutral-950/95 overflow-y-auto px-6 py-3 space-y-2.5 z-20">
          <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-1">
            Conversation Transcript ({turns.length} turns)
          </div>
          {turns.length === 0 ? (
            <div className="text-xs text-neutral-500 italic">No spoken dialogue yet.</div>
          ) : (
            turns.map((t, i) => (
              <div
                key={i}
                className={`text-xs leading-relaxed ${
                  t.role === 'user' ? 'text-emerald-300/90' : 'text-neutral-200'
                }`}
              >
                <span className="font-semibold mr-1.5">
                  {t.role === 'user' ? 'You:' : 'Aura:'}
                </span>
                <span>{t.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bottom Status & Utility Bar (NO Done/Interrupt buttons - completely automatic turn-taking) */}
      <div className="px-6 py-4 border-t border-neutral-900 bg-neutral-950/90 flex items-center justify-between gap-4 z-20">
        {/* Left: Mute / Pause Mic Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nextMuted) {
                if (currentAudioRef.current) currentAudioRef.current.pause();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setStatus('idle');
              } else {
                startListeningWorkflow();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={isMuted ? 'Microphone is paused. Click to resume' : 'Mute microphone temporarily'}
          >
            {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            <span>{isMuted ? 'Mic Paused' : 'Mic Active'}</span>
          </button>
        </div>

        {/* Center: Live mode indicator */}
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Automatic Turn-Taking Active (No buttons needed)</span>
        </div>

        {/* Right: End & Save Session */}
        <div>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            Done & Save
          </button>
        </div>
      </div>
    </div>
  );
};
