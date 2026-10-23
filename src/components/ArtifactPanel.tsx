import React, { useState, useEffect } from 'react';
import { X, Play, Code2, Copy, Check, Download, ExternalLink, RefreshCw, Maximize2 } from 'lucide-react';
import { Artifact } from '../types';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  onClose: () => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({ artifact, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // If artifact changes and is not runnable, default to code
    if (artifact && !['html', 'svg', 'xml'].includes(artifact.language) && !artifact.content.includes('<html')) {
      setActiveTab('code');
    } else {
      setActiveTab('preview');
    }
  }, [artifact]);

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = artifact.language === 'svg' ? 'svg' : artifact.language === 'html' ? 'html' : artifact.language === 'json' ? 'json' : 'txt';
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artifact-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenExternal = () => {
    const win = window.open();
    if (win) {
      win.document.open();
      if (artifact.language === 'svg' || artifact.content.trim().startsWith('<svg')) {
        win.document.write(`<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;">${artifact.content}</body></html>`);
      } else {
        win.document.write(artifact.content);
      }
      win.document.close();
    }
  };

  const prepareSrcDoc = (raw: string) => {
    if (artifact.language === 'svg' || raw.trim().startsWith('<svg')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #09090b;
      color: #fafafa;
      font-family: system-ui, sans-serif;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>${raw}</body>
</html>`;
    }

    if (!raw.includes('<html') && !raw.includes('<!DOCTYPE')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 16px;
      background-color: #09090b;
      color: #f4f4f5;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>${raw}</body>
</html>`;
    }

    return raw;
  };

  const isRunnable = ['html', 'svg', 'xml'].includes(artifact.language) || 
    artifact.content.includes('<html') || 
    artifact.content.includes('<!DOCTYPE html>') || 
    artifact.content.trim().startsWith('<svg');

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 w-full md:w-[480px] lg:w-[600px] shrink-0 transition-all">
      {/* Artifact Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <Code2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="text-sm font-semibold text-neutral-100 truncate">
            {artifact.title || 'Interactive Canvas'}
          </span>
          <span className="text-xs font-mono text-neutral-400 uppercase">
            {artifact.language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
            title="Reload Preview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
            title="Download Artifact"
          >
            <Download className="h-4 w-4" />
          </button>
          {isRunnable && (
            <button
              onClick={handleOpenExternal}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors ml-1"
            title="Close Canvas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Segmented Controls for Preview vs Code */}
      {isRunnable && (
        <div className="flex border-b border-neutral-800/80 px-4 py-2 bg-neutral-950/40">
          <div className="flex items-center gap-1 p-0.5 bg-neutral-900 border border-neutral-800 rounded-md">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'preview'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Play className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeTab === 'code'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Code2 className="h-3 w-3" />
              Source Code
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-neutral-950">
        {activeTab === 'preview' && isRunnable ? (
          <iframe
            key={key}
            srcDoc={prepareSrcDoc(artifact.content)}
            title="Artifact Preview Sandbox"
            sandbox="allow-scripts allow-modals"
            className="w-full h-full border-none bg-neutral-950"
          />
        ) : (
          <div className="h-full overflow-auto p-4 font-mono text-xs text-neutral-300">
            <pre className="leading-relaxed">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
