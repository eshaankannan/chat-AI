import React, { useState } from 'react';
import {
  X,
  Download,
  FolderDown,
  FileText,
  FileCode,
  Archive,
  Check,
  Copy,
  Folder,
  HardDrive,
  Info,
} from 'lucide-react';
import { Conversation, Artifact } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversation: Conversation | null;
  conversations: Conversation[];
  activeArtifact?: Artifact | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  activeConversation,
  conversations,
  activeArtifact,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const getSafeTitle = (title?: string) => {
    return (title || 'chat-ai-conversation')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'chat';
  };

  // 1. Export as Markdown (.md)
  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    const dateStr = new Date().toLocaleDateString();
    let md = `# ${activeConversation.title}\n`;
    md += `*Exported from Chat AI on ${dateStr}*\n\n---\n\n`;

    for (const msg of activeConversation.messages) {
      const roleName = msg.role === 'user' ? 'You' : 'Chat AI';
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      md += `### ${roleName} (${timeStr})\n\n${msg.text}\n\n`;

      if (msg.artifacts && msg.artifacts.length > 0) {
        for (const art of msg.artifacts) {
          md += `\`\`\`${art.language}\n${art.content}\n\`\`\`\n\n`;
        }
      }
    }

    const filename = `${getSafeTitle(activeConversation.title)}-${Date.now()}.md`;
    triggerDownload(md, filename, 'text/markdown');
  };

  // 2. Export as Plain Text (.txt)
  const handleExportPlainText = () => {
    if (!activeConversation) return;
    let txt = `=======================================================\n`;
    txt += `CHAT AI CONVERSATION: ${activeConversation.title}\n`;
    txt += `Date: ${new Date().toLocaleString()}\n`;
    txt += `=======================================================\n\n`;

    for (const msg of activeConversation.messages) {
      const roleName = msg.role === 'user' ? 'YOU' : 'CHAT AI';
      const timeStr = new Date(msg.timestamp).toLocaleTimeString();
      txt += `[${timeStr}] ${roleName}:\n${msg.text}\n\n-------------------------------------------------------\n\n`;
    }

    const filename = `${getSafeTitle(activeConversation.title)}-${Date.now()}.txt`;
    triggerDownload(txt, filename, 'text/plain');
  };

  // 3. Export as JSON (.json)
  const handleExportJson = () => {
    if (!activeConversation) return;
    const jsonStr = JSON.stringify(activeConversation, null, 2);
    const filename = `${getSafeTitle(activeConversation.title)}-${Date.now()}.json`;
    triggerDownload(jsonStr, filename, 'application/json');
  };

  // 4. Export All Conversations (Backup Archive)
  const handleExportAll = () => {
    const backupData = {
      app: 'Chat AI',
      exportedAt: new Date().toISOString(),
      totalConversations: conversations.length,
      conversations,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const filename = `chat-ai-all-chats-backup-${new Date().toISOString().slice(0, 10)}.json`;
    triggerDownload(jsonStr, filename, 'application/json');
  };

  // 5. Export Active Artifact Code
  const handleExportArtifact = () => {
    if (!activeArtifact) return;
    const ext = activeArtifact.type === 'svg' ? 'svg' : 'html';
    const filename = `${getSafeTitle(activeArtifact.title || 'artifact')}.${ext}`;
    const mime = activeArtifact.type === 'svg' ? 'image/svg+xml' : 'text/html';
    triggerDownload(activeArtifact.content, filename, mime);
  };

  // Copy all conversation text to clipboard
  const handleCopyAll = () => {
    if (!activeConversation) return;
    let text = `${activeConversation.title}\n\n`;
    for (const msg of activeConversation.messages) {
      text += `${msg.role === 'user' ? 'You' : 'Chat AI'}: ${msg.text}\n\n`;
    }
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <FolderDown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Save & Download to Your Folder
              </h2>
              <p className="text-[11px] text-neutral-400">
                Download your chat history, documents, or code directly to your computer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-neutral-200">
          {/* Notification on success */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Saved <strong>{downloadSuccess}</strong> to your computer folder! Check your Downloads folder.
              </span>
            </div>
          )}

          {/* Quick Explanation */}
          <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-start gap-3 text-xs text-neutral-400 leading-relaxed">
            <HardDrive className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-neutral-200 font-medium mb-0.5">Where will it be saved?</p>
              <p>
                Clicking any format below will immediately prompt your web browser to download and save the file directly to your computer's <strong>Downloads</strong> folder (or the folder you select).
              </p>
            </div>
          </div>

          {/* Section 1: Current Chat */}
          {activeConversation && activeConversation.messages.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Current Chat: "{activeConversation.title}"</span>
                </h3>
                <span className="text-[11px] text-neutral-500">
                  {activeConversation.messages.length} messages
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Markdown */}
                <button
                  onClick={handleExportMarkdown}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/70 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                        Markdown (.md)
                      </div>
                      <div className="text-[10px] text-neutral-400">Formatted doc with code</div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-neutral-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                </button>

                {/* Plain Text */}
                <button
                  onClick={handleExportPlainText}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/70 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 group-hover:scale-105 transition-transform">
                      <FileCode className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                        Plain Text (.txt)
                      </div>
                      <div className="text-[10px] text-neutral-400">Opens in Notepad / Notes</div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-neutral-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                </button>

                {/* JSON */}
                <button
                  onClick={handleExportJson}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/70 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      <FileCode className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-100 group-hover:text-purple-300 transition-colors">
                        JSON Data (.json)
                      </div>
                      <div className="text-[10px] text-neutral-400">Structured data with timestamps</div>
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-neutral-500 group-hover:text-purple-400 shrink-0 transition-colors" />
                </button>

                {/* Copy to Clipboard */}
                <button
                  onClick={handleCopyAll}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/70 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      {copiedText ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-100 group-hover:text-emerald-300 transition-colors">
                        {copiedText ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                      </div>
                      <div className="text-[10px] text-neutral-400">Paste anywhere directly</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/80 text-xs text-neutral-400 text-center">
              Start chatting or type a question to save the conversation to your folder!
            </div>
          )}

          {/* Section 2: Active Artifact / Live Code (if any) */}
          {activeArtifact && (
            <div className="p-4 rounded-xl bg-neutral-950/70 border border-cyan-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-neutral-200">
                    Live Code Artifact: {activeArtifact.title}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300">
                  {activeArtifact.language}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-snug">
                Save the runnable HTML/SVG file to your folder to run it offline or double-click to open in any web browser.
              </p>
              <button
                onClick={handleExportArtifact}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save Code File to Folder ({activeArtifact.type === 'svg' ? '.svg' : '.html'})</span>
              </button>
            </div>
          )}

          {/* Section 3: All Chats Backup */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-neutral-200">
                  Complete Chat History Backup
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                {conversations.length} total {conversations.length === 1 ? 'chat' : 'chats'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Download all your conversations, prompts, and timestamps in a single JSON backup archive file.
            </p>
            <button
              onClick={handleExportAll}
              disabled={conversations.length === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-medium border border-neutral-700/80 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>Download All Chats to Folder (.json backup)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Info className="h-3.5 w-3.5 text-cyan-400" />
            <span>Files are saved directly to your device</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
