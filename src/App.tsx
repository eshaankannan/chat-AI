import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sparkles,
  Sliders,
  Plus,
  Share2,
  Trash2,
  Copy,
  Check,
  PanelRightOpen,
  PanelRightClose,
  Code2,
  ArrowRight,
  ArrowDown,
  Info,
  RotateCcw,
  Mic,
  Volume2,
  VolumeX,
  Home,
  Globe,
  User as UserIcon,
  LogIn,
  Cloud,
  FolderDown,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatInput } from './components/ChatInput';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ArtifactPanel } from './components/ArtifactPanel';
import { AudioPlayer } from './components/AudioPlayer';
import { SettingsModal } from './components/SettingsModal';
import { VoiceChatModal } from './components/VoiceChatModal';
import { AccountModal } from './components/AccountModal';
import { ExportModal } from './components/ExportModal';
import { WelcomeFeatureTour } from './components/WelcomeFeatureTour';
import { Conversation, Message, MessageImage, Artifact, ModelSettings } from './types';
import { PERSONAS, DEFAULT_SETTINGS } from './constants/personas';
import { WORLD_LANGUAGES, getLanguageByCode } from './constants/languages';
import { speakText, stopCurrentSpeech } from './utils/audio';
import {
  auth,
  onAuthStateChanged,
  User,
  getUserProfile,
  UserProfileData,
  loadConversationsFromCloud,
  saveConversationToCloud,
  deleteConversationFromCloud,
} from './firebase';

// Generated image assets
import avatarImg from './assets/images/aura_ai_avatar_1792154897529.jpg';
import heroImg from './assets/images/aura_ai_hero_1792154898118.jpg';

const STORAGE_KEY_CONVS = 'aura_ai_conversations_v1';
const STORAGE_KEY_SETTINGS = 'aura_ai_settings_v1';

