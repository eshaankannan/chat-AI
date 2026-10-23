import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Download,
  Settings,
  Sparkles,
  Code2,
  FileText,
  Layout,
  ExternalLink,
  ChevronLeft,
  Home,
  User as UserIcon,
  LogIn,
  FolderDown,
} from 'lucide-react';
import { Conversation, Persona } from '../types';
import { PERSONAS } from '../constants/personas';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onGoHome: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onExportConversation: (conv: Conversation) => void;
  onOpenExport?: () => void;
  activePersonaId: string;
  onSelectPersona: (personaId: string) => void;
  onOpenSettings: () => void;
  currentUser?: any;
  onOpenAccount: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onGoHome,
  onDeleteConversation,
  onRenameConversation,
  onExportConversation,
  onOpenExport,
  activePersonaId,
  onSelectPersona,
  onOpenSettings,
  currentUser,
  onOpenAccount,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const getPersonaIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code2':
        return <Code2 className="h-4 w-4" />;
      case 'Search':
        return <Search className="h-4 w-4" />;
      case 'PenTool':
        return <FileText className="h-4 w-4" />;
      case 'Layout':
        return <Layout className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 bg-neutral-950 border-r border-neutral-800/80 transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & New Chat */}
        <div className="p-3 border-b border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold text-xs">
                C
              </div>
              <span className="font-semibold text-sm tracking-tight text-neutral-100">
                Chat AI
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-200 md:hidden rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Home / Hub Navigation */}
          <button
            onClick={() => {
              onGoHome();
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 py-2 px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              !activeConversationId
                ? 'bg-neutral-850 text-cyan-300 border border-cyan-500/30 shadow-xs'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent'
            }`}
            title="Go to Home & Feature Showcase"
          >
            <Home className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold">Home & Features Hub</span>
          </button>

          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-neutral-950 bg-neutral-100 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Session</span>
          </button>
        </div>

        {/* Persona Selector Tabs */}
        <div className="p-2 border-b border-neutral-800/60">
          <div className="px-2 pb-1 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Intelligence Mode
          </div>
          <div className="space-y-0.5">
            {PERSONAS.map((p) => {
              const isSelected = p.id === activePersonaId;
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPersona(p.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-neutral-900 text-neutral-100 font-medium'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                  }`}
                >
                  <span
                    className="p-1 rounded bg-neutral-800/60"
                    style={{ color: p.accentColor }}
                  >
                    {getPersonaIcon(p.iconName)}
                  </span>
                  <div className="truncate flex-1">
                    <div className="leading-tight truncate">{p.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-neutral-900/80 border border-neutral-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="px-2 py-1 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            History ({conversations.length})
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-500">
              {searchQuery ? 'No matching conversations' : 'No prior conversations'}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-neutral-100'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-neutral-300" />

                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1 overflow-hidden">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-neutral-800 text-neutral-100 text-xs px-1.5 py-0.5 rounded outline-none border border-neutral-700"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveRename(c.id, e)}
                        className="p-1 hover:text-emerald-400"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="p-1 hover:text-rose-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate flex-1 font-normal">
                        {c.title}
                      </span>

                      {/* Action buttons on hover */}
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => handleStartRename(c, e)}
                          className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
                          title="Rename"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportConversation(c);
                          }}
                          className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
                          title="Export Markdown"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(c.id);
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/50 space-y-1.5">
          {/* User Account Tile */}
          <button
            onClick={() => {
              onOpenAccount();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-between p-2 rounded-lg text-xs bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800/80 hover:border-neutral-700 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="h-6 w-6 rounded-full object-cover border border-cyan-500/50"
                />
              ) : currentUser ? (
                <div className="h-6 w-6 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-semibold text-[10px]">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-cyan-400 group-hover:border-cyan-500/50 transition-colors">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-neutral-200 group-hover:text-cyan-300 transition-colors truncate">
                  {currentUser ? (currentUser.displayName || 'Account Active') : 'Create Account'}
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {currentUser ? (currentUser.email || 'Cloud Synced') : 'Sign in & Cloud Backup'}
                </div>
              </div>
            </div>

            {!currentUser ? (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 rounded-md shrink-0">
                Sign In
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Online & Synced" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60 transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span>Model & Voice Settings</span>
          </button>

          {onOpenExport && (
            <button
              onClick={() => {
                onOpenExport();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 border border-cyan-900/40 rounded-lg transition-colors cursor-pointer"
              title="Save chat history and code files to your folder"
            >
              <FolderDown className="h-4 w-4" />
              <span>Save to Folder</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
