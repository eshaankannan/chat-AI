import React, { useState } from 'react';
import { X, Sliders, Volume2, RotateCcw, AlertTriangle, Globe } from 'lucide-react';
import { ModelSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants/personas';
import { WORLD_LANGUAGES } from '../constants/languages';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ModelSettings;
  onSaveSettings: (settings: ModelSettings) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllConversations,
}) => {
  const [current, setCurrent] = useState<ModelSettings>(settings);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(current);
    onClose();
  };

  const handleReset = () => {
    setCurrent(DEFAULT_SETTINGS);
  };

  const voices: Array<{ id: ModelSettings['voice']; label: string; desc: string }> = [
    { id: 'Kore', label: 'Kore', desc: 'Calm, balanced, versatile' },
    { id: 'Puck', label: 'Puck', desc: 'Lively, friendly, crisp' },
    { id: 'Fenrir', label: 'Fenrir', desc: 'Deep, authoritative, steady' },
    { id: 'Zephyr', label: 'Zephyr', desc: 'Soft, articulate, gentle' },
    { id: 'Charon', label: 'Charon', desc: 'Low-pitched, resonant' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-neutral-100">
              Workspace & Intelligence Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs md:text-sm">
          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-neutral-200">
                Temperature (Creativity)
              </label>
              <span className="font-mono text-cyan-400">
                {current.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={current.temperature}
              onChange={(e) =>
                setCurrent({ ...current, temperature: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-neutral-500 mt-1">
              <span>Precise & Deterministic (0.0)</span>
              <span>Creative & Imaginative (1.5)</span>
            </div>
          </div>

          {/* Reasoning / Thinking Level */}
          <div>
            <label className="block font-medium text-neutral-200 mb-1.5">
              Reasoning Depth (Thinking Level)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setCurrent({ ...current, thinkingLevel: level })}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                    current.thinkingLevel === level
                      ? 'bg-neutral-800 text-cyan-400 border-cyan-500/50'
                      : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  {level === 'LOW' && 'Low (Fastest)'}
                  {level === 'MEDIUM' && 'Medium (Balanced)'}
                  {level === 'HIGH' && 'High (Complex STEM)'}
                </button>
              ))}
            </div>
          </div>

          {/* Gemini TTS Voice */}
          <div>
            <div className="flex items-center gap-1.5 font-medium text-neutral-200 mb-2">
              <Volume2 className="h-4 w-4 text-cyan-400" />
              <span>Gemini 3.8 Flash Lite Voice</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {voices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setCurrent({ ...current, voice: v.id })}
                  className={`flex flex-col text-left p-2.5 rounded-lg border transition-colors ${
                    current.voice === v.id
                      ? 'bg-neutral-800 text-neutral-100 border-cyan-500/50'
                      : 'bg-neutral-950/60 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <span className="font-semibold text-xs text-neutral-100">{v.label}</span>
                  <span className="text-[11px] text-neutral-500">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Universal World Language Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-neutral-200 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span>Language & Dialect</span>
              </label>
            </div>
            <select
              value={current.language || 'auto'}
              onChange={(e) => setCurrent({ ...current, language: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {WORLD_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-neutral-900 text-neutral-200">
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500 mt-1">
              Choose "Auto-Detect (Every Language)" to speak and write freely in any world language, or pin Aura to a specific language.
            </p>
          </div>

          {/* Custom System Instruction Override */}
          <div>
            <label className="block font-medium text-neutral-200 mb-1.5">
              Custom Persona / Instruction Modifier
            </label>
            <textarea
              rows={3}
              value={current.customSystemPrompt}
              onChange={(e) =>
                setCurrent({ ...current, customSystemPrompt: e.target.value })
              }
              placeholder="E.g., 'Always provide answers with bullet points and citations', 'Speak concisely'..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 leading-relaxed"
            />
          </div>

          {/* Data Cleanup */}
          <div className="pt-2 border-t border-neutral-800">
            {showClearConfirm ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-medium text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Delete all conversations and history?</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onClearAllConversations();
                      setShowClearConfirm(false);
                      onClose();
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    Yes, Delete All
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs rounded hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-neutral-500 hover:text-rose-400 transition-colors"
              >
                Clear all conversation history from storage
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/60">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-neutral-950 bg-neutral-100 hover:bg-white rounded-lg transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
