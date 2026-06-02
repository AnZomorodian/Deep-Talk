import { useState, useEffect, FormEvent } from 'react';
import { Smartphone, Monitor, ShieldCheck, Key, LogOut, Plus, RefreshCw, Layers, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { Device, UserProfile } from '../types';
import { backupPrivateKey, restorePrivateKey } from '../crypto';

interface DeviceManagerProps {
  user: UserProfile;
  currentDeviceId: string;
  onRefreshDevices: () => Promise<void>;
  onTerminateDevice: (deviceId: string) => Promise<void>;
  onBackupKey: (encryptedKey: string, salt: string) => Promise<void>;
  onRestoreKey: (password: string) => Promise<boolean>;
  onUpdateSettings?: (disableReceipts: boolean, onlineShow?: boolean, reactionShow?: boolean) => Promise<void>;
  onUpdateProfile?: (displayName: string, avatarUrl: string, email?: string, bio?: string, phone?: string, badge?: string, bannerStyle?: string) => Promise<void>;
}

export const BANNER_STYLES: Record<string, { banner: string; bg: string; text: string; name: string }> = {
  obsidian: {
    banner: 'bg-gradient-to-r from-slate-950 via-[#161B26] to-slate-950 border-b border-slate-800/80',
    bg: 'bg-slate-950/20',
    text: 'text-slate-400 hover:text-slate-350',
    name: 'Obsidian Slate'
  },
  cyberneon: {
    banner: 'bg-gradient-to-r from-[#170529] via-[#3B0E5A] to-slate-950 border-b border-fuchsia-900/30',
    bg: 'bg-fuchsia-950/20',
    text: 'text-fuchsia-400 hover:text-fuchsia-350',
    name: 'Cyber Neon'
  },
  quantum: {
    banner: 'bg-gradient-to-r from-[#031D1A] via-[#053D37] to-slate-950 border-b border-teal-900/40',
    bg: 'bg-teal-950/20',
    text: 'text-teal-400 hover:text-teal-350',
    name: 'Quantum Grid'
  },
  ambertech: {
    banner: 'bg-gradient-to-r from-[#191003] via-[#352205] to-slate-950 border-b border-amber-900/20',
    bg: 'bg-amber-500/5',
    text: 'text-amber-500 hover:text-amber-450',
    name: 'Tactical Amber'
  },
  ghost: {
    banner: 'bg-gradient-to-r from-[#061525] via-[#102B4D] to-slate-950 border-b border-sky-900/30',
    bg: 'bg-sky-950/15',
    text: 'text-sky-400 hover:text-sky-350',
    name: 'Stealth Blue'
  }
};

export const BADGE_STYLES: Record<string, string> = {
  'Ghost Agent': 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  'Sovereign': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'NetAdmin': 'text-rose-400 bg-rose-500/10 border-rose-500/25',
  'Specialist': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25',
  'Cipher Ghost': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Standard User': 'text-slate-400 bg-slate-500/10 border-slate-700/30'
};

export default function DeviceManager({
  user,
  currentDeviceId,
  onRefreshDevices,
  onTerminateDevice,
  onBackupKey,
  onRestoreKey,
  onUpdateSettings,
  onUpdateProfile,
}: DeviceManagerProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backedUp, setBackedUp] = useState(!!user.encryptedPrivateKey);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'crit' | 'info' } | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user.displayName);
  const [editAvatarUrl, setEditAvatarUrl] = useState(user.avatarUrl);
  const [editEmail, setEditEmail] = useState(user.email || '');
  const [editBio, setEditBio] = useState(user.bio || '');
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [editBadge, setEditBadge] = useState(user.badge || 'Ghost Agent');
  const [editBannerStyle, setEditBannerStyle] = useState(user.bannerStyle || 'obsidian');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setBackedUp(!!user.encryptedPrivateKey);
  }, [user.encryptedPrivateKey]);

  useEffect(() => {
    setEditDisplayName(user.displayName);
    setEditAvatarUrl(user.avatarUrl);
    setEditEmail(user.email || '');
    setEditBio(user.bio || '');
    setEditPhone(user.phone || '');
    setEditBadge(user.badge || 'Ghost Agent');
    setEditBannerStyle(user.bannerStyle || 'obsidian');
  }, [user.displayName, user.avatarUrl, user.email, user.bio, user.phone, user.badge, user.bannerStyle]);

  const rollNewAvatarSeed = () => {
    const styles = ['bottts', 'identicon', 'avataaars', 'shapes', 'lorelei'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const randomSeed = Math.random().toString(36).substring(2, 9);
    setEditAvatarUrl(`https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}`);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!editDisplayName.trim()) return;
    try {
      setUpdatingProfile(true);
      if (onUpdateProfile) {
        await onUpdateProfile(
          editDisplayName.trim(),
          editAvatarUrl,
          editEmail.trim(),
          editBio.trim(),
          editPhone.trim(),
          editBadge.trim(),
          editBannerStyle.trim()
        );
      }
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Create recovery key pair backup
  const handleCreateBackup = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setStatusMsg({ text: 'Recovery password must contain at least 6 characters.', type: 'crit' });
      return;
    }
    if (password !== confirmPassword) {
      setStatusMsg({ text: 'Passwords do not match.', type: 'crit' });
      return;
    }

    try {
      setPendingSync(true);
      // Retrieve original plain private key from localStorage
      const plainPrivateKey = localStorage.getItem(`secure_telegram_private_key:${user.username}`);
      if (!plainPrivateKey) {
        setStatusMsg({ text: 'No local private key was found on this device to backup.', type: 'crit' });
        setPendingSync(false);
        return;
      }

      // Cryptographically backup with PBKDF2-AES encryption
      const result = await backupPrivateKey(plainPrivateKey, password);
      
      // Upload encrypted payload to user profile on server
      await onBackupKey(result.encryptedPrivateKey, result.salt);

      setBackedUp(true);
      setPassword('');
      setConfirmPassword('');
      setStatusMsg({ text: 'Keys successfully backup and synced securely to cloud storage.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: 'Encryption backup failed: ' + err.message, type: 'crit' });
    } finally {
      setPendingSync(false);
    }
  };

  // Restore encryption keys with password
  const handleRestoreBackup = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;

    try {
      setRestoring(true);
      setStatusMsg(null);
      const success = await onRestoreKey(password);
      if (success) {
        setStatusMsg({ text: 'E2EE Private Key restored successfully! You can now decrypt E2EE messages on this device.', type: 'success' });
        setPassword('');
      } else {
        setStatusMsg({ text: 'Decryption failed! Please verify your password.', type: 'crit' });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ text: 'Key recovery error: ' + err.message, type: 'crit' });
    } finally {
      setRestoring(false);
    }
  };

  // Simulate logging into a second device in another tab
  const handleSimulateNewDevice = () => {
    const loginUrl = `${window.location.origin}?simLogin=${user.username}`;
    window.open(loginUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0E121A] border-l border-slate-800/60 w-full max-w-sm overflow-y-auto shrink-0 select-none">
      
      {/* Settings Header */}
      <div className="px-6 py-5 bg-[#0E121A] border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="text-sky-400" size={16} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Settings & Profile</h3>
        </div>
        <button
          onClick={onRefreshDevices}
          className="p-1.5 rounded-full hover:bg-slate-800/40 text-slate-450 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Refresh active lists"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">
        
        {/* Minimal Style Clean Profile Section with inline E2EE editor */}
        {(() => {
          const activeStyle = BANNER_STYLES[user.bannerStyle || 'obsidian'] || BANNER_STYLES.obsidian;
          return (
            <div className="rounded-xl border border-slate-800/60 bg-[#131722] flex flex-col overflow-hidden">
              {!isEditingProfile ? (
                <>
                  {/* Styled Header Banner Area */}
                  <div className={`p-4 ${activeStyle.banner} relative flex flex-col gap-3 z-10 transition-all duration-300`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-full border border-sky-500/40 bg-[#1A1F2B] object-cover shrink-0 shadow-lg"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white tracking-tight truncate">{user.displayName}</span>
                          <span className="text-xs text-sky-400 font-mono">@{user.username}</span>
                          <span className="text-[10px] text-slate-400/80 font-mono mt-0.5">
                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditDisplayName(user.displayName);
                          setEditAvatarUrl(user.avatarUrl);
                          setEditEmail(user.email || '');
                          setEditBio(user.bio || '');
                          setEditPhone(user.phone || '');
                          setEditBadge(user.badge || 'Ghost Agent');
                          setEditBannerStyle(user.bannerStyle || 'obsidian');
                          setIsEditingProfile(true);
                        }}
                        className="px-2.5 py-1.5 border border-slate-800 hover:border-slate-700/80 text-[10px] font-bold font-mono tracking-wider uppercase text-sky-400 hover:text-sky-300 rounded-lg bg-[#0E121A] transition-all active:scale-95 shrink-0 shadow-md"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Active Designation Tag */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`px-2 py-0.5 rounded border text-[8.5px] font-extrabold font-mono uppercase tracking-widest leading-none shadow-sm ${BADGE_STYLES[user.badge || 'Ghost Agent'] || BADGE_STYLES['Ghost Agent']}`}>
                        {user.badge || 'Ghost Agent'}
                      </span>
                      <span className="text-[8.5px] font-mono text-slate-500 uppercase tracking-widest">Active Status</span>
                    </div>
                  </div>

                  {/* Details part */}
                  <div className="p-4 flex flex-col gap-2.5 text-xs bg-[#131722]">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Email Address</span>
                      <span className="text-slate-200 mt-0.5 font-sans">{user.email || <span className="text-slate-600 italic">No email defined</span>}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Phone Number</span>
                      <span className="text-slate-200 mt-0.5 font-sans">{user.phone || <span className="text-slate-600 italic">No phone defined</span>}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Bio / Status</span>
                      <span className="text-slate-200 mt-0.5 font-sans whitespace-pre-wrap leading-relaxed">{user.bio || <span className="text-slate-600 italic">Active on Deep Talk</span>}</span>
                    </div>
                    
                    <div className="flex flex-col bg-[#0A0C13] p-2.5 rounded-lg border border-slate-800/45 mt-1 font-mono">
                      <div className="flex items-center justify-between text-[8px] font-bold text-sky-400 uppercase tracking-widest">
                        <span>E2EE Public Fingerprint</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(user.publicKey);
                            alert('E2EE signature fingerprint copied!');
                          }}
                          className="text-slate-500 hover:text-sky-400 p-0.5 transition-all cursor-pointer"
                          title="Copy fingerprint string"
                        >
                          <Copy size={10} />
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 break-all select-all font-mono leading-tight max-h-12 overflow-y-auto pr-1">
                        {user.publicKey}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSaveProfile} className="p-4 flex flex-col gap-3 font-sans bg-[#131722]">
                  <div className="text-[9.5px] font-bold text-sky-400 font-mono uppercase tracking-widest border-b border-slate-800/60 pb-1.5 mb-1 flex items-center justify-between">
                    <span>Edit Profile Settings</span>
                    <span className="text-slate-500 text-[8px] font-normal font-sans tracking-normal capitalize">Identity credentials</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Display Name</label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Your Name"
                      className="p-2.5 rounded-lg bg-[#0E121A] border border-slate-800 text-xs text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      maxLength={50}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="p-2.5 rounded-lg bg-[#0E121A] border border-slate-800 text-xs text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      maxLength={25}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 019-9922"
                      className="p-2.5 rounded-lg bg-[#0E121A] border border-slate-800 text-xs text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Bio / Status</label>
                    <textarea
                      maxLength={160}
                      rows={2}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Tell others about yourself..."
                      className="p-2.5 rounded-lg bg-[#0E121A] border border-slate-800 text-xs text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none resize-none"
                    />
                  </div>

                  {/* NEW IDEA: Selected Cyber Designation Badge */}
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Status Designation</label>
                    <select
                      value={editBadge}
                      onChange={(e) => setEditBadge(e.target.value)}
                      className="p-2 bg-[#0E121A] border border-slate-800 rounded-lg text-xs text-slate-200 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none cursor-pointer"
                    >
                      <option value="Ghost Agent">Ghost Agent (Purple)</option>
                      <option value="Sovereign">Sovereign Operator (Blue)</option>
                      <option value="NetAdmin">Net Network Admin (Crimson)</option>
                      <option value="Specialist">Crypt Specialist (Cyan)</option>
                      <option value="Cipher Ghost">Cipher Ghost (Emerald)</option>
                      <option value="Standard User">Standard Operator (Slate)</option>
                    </select>
                  </div>

                  {/* NEW IDEA: Visual Accent Banner Theme Grid */}
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Card Theme Style</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                      {Object.entries(BANNER_STYLES).map(([key, styleObj]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditBannerStyle(key)}
                          className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition-all relative overflow-hidden group cursor-pointer ${
                            editBannerStyle === key
                              ? 'border-sky-500/80 bg-sky-500/5 ring-1 ring-sky-500/50 shadow-md'
                              : 'border-slate-800/80 bg-[#0E121A] hover:border-slate-700'
                          }`}
                        >
                          <div className={`absolute top-0 right-0 w-8 h-8 rounded-full pointer-events-none ${styleObj.banner} opacity-40`} />
                          <span className="text-[10px] font-bold text-white leading-none z-10">{styleObj.name}</span>
                          <span className="text-[8px] text-slate-500 font-mono leading-none z-10 select-none uppercase">
                            {key === editBannerStyle ? '● Selected' : 'Use style'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1.5">
                    <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">Avatar Preview</label>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0E121A] border border-slate-800/40">
                      <img
                        src={editAvatarUrl}
                        alt="Roll Avatar"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full border border-sky-500/30 bg-[#1A1F2B] object-cover shrink-0"
                      />
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          type="button"
                          onClick={rollNewAvatarSeed}
                          className="w-full py-1.5 px-2 border border-slate-800 hover:border-slate-700 bg-[#151A26] text-[9.5px] font-bold font-mono text-slate-350 hover:text-white rounded transition-all uppercase tracking-wider text-center cursor-pointer"
                        >
                          🎲 Roll Seed
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-0.5 font-mono">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Custom Image URL</label>
                    <input
                      type="text"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="p-2 px-2.5 rounded-lg bg-[#0E121A] border border-slate-800 text-[10.5px] text-slate-400 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none truncate"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="w-1/2 py-2 border border-slate-800 hover:bg-slate-800/25 text-slate-450 rounded-lg text-[10.5px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingProfile}
                      className="w-1/2 py-2 bg-sky-500 hover:bg-sky-450 disabled:opacity-50 text-white rounded-lg text-[10.5px] font-bold uppercase transition-all shadow-[0_0_12px_rgba(14,165,233,0.25)] cursor-pointer"
                    >
                      {updatingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })()}

        {/* Privacy Section */}
        <div className="p-4 rounded-xl bg-[#0A0C12] border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-350 uppercase tracking-widest font-mono text-slate-300">Privacy & Stealth</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Control your footprint in active chats. Turning off read receipts hides your viewed status from other participants.
          </p>
          
          {/* Read Receipts */}
          <div className="flex items-center justify-between p-2.5 mt-1 rounded-lg bg-[#11141F] border border-slate-800/45">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">Read Receipts</span>
              <span className="text-[10px] text-slate-500">Share your viewed status</span>
            </div>
            <button
              onClick={() => {
                if (onUpdateSettings) {
                  onUpdateSettings(!user.disableReadReceipts, user.onlineShow !== false, user.reactionShow !== false);
                }
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                !user.disableReadReceipts ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  !user.disableReadReceipts ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Show Online */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#11141F] border border-slate-800/45">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">Online Status</span>
              <span className="text-[10px] text-slate-500">Show when you are active</span>
            </div>
            <button
              onClick={() => {
                if (onUpdateSettings) {
                  onUpdateSettings(!!user.disableReadReceipts, !(user.onlineShow !== false), user.reactionShow !== false);
                }
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                user.onlineShow !== false ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  user.onlineShow !== false ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Show Reactions */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#11141F] border border-slate-800/45">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">Show Reactions</span>
              <span className="text-[10px] text-slate-500">Render emojis on chat feed</span>
            </div>
            <button
              onClick={() => {
                if (onUpdateSettings) {
                  onUpdateSettings(!!user.disableReadReceipts, user.onlineShow !== false, !(user.reactionShow !== false));
                }
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                user.reactionShow !== false ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  user.reactionShow !== false ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Device Listing Panel */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Active Sessions</span>
            <button
              onClick={handleSimulateNewDevice}
              className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors uppercase tracking-wider"
            >
              <Plus size={11} />
              Simulate Device
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {user.devices?.map((dev: Device) => {
              const isCurrent = dev.deviceId === currentDeviceId;
              return (
                <div
                  key={dev.deviceId}
                  className={`flex items-center justify-between p-3.5 rounded-lg border ${
                    isCurrent 
                      ? 'bg-sky-500/10 border-sky-500/25' 
                      : 'bg-[#1A1F2B] border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md bg-[#0A0C12] text-slate-500 ${isCurrent ? 'text-sky-400 bg-sky-500/10' : ''}`}>
                      {dev.deviceName.toLowerCase().includes('phone') ? <Smartphone size={15} /> : <Monitor size={15} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 leading-tight">
                        {dev.deviceName}
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-sky-500/10 text-[8px] font-bold text-sky-400 rounded border border-sky-500/20 font-mono uppercase tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Last synch: {new Date(dev.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => onTerminateDevice(dev.deviceId)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                      title="Terminate device session"
                    >
                      <LogOut size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cryptographic Backup / Sync Panel */}
        <div className="p-4 rounded-xl bg-[#0A0C12] border border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Key className="text-amber-500" size={15} />
            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest font-mono">E2EE Private Backup</span>
          </div>
          
          <p className="text-[11px] text-slate-450 text-slate-400 leading-relaxed font-sans">
            Chats are encrypted end-to-end. Set a password to encrypt and sync your key securely to the server, letting you instantly sync chats to new tabs.
          </p>

          {/* Status Message */}
          {statusMsg && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-1.5 border leading-relaxed font-sans ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : statusMsg.type === 'crit'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-405 text-rose-450'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {statusMsg.type === 'crit' ? <AlertTriangle size={13} className="shrink-0 mt-0.5 text-rose-500" /> : <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-500" />}
              <span className="break-words">{statusMsg.text}</span>
            </div>
          )}

          {/* BACKUP FORM: If not backed up or resetting */}
          <div className="flex flex-col gap-3">
            <div className="h-px bg-slate-800/40 my-0.5"></div>

            {/* Check local private key state */}
            {localStorage.getItem(`secure_telegram_private_key:${user.username}`) ? (
              <form onSubmit={handleCreateBackup} className="flex flex-col gap-3.5">
                <span className="text-[9px] font-bold text-amber-400/90 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-amber-500" />
                  {backedUp ? 'Overwrite backup password' : 'New Backup Config'}
                </span>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">RECOVERY PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="p-2.5 rounded-lg bg-[#1A1F2B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-wider">CONFIRM RECOVERY PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="p-2.5 rounded-lg bg-[#1A1F2B] border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pendingSync}
                  className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-455 text-white font-bold text-[11px] transition-colors shadow-[0_0_15px_rgba(14,165,233,0.3)] active:scale-98 disabled:opacity-50 cursor-pointer uppercase font-mono tracking-wider"
                >
                  {pendingSync ? 'Syncing...' : 'Sync Key to Server'}
                </button>
              </form>
            ) : (
              /* RESTORE FORM: If there is no keys stored locally on this physical device but backed up on the backend */
              backedUp ? (
                <form onSubmit={handleRestoreBackup} className="flex flex-col gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 text-[10.5px] text-amber-400 leading-relaxed font-sans">
                    🔑 Session Lock: Device has no cryptographic keys. Input your password to decrypt your remote key setup.
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      type="password"
                      required
                      placeholder="Input Master Recovery Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="p-2.5 rounded-lg bg-[#1A1F2B] border border-slate-800 text-xs text-white focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={restoring}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-[11px] transition-all active:scale-98 cursor-pointer uppercase font-mono tracking-wider"
                  >
                    {restoring ? 'Decrypting...' : 'Unlock Secure Chats'}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-rose-500/10 text-rose-450 border border-rose-500/20 rounded-lg text-[10.5px] font-sans">
                  ⚠️ No keys found. Since you haven't backed up keys, previous E2EE chats can never be imported on this newly simulated device.
                </div>
              )
            )}
          </div>
        </div>

        {/* Sync Status Info */}
        <div className="flex flex-col gap-2 p-4 bg-[#1A1F2B]/60 rounded-xl border border-slate-800/80 text-[10px] text-slate-500 leading-relaxed font-mono">
          <div className="flex items-center gap-1.5 text-slate-400 font-sans font-bold uppercase mb-1">
            <ShieldCheck size={12} className="text-sky-400" />
            Security Parameters
          </div>
          <div className="truncate">User UUID: <span className="text-slate-400">{user.id}</span></div>
          <div>Node Sync: <span className="text-sky-400 font-bold uppercase">SSE Link (100% Secure)</span></div>
          <div>Encryption: <span className="text-emerald-400 font-bold uppercase">RSA-OAEP-2048 & AES-256</span></div>
        </div>

      </div>
    </div>
  );
}
