import React, { useState } from 'react';
import { Check, Copy, Play, Code2, ExternalLink } from 'lucide-react';
import { Artifact } from '../types';

interface MarkdownRendererProps {
  content: string;
  onOpenArtifact?: (artifact: Artifact) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onOpenArtifact }) => {
  // Parse markdown into segments (code blocks vs prose)
  const segments = React.useMemo(() => {
    const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const items: Array<
      | { type: 'code'; language: string; code: string; isRunnable: boolean }
      | { type: 'prose'; text: string }
    > = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        items.push({
          type: 'prose',
          text: content.slice(lastIndex, match.index),
        });
      }

      const language = (match[1] || 'text').toLowerCase();
      const code = match[2];
      const isRunnable = ['html', 'svg', 'xml'].includes(language) || 
        (language === 'jsx' && code.includes('export default')) ||
        (code.includes('<!DOCTYPE html>') || code.includes('<svg') || code.includes('<html'));

      items.push({
        type: 'code',
        language,
        code,
        isRunnable,
      });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      items.push({
        type: 'prose',
        text: content.slice(lastIndex),
      });
    }

    return items;
  }, [content]);

  return (
    <div className="space-y-4 text-neutral-200 text-sm md:text-base leading-relaxed break-words">
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return (
            <CodeBlockItem
              key={idx}
              language={seg.language}
              code={seg.code}
              isRunnable={seg.isRunnable}
              onOpenArtifact={onOpenArtifact}
            />
          );
        }
        return <ProseBlock key={idx} text={seg.text} />;
      })}
    </div>
  );
};

const CodeBlockItem: React.FC<{
  language: string;
  code: string;
  isRunnable: boolean;
  onOpenArtifact?: (artifact: Artifact) => void;
}> = ({ language, code, isRunnable, onOpenArtifact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenArtifact = () => {
    if (!onOpenArtifact) return;
    const type = language === 'svg' ? 'svg' : language === 'html' ? 'html' : 'code';
    onOpenArtifact({
      id: `art-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      title: `${language.toUpperCase()} Artifact`,
      language,
      content: code,
    });
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/90 shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-950/70 px-3.5 py-1.5 text-xs text-neutral-400">
        <span className="font-mono text-neutral-300 font-medium">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-2">
          {isRunnable && onOpenArtifact && (
            <button
              onClick={handleOpenArtifact}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors"
              title="Preview interactive code in canvas"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Live Preview</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="overflow-x-auto p-4 font-mono text-xs md:text-sm text-neutral-300 leading-normal selection:bg-cyan-500/20">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ProseBlock: React.FC<{ text: string }> = ({ text }) => {
  // Parse paragraphs and linebreaks
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inList: 'ul' | 'ol' | null = null;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1 list-disc list-inside text-neutral-300 pl-1">
          {listItems}
        </ul>
      );
    } else if (inList === 'ol') {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-2 space-y-1 list-decimal list-inside text-neutral-300 pl-1">
          {listItems}
        </ol>
      );
    }
    inList = null;
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check headings
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-base font-semibold text-neutral-100 mt-4 mb-1">
          {formatInline(trimmed.replace('### ', ''))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-lg font-semibold text-neutral-100 mt-5 mb-2 pb-1 border-b border-neutral-800/60">
          {formatInline(trimmed.replace('## ', ''))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={i} className="text-xl font-bold text-neutral-50 mt-6 mb-2">
          {formatInline(trimmed.replace('# ', ''))}
        </h1>
      );
      continue;
    }

    // Check blockquotes
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={i} className="my-2 pl-4 py-1 border-l-2 border-cyan-500/60 bg-neutral-900/40 text-neutral-300 italic rounded-r">
          {formatInline(trimmed.replace(/^>\s*/, ''))}
        </blockquote>
      );
      continue;
    }

    // Check unordered lists
    if (/^[-*]\s+/.test(trimmed)) {
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
      }
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {formatInline(trimmed.replace(/^[-*]\s+/, ''))}
        </li>
      );
      continue;
    }

    // Check ordered lists
    if (/^\d+\.\s+/.test(trimmed)) {
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
      }
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {formatInline(trimmed.replace(/^\d+\.\s+/, ''))}
        </li>
      );
      continue;
    }

    // Empty line separates paragraphs
    if (trimmed === '') {
      flushList();
      continue;
    }

    // Normal paragraph line
    flushList();
    elements.push(
      <p key={i} className="my-1.5 leading-relaxed text-neutral-300">
        {formatInline(rawLine)}
      </p>
    );
  }

  flushList();

  return <>{elements}</>;
};

// Inline formatter for bold, italic, inline code, and links
function formatInline(str: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Tokenize `code`, **bold**, *italic*, [link](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-neutral-800/90 px-1.5 py-0.5 font-mono text-xs text-cyan-300 border border-neutral-700/50"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-neutral-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-neutral-300">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
          >
            {linkMatch[1]}
            <ExternalLink className="h-3 w-3 inline" />
          </a>
        );
      }
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }

  return parts;
}