// Helper to guarantee 100% unique IDs for messages and prevent React key collisions
function deduplicateMessages(messages: Message[]): Message[] {
  const seenIds = new Set<string>();
  const clean: Message[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    let uniqueId = msg.id;
    if (!uniqueId || seenIds.has(uniqueId)) {
      uniqueId = `${msg.id || 'msg'}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    seenIds.add(uniqueId);
    clean.push({ ...msg, id: uniqueId });
  }
  return clean;
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((c: Conversation) => ({
            ...c,
            messages: deduplicateMessages(c.messages || []),
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load conversations from localStorage:', e);
    }
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return conversations.length > 0 ? conversations[0].id : null;
  });

  const [activePersonaId, setActivePersonaId] = useState<string>('general');
  const [settings, setSettings] = useState<ModelSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledForTurnRef = useRef<boolean>(false);

  // Subscribe to Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user profile from Firestore
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            if (profile.preferredLanguage && profile.preferredLanguage !== 'auto') {
              setSettings((prev) => ({ ...prev, language: profile.preferredLanguage || 'auto' }));
            }
            if (profile.preferredVoice) {
              setSettings((prev) => ({ ...prev, voice: profile.preferredVoice as any }));
            }
          }
        } catch (e) {
          console.warn('Could not fetch user profile:', e);
        }

        // Fetch user conversations from Cloud Firestore and merge
        try {
          const cloudConvs = await loadConversationsFromCloud(user.uid);
          if (cloudConvs.length > 0) {
            setConversations((local) => {
              const localMap = new Map(local.map((c) => [c.id, c]));
              for (const cc of cloudConvs) {
                if (!localMap.has(cc.id)) {
                  localMap.set(cc.id, cc);
                }
              }
              return Array.from(localMap.values()).sort(
                (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
              );
            });
          }
        } catch (e) {
          console.warn('Could not load cloud conversations:', e);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleVoiceModalClose = (newVoiceMessages?: Message[]) => {
    setIsVoiceChatOpen(false);
    if (newVoiceMessages && newVoiceMessages.length > 0) {
      let currentConvId = activeConversationId;
      if (!currentConvId || !conversations.some((c) => c.id === currentConvId)) {
        const newId = `conv-${Date.now()}`;
        const newConv: Conversation = {
          id: newId,
          title: `Voice Session: ${newVoiceMessages[0].text.slice(0, 24)}...`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: deduplicateMessages(newVoiceMessages),
          personaId: activePersonaId,
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newId);
      } else {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === currentConvId) {
              const existingIds = new Set(c.messages.map((m) => m.id));
              // Only add messages not already in conversation and ensure unique IDs
              const uniqueIncoming = newVoiceMessages
                .filter((m) => !existingIds.has(m.id))
                .map((m, idx) => ({
                  ...m,
                  id: `${m.id || 'voice'}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                }));
              return {
                ...c,
                updatedAt: Date.now(),
                messages: deduplicateMessages([...c.messages, ...uniqueIncoming]),
              };
            }
            return c;
          })
        );
      }
    }
  };

  // Save conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, [conversations]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Track user scroll position so scrolling is 100% user-controlled
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    setShowScrollBottom(distanceToBottom > 200);
  };

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const activePersona = PERSONAS.find((p) => p.id === activePersonaId) || PERSONAS[0];

  // Return to Home Feature Hub
  const handleGoHome = () => {
    setActiveConversationId(null);
    setActiveArtifact(null);
    stopCurrentSpeech();
  };

  // Create new conversation
  const handleNewConversation = (personaId?: string) => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      personaId: personaId || activePersonaId,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
    setActiveArtifact(null);
  };

  // Switch persona
  const handleSelectPersona = (pId: string) => {
    setActivePersonaId(pId);
    if (!activeConversation || activeConversation.messages.length === 0) {
      if (activeConversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversation.id ? { ...c, personaId: pId } : c))
        );
      }
    }
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      setActiveArtifact(null);
    }
  };

  // Rename conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Clear all conversations
  const handleClearAllConversations = () => {
    setConversations([]);
    setActiveConversationId(null);
    setActiveArtifact(null);
  };

  // Export conversation as Markdown
  const handleExportConversation = (conv: Conversation) => {
    let md = `# ${conv.title}\n*Exported from Chat AI on ${new Date().toLocaleDateString()}*\n\n---\n\n`;
    for (const msg of conv.messages) {
      const roleName = msg.role === 'user' ? 'User' : 'Chat AI';
      md += `### ${roleName} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n${msg.text}\n\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Extract artifact from model response text
  const extractArtifactFromText = (text: string): Artifact | null => {
    const codeBlockMatch = /```(html|svg|xml|jsx|tsx)\n([\s\S]*?)```/i.exec(text);
    if (codeBlockMatch) {
      const lang = codeBlockMatch[1].toLowerCase();
      const code = codeBlockMatch[2];
      if (['html', 'svg', 'xml'].includes(lang) || code.includes('<html') || code.includes('<svg')) {
        return {
          id: `art-${Date.now()}`,
          type: lang === 'svg' ? 'svg' : 'html',
          title: lang === 'svg' ? 'Interactive Vector Graphic' : 'Live Interactive Component',
          language: lang,
          content: code,
        };
      }
    }
    return null;
  };

  // Send message
  const handleSendMessage = async (userText: string, images?: MessageImage[]) => {
    stopCurrentSpeech();
    let currentConvId = activeConversationId;

    // Create a new conversation if none exists
    if (!currentConvId || !conversations.some((c) => c.id === currentConvId)) {
      const newId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: newId,
        title: userText.slice(0, 36) || 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        personaId: activePersonaId,
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newId);
      currentConvId = newId;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: Date.now(),
      images,
    };

    const modelMessageId = `msg-${Date.now() + 1}`;
    const initialModelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
    };

    // Update conversation with user message and empty model message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConvId) {
          return {
            ...c,
            updatedAt: Date.now(),
            messages: [...c.messages, userMessage, initialModelMessage],
          };
        }
        return c;
      })
    );

    hasScrolledForTurnRef.current = false;
    // Scroll down to newly typed question immediately so user isn't stuck at previous position
    const scrollToNewQuestion = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    requestAnimationFrame(scrollToNewQuestion);
    setTimeout(scrollToNewQuestion, 40);
    setTimeout(scrollToNewQuestion, 160);
    setTimeout(scrollToNewQuestion, 360);

    // Request intuitive title if this is the first message
    const targetConv = conversations.find((c) => c.id === currentConvId);
    if (!targetConv || targetConv.messages.length === 0) {
      fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.title) {
            handleRenameConversation(currentConvId!, data.title);
          }
        })
        .catch(() => {});
    }

    // Prepare messages history for API, filtering out incomplete or error messages
    const priorValidMessages = (targetConv ? targetConv.messages : [])
      .filter((m) => m.text && m.text.trim() && !m.error && !m.isStreaming);

    const fullHistory = [...priorValidMessages, userMessage].map((m) => ({
      role: m.role,
      text: m.text,
      images: m.images?.map((img) => ({
        data: img.data,
        mimeType: img.mimeType,
      })),
    }));

    // Construct system instructions
    const personaInstruction = activePersona.systemInstruction;
    const customPrompt = settings.customSystemPrompt?.trim();
    const finalSystemInstruction = customPrompt
      ? `${personaInstruction}\n\nAdditional user guidelines: ${customPrompt}`
      : personaInstruction;

    const startTime = Date.now();
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: fullHistory,
          systemInstruction: finalSystemInstruction,
          temperature: settings.temperature,
          thinkingLevel: settings.thinkingLevel,
          language: settings.language !== 'auto' ? settings.language : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let hasStreamError = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                let friendlyMsg = 'A temporary service issue occurred. Please retry.';
                try {
                  const inner = typeof parsed.error === 'string' ? JSON.parse(parsed.error) : parsed.error;
                  if (inner?.error?.message) friendlyMsg = inner.error.message;
                  else if (inner?.message) friendlyMsg = inner.message;
                  else if (typeof parsed.error === 'string') friendlyMsg = parsed.error;
                } catch {
                  if (typeof parsed.error === 'string') friendlyMsg = parsed.error;
                }
                accumulatedText = `⚠️ ${friendlyMsg}`;
                hasStreamError = true;
              } else if (parsed.text) {
                accumulatedText += parsed.text;
              }

              // Update state progressively
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === currentConvId) {
                    return {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === modelMessageId
                          ? { ...m, text: accumulatedText, isStreaming: true, error: hasStreamError }
                          : m
                      ),
                    };
                  }
                  return c;
                })
              );
            } catch (err) {
              console.warn('Failed to parse SSE chunk:', dataStr);
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      const detectedArtifact = extractArtifactFromText(accumulatedText);

      // Finalize model message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === currentConvId) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === modelMessageId
                  ? {
                      ...m,
                      text: accumulatedText,
                      isStreaming: false,
                      latencyMs: duration,
                      artifacts: detectedArtifact ? [detectedArtifact] : undefined,
                      error: hasStreamError,
                    }
                  : m
              ),
            };
          }
          return c;
        })
      );

      // Auto-preview artifact if found
      if (detectedArtifact) {
        setActiveArtifact(detectedArtifact);
      }

      // Automatically speak answer if Auto-Speak is enabled
      if (settings.autoSpeak && accumulatedText && !hasStreamError) {
        speakText(
          accumulatedText,
          settings.voice,
          undefined,
          undefined,
          settings.language !== 'auto' ? getLanguageByCode(settings.language).speechCode : undefined
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Streaming request failed:', error);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === currentConvId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === modelMessageId
                    ? {
                        ...m,
                        text: m.text || `Unable to reach Gemini API: ${error.message || 'Please check your connection and configuration.'}`,
                        isStreaming: false,
                        error: true,
                      }
                    : m
                ),
              };
            }
            return c;
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetryMessage = (messageId: string) => {
    if (!activeConversation) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    let userPrompt = '';
    let userImages: MessageImage[] | undefined;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (activeConversation.messages[i].role === 'user') {
        userPrompt = activeConversation.messages[i].text;
        userImages = activeConversation.messages[i].images;
        break;
      }
    }
    if (!userPrompt && (!userImages || userImages.length === 0)) return;

    // Prune this failed message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversation.id) {
          return {
            ...c,
            messages: c.messages.slice(0, msgIndex),
          };
        }
        return c;
      })
    );

    handleSendMessage(userPrompt, userImages);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setActiveArtifact(null);
        }}
        onNewConversation={() => handleNewConversation()}
        onGoHome={handleGoHome}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onExportConversation={handleExportConversation}
        onOpenExport={() => setIsExportOpen(true)}
        activePersonaId={activePersonaId}
        onSelectPersona={handleSelectPersona}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        onOpenAccount={() => setIsAccountOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Bar Contract: 3 zones (wordmark brand, nav links/breadcrumb, 1 primary action) */}
        <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-3 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xs shrink-0 z-10">
          {/* Zone 1: Brand Wordmark & Home Navigation */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 text-neutral-400 hover:text-neutral-200 md:hidden rounded-lg hover:bg-neutral-900 transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Clickable Brand Mark to return to Home */}
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity text-left cursor-pointer group"
              title="Return to Home & Feature Showcase"
            >
              <img
                src={avatarImg}
                alt="Chat AI"
                className="h-7 w-7 rounded-full object-cover border border-neutral-700/80 shadow-xs group-hover:border-cyan-500/60 transition-colors"
              />
              <span className="text-base font-semibold tracking-tight text-neutral-100 group-hover:text-cyan-300 transition-colors">
                Chat AI
              </span>
            </button>

            {/* Dedicated Home Button */}
            <button
              onClick={handleGoHome}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                !activeConversationId
                  ? 'bg-neutral-850 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-neutral-900/80 text-neutral-300 hover:text-white border-neutral-800 hover:bg-neutral-850'
              }`}
              title="Go to Home & Feature Showcase"
            >
              <Home className="h-3.5 w-3.5 text-cyan-400" />
              <span>Home</span>
            </button>
          </div>

          {/* Zone 2: Single-line context metadata & Breadcrumb */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-neutral-400 whitespace-nowrap shrink-0">
            {!activeConversationId ? (
              <span className="text-cyan-400 font-medium flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Feature Hub (8 Capabilities)</span>
              </span>
            ) : (
              <button
                onClick={handleGoHome}
                className="text-neutral-400 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Return to Home Hub"
              >
                <span>Home</span>
                <span>/</span>
                <span className="text-neutral-200 truncate max-w-[160px]">
                  {activeConversation?.title || 'Chat'}
                </span>
              </button>
            )}
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-neutral-300 font-medium">{activePersona.name}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>Gemini 3 Flash</span>
          </div>

          {/* Zone 3: Primary action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-Speak Responses Toggle */}
            <button
              onClick={() => {
                const nextState = !settings.autoSpeak;
                setSettings((s) => ({ ...s, autoSpeak: nextState }));
                if (!nextState) stopCurrentSpeech();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                settings.autoSpeak
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title={
                settings.autoSpeak
                  ? 'Auto-Speak is ON: Chat AI speaks responses aloud'
                  : 'Auto-Speak is OFF: click to have Chat AI speak responses aloud'
              }
            >
              {settings.autoSpeak ? (
                <Volume2 className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {settings.autoSpeak ? 'Voice: ON' : 'Voice: OFF'}
              </span>
            </button>

            <button
              onClick={() => setIsVoiceChatOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 rounded-lg hover:bg-cyan-900/60 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0"
              title="Start real-time hands-free voice chat with Chat AI"
            >
              <Mic className="h-3.5 w-3.5 text-cyan-400" />
              <span>Voice Mode</span>
            </button>

            {activeArtifact && (
              <button
                onClick={() => setActiveArtifact(null)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 rounded-lg hover:bg-cyan-900/60 transition-colors whitespace-nowrap shrink-0"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Hide Canvas</span>
              </button>
            )}

            {/* User Account / Sign In Button */}
            <button
              onClick={() => setIsAccountOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                currentUser
                  ? 'bg-neutral-900 border-neutral-700/80 text-neutral-200 hover:border-cyan-500/50'
                  : 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-800/80 text-cyan-300 shadow-xs'
              }`}
              title={currentUser ? 'Your Chat AI Account & Profile' : 'Create an Account / Sign In'}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Account'}
                  className="h-4 w-4 rounded-full object-cover border border-cyan-400/80"
                />
              ) : currentUser ? (
                <div className="h-4 w-4 rounded-full bg-cyan-900 text-cyan-200 font-semibold text-[9px] flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              ) : (
                <UserIcon className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>{currentUser ? (currentUser.displayName?.split(' ')[0] || 'Account') : 'Sign In'}</span>
            </button>

            {/* Save to Folder Button */}
            <button
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              title="Save chat history, text, or code directly to your computer folder"
            >
              <FolderDown className="h-3.5 w-3.5 text-cyan-400" />
              <span>Save to Folder</span>
            </button>

            <button
              onClick={() => handleNewConversation()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-950 bg-neutral-100 hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Session</span>
            </button>
          </div>
        </header>

        {/* Center Canvas Area: Split Chat & Artifact Panel */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Messages Column */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6"
            >
              {/* Empty / Welcome State with Floating Sign & Feature Tour */}
              {(!activeConversation || activeConversation.messages.length === 0) && (
                <WelcomeFeatureTour
                  onStartVoiceChat={() => setIsVoiceChatOpen(true)}
                  onSelectPrompt={(p) => handleSendMessage(p)}
                  onPreviewDemoArtifact={(artifact) => setActiveArtifact(artifact)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenAccount={() => setIsAccountOpen(true)}
                  onOpenExport={() => setIsExportOpen(true)}
                  currentUser={currentUser}
                  activePersonaId={activePersonaId}
                  onSelectPersona={(id) => handleSelectPersona(id)}
                  heroImage={heroImg}
                />
              )}

              {/* Populated Messages Stream */}
              {activeConversation &&
                activeConversation.messages.map((message, idx) => {
                  const isUser = message.role === 'user';

                  return (
                    <div
                      key={`${message.id || 'msg'}-${idx}`}
                      className={`flex gap-3 md:gap-4 max-w-4xl mx-auto ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {/* Assistant Avatar */}
                      {!isUser && (
                        <img
                          src={avatarImg}
                          alt="Chat AI"
                          className="h-8 w-8 rounded-full object-cover border border-neutral-700 shrink-0 mt-0.5"
                        />
                      )}

                      {/* Message Content Container */}
                      <div
                        className={`group relative rounded-2xl p-4 md:p-5 max-w-[88%] md:max-w-[80%] ${
                          isUser
                            ? 'bg-neutral-800 text-neutral-100 border border-neutral-700/60'
                            : 'bg-neutral-900/70 border border-neutral-800/80 text-neutral-200 shadow-sm'
                        }`}
                      >
                        {/* User Uploaded Images */}
                        {message.images && message.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {message.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img.previewUrl || `data:${img.mimeType};base64,${img.data}`}
                                alt={img.name || 'User upload'}
                                className="max-h-48 rounded-lg object-contain border border-neutral-700"
                              />
                            ))}
                          </div>
                        )}

                        {/* Text / Markdown Render */}
                        {isUser ? (
                          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                            {message.text}
                          </p>
                        ) : (
                          <>
                            {message.text ? (
                              <MarkdownRenderer
                                content={message.text}
                                onOpenArtifact={(art) => setActiveArtifact(art)}
                              />
                            ) : message.isStreaming ? (
                              <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
                                <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                                <span>Chat AI is reasoning...</span>
                              </div>
                            ) : null}

                            {/* Artifact badge if message contains runnable artifact */}
                            {message.artifacts && message.artifacts.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-cyan-400">
                                  <Code2 className="h-4 w-4" />
                                  <span>{message.artifacts[0].title}</span>
                                </div>
                                <button
                                  onClick={() => setActiveArtifact(message.artifacts![0])}
                                  className="flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 px-2 py-1 bg-cyan-950/60 rounded border border-cyan-800/60 transition-colors"
                                >
                                  <span>Open in Canvas</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            )}

                            {/* Message Footer: Latency, Listen (TTS), Copy */}
                            {!message.isStreaming && message.text && (
                              <div className="mt-4 pt-3 border-t border-neutral-800/50 flex items-center justify-between text-xs text-neutral-500">
                                <div className="flex items-center gap-2">
                                  {message.latencyMs && (
                                    <span className="font-mono text-[11px]">
                                      {(message.latencyMs / 1000).toFixed(1)}s
                                    </span>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <AudioPlayer
                                    text={message.text}
                                    voice={settings.voice}
                                  />
                                </div>

                                <button
                                  onClick={() => handleCopyMessage(message.id, message.text)}
                                  className="p-1 hover:text-neutral-200 rounded transition-colors"
                                  title="Copy response"
                                >
                                  {copiedId === message.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Retry button for failed messages */}
                            {message.error && (
                              <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex items-center justify-between text-xs">
                                <span className="text-rose-400">Response could not be completed</span>
                                <button
                                  onClick={() => handleRetryMessage(message.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-100 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Retry</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <ChatInput
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              isStreaming={isStreaming}
              onOpenVoiceChat={() => setIsVoiceChatOpen(true)}
            />

            {/* User-controlled Jump to Bottom button */}
            {showScrollBottom && (
              <button
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-28 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-full border border-neutral-700 shadow-xl backdrop-blur transition-all"
                title="Scroll down to latest response"
              >
                <ArrowDown className="h-3.5 w-3.5 text-cyan-400" />
                <span>Jump to bottom</span>
              </button>
            )}
          </div>

          {/* Right Artifact Canvas Panel */}
          {activeArtifact && (
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
        onClearAllConversations={handleClearAllConversations}
      />

      {/* Real-Time Live Voice Chat Modal */}
      <VoiceChatModal
        isOpen={isVoiceChatOpen}
        onClose={handleVoiceModalClose}
        activePersona={activePersona}
        defaultVoice={settings.voice}
      />

      {/* Account & Profile Management Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        onProfileUpdated={(updated) => {
          setUserProfile((prev) => (prev ? { ...prev, ...updated } : null));
          if (updated.preferredLanguage && updated.preferredLanguage !== 'auto') {
            setSettings((s) => ({ ...s, language: updated.preferredLanguage || 'auto' }));
          }
          if (updated.preferredVoice) {
            setSettings((s) => ({ ...s, voice: updated.preferredVoice as any }));
          }
        }}
      />

      {/* Save / Export to Folder Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        activeConversation={activeConversation}
        conversations={conversations}
        activeArtifact={activeArtifact}
      />
    </div>
  );
}
