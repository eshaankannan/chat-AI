import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  LogIn,
  LogOut,
  Shield,
  Cloud,
  Check,
  Sparkles,
  Copy,
  AlertCircle,
  Loader2,
  Globe,
  Volume2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { signInWithGoogle, logOut, updateUserProfile, UserProfileData } from '../firebase';
import { WORLD_LANGUAGES } from '../constants/languages';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  userProfile: UserProfileData | null;
  onProfileUpdated: (updated: Partial<UserProfileData>) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onProfileUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || currentUser?.displayName || ''
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    userProfile?.preferredLanguage || 'auto'
  );
  const [preferredVoice, setPreferredVoice] = useState(
    userProfile?.preferredVoice || 'Kore'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Popup cancelled.');
      } else {
        setError(err.message || 'Unable to sign in. Please check your browser popup settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logOut();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updates = {
        displayName: displayName.trim() || 'Chat AI Member',
        preferredLanguage,
        preferredVoice,
      };
      await updateUserProfile(currentUser.uid, updates);
      onProfileUpdated(updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const copyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const voices = [
    { id: 'Kore', name: 'Kore (Warm & Natural)' },
    { id: 'Puck', name: 'Puck (Lively & Crisp)' },
    { id: 'Charon', name: 'Charon (Deep & Direct)' },
    { id: 'Fenrir', name: 'Fenrir (Energetic)' },
    { id: 'Zephyr', name: 'Zephyr (Bright)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <UserIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                {currentUser ? 'Your Chat AI Account' : 'Create a Chat AI Account'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {currentUser ? 'Manage profile and cloud synchronization' : 'Sign in to save chat history and sync across devices'}
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
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {!currentUser ? (
            /* Not Signed In: Create Account / Sign In State */
            <div className="space-y-6">
              <div className="text-center py-2 space-y-2">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 shadow-inner mb-2">
                  <Sparkles className="h-8 w-8 text-cyan-300" />
                </div>
                <h3 className="text-base font-semibold text-neutral-100 tracking-tight">
                  Welcome to Chat AI
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Create a free account to unlock persistent cloud memory, automatic session backup, and multi-device syncing.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <Cloud className="h-4 w-4" />
                    <span className="text-xs font-semibold">Cloud Sync</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    Your conversations and voice transcripts are safely backed up in Firebase Firestore.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-semibold">Private & Safe</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    Zero-trust security rules ensure only your authenticated account can read your data.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-purple-400">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-semibold">Polyglot Profile</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    Remember your native language dialect and custom voice preferences automatically.
                  </p>
                </div>
              </div>

              {/* Primary Action Button: Sign in / Create Account with Google */}
              <div className="pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-neutral-100 hover:bg-white text-neutral-950 rounded-xl font-semibold text-xs tracking-wide shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-950" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google to Create Account</span>
                </button>
                <p className="text-[11px] text-neutral-500 text-center mt-2.5">
                  Safe, secure Google OAuth authentication. No password required.
                </p>
              </div>
            </div>
          ) : (
            /* Signed In: Profile & Settings State */
            <div className="space-y-6">
              {/* User Overview Card */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="h-14 w-14 rounded-full object-cover border-2 border-cyan-500/40"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-cyan-950 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-300 font-semibold text-lg">
                    {(currentUser.displayName || currentUser.email || 'A')[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-100 truncate">
                      {currentUser.displayName || 'Chat AI Member'}
                    </h3>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 rounded-md">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[140px]">
                      UID: {currentUser.uid}
                    </span>
                    <button
                      onClick={copyUid}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
                      title="Copy UID"
                    >
                      {copiedUid ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                      <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status Pill */}
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Cloud className="h-4 w-4 text-emerald-400" />
                  <span>Cloud Sync: Active (Firestore Connected)</span>
                </div>
                <span className="text-[11px] text-emerald-400/80 font-mono">Real-Time</span>
              </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Preferred Language</span>
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {WORLD_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1">
                      <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Preferred AI Voice</span>
                    </label>
                    <select
                      value={preferredVoice}
                      onChange={(e) => setPreferredVoice(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {voices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs">
                    {saveSuccess && (
                      <span className="text-emerald-400 flex items-center gap-1 animate-in fade-in">
                        <Check className="h-3.5 w-3.5" />
                        <span>Profile updated!</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>

              {/* Sign Out Section */}
              <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between">
                <span className="text-xs text-neutral-400">Want to switch accounts?</span>
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/40 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
