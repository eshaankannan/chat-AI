import React, { useRef, useState, useEffect } from 'react';
import { Send, Square, Image as ImageIcon, Mic, MicOff, X, Sparkles, Headphones } from 'lucide-react';
import { MessageImage } from '../types';
import { getLanguageByCode } from '../constants/languages';
import { stopCurrentSpeech } from '../utils/audio';

interface ChatInputProps {
  onSendMessage: (text: string, images?: MessageImage[]) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  language?: string;
  onOpenVoiceChat?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  disabled,
  language = 'auto',
  onOpenVoiceChat,
}) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<MessageImage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [text]);

  const [micError, setMicError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Setup Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const langObj = getLanguageByCode(language);
      recognition.lang = langObj.code === 'auto' ? 'en-US' : langObj.speechCode;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setText((prev) => (prev ? `${prev} ${event.results[i][0].transcript}` : event.results[i][0].transcript));
          }
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setMicError('Microphone blocked. Click the lock/tune icon in your address bar and allow Microphone.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleRecord = async () => {
    stopCurrentSpeech();
    setMicError(null);

    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (blob.size > 1500) {
              setIsTranscribing(true);
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = async () => {
                try {
                  const res = await fetch('/api/transcribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      audioBase64: reader.result as string,
                      mimeType: 'audio/webm',
                    }),
                  });
                  const data = await res.json();
                  if (data.transcript && data.transcript.trim()) {
                    setText((prev) => (prev ? `${prev} ${data.transcript.trim()}` : data.transcript.trim()));
                  }
                } catch (e) {
                  console.warn('Transcription error:', e);
                } finally {
                  setIsTranscribing(false);
                }
              };
            }
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn('MediaRecorder init error:', recErr);
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone blocked. Click the lock/tune icon in your address bar and allow Microphone.');
      } else {
        setMicError('Could not access microphone: ' + (err.message || 'Check audio device.'));
      }
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    stopCurrentSpeech();
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;

    onSendMessage(trimmed, images.length > 0 ? images : undefined);
    setText('');
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages((prev) => [
            ...prev,
            {
              data: result,
              mimeType: file.type,
              name: file.name,
              previewUrl: result,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Container with subtle border and focus ring */}
      <div className="relative rounded-2xl bg-neutral-900 border border-neutral-800 focus-within:border-neutral-700 focus-within:ring-1 focus-within:ring-neutral-700/60 shadow-lg transition-all">
        {/* Mic Error Notice */}
        {micError && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300">
            <span>{micError}</span>
            <button
              onClick={() => setMicError(null)}
              className="text-neutral-400 hover:text-white p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Transcribing indicator */}
        {isTranscribing && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border-b border-cyan-500/20 text-xs text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Processing speech with Gemini AI...</span>
          </div>
        )}

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="flex items-center gap-2 p-3 border-b border-neutral-800/80 overflow-x-auto">
            {images.map((img, idx) => (
              <div key={idx} className="relative group shrink-0">
                <img
                  src={img.previewUrl}
                  alt={img.name || 'Attachment'}
                  className="h-16 w-16 object-cover rounded-lg border border-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-neutral-950 text-neutral-300 hover:text-white rounded-full p-0.5 border border-neutral-700 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? 'Listening... speak clearly (click mic again when done)'
                : isTranscribing
                ? 'Processing speech with Gemini AI...'
                : 'Ask anything, draft code, explore ideas, or attach images...'
            }
            disabled={disabled}
            className="w-full resize-none bg-transparent text-sm md:text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none min-h-[44px] max-h-[180px] leading-relaxed"
          />
        </div>

        {/* Bottom Toolbar & Action Buttons */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-neutral-800/40">
          <div className="flex items-center gap-1 text-neutral-400">
            {/* Image attachment button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Attach images (diagrams, photos, UI screenshots)"
            >
              <ImageIcon className="h-4 w-4" />
            </button>

            {/* Voice Dictation button */}
            <button
              type="button"
              onClick={handleToggleRecord}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title={isRecording ? 'Stop voice recording' : 'Voice dictation'}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Real-time Voice Chat Mode button */}
            {onOpenVoiceChat && (
              <button
                type="button"
                onClick={onOpenVoiceChat}
                className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
                title="Open Live Voice Mode (Hands-Free Conversation)"
              >
                <Headphones className="h-4 w-4" />
              </button>
            )}

            <span className="hidden sm:inline-block text-xs text-neutral-500 pl-2">
              Gemini 3 Flash
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs text-neutral-500">
              Enter to send · Shift+Enter newline
            </span>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && images.length === 0}
                className="flex items-center justify-center h-8 w-8 text-neutral-950 bg-neutral-100 hover:bg-white disabled:opacity-40 disabled:hover:bg-neutral-100 rounded-lg transition-all"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
