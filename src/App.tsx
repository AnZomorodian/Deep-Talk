import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Shield, Lock, Unlock, Phone, Video, Users, UserPlus, File, Paperclip, Trash2, Pin,
  Undo2, RefreshCw, Layers, Check, CheckCheck, Smile, BookOpen, Settings, LogOut, Info, AlertTriangle, Eye, Download, Flame, Clock, Share2, HelpCircle, Search, X, CornerUpLeft, Mic, MicOff, CornerUpRight, MapPin, CreditCard, Compass, Radio, DollarSign, QrCode, Scan, Star, Archive, ArchiveRestore, Copy, User, FileText, Code, Table, Ban, MessageSquare
} from 'lucide-react';

import { Device, UserProfile, Message, Chat, CallState, SyncEvent, Reaction } from './types';
import {
  generateE2EEKeyPair, exportPublicKey, exportPrivateKey, importPublicKey, importPrivateKey,
  encryptE2EE, decryptE2EE, restorePrivateKey
} from './crypto';

import CallWindow from './components/CallWindow';
import NotesTab from './components/NotesTab';
import ThreadTab from './components/ThreadTab';
import DeviceManager from './components/DeviceManager';
import VoiceAudioPlayer from './components/VoiceAudioPlayer';

export default function App() {
  // Auth & Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchMatchIndex, setChatSearchMatchIndex] = useState(0);
  const [allMyMessages, setAllMyMessages] = useState<Message[]>([]);

  // UI Panels
  const [activeRightTab, setActiveRightTab] = useState<'notes' | 'settings' | 'thread' | 'none'>('none');
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(true);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; name: string; type: 'image' | 'video' | 'binary' } | null>(null);
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerAvatar, setRegisterAvatar] = useState('');
  const [loginRestorePassword, setLoginRestorePassword] = useState('');
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // New Chat Controls
  const [newChatTarget, setNewChatTarget] = useState('');
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  
  // Message Inputs
  const [messageInput, setMessageInput] = useState('');
  const [selfDestructSecs, setSelfDestructSecs] = useState<number>(0); // 0 = no self-destruct
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; base64: string; size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  
  // Voice recording states & refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // active video call
  const [ongoingCall, setOngoingCall] = useState<CallState | null>(null);

  // Scheduled Messages States
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showScheduledListModal, setShowScheduledListModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Viewing Other User Profile
  const [viewingUserProfile, setViewingUserProfile] = useState<UserProfile | null>(null);
  const [blockingInProgress, setBlockingInProgress] = useState(false);

  // Pinned conversations state
  const [pinnedChatIds, setPinnedChatIds] = useState<{ [chatId: string]: boolean }>({});

  // Real-time voice typing user map
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: { [userId: string]: string } }>({});

  // Drag-and-drop file drag indicators
  const [isDragging, setIsDragging] = useState(false);

  // Hover states / Reactions active
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [decryptTrigger, setDecryptTrigger] = useState<number>(0);
  const [decryptedCache, setDecryptedCache] = useState<{ [msgId: string]: string }>({});

  // Location and Card Sharing
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // QR scanner states
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedScanPeer, setSelectedScanPeer] = useState<string>('');
  const [qrProgressState, setQrProgressState] = useState<'idle' | 'scanning' | 'matched'>('idle');
  
  // Card Creation inputs
  const [cardNoInput, setCardNoInput] = useState('');
  const [cardTypeInput, setCardTypeInput] = useState<'Visa' | 'Mastercard'>('Visa');
  const [cardBankInput, setCardBankInput] = useState('Switzerland Federal Vault');
  const [cardHolderInput, setCardHolderInput] = useState('');

  // Transfer Processing
  const [activeTransferCard, setActiveTransferCard] = useState<any | null>(null);
  const [transferAmount, setTransferAmount] = useState('250.00');
  const [transferStep, setTransferStep] = useState<number>(0); // 0: idle, 1: Tunneling, 2: Keys verification, 3: Success
  const [transferTargetMsgId, setTransferTargetMsgId] = useState<string | null>(null);

  // Message deleting state for inline bubble confirmation
  const [messageDeletingId, setMessageDeletingId] = useState<string | null>(null);

  // Star and Archive Feature States
  const [starredMessageIds, setStarredMessageIds] = useState<Record<string, boolean>>({});
  const [archivedChatIds, setArchivedChatIds] = useState<Record<string, boolean>>({});
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'starred' | 'archived'>('chats');

  // Interactive Card & Custom Location states
  const [cardTheme, setCardTheme] = useState<'obsidian' | 'blue' | 'platinum' | 'gold'>('obsidian');
  const [cardExpiry, setCardExpiry] = useState('12/31');
  const [cardCvv, setCardCvv] = useState('303');
  const [cardCopied, setCardCopied] = useState(false);
  
  const [manualLat, setManualLat] = useState('47.3686');
  const [manualLng, setManualLng] = useState('8.5391');
  const [manualAddr, setManualAddr] = useState('Zurich Bank Vault, Switzerland');
  const [locationActiveType, setLocationActiveType] = useState<'current' | 'custom'>('current');

  const [avatarStyle, setAvatarStyle] = useState<'identicon' | 'bottts' | 'pixel-art' | 'fun-emoji' | 'lorelei' | 'shapes'>('identicon');
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString(36).substring(7));

  const activeChatMatches = React.useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const query = chatSearchQuery.toLowerCase();
    return messages.filter(m => {
      if (m.recalled) return false;
      let textToSearch = m.content || '';
      if (m.isEncrypted) {
        const cached = decryptedCache[m.id];
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            textToSearch = parsed.text || '';
          } catch (e) {
            textToSearch = cached;
          }
        }
      }
      return textToSearch.toLowerCase().includes(query);
    }).map(m => m.id);
  }, [messages, chatSearchQuery, decryptedCache]);

  const getUserFingerprint = (publicKey: string) => {
    if (!publicKey) return 'E2E4:FA1D:902C:B754';
    let hash = 0;
    for (let i = 0; i < publicKey.length; i++) {
      hash = (hash << 5) - hash + publicKey.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padEnd(8, 'f') + Math.abs(hash ^ 0xabcdef).toString(16).padEnd(8, 'e');
    const upper = hex.substring(0, 16).toUpperCase();
    return `${upper.substring(0,4)}:${upper.substring(4,8)}:${upper.substring(8,12)}:${upper.substring(12,16)}`;
  };

  const highlightMatchedText = (text: string, query: string) => {
    if (!query || !query.trim()) return text;
    try {
      const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
      return (
        <>
          {parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? (
              <mark key={i} className="bg-amber-400 text-slate-950 font-bold px-0.5 rounded-sm animate-pulse shadow-sm">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch (e) {
      return text;
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sseSourceRef = useRef<EventSource | null>(null);

  // Roll a nice randomized identification avatar
  const rollNewAvatar = (customStyle?: any, customSeed?: string) => {
    const activeStyle = customStyle || avatarStyle;
    const activeSeed = customSeed || Math.random().toString(36).substring(7);
    if (!customSeed) {
      setAvatarSeed(activeSeed);
    }
    setRegisterAvatar(`https://api.dicebear.com/7.x/${activeStyle}/svg?seed=${activeSeed}`);
  };

  // Initialize unique device info on boot
  useEffect(() => {
    let devId = localStorage.getItem('secure_telegram_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('secure_telegram_device_id', devId!);
    }
    setDeviceId(devId);

    // Set nice device name based on user agent
    const matches = navigator.userAgent.match(/(iPhone|iPad|Android|Macintosh|Windows|Linux)/i);
    const hostName = matches ? matches[0] : 'Web Client';
    setDeviceName(`${hostName} Browser (${devId.substring(4, 8)})`);

    // Fetch all registered users
    fetchUsers();

    // Recover active user session between page reloads
    const activeUsername = localStorage.getItem('secure_telegram_active_username');
    if (activeUsername) {
      const hasLocalKey = localStorage.getItem(`secure_telegram_private_key:${activeUsername}`);
      if (hasLocalKey) {
        fetch('/api/users')
          .then(r => r.json())
          .then((users: UserProfile[]) => {
            const foundUser = users.find(u => u.username === activeUsername);
            if (foundUser) {
              loginUserSession(foundUser);
            }
          })
          .catch(err => console.error('Stale session restoration failed:', err));
      }
    }

    // Set randomized avatar
    rollNewAvatar();

    // Check query params to simulate multiple devices (helps the user open multiple tabs)
    const urlParams = new URLSearchParams(window.location.search);
    const simLogin = urlParams.get('simLogin');
    if (simLogin) {
      setLoginUsername(simLogin);
      setRegisterUsername(simLogin);
    }
  }, []);

  // Load starred and archived elements on currentUser change
  useEffect(() => {
    if (currentUser) {
      const storedStars = localStorage.getItem(`starred_messages_${currentUser.id}`);
      if (storedStars) {
        try {
          setStarredMessageIds(JSON.parse(storedStars));
        } catch (e) {
          console.error("Failed to parse starred messages", e);
        }
      } else {
        setStarredMessageIds({});
      }

      const storedArchives = localStorage.getItem(`archived_chats_${currentUser.id}`);
      if (storedArchives) {
        try {
          setArchivedChatIds(JSON.parse(storedArchives));
        } catch (e) {
          console.error("Failed to parse archived chats", e);
        }
      } else {
        setArchivedChatIds({});
      }
    } else {
      setStarredMessageIds({});
      setArchivedChatIds({});
    }
  }, [currentUser]);

  // Persists star state configuration
  const handleToggleStarMessage = (messageId: string) => {
    if (!currentUser) return;
    setStarredMessageIds(prev => {
      const updated = { ...prev, [messageId]: !prev[messageId] };
      if (!updated[messageId]) {
        delete updated[messageId];
      }
      localStorage.setItem(`starred_messages_${currentUser.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Persists archived state configuration
  const handleToggleArchiveChat = (chatId: string) => {
    if (!currentUser) return;
    setArchivedChatIds(prev => {
      const updated = { ...prev, [chatId]: !prev[chatId] };
      if (!updated[chatId]) {
        delete updated[chatId];
      }
      localStorage.setItem(`archived_chats_${currentUser.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Connect Server-Sent Events (SSE) for Real-Time synchronization
  useEffect(() => {
    if (!currentUser) return;

    // Close any prior stream
    if (sseSourceRef.current) sseSourceRef.current.close();

    const syncStream = new EventSource('/api/sync');
    sseSourceRef.current = syncStream;

    syncStream.onopen = () => {
      console.log('Real-Time sync link connected successfully.');
    };

    syncStream.onerror = () => {
      console.warn('Sync connection dropped. Retrying...');
    };

    // Keep active session alive on server
    const keepAliveInterval = setInterval(() => {
      fetch(`/api/users/${currentUser.id}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, deviceName })
      }).catch(err => console.error('Device keepalive failed:', err));
    }, 15000);

    // Handle real-time push events from Server
    syncStream.onmessage = async (event) => {
      try {
        const syncEvent: SyncEvent = JSON.parse(event.data);
        const { type, payload } = syncEvent;

        switch (type) {
          case 'message': {
            const newMsg = payload as Message;
            // Only push if it is relevant to the active user profile
            const db = await fetch(`/api/users/${currentUser.id}/chats`).then(r => r.json());
            setChats(db);

            setAllMyMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (newMsg.chatId === activeChatId) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              // Auto mark as viewed
              if (newMsg.senderId !== currentUser.id) {
                markMessageAsViewed(newMsg.id);
              }
            }
            break;
          }

          case 'message_viewed': {
            const { messageId, userId, selfDestructAt } = payload;
            setMessages(prev => prev.map(m => {
              if (m.id === messageId) {
                const updatedViewers = m.viewedBy.includes(userId) ? m.viewedBy : [...m.viewedBy, userId];
                return { ...m, viewedBy: updatedViewers, selfDestructAt };
              }
              return m;
            }));
            setAllMyMessages(prev => prev.map(m => {
              if (m.id === messageId) {
                const updatedViewers = m.viewedBy.includes(userId) ? m.viewedBy : [...m.viewedBy, userId];
                return { ...m, viewedBy: updatedViewers, selfDestructAt };
              }
              return m;
            }));
            break;
          }

          case 'message_viewed_suppressed': {
            const { messageId, selfDestructAt } = payload;
            const handler = (m: Message) => {
              if (m.id === messageId) {
                return { ...m, selfDestructAt };
              }
              return m;
            };
            setMessages(prev => prev.map(handler));
            setAllMyMessages(prev => prev.map(handler));
            break;
          }

          case 'message_recalled': {
            const { messageId } = payload;
            const updatedRecall = (m: Message) => {
              if (m.id === messageId) {
                return {
                  ...m,
                  recalled: true,
                  content: '[This message was recalled]',
                  fileUrl: undefined,
                  fileName: undefined
                };
              }
              return m;
            };
            setMessages(prev => prev.map(updatedRecall));
            setAllMyMessages(prev => prev.map(updatedRecall));
            break;
          }

          case 'message_deleted': {
            const { messageId } = payload;
            setMessages(prev => prev.filter(m => m.id !== messageId));
            setAllMyMessages(prev => prev.filter(m => m.id !== messageId));
            break;
          }

          case 'reaction': {
            const { messageId, reactions } = payload;
            const updatedReaction = (m: Message) => {
              if (m.id === messageId) {
                return { ...m, reactions };
              }
              return m;
            };
            setMessages(prev => prev.map(updatedReaction));
            setAllMyMessages(prev => prev.map(updatedReaction));
            break;
          }

          case 'note_update': {
            const { chatId, sharedNotes, lastModified, modifiedBy } = payload;
            setChats(prev => prev.map(c => {
              if (c.id === chatId) {
                return { ...c, sharedNotes, sharedNotesLastModified: lastModified, sharedNotesModifiedBy: modifiedBy };
              }
              return c;
            }));
            break;
          }

          case 'call_event': {
            const call = payload as CallState;
            // Trigger call displays if it belongs to me or I dialed it
            if (call.callerId === currentUser.id || call.receiverId === currentUser.id) {
              if (call.status === 'rejected' || call.status === 'ended') {
                setOngoingCall(null);
              } else if (call.receiverId === currentUser.id && (call.status === 'incoming' || call.status === 'outgoing')) {
                // If it is outgoing from caller's perspective, it is incoming from receiver's perspective!
                setOngoingCall({ ...call, status: 'incoming' });
              } else if (call.status === 'connected') {
                setOngoingCall(call);
              }
            }
            break;
          }

          case 'chat_updated': {
            const updatedChat = payload as Chat;
            setChats(prev => prev.map(c => c.id === updatedChat.id ? { ...c, ...updatedChat } : c));
            break;
          }

          case 'chat_deleted': {
            const { chatId } = payload;
            setChats(prev => prev.filter(c => c.id !== chatId));
            setMessages(prev => prev.filter(m => m.chatId !== chatId));
            setAllMyMessages(prev => prev.filter(m => m.chatId !== chatId));
            if (activeChatId === chatId) {
              setActiveChatId(null);
            }
            setPinnedChatIds(prev => {
              const copy = { ...prev };
              delete copy[chatId];
              return copy;
            });
            break;
          }

          case 'typing_event': {
            const { chatId, userId, displayName, username, isTyping } = payload;
            if (userId === currentUser?.id) break;

            setTypingUsers(prev => {
              const chatTyping = { ...(prev[chatId] || {}) };
              if (isTyping) {
                chatTyping[userId] = displayName || username;
              } else {
                delete chatTyping[userId];
              }
              return { ...prev, [chatId]: chatTyping };
            });
            break;
          }

          case 'user_registered': {
            const newUser = payload as UserProfile;
            setAllUsers(prev => {
              if (prev.some(u => u.id === newUser.id)) return prev;
              return [...prev, newUser];
            });
            break;
          }

          case 'user_deleted': {
            const { userId } = payload;
            if (currentUser && currentUser.id === userId) {
              alert('Your profile has been deleted by an administrator.');
              localStorage.removeItem('secure_telegram_active_username');
              setCurrentUser(null);
              setShowRegisterModal(true);
              window.location.href = window.location.origin;
            } else {
              setAllUsers(prev => prev.filter(u => u.id !== userId));
              setChats(prev => prev.filter(c => !c.participants.includes(userId) || c.type === 'group'));
            }
            break;
          }

          case 'user_settings_updated': {
            const { userId, disableReadReceipts, displayName, avatarUrl } = payload;
            setAllUsers(prev => prev.map(u => {
              if (u.id === userId) {
                return { 
                  ...u, 
                  disableReadReceipts: disableReadReceipts !== undefined ? disableReadReceipts : u.disableReadReceipts,
                  displayName: displayName !== undefined ? displayName : u.displayName,
                  avatarUrl: avatarUrl !== undefined ? avatarUrl : u.avatarUrl
                };
              }
              return u;
            }));
            if (currentUser && currentUser.id === userId) {
              setCurrentUser(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  disableReadReceipts: disableReadReceipts !== undefined ? disableReadReceipts : prev.disableReadReceipts,
                  displayName: displayName !== undefined ? displayName : prev.displayName,
                  avatarUrl: avatarUrl !== undefined ? avatarUrl : prev.avatarUrl
                };
              });
            }
            break;
          }

          case 'scheduled_updated': {
            const { chatId } = payload;
            if (activeChatId && chatId === activeChatId) {
              fetchScheduledMessages(chatId);
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error handling SSE payload:', err);
      }
    };

    return () => {
      syncStream.close();
      clearInterval(keepAliveInterval);
    };
  }, [currentUser, activeChatId]);

  // Load chat messages when activeChatId changes
  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
      fetchScheduledMessages(activeChatId);
    } else {
      setMessages([]);
      setScheduledMessages([]);
    }
  }, [activeChatId]);

  // Load draft from localstorage when switching chats or active user changes
  useEffect(() => {
    setReplyToId(null);
    if (currentUser) {
      if (activeChatId) {
        const savedDraft = localStorage.getItem(`secure_telegram_draft_${currentUser.id}_${activeChatId}`) || '';
        setMessageInput(savedDraft);
      } else {
        setMessageInput('');
      }
    } else {
      setMessageInput('');
    }
  }, [activeChatId, currentUser]);

  // Synchronize pin status from chats to pinnedChatIds
  useEffect(() => {
    const pins: { [chatId: string]: boolean } = {};
    chats.forEach(c => {
      if (c.pinned) {
        pins[c.id] = true;
      }
    });
    setPinnedChatIds(prev => ({ ...pins, ...prev }));
  }, [chats]);

  // Load users list when Admin section is visualized
  useEffect(() => {
    if (showAdminModal) {
      fetchUsers();
    }
  }, [showAdminModal]);

  // Decryption trigger hook
  useEffect(() => {
    const decryptAll = async () => {
      if (!currentUser) return;
      const cachedPrivateKey = localStorage.getItem(`secure_telegram_private_key:${currentUser.username}`);
      if (!cachedPrivateKey) return;

      const updatedCache = { ...decryptedCache };
      let changed = false;

      // Decrypt target messages in current active thread and other user chats for keyword search integrity
      const messagesToDecrypt = [...messages, ...allMyMessages];
      for (const msg of messagesToDecrypt) {
        if (msg.isEncrypted && !updatedCache[msg.id] && !msg.recalled) {
          try {
            const plain = await decryptE2EE(msg.content, cachedPrivateKey);
            updatedCache[msg.id] = plain;
            changed = true;
          } catch (e) {
            updatedCache[msg.id] = '[Decryption error: keys missing]';
            changed = true;
          }
        }
      }

      if (changed) {
        setDecryptedCache(updatedCache);
      }
    };

    decryptAll();
  }, [messages, allMyMessages, currentUser, decryptTrigger]);

  // Self-Destruct Timers: ticking countdown locally
  useEffect(() => {
    const timer = setInterval(() => {
      let changed = false;
      messages.forEach(async (msg) => {
        if (msg.selfDestructAt && !msg.recalled) {
          const timeLeft = Math.max(0, Math.ceil((msg.selfDestructAt - Date.now()) / 1000));
          if (timeLeft === 0) {
            // trigger deletion
            changed = true;
            fetch(`/api/messages/${msg.id}/destruct`, { method: 'POST' }).catch(err => console.error(err));
          }
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [messages]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // API Callbacks
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const list = await res.json();
      setAllUsers(list);
    } catch (e) {
      console.error('Failed to load registered users:', e);
    }
  };

  const fetchChats = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/chats`);
      const list = await res.json();
      setChats(list);
      // Simultaneously fetch all user's messages to populate search keywords
      fetchAllMyMessages(userId);
    } catch (e) {
      console.error('Failed to load user conversations:', e);
    }
  };

  const fetchAllMyMessages = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/messages`);
      const list = await res.json();
      setAllMyMessages(list);
    } catch (e) {
      console.error('Failed to load user messages across channels:', e);
    }
  };

  const fetchScheduledMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/scheduled`);
      const data = await res.json();
      setScheduledMessages(data);
    } catch (err) {
      console.error('Failed to load scheduled messages:', err);
    }
  };

  const handleCancelScheduledMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/scheduled/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        setScheduledMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (err) {
      console.error('Failed to cancel scheduled message:', err);
    }
  };

  const handleConfirmScheduleMessage = async () => {
    if (!currentUser || !activeChatId) return;
    if (!messageInput.trim() && !selectedFile) {
      alert('Cannot schedule an empty message.');
      return;
    }
    if (!scheduledTime) {
      alert('Please select a valid date & time.');
      return;
    }

    const epochTime = new Date(scheduledTime).getTime();
    if (epochTime <= Date.now()) {
      alert('Please schedule a future date & time.');
      return;
    }

    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    setIsScheduling(true);
    try {
      let finalContent = messageInput;
      let isEncryptedPayload = false;
      let finalFileUrl: string | undefined = undefined;

      // Handle file sharing upload first
      if (selectedFile) {
        const fileRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileDataB64: selectedFile.base64
          })
        });
        const fileJson = await fileRes.json();
        finalFileUrl = fileJson.fileUrl;
      }

      // Check if chat is private / direct (means E2EE is enabled!)
      if (chat.type === 'direct') {
        const recipientId = chat.participants.find(p => p !== currentUser.id);
        const recipientObject = allUsers.find(u => u.id === recipientId);

        if (recipientObject) {
          isEncryptedPayload = true;
          // Encrypt plain message client-side under recipient's public key (double-wrapping under recipient & sender)
          const textToEncrypt = JSON.stringify({
            text: messageInput || '[Attachment Shared]',
            fileUrl: finalFileUrl,
            fileName: selectedFile?.name,
            fileSize: selectedFile?.size
          });

          finalContent = await encryptE2EE(textToEncrypt, recipientObject.publicKey, currentUser.publicKey);
        }
      } else if (chat.type === 'saved') {
        isEncryptedPayload = true;
        // Encrypt plain message client-side under user's own public key
        const textToEncrypt = JSON.stringify({
          text: messageInput || '[Attachment Shared]',
          fileUrl: finalFileUrl,
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size
        });

        finalContent = await encryptE2EE(textToEncrypt, currentUser.publicKey, currentUser.publicKey);
      }

      // Post scheduled payload
      const scheduledPayload = {
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: finalContent,
        isEncrypted: isEncryptedPayload,
        type: selectedFile ? 'file' : 'text',
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        fileMimeType: selectedFile?.type,
        fileUrl: finalFileUrl,
        selfDestructDuration: selfDestructSecs,
        replyToId: replyToId || undefined,
        scheduledAt: epochTime
      };

      await fetch(`/api/chats/${activeChatId}/scheduled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduledPayload)
      });

      // Clear states
      setMessageInput('');
      setSelectedFile(null);
      setSelfDestructSecs(0);
      setReplyToId(null);
      setShowScheduleModal(false);
      
      if (currentUser && activeChatId) {
        localStorage.removeItem(`secure_telegram_draft_${currentUser.id}_${activeChatId}`);
      }

      fetchScheduledMessages(activeChatId);
    } catch (err) {
      console.error('Failed to schedule message:', err);
    } finally {
      setIsScheduling(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      const list = await res.json();
      setMessages(list);

      // Instantly tag unrecognized messages as viewed
      if (currentUser) {
        list.forEach((m: Message) => {
          if (m.senderId !== currentUser.id && !m.viewedBy.includes(currentUser.id)) {
            markMessageAsViewed(m.id);
          }
        });
      }
    } catch (e) {
      console.error('Failed to load thread messages:', e);
    }
  };

  // Safe helper to extract error message or content from fetch response
  const getSafeErrorMessage = async (res: Response, fallback: string): Promise<string> => {
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await res.json();
        return json.error || fallback;
      } else {
        const text = await res.text();
        if (text.includes('<!doctype') || text.includes('<html')) {
          return `${fallback} (Status: ${res.status})`;
        }
        return text || fallback;
      }
    } catch (e) {
      return `${fallback} (Status: ${res.status})`;
    }
  };

  // Register & Authentication Business Logic
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!loginUsername) return;

    const normalUser = loginUsername.trim().toLowerCase().replace(/^@/, '');

    try {
      const checkRes = await fetch('/api/users');
      const currentUsers: UserProfile[] = await checkRes.json();
      let existingUser = currentUsers.find(u => u.username === normalUser);

      // Special auto-provisioning for Admin / Admin123
      if (normalUser === 'admin' && loginPassword === 'Admin123') {
        if (!existingUser) {
          const keyPair = await generateE2EEKeyPair();
          const pubB64 = await exportPublicKey(keyPair.publicKey);
          const privB64 = await exportPrivateKey(keyPair.privateKey);

          localStorage.setItem(`secure_telegram_private_key:${normalUser}`, privB64);
          localStorage.setItem(`secure_telegram_public_key:${normalUser}`, pubB64);

          const regRes = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: normalUser,
              displayName: 'Systems Administrator',
              publicKey: pubB64,
              password: 'Admin123',
              avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${normalUser}`
            })
          });

          if (regRes.ok) {
            existingUser = await regRes.json();
          } else {
            const errMsg = await getSafeErrorMessage(regRes, 'Server admin registration failed');
            setAuthError(errMsg);
            return;
          }
        } else {
          // If admin exists on the server but local storage is missing the keys, auto-generate them
          const localKey = localStorage.getItem(`secure_telegram_private_key:${normalUser}`);
          if (!localKey) {
            const keyPair = await generateE2EEKeyPair();
            const pubB64 = await exportPublicKey(keyPair.publicKey);
            const privB64 = await exportPrivateKey(keyPair.privateKey);

            localStorage.setItem(`secure_telegram_private_key:${normalUser}`, privB64);
            localStorage.setItem(`secure_telegram_public_key:${normalUser}`, pubB64);

            await fetch('/api/users/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: normalUser,
                displayName: 'Systems Administrator',
                publicKey: pubB64,
                password: 'Admin123',
                avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${normalUser}`
              })
            });

            const refetchRes = await fetch('/api/users');
            const updatedUsers: UserProfile[] = await refetchRes.json();
            existingUser = updatedUsers.find(u => u.username === normalUser);
          }
        }
      }

      if (!existingUser) {
        setAuthError(`Alias @${normalUser} is not registered yet. Switch to the Register tab to generate a new key pair!`);
        return;
      }

      // Check user password if set
      if (existingUser.password && existingUser.password !== loginPassword) {
        setAuthError('Incorrect secret password. Please verify the credentials and try again.');
        return;
      }

      // Check if we have the private key cached locally in this browser
      const localKey = localStorage.getItem(`secure_telegram_private_key:${normalUser}`);
      if (localKey) {
        await loginUserSession(existingUser);
      } else if (existingUser.encryptedPrivateKey) {
        setRegisterUsername(normalUser);
        setShowRestorePrompt(true);
      } else {
        setAuthError(`Cryptographic keyring is missing local storage signatures in this browser, and no server-side backup exists for @${normalUser}. Please register as another username or restore from a file.`);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Login system failed: ' + err.message);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!registerUsername) return;

    const normalUser = registerUsername.trim().toLowerCase().replace(/^@/, '');
    
    // 1. Check if user already exists on the server first
    try {
      const checkRes = await fetch('/api/users');
      const currentUsers: UserProfile[] = await checkRes.json();
      const existingUser = currentUsers.find(u => u.username === normalUser);

      if (existingUser) {
        setAuthError(`Alias @${normalUser} is already taken on the server. If this is your account, please log in on the Log In tab.`);
        return;
      }

      // 2. Register brand new key pair (RSA-OAEP) for E2E Encrypted Chats
      const keyPair = await generateE2EEKeyPair();
      const pubB64 = await exportPublicKey(keyPair.publicKey);
      const privB64 = await exportPrivateKey(keyPair.privateKey);

      // Save private key in local browser localStorage securely
      localStorage.setItem(`secure_telegram_private_key:${normalUser}`, privB64);
      localStorage.setItem(`secure_telegram_public_key:${normalUser}`, pubB64);

      // Post registration JSON
      const regRes = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normalUser,
          displayName: registerDisplayName || normalUser,
          publicKey: pubB64,
          password: registerPassword || undefined,
          avatarUrl: registerAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${normalUser}`
        })
      });

      if (!regRes.ok) {
        const errMsg = await getSafeErrorMessage(regRes, 'Server registration failed');
        setAuthError(errMsg);
        return;
      }

      const createdUser = await regRes.json();
      await loginUserSession(createdUser);

    } catch (err: any) {
      console.error(err);
      setAuthError('Authentication Error: ' + err.message);
    }
  };

  // Login after verifying existence
  const loginUserSession = async (profile: UserProfile) => {
    localStorage.setItem('secure_telegram_active_username', profile.username);
    setCurrentUser(profile);
    setShowRegisterModal(false);
    
    // Post device information registration
    await fetch(`/api/users/${profile.id}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, deviceName })
    });

    // Load initial users & chats
    fetchUsers();
    fetchChats(profile.id);
  };

  // Restore Backed Up Keyring via Password
  const handleRestoreDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreInProgress(true);
    setAuthError(null);

    const normalUser = registerUsername.trim().toLowerCase().replace(/^@/, '');

    try {
      const checkRes = await fetch('/api/users');
      const currentUsers: UserProfile[] = await checkRes.json();
      const targetUser = currentUsers.find(u => u.username === normalUser);

      if (!targetUser || !targetUser.encryptedPrivateKey || !targetUser.privateKeySalt) {
        setAuthError('Error: No cloud keyring was stored for this account.');
        setRestoreInProgress(false);
        return;
      }

      // Decrypt private key using PBKDF2 derivative
      const decPrivKey = await restorePrivateKey(
        targetUser.encryptedPrivateKey,
        loginRestorePassword,
        targetUser.privateKeySalt
      );

      // Store successfully decrypted private key locally
      localStorage.setItem(`secure_telegram_private_key:${normalUser}`, decPrivKey);
      localStorage.setItem(`secure_telegram_public_key:${normalUser}`, targetUser.publicKey);

      // Successfully logged in!
      setShowRestorePrompt(false);
      setLoginRestorePassword('');
      loginUserSession(targetUser);

    } catch (err) {
      setAuthError('Incorrect recovery password! Decryption failed.');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const handleOpenSavedMessages = async () => {
    if (!currentUser) return;
    const existing = chats.find(c => c.type === 'saved' && c.participants.includes(currentUser.id));
    if (existing) {
      setActiveChatId(existing.id);
      return;
    }

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'saved',
          name: 'Saved Messages',
          participants: [currentUser.id]
        })
      });
      if (res.ok) {
        const newChat = await res.json();
        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
      }
    } catch (e) {
      console.error('Failed to provision Saved Messages channel:', e);
    }
  };

  const handleForwardMessage = async (targetChatId: string) => {
    if (!currentUser || !forwardMessage) return;
    const targetChat = chats.find(c => c.id === targetChatId);
    if (!targetChat) return;

    try {
      // Get plaintext of the original message
      let plainText = forwardMessage.content;
      if (forwardMessage.isEncrypted) {
        const cachedText = decryptedCache[forwardMessage.id];
        if (cachedText) {
          try {
            const parsed = JSON.parse(cachedText);
            plainText = parsed.text || '';
          } catch (e) {
            plainText = cachedText;
          }
        } else {
          plainText = '';
        }
      }

      let finalContent = plainText;
      let isEncrypted = false;

      // Encrypt if target chat is direct or saved E2EE
      if (targetChat.type === 'direct') {
        const recipientId = targetChat.participants.find(p => p !== currentUser.id);
        const recipientObject = allUsers.find(u => u.id === recipientId);
        if (recipientObject) {
          isEncrypted = true;
          const jsonToEncrypt = JSON.stringify({
            text: plainText,
            fileUrl: forwardMessage.fileUrl,
            fileName: forwardMessage.fileName,
            fileSize: forwardMessage.fileSize
          });
          finalContent = await encryptE2EE(jsonToEncrypt, recipientObject.publicKey, currentUser.publicKey);
        }
      } else if (targetChat.type === 'saved') {
        isEncrypted = true;
        const jsonToEncrypt = JSON.stringify({
          text: plainText,
          fileUrl: forwardMessage.fileUrl,
          fileName: forwardMessage.fileName,
          fileSize: forwardMessage.fileSize
        });
        finalContent = await encryptE2EE(jsonToEncrypt, currentUser.publicKey, currentUser.publicKey);
      }

      // Send payload to target chat
      const payload = {
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: finalContent,
        isEncrypted,
        type: forwardMessage.type,
        fileName: forwardMessage.fileName,
        fileSize: forwardMessage.fileSize,
        fileMimeType: forwardMessage.fileMimeType,
        fileUrl: forwardMessage.fileUrl,
        isForwarded: true,
        forwardedFromName: forwardMessage.senderName
      };

      const res = await fetch(`/api/chats/${targetChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setForwardMessage(null);
        setForwardSearchQuery('');
        // Focus on active chat
        setActiveChatId(targetChatId);
      }
    } catch (err) {
      console.error('Failed to forward message:', err);
      alert('Failed to forward message due to security encryption error.');
    }
  };

  const handleSendLocation = async (lat: number, lng: number, address: string) => {
    if (!currentUser || !activeChatId) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    try {
      const locationData = { lat, lng, address };
      let finalContent = JSON.stringify(locationData);
      let isEncrypted = false;

      if (chat.type === 'direct') {
        const recipientId = chat.participants.find(p => p !== currentUser.id);
        const recipientObject = allUsers.find(u => u.id === recipientId);
        if (recipientObject) {
          isEncrypted = true;
          const jsonToEncrypt = JSON.stringify({
            text: `📍 Shared Location: ${address}`,
            location: locationData
          });
          finalContent = await encryptE2EE(jsonToEncrypt, recipientObject.publicKey, currentUser.publicKey);
        }
      } else if (chat.type === 'saved') {
        isEncrypted = true;
        const jsonToEncrypt = JSON.stringify({
          text: `📍 Shared Location (Saved): ${address}`,
          location: locationData
        });
        finalContent = await encryptE2EE(jsonToEncrypt, currentUser.publicKey, currentUser.publicKey);
      }

      const msgPayload = {
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: finalContent,
        isEncrypted,
        type: 'location' as const,
        selfDestructDuration: 0,
      };

      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });
      setShowLocationModal(false);
    } catch (err) {
      console.error('Error sending location:', err);
    }
  };

  const handleSendCard = async () => {
    if (!currentUser || !activeChatId || !cardNoInput) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    const cleanCardNo = cardNoInput.replace(/\s+/g, '');
    if (cleanCardNo.length < 12) {
      alert('Card Number must be at least 12 digits.');
      return;
    }

    try {
      const cardData = {
        cardNumber: cleanCardNo,
        cardType: cardTypeInput,
        bankName: cardBankInput || 'Federal Crypt-Ledger',
        holderName: cardHolderInput || currentUser.displayName,
        theme: cardTheme,
        expiry: cardExpiry,
        cvv: cardCvv
      };

      let finalContent = JSON.stringify(cardData);
      let isEncrypted = false;

      if (chat.type === 'direct') {
        const recipientId = chat.participants.find(p => p !== currentUser.id);
        const recipientObject = allUsers.find(u => u.id === recipientId);
        if (recipientObject) {
          isEncrypted = true;
          const jsonToEncrypt = JSON.stringify({
            text: `💳 Secure ATM/Net Transfer Card: ${cardData.bankName}`,
            card: cardData
          });
          finalContent = await encryptE2EE(jsonToEncrypt, recipientObject.publicKey, currentUser.publicKey);
        }
      } else if (chat.type === 'saved') {
        isEncrypted = true;
        const jsonToEncrypt = JSON.stringify({
          text: `💳 Personal Secure Vault Card: ${cardData.bankName}`,
          card: cardData
        });
        finalContent = await encryptE2EE(jsonToEncrypt, currentUser.publicKey, currentUser.publicKey);
      }

      const msgPayload = {
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: finalContent,
        isEncrypted,
        type: 'card' as const,
        selfDestructDuration: 0,
      };

      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });

      setCardNoInput('');
      setCardHolderInput('');
      setShowCardModal(false);
    } catch (err) {
      console.error('Error sending credit card:', err);
    }
  };

  const handleProcessTransfer = async () => {
    if (!currentUser || !activeChatId || !activeTransferCard) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    setTransferStep(1); // Connection Tunneling simulation
    
    setTimeout(() => {
      setTransferStep(2); // Cryptographic Check validation
      
      setTimeout(() => {
        setTransferStep(3); // Transfer simulation settlement

        setTimeout(async () => {
          try {
            const transferPayload = {
              amount: transferAmount,
              currency: 'USD',
              cardLast4: activeTransferCard.cardNumber.slice(-4),
              bankName: activeTransferCard.bankName,
              cardType: activeTransferCard.cardType,
              holderName: activeTransferCard.holderName,
              transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
              status: 'SETTLED'
            };

            let finalContent = JSON.stringify(transferPayload);
            let isEncrypted = false;

            if (chat.type === 'direct') {
              const recipientId = chat.participants.find(p => p !== currentUser.id);
              const recipientObject = allUsers.find(u => u.id === recipientId);
              if (recipientObject) {
                isEncrypted = true;
                const jsonToEncrypt = JSON.stringify({
                  text: `💸 Secured E2EE Wire Receipt: Sent $${transferAmount} via Swiss Ledger Core`,
                  transfer: transferPayload
                });
                finalContent = await encryptE2EE(jsonToEncrypt, recipientObject.publicKey, currentUser.publicKey);
              }
            } else if (chat.type === 'saved') {
              isEncrypted = true;
              const jsonToEncrypt = JSON.stringify({
                text: `💸 Personal Ledger Transfer: Deposited $${transferAmount}`,
                transfer: transferPayload
              });
              finalContent = await encryptE2EE(jsonToEncrypt, currentUser.publicKey, currentUser.publicKey);
            }

            const msgPayload = {
              senderId: currentUser.id,
              senderName: currentUser.displayName,
              content: finalContent,
              isEncrypted,
              type: 'transfer' as const,
              selfDestructDuration: 0,
            };

            await fetch(`/api/chats/${activeChatId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(msgPayload)
            });

          } catch (e) {
            console.error('Transfer receipt payload creation failed:', e);
          } finally {
            setActiveTransferCard(null);
            setTransferStep(0);
          }
        }, 1250);
      }, 1450);
    }, 1300);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/destruct`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setAllMyMessages(prev => prev.filter(m => m.id !== messageId));
        setMessageDeletingId(null);
      } else {
        alert('Could not fully erase message record.');
      }
    } catch (err) {
      console.error('Failed to hard delete message:', err);
    }
  };

  const startDirectSecureChatWithUser = async (targetUser: any) => {
    if (!currentUser || !targetUser) return;
    if (targetUser.id === currentUser.id) {
      alert("You cannot start an encrypted chat with your own profile. (Simulate by opening a second session!)");
      return;
    }
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          participants: [currentUser.id, targetUser.id]
        })
      });

      const newChat = await res.json();
      setChats(prev => {
        if (prev.some(c => c.id === newChat.id)) return prev;
        return [newChat, ...prev];
      });
      setActiveChatId(newChat.id);
      setNewChatTarget('');
    } catch (e) {
      console.error(e);
    }
  };

  // Create Conversation Dialog (Private encrypted chat or Group)
  const handleStartPrivateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newChatTarget) return;

    const targetClean = newChatTarget.trim().toLowerCase().replace(/^@/, '');
    const targetUser = allUsers.find(u => u.username === targetClean);

    if (!targetUser) {
      alert('User details could not be found. Check if they have registered first!');
      return;
    }

    await startDirectSecureChatWithUser(targetUser);
  };

  const handleStartGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !groupName || groupParticipants.length === 0) return;

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: groupName,
          participants: [currentUser.id, ...groupParticipants]
        })
      });

      const newChat = await res.json();
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      
      // Clean up variables
      setGroupName('');
      setGroupParticipants([]);
      setShowGroupCreator(false);
    } catch (e) {
      console.error(e);
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      let mediaRecorder;
      const options = { mimeType: 'audio/webm' };
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const fileReader = new FileReader();
        fileReader.onloadend = () => {
          setSelectedFile({
            name: `voice-message-${Date.now()}.webm`,
            type: audioBlob.type || 'audio/webm',
            base64: fileReader.result as string,
            size: audioBlob.size
          });
        };
        fileReader.readAsDataURL(audioBlob);

        // Stop all track streams so microphone icon goes away
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting voice recording:', err);
      alert('Could not start recording context. Please enable microphone permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      audioChunksRef.current = [];
    }
  };

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  // File picker handler: converts to clean Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAttachmentWarning(null);

    if (file.size > MAX_FILE_SIZE) {
      setAttachmentWarning(`Attachment complies with security limits up to 10MB. File is too large: ${formatBytes(file.size)}.`);
      e.target.value = ''; // Reset file input
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        base64: reader.result as string,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setAttachmentWarning(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      if (file.size > MAX_FILE_SIZE) {
        setAttachmentWarning(`Attachment complies with security limits up to 10MB. File is too large: ${formatBytes(file.size)}.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          name: file.name,
          type: file.type,
          base64: reader.result as string,
          size: file.size
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Typing state tracking refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const amTypingRef = useRef<boolean>(false);

  // Broadcast typing status to active chat members
  const broadcastTyping = async (isTyping: boolean) => {
    if (!currentUser || !activeChatId) return;
    try {
      await fetch(`/api/chats/${activeChatId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          displayName: currentUser.displayName,
          isTyping
        })
      });
    } catch (e) {
      // ignore
    }
  };

  const handleMessageInputChange = (val: string) => {
    setMessageInput(val);
    if (!currentUser || !activeChatId) return;

    if (val) {
      localStorage.setItem(`secure_telegram_draft_${currentUser.id}_${activeChatId}`, val);
    } else {
      localStorage.removeItem(`secure_telegram_draft_${currentUser.id}_${activeChatId}`);
    }

    if (!amTypingRef.current) {
      amTypingRef.current = true;
      broadcastTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      amTypingRef.current = false;
      broadcastTyping(false);
    }, 2500);
  };

  const handleTogglePin = async (chatId: string, pinValue: boolean) => {
    // 1. Update optimistic UI state map & chats list representation
    setPinnedChatIds(prev => ({ ...prev, [chatId]: pinValue }));
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return { ...c, pinned: pinValue };
      }
      return c;
    }));

    // 2. Persist pin state in standard database via server REST API
    try {
      await fetch(`/api/chats/${chatId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: pinValue })
      });
    } catch (e) {
      console.error('Failed to swap pin state on the server:', e);
    }
  };

  const handleTogglePinMessage = async (chatId: string, messageId: string | null) => {
    // Optimistic local state update
    setChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return { ...c, pinnedMessageId: messageId };
      }
      return c;
    }));

    try {
      const res = await fetch(`/api/chats/${chatId}/pin-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId })
      });
      if (!res.ok) {
        throw new Error('Pin message failed');
      }
    } catch (e) {
      console.error('Failed to change message pin on server:', e);
    }
  };

  const handleDeleteUser = async (userToDeleteId: string) => {
    if (confirm("Are you absolutely sure you want to completely delete this user? Their profile, registered devices, and direct sessions will be deleted immediately.")) {
      try {
        const res = await fetch(`/api/users/${userToDeleteId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
          setAllUsers(prev => prev.filter(u => u.id !== userToDeleteId));
        } else {
          alert("Error: " + (data.error || "failed deleting user"));
        }
      } catch (err: any) {
        console.error('Failed deleting user:', err);
      }
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this chat conversation and clear all its encrypted history? All shared files and logs will be permanently erased.')) {
      return;
    }

    // 1. Clear local state representation
    setChats(prev => prev.filter(c => c.id !== chatId));
    setMessages(prev => prev.filter(m => m.chatId !== chatId));
    setAllMyMessages(prev => prev.filter(m => m.chatId !== chatId));
    
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }

    setPinnedChatIds(prev => {
      const copy = { ...prev };
      delete copy[chatId];
      return copy;
    });

    // 2. Commit deletion call on backend
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to complete background chat purge calls:', e);
    }
  };

  // Send Message Logic (Encrypts Client-side E2EE or sends plaintext)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChatId) return;
    if (!messageInput.trim() && !selectedFile) return;

    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    try {
      let finalContent = messageInput;
      let isEncryptedPayload = false;
      let finalFileUrl: string | undefined = undefined;

      // Handle file sharing upload first
      if (selectedFile) {
        setIsUploading(true);
        // Upload base64
        const fileRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileDataB64: selectedFile.base64
          })
        });
        const fileJson = await fileRes.json();
        finalFileUrl = fileJson.fileUrl;
        setIsUploading(false);
      }

      // Check if chat is private / direct (means E2EE is enabled!)
      if (chat.type === 'direct') {
        const recipientId = chat.participants.find(p => p !== currentUser.id);
        const recipientObject = allUsers.find(u => u.id === recipientId);

        if (recipientObject) {
          isEncryptedPayload = true;
          // Encrypt plain message client-side under recipient's public key (double-wrapping under recipient & sender)
          const textToEncrypt = JSON.stringify({
            text: messageInput || '[Attachment Shared]',
            fileUrl: finalFileUrl,
            fileName: selectedFile?.name,
            fileSize: selectedFile?.size
          });

          finalContent = await encryptE2EE(textToEncrypt, recipientObject.publicKey, currentUser.publicKey);
        }
      } else if (chat.type === 'saved') {
        isEncryptedPayload = true;
        // Encrypt plain message client-side under user's own public key
        const textToEncrypt = JSON.stringify({
          text: messageInput || '[Attachment Shared]',
          fileUrl: finalFileUrl,
          fileName: selectedFile?.name,
          fileSize: selectedFile?.size
        });

        finalContent = await encryptE2EE(textToEncrypt, currentUser.publicKey, currentUser.publicKey);
      }

      // Post message
      const msgPayload = {
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: finalContent,
        isEncrypted: isEncryptedPayload,
        type: selectedFile ? 'file' : 'text',
        fileName: selectedFile?.name, // keep headers populated for clean list queries
        fileSize: selectedFile?.size,
        fileMimeType: selectedFile?.type,
        fileUrl: finalFileUrl,
        selfDestructDuration: selfDestructSecs,
        replyToId: replyToId || undefined
      };

      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });

      // Clear input
      setMessageInput('');
      setSelectedFile(null);
      setSelfDestructSecs(0);
      setReplyToId(null);
      if (currentUser && activeChatId) {
        localStorage.removeItem(`secure_telegram_draft_${currentUser.id}_${activeChatId}`);
      }

      // Stop typing broadcast immediately on release
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (amTypingRef.current) {
        amTypingRef.current = false;
        broadcastTyping(false);
      }

    } catch (err) {
      console.error('Failed to dispatch secure transport package:', err);
    }
  };

  const handleSendThreadReply = async (content: string) => {
    if (!currentUser || !activeChatId || !activeThreadMessage) return;

    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    try {
      let finalContent = content;
      let isEncryptedPayload = false;

      // Check if E2EE is enabled based on chat type (direct, saved)
      if (chat.type === 'direct') {
        const recipientId = chat.participants.find(p => p !== currentUser.id);
        const recipientObject = allUsers.find(u => u.id === recipientId);

        if (recipientObject) {
          isEncryptedPayload = true;
          const textToEncrypt = JSON.stringify({
            text: content,
            fileUrl: undefined,
            fileName: undefined,
            fileSize: undefined
          });
          finalContent = await encryptE2EE(textToEncrypt, recipientObject.publicKey, currentUser.publicKey);
        }
      } else if (chat.type === 'saved') {
        isEncryptedPayload = true;
        const textToEncrypt = JSON.stringify({
          text: content,
          fileUrl: undefined,
          fileName: undefined,
          fileSize: undefined
        });
        finalContent = await encryptE2EE(textToEncrypt, currentUser.publicKey, currentUser.publicKey);
      }

      const msgPayload = {
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: finalContent,
        isEncrypted: isEncryptedPayload,
        type: 'text',
        replyToId: activeThreadMessage.id
      };

      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgPayload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error || 'Failed to send thread reply.');
      }
    } catch (err) {
      console.error('Failed to dispatch secure thread message:', err);
    }
  };

  // Mark Message as Viewed
  const markMessageAsViewed = async (messageId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Recall Sent Message within history timeline
  const handleRecallMessage = async (messageId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/recall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Add Emojis Reactions onhover messages
  const handleSelectReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          username: currentUser.username,
          emoji
        })
      });
      setActiveReactionMessageId(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Shared Notes Autosave Co-authoring
  const handleSaveNotes = async (notes: string) => {
    if (!currentUser || !activeChatId) return;
    try {
      await fetch(`/api/chats/${activeChatId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharedNotes: notes,
          userId: currentUser.id
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePrivacySettings = async (disableReceipts: boolean, onlineShow?: boolean, reactionShow?: boolean) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          disableReadReceipts: disableReceipts,
          onlineShow: onlineShow !== undefined ? onlineShow : currentUser.onlineShow,
          reactionShow: reactionShow !== undefined ? reactionShow : currentUser.reactionShow
        })
      });
      const updatedUser = await res.json();
      setCurrentUser(updatedUser);
      fetchUsers();
    } catch (e) {
      console.error('Failed to update privacy settings:', e);
    }
  };

  const handleUpdateProfileSettings = async (
    displayName: string,
    avatarUrl: string,
    email?: string,
    bio?: string,
    phone?: string,
    badge?: string,
    bannerStyle?: string
  ) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, avatarUrl, email, bio, phone, badge, bannerStyle })
      });
      const updatedUser = await res.json();
      setCurrentUser(updatedUser);
      fetchUsers();
    } catch (e) {
      console.error('Failed to update profile settings:', e);
    }
  };

  const handleToggleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      setBlockingInProgress(true);
      const currentlyBlocked = currentUser.blockedUsers || [];
      const isCurrentlyBlocked = currentlyBlocked.includes(targetUserId);
      const newBlockedList = isCurrentlyBlocked
        ? currentlyBlocked.filter(id => id !== targetUserId)
        : [...currentlyBlocked, targetUserId];

      const res = await fetch(`/api/users/${currentUser.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUsers: newBlockedList })
      });
      const updatedUser = await res.json();
      setCurrentUser(updatedUser);
      setViewingUserProfile(null);
      
      // Deselect blocked chat if it was active
      const activeChat = chats.find(c => c.id === activeChatId);
      if (activeChat && activeChat.type === 'direct' && activeChat.participants.includes(targetUserId)) {
        setActiveChatId(null);
      }

      if (currentUser) {
        await fetchChats(currentUser.id);
        if (activeChatId) {
          await fetchMessages(activeChatId);
        }
      }
    } catch (e) {
      console.error('Failed to toggle block state:', e);
    } finally {
      setBlockingInProgress(false);
    }
  };

  const handleExportHistory = (format: 'txt' | 'html' | 'json' | 'md' | 'csv') => {
    if (!activeChatId) return;
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    // Get chat name for filename
    let chatName = activeChat.name || 'Group Chat';
    if (activeChat.type === 'direct') {
      const otherId = activeChat.participants.find(p => p !== currentUser?.id);
      const userObj = allUsers.find(u => u.id === otherId);
      if (userObj) {
        chatName = userObj.displayName;
      }
    }

    // Format all messages of this chat
    const formattedMsgs = messages.map(msg => {
      const sender = allUsers.find(u => u.id === msg.senderId);
      const senderName = sender ? `${sender.displayName} (@${sender.username})` : `User_${msg.senderId}`;
      const isSelf = msg.senderId === currentUser?.id;
      const timeStr = new Date(msg.timestamp).toISOString().replace('T', ' ').substring(0, 19);

      let displayedContent = msg.content || '';
      let decryptedFileUrl = msg.fileUrl;
      let decryptedFileName = msg.fileName;
      let decryptedFileSize = msg.fileSize;

      const isRecalled = !!msg.recalledAt;

      if (isRecalled) {
        displayedContent = '🚫 This message was recalled by the sender.';
      } else if (msg.isEncrypted) {
        const cached = decryptedCache[msg.id];
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            displayedContent = parsed.text;
            decryptedFileUrl = parsed.fileUrl;
            decryptedFileName = parsed.fileName;
            decryptedFileSize = parsed.fileSize;
          } catch (e) {
            displayedContent = cached;
          }
        } else {
          displayedContent = '🔐 [Encrypted secure packet - Key not loaded]';
        }
      }

      return {
        id: msg.id,
        senderName,
        username: sender ? sender.username : `user_${msg.senderId}`,
        isSelf,
        timeStr,
        content: displayedContent,
        fileUrl: decryptedFileUrl,
        fileName: decryptedFileName,
        fileSize: decryptedFileSize
      };
    });

    if (format === 'txt') {
      // Build plain text string
      let textContent = `==================================================\n`;
      textContent += `DEEP TALK CONVERSATION BACKUP: ${chatName.toUpperCase()}\n`;
      textContent += `Exported: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC\n`;
      textContent += `Total Messages: ${formattedMsgs.length}\n`;
      textContent += `==================================================\n\n`;

      formattedMsgs.forEach(m => {
        textContent += `[${m.timeStr}] ${m.senderName}:\n`;
        textContent += `  ${m.content}\n`;
        if (m.fileName) {
          textContent += `  📎 Attachment: ${m.fileName} (${m.fileSize ? (m.fileSize / 1024).toFixed(1) + ' KB' : 'unknown size'})\n`;
          if (m.fileUrl) {
            textContent += `     Link: ${window.location.origin}${m.fileUrl}\n`;
          }
        }
        textContent += `\n`;
      });

      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_history_${chatName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      // Build visual HTML report
      let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deep Talk Export - ${chatName}</title>
  <style>
    body {
      background-color: #0A0C12;
      color: #94A3B8;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 16px;
    }
    .wrapper {
      max-width: 850px;
      margin: 0 auto;
      background-color: #0E121A;
      border: 1px solid #1E293B;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
    }
    .header {
      background: linear-gradient(135deg, #111827 0%, #030712 100%);
      padding: 30px;
      border-bottom: 1px solid #1E293B;
      text-align: center;
      position: relative;
    }
    .header-badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(14, 165, 233, 0.3);
      color: #38BDF8;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-radius: 4px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #F8FAFC;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #64748B;
    }
    .thread {
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background-color: rgba(15, 23, 42, 0.2);
    }
    .message-row {
      display: flex;
      width: 100%;
    }
    .message-row.row-self {
      justify-content: flex-end;
    }
    .message-row.row-other {
      justify-content: flex-start;
    }
    .bubble {
      max-width: 75%;
      padding: 14px 18px;
      border-radius: 12px;
      box-sizing: border-box;
      position: relative;
    }
    .row-self .bubble {
      background-color: #172554;
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #EFF6FF;
      border-bottom-right-radius: 2px;
    }
    .row-other .bubble {
      background-color: #1E293B;
      border: 1px solid #334155;
      color: #F1F5F9;
      border-bottom-left-radius: 2px;
    }
    .msg-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .sender-name {
      font-weight: 700;
      color: #38BDF8;
    }
    .row-self .sender-name {
      color: #60A5FA;
    }
    .msg-time {
      color: #64748B;
    }
    .row-self .msg-time {
      color: #93C5FD;
      opacity: 0.8;
    }
    .msg-body {
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 13.5px;
      line-height: 1.5;
    }
    .attachment {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      padding: 8px 14px;
      background-color: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      font-size: 12px;
      color: #38BDF8;
      text-decoration: none;
      transition: all 0.2s;
    }
    .attachment:hover {
      background-color: rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.3);
    }
    .footer {
      background-color: #0A0C12;
      padding: 20px;
      text-align: center;
      font-size: 11px;
      color: #64748B;
      border-top: 1px solid #1E293B;
      letter-spacing: 0.5px;
    }
    .footer strong {
      color: #0EA5E9;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-badge">E2EE Cryptographic Archive</span>
      <h1>${chatName}</h1>
      <p>Export Date: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC • ${formattedMsgs.length} messages</p>
    </div>
    <div class="thread">
`;

      formattedMsgs.forEach(m => {
        const rowClass = m.isSelf ? 'row-self' : 'row-other';
        htmlContent += `
      <div class="message-row ${rowClass}">
        <div class="bubble">
          <div class="msg-meta">
            <span class="sender-name">${m.senderName}</span>
            <span class="msg-time">${m.timeStr}</span>
          </div>
          <div class="msg-body">${m.content}</div>
          \${m.fileName ? \`
          <a class="attachment" href="\${window.location.origin}\${m.fileUrl || '#'}" download="\${m.fileName}" target="_blank">
            📎 \${m.fileName} (\${m.fileSize ? (m.fileSize / 1024).toFixed(1) + ' KB' : 'Download Link'})
          </a>
          \` : ''}
        </div>
      </div>
`;
      });

      htmlContent += `
    </div>
    <div class="footer">
      Generated securely by <strong>Deep Talk</strong> E2EE Core Sandbox Node. Fully printable.
    </div>
  </div>
</body>
</html>
`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_history_${chatName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonBackup = {
        chatName,
        exportDate: new Date().toISOString(),
        totalMessages: formattedMsgs.length,
        messages: formattedMsgs.map(m => ({
          id: m.id,
          timestamp: m.timeStr,
          author: m.senderName,
          body: m.content,
          attachmentUrl: m.fileUrl,
          attachmentName: m.fileName,
          attachmentSize: m.fileSize
        }))
      };
      const blob = new Blob([JSON.stringify(jsonBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_history_${chatName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'md') {
      let mdContent = `# Deep Talk Chat History - ${chatName}\n\n`;
      mdContent += `* **Export Date:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC\n`;
      mdContent += `* **Total Messages:** ${formattedMsgs.length}\n\n`;
      mdContent += `---\n\n`;

      formattedMsgs.forEach(m => {
        mdContent += `### **${m.senderName}** <sub style="color: #64748B;">${m.timeStr}</sub>\n\n`;
        mdContent += `${m.content}\n\n`;
        if (m.fileName) {
          mdContent += `* 📎 **Attachment:** [${m.fileName}](${window.location.origin}${m.fileUrl || '#'}) (${m.fileSize ? (m.fileSize / 1024).toFixed(1) + ' KB' : 'unknown size'})\n\n`;
        }
        mdContent += `---\n\n`;
      });

      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_history_${chatName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvRows = [
        ['Message ID', 'Timestamp (UTC)', 'Sender Name', 'Username', 'Message Type', 'Content', 'Attachment Name', 'Attachment URL'],
        ...formattedMsgs.map(m => [
          m.id,
          m.timeStr,
          m.senderName.replace(/"/g, '""'),
          m.username,
          m.fileName ? 'File' : 'Text',
          m.content.replace(/"/g, '""'),
          m.fileName ? m.fileName.replace(/"/g, '""') : '',
          m.fileUrl || ''
        ])
      ];

      const csvContent = csvRows.map(row => row.map(val => `"${val}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat_history_${chatName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Device Backup triggers from DeviceManager component settings
  const handleBackupPrivateKey = async (encryptedKey: string, salt: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          publicKey: currentUser.publicKey,
          encryptedPrivateKey: encryptedKey,
          privateKeySalt: salt
        })
      });
      const updated = await res.json();
      setCurrentUser(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeviceRestoreKeyring = async (password: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const checkRes = await fetch('/api/users');
      const list: UserProfile[] = await checkRes.json();
      const me = list.find(u => u.id === currentUser.id);

      if (!me || !me.encryptedPrivateKey || !me.privateKeySalt) return false;

      // Decrypt
      const decPriv = await restorePrivateKey(me.encryptedPrivateKey, password, me.privateKeySalt);
      localStorage.setItem(`secure_telegram_private_key:${currentUser.username}`, decPriv);
      setDecryptTrigger(p => p + 1);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleTerminateRemoteDevice = async (remoteDevId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/devices/${remoteDevId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setCurrentUser(prev => prev ? { ...prev, devices: data.devices } : null);
    } catch (e) {
      console.error(e);
    }
  };

  // Initiate / Trigger Secure Calls
  const handleInitiateCall = async (type: 'voice' | 'video') => {
    if (!currentUser || !activeChatId) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    const recipientId = chat.participants.find(p => p !== currentUser.id);
    if (!recipientId) return;

    try {
      const callPayload = {
        chatId: activeChatId,
        callerId: currentUser.id,
        callerName: currentUser.displayName,
        receiverId: recipientId,
        type,
        status: 'outgoing'
      };

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callPayload)
      });
      const data = await res.json();
      setOngoingCall(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptCall = async () => {
    if (!ongoingCall) return;
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ongoingCall, status: 'connected' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineCall = async () => {
    if (!ongoingCall) return;
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ongoingCall, status: 'rejected' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndCall = async () => {
    if (!ongoingCall) return;
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ongoingCall, status: 'ended' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Helper functions
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleScrollToMessage = (msgId: string) => {
    const parentElem = document.getElementById(`message-bubble-${msgId}`);
    if (parentElem) {
      parentElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Let's apply a beautiful pulse/highlight glow effect
      parentElem.classList.add('ring-2', 'ring-sky-500/50', 'bg-sky-500/5', 'duration-300');
      setTimeout(() => {
        parentElem.classList.remove('ring-2', 'ring-sky-500/50', 'bg-sky-500/5', 'duration-300');
      }, 2000);
    }
  };

  const getMediaType = (fileName?: string, fileMimeType?: string): 'image' | 'video' | 'binary' => {
    if (fileMimeType) {
      if (fileMimeType.startsWith('image/')) return 'image';
      if (fileMimeType.startsWith('video/')) return 'video';
    }
    if (fileName) {
      const ext = fileName.toLowerCase().split('.').pop() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
      if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
    }
    return 'binary';
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out from this session? Your device keys remain persistent locally.')) {
      localStorage.removeItem('secure_telegram_active_username');
      setCurrentUser(null);
      setShowRegisterModal(true);
      window.location.href = window.location.origin;
    }
  };

  return (
    <div id="secure-messenger-main" className="flex flex-col h-screen overflow-hidden bg-[#0A0C12] text-slate-200 font-sans">
      
      {/* 1. Header Toolbar */}
      <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 backdrop-blur-md bg-[#0A0C12]/80 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-xs font-bold uppercase tracking-tight text-white flex items-center gap-1.5 font-sans">
              Deep Talk
            </h1>
            <p className="text-[10px] text-slate-500 font-mono leading-none">
              E2EE Tunnel • {deviceName}
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            {currentUser.username === 'admin' && (
              <button
                id="toolbar-admin-btn"
                onClick={() => setShowAdminModal(true)}
                className="p-1 px-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-450 border border-rose-500/30 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.15)] active:scale-95"
                title="Manage Users"
              >
                <Settings size={13} />
                ADMIN PANEL
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1A1F2B] border border-slate-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
              <span className="text-[11px] text-slate-300 font-mono">
                Active: <strong className="text-white font-sans text-xs">@{currentUser.username}</strong>
              </span>
            </div>
            
            <button
              id="toolbar-logout-btn"
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1F2B] transition-all active:scale-95 border border-slate-800 hover:border-slate-700/60"
              title="Log out session"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </header>

      {/* 2. Main Layout Pane */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Frame */}
        {currentUser && (
          <aside className="w-72 flex flex-col bg-[#0E121A] border-r border-slate-800/50 shrink-0 select-none">
            
            {/* Search + Chat Creator Actions */}
            <div className="p-4 flex flex-col gap-2.5">
              
              {/* Target username direct chat */}
              <form onSubmit={handleStartPrivateChat} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Private E2EE Chat @username"
                  required
                  value={newChatTarget}
                  onChange={(e) => setNewChatTarget(e.target.value)}
                  className="w-full pl-3 pr-14 py-2.5 rounded-lg bg-[#1A1F2B] border border-slate-800/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(true);
                    setQrProgressState('idle');
                    setSelectedScanPeer('');
                  }}
                  className="absolute right-7 px-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                  title="Scan Public Key Fingerprint QR code"
                >
                  <QrCode size={13} />
                </button>
                <button
                  type="submit"
                  className="absolute right-2 px-1 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                  title="Invite via encryption public-key"
                >
                  <UserPlus size={14} />
                </button>
              </form>

              {/* Group chat triggering buttons */}
              <div className="flex items-center gap-2">
                <button
                  id="trigger-group-creator-btn"
                  onClick={() => setShowGroupCreator(!showGroupCreator)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 rounded-lg text-[10px] font-bold text-sky-400 font-mono tracking-wide shadow-[0_4px_15px_rgba(14,165,233,0.05)] transition-all active:scale-98 cursor-pointer"
                >
                  <Users size={12} />
                  CREATE CHANNEL
                </button>

                <button
                  type="button"
                  onClick={handleOpenSavedMessages}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 font-mono tracking-wide shadow-[0_4px_15px_rgba(16,185,129,0.05)] transition-all active:scale-98 cursor-pointer"
                  title="Open Saved Messages (Personal secure cloud notepad)"
                >
                  <BookOpen size={12} />
                  SAVED MESSAGES
                </button>
              </div>

              {/* Left Sidebar filter search input */}
              <div className="relative flex items-center mt-1">
                <Search size={13} className="absolute left-3 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search chats or messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-2 rounded-lg bg-[#11141F] border border-slate-800/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-sans"
                />
              </div>
            </div>

            {/* Simulated registration sandbox helper banner */}
            <div className="mx-4 mb-3 p-3 bg-[#1A1F2B]/50 rounded-lg border border-slate-800/50 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Info size={11} className="text-sky-400 animate-pulse" /> Multi-tab helper
              </span>
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                Open another tab using <span className="text-sky-400 font-mono">Open Multi-Session</span> to interact live with the encryption tunnel!
              </p>
            </div>

            {/* Tab Selector for Left Sidebar */}
            <div className="mx-4 mb-3 flex items-center bg-[#070A11] p-1 rounded-lg border border-slate-800/40 gap-1 select-none shrink-0">
              <button
                type="button"
                onClick={() => setSidebarTab('chats')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-150 ${
                  sidebarTab === 'chats'
                    ? 'bg-[#1A1F2D] text-sky-400 border border-slate-700/50 shadow'
                    : 'text-slate-500 hover:text-slate-300 cursor-pointer'
                }`}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('starred')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-155 flex items-center justify-center gap-1 ${
                  sidebarTab === 'starred'
                    ? 'bg-[#1A1F2D] text-amber-400 border border-slate-700/50 shadow'
                    : 'text-slate-500 hover:text-slate-300 cursor-pointer'
                }`}
              >
                <Star size={10} className={sidebarTab === 'starred' ? 'text-amber-450 fill-amber-450/20' : ''} />
                Starred
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('archived')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 ${
                  sidebarTab === 'archived'
                    ? 'bg-[#1A1F2D] text-indigo-400 border border-slate-700/50 shadow'
                    : 'text-slate-500 hover:text-slate-300 cursor-pointer'
                }`}
              >
                <Archive size={10} />
                Archived
              </button>
            </div>

            {/* Conversation Active Grid list */}
            <div className="flex-1 overflow-y-auto px-2 flex flex-col gap-1.5">
              {sidebarTab === 'starred' ? (
                <>
                  <span className="px-3 py-1 text-[9px] font-bold text-slate-500 tracking-[0.15em] mb-1 uppercase font-mono">
                    Starred Messages ({activeChatId ? allMyMessages.filter(m => m.chatId === activeChatId && starredMessageIds[m.id]).length : 0})
                  </span>
                  {(() => {
                    if (!activeChatId) {
                      return (
                        <div className="p-4 text-center text-[10.5px] text-slate-500 leading-relaxed font-mono">
                          Select a conversation to inspect starred transmissions.
                        </div>
                      );
                    }
                    
                    const chatMsgs = allMyMessages.filter(m => m.chatId === activeChatId);
                    const starredMsgs = chatMsgs.filter(m => starredMessageIds[m.id]);

                    if (starredMsgs.length === 0) {
                      return (
                        <div className="p-4 text-center text-[11px] text-slate-500 leading-relaxed font-mono">
                          No starred messages in this chat. Hover over any message envelope and click the <Star size={10} className="inline text-amber-400 mx-0.5" /> icon to pin it here.
                        </div>
                      );
                    }

                    return starredMsgs.map(msg => {
                      let displayedContent = msg.content;
                      if (msg.isEncrypted) {
                        const cached = decryptedCache[msg.id];
                        if (cached) {
                          try {
                            const parsed = JSON.parse(cached);
                            displayedContent = parsed.text || '[Secure Attachment]';
                          } catch (e) {
                            displayedContent = cached;
                          }
                        } else {
                          displayedContent = '🔐 Encrypted secure packet...';
                        }
                      }
                      
                      const timestampStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleScrollToMessage(msg.id)}
                          className="group/starred relative p-2.5 rounded-lg bg-[#11141F] hover:bg-[#1C2030] border border-slate-800/40 hover:border-amber-500/30 transition-all cursor-pointer flex flex-col gap-1 text-left active:scale-[0.98]"
                          title="Click to zoom timeline to this packet"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-sky-400">@{msg.senderName}</span>
                            <span className="text-[8.5px] font-mono text-slate-500">{timestampStr}</span>
                          </div>
                          
                          <p className="text-[11px] text-slate-300 font-sans line-clamp-2 leading-relaxed break-words">
                            {displayedContent}
                          </p>

                          <div className="absolute right-2 top-2 hidden group-hover/starred:flex items-center gap-1 bg-[#0A0C12] border border-slate-800 rounded-md p-0.5 shadow-lg">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStarMessage(msg.id);
                              }}
                              className="p-1 hover:bg-rose-500/10 text-amber-400 hover:text-rose-400 rounded transition-all"
                              title="Unstar Message"
                            >
                              <Star size={10} className="fill-amber-400" />
                            </button>
                            <button
                              type="button"
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-all"
                              title="Go to Message"
                            >
                              <CornerUpRight size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              ) : (
                <>
                  <span className="px-3 py-1 text-[9px] font-bold text-slate-500 tracking-[0.15em] mb-1 uppercase font-mono">
                    {sidebarTab === 'archived' ? 'Archived Conversations' : 'Conversations'} ({
                      (() => {
                        const isArchivedView = sidebarTab === 'archived';
                        const query = searchQuery.trim().toLowerCase();
                        const matchingChats = chats.filter(chat => {
                          const matchesArchive = isArchivedView ? archivedChatIds[chat.id] : !archivedChatIds[chat.id];
                          if (!matchesArchive) return false;
                          if (!query) return true;

                          let displayName = chat.name || 'Group Chat';
                          if (chat.type === 'direct') {
                            const otherId = chat.participants.find(p => p !== currentUser?.id);
                            const userObj = allUsers.find(u => u.id === otherId);
                            if (userObj) {
                              displayName = userObj.displayName;
                            } else {
                              displayName = otherId || 'Unknown Keys';
                            }
                          }

                          if (displayName.toLowerCase().includes(query)) return true;

                          const matchesParticipant = chat.participants.some(pId => {
                            const u = allUsers.find(usr => usr.id === pId);
                            if (u) {
                              return u.displayName.toLowerCase().includes(query) || 
                                     u.username.toLowerCase().includes(query);
                            }
                            return false;
                          });
                          if (matchesParticipant) return true;

                          const chatMsgs = allMyMessages.filter(m => m.chatId === chat.id);
                          return chatMsgs.some(m => {
                            if (m.recalled) return false;
                            const decryptedText = decryptedCache[m.id] || '';
                            const rawContent = m.content || '';
                            return rawContent.toLowerCase().includes(query) || 
                                   decryptedText.toLowerCase().includes(query);
                          });
                        });
                        return matchingChats.length;
                      })()
                    })
                  </span>

                  {(() => {
                    const isArchivedView = sidebarTab === 'archived';
                    const query = searchQuery.trim().toLowerCase();
                    const filtered = chats.filter(chat => {
                      const matchesArchive = isArchivedView ? archivedChatIds[chat.id] : !archivedChatIds[chat.id];
                      if (!matchesArchive) return false;
                      if (!query) return true;

                      // Compute displayName
                      let displayName = chat.name || 'Group Chat';
                      if (chat.type === 'direct') {
                        const otherId = chat.participants.find(p => p !== currentUser?.id);
                        const userObj = allUsers.find(u => u.id === otherId);
                        if (userObj) {
                          displayName = userObj.displayName;
                        } else {
                          displayName = otherId || 'Unknown Keys';
                        }
                      }

                      // 1. Search chat name
                      if (displayName.toLowerCase().includes(query)) return true;

                      // 2. Search participant names/usernames
                      const matchesParticipant = chat.participants.some(pId => {
                        const u = allUsers.find(usr => usr.id === pId);
                        if (u) {
                          return u.displayName.toLowerCase().includes(query) || 
                                 u.username.toLowerCase().includes(query);
                        }
                        return false;
                      });
                      if (matchesParticipant) return true;

                      // 3. Search decrypted or plain content of messages in this chat
                      const chatMsgs = allMyMessages.filter(m => m.chatId === chat.id);
                      return chatMsgs.some(m => {
                        if (m.recalled) return false;
                        const decryptedText = decryptedCache[m.id] || '';
                        const rawContent = m.content || '';
                        return rawContent.toLowerCase().includes(query) || 
                               decryptedText.toLowerCase().includes(query);
                      });
                    });

                    // Sort: pinned conversations first!
                    const sorted = [...filtered].sort((a, b) => {
                      const aPinned = pinnedChatIds[a.id] || a.pinned ? 1 : 0;
                      const bPinned = pinnedChatIds[b.id] || b.pinned ? 1 : 0;
                      return bPinned - aPinned;
                    });

                    if (sorted.length === 0) {
                      return (
                        <div className="p-4 text-center text-[11px] text-slate-500 leading-relaxed font-mono">
                          {query 
                            ? 'No matching conversations found.' 
                            : isArchivedView 
                            ? 'Archive is empty. Swipe chats to clear your focus list.'
                            : 'No active conversations. Open direct chat @username above.'
                          }
                        </div>
                      );
                    }

                    return sorted.map(chat => {
                      const isActive = chat.id === activeChatId;
                      const isPinned = !!(pinnedChatIds[chat.id] || chat.pinned);
                      const unreadCount = allMyMessages.filter(m => 
                        m.chatId === chat.id && 
                        m.senderId !== currentUser?.id && 
                        (!m.viewedBy || !m.viewedBy.includes(currentUser?.id || '')) &&
                        !m.recalled
                      ).length;
                      let displayAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`;
                      let displayName = chat.name || 'Group Chat';

                      if (chat.type === 'saved') {
                         displayName = 'Saved Messages 📌';
                         displayAvatar = 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=saved';
                      } else if (chat.type === 'direct') {
                         const otherId = chat.participants.find(p => p !== currentUser?.id);
                         const userObj = allUsers.find(u => u.id === otherId);
                         if (userObj) {
                           displayName = userObj.displayName;
                           displayAvatar = userObj.avatarUrl;
                         } else {
                           displayName = otherId || 'Unknown Keys';
                         }
                      }

                      return (
                        <div
                          key={chat.id}
                          className="group/chat relative flex items-center w-full min-w-0"
                        >
                          <button
                            onClick={() => {
                              setActiveChatId(chat.id);
                              // Auto switch Starred filter if we select a different chat
                              if (sidebarTab === 'starred') {
                                setSidebarTab('starred');
                              }
                            }}
                            className={`flex-1 flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                              isActive 
                              ? 'bg-sky-500/10 border-l-2 border-sky-500 text-white' 
                              : 'bg-transparent border-transparent hover:bg-slate-800/20 text-slate-400'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <img
                                src={displayAvatar}
                                alt="avatar"
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-lg bg-[#1A1F2B] object-cover border border-slate-800"
                              />
                              {chat.type === 'direct' && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0E121A]"></span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold truncate pr-2 ${isActive ? 'text-white' : 'text-slate-300'}`}>{displayName}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-white font-black text-[9px] min-w-[16px] text-center shadow-[0_0_10px_rgba(14,165,233,0.5)] animate-pulse">
                                      {unreadCount}
                                    </span>
                                  )}
                                  {isPinned && <Pin size={10} className="text-amber-400 fill-amber-400/20 rotate-45" />}
                                  {chat.type === 'saved' ? (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] uppercase font-bold tracking-tight border border-emerald-500/20">Cloud</span>
                                  ) : chat.type === 'direct' ? (
                                    <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[8px] uppercase font-bold tracking-tight">E2EE</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[8px] uppercase font-bold tracking-tight">Public</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-1">
                                {chat.type === 'saved' ? 'Personal Secure Notes' : chat.type === 'direct' ? 'End-to-End Tunnel' : 'Shared Multi-Party'}
                              </p>
                            </div>
                          </button>

                          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover/chat:flex items-center gap-1 bg-[#111420]/95 p-1 rounded-md border border-slate-850 shadow-xl z-20">
                            {/* Archive Toggle Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleArchiveChat(chat.id);
                              }}
                              className={`p-1 rounded hover:bg-slate-800 transition-all ${archivedChatIds[chat.id] ? 'text-indigo-400 hover:text-indigo-300' : 'text-slate-400 hover:text-indigo-400'}`}
                              title={archivedChatIds[chat.id] ? 'Restore to Active List' : 'Archive conversation'}
                            >
                              {archivedChatIds[chat.id] ? <ArchiveRestore size={11} /> : <Archive size={11} />}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePin(chat.id, !isPinned);
                              }}
                              className={`p-1 rounded hover:bg-slate-800 transition-all ${isPinned ? 'text-amber-400' : 'text-slate-400'}`}
                              title={isPinned ? 'Unpin channel' : 'Pin channel to top'}
                            >
                              <Pin size={11} className={isPinned ? 'rotate-45' : ''} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                              className="p-1 rounded hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-all"
                              title="Purge channel"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              )}
            </div>
          </aside>
        )}

        {/* 3. Center Messaging Deck */}
        <main className="flex-1 flex flex-col bg-[#0A0C12] overflow-hidden relative">
          
          {/* Active Chat Selected */}
          {activeChatId ? (
            <>
              {/* Chat Deck Header */}
              {(() => {
                const activeChat = chats.find(c => c.id === activeChatId);
                if (!activeChat) return null;
                
                let title = activeChat.name || 'Group Chat';
                let avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${activeChat.id}`;
                let subtext = 'Secure shared broadcast channel';
                let isE2E = activeChat.type === 'direct';

                if (isE2E) {
                  const otherId = activeChat.participants.find(p => p !== currentUser?.id);
                  const userObj = allUsers.find(u => u.id === otherId);
                  if (userObj) {
                    title = userObj.displayName;
                    avatar = userObj.avatarUrl;
                    subtext = `@${userObj.username} • Cryptographically synchronized`;
                  } else {
                    title = otherId || 'Unknown Client';
                  }
                }

                const chatTypingMap = typingUsers[activeChatId || ''] || {};
                const typingUserNames = Object.values(chatTypingMap);
                const isSomeoneTyping = typingUserNames.length > 0;
                const typingText = typingUserNames.length === 1 
                  ? `${typingUserNames[0]} is typing...` 
                  : typingUserNames.length === 2 
                    ? `${typingUserNames[0]} and ${typingUserNames[1]} are typing...` 
                    : 'Several people are typing...';

                return (
                  <div className="h-16 border-b border-slate-800/50 flex items-center justify-between px-6 backdrop-blur-md bg-[#0A0C12]/80 z-10 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={avatar}
                        alt="avatar"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg bg-[#1A1F2B] object-cover border border-slate-800"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {title}
                          {isE2E && (
                            <span className="px-1.5 py-0.5 bg-sky-500/10 text-sky-400 font-mono text-[9px] rounded border border-sky-500/30 flex items-center gap-1 font-bold uppercase">
                              <Lock size={9} />
                              E2EE
                            </span>
                          )}
                        </span>
                        {isSomeoneTyping ? (
                          <span className="text-[10px] text-sky-400 font-medium animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-450 animate-bounce"></span>
                            {typingText}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {subtext}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chat Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInitiateCall('video')}
                        className="p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-sky-400 transition-colors"
                        title="Secure Video Call"
                      >
                        <Video size={16} />
                      </button>
                      <button
                        onClick={() => handleInitiateCall('voice')}
                        className="p-2 rounded-full hover:bg-slate-800/40 text-slate-400 hover:text-sky-400 transition-colors"
                        title="Secure Voice Call"
                      >
                        <Phone size={16} />
                      </button>

                      <button
                        onClick={() => {
                          setShowChatSearch(!showChatSearch);
                          setChatSearchQuery('');
                          setChatSearchMatchIndex(0);
                        }}
                        className={`p-2 rounded-full transition-colors ${
                          showChatSearch 
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-505/35' 
                            : 'hover:bg-slate-800/40 text-slate-400 hover:text-amber-500'
                        }`}
                        title="Search messages inside active chat window"
                      >
                        <Search size={16} />
                      </button>

                      <div className="w-px h-5 bg-slate-850 mx-1"></div>

                      <button
                        onClick={() => setActiveRightTab(activeRightTab === 'notes' ? 'none' : 'notes')}
                        className={`p-2 rounded-lg transition-all ${
                          activeRightTab === 'notes' 
                            ? 'bg-sky-500/15 text-sky-450 border border-sky-500/30' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                        title="Co-authoring notebook drawer"
                      >
                        <BookOpen size={16} />
                      </button>
                      {/* Export Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          className={`p-2 rounded-lg transition-all ${
                            showExportMenu
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                          }`}
                          title="Export Conversation History"
                        >
                          <Download size={16} />
                        </button>
                        {showExportMenu && (
                          <div id="export-history-dropdown" className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0F131D] border border-slate-800/90 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] z-30 font-sans">
                            <span className="block px-3 py-1.5 text-[8.5px] font-bold text-slate-500 font-mono uppercase tracking-widest leading-none border-b border-slate-800/40 mb-1">Backup Formats</span>
                            <button
                              onClick={() => {
                                handleExportHistory('txt');
                                setShowExportMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[11px] text-slate-350 hover:text-white hover:bg-slate-800/45 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <File size={13} className="text-sky-455 text-sky-400" />
                              Save as Plain Text (.txt)
                            </button>
                            <button
                              onClick={() => {
                                handleExportHistory('html');
                                setShowExportMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[11px] text-slate-350 hover:text-white hover:bg-slate-800/45 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Layers size={13} className="text-emerald-400" />
                              Save as Styled HTML (.html)
                            </button>
                            <button
                              onClick={() => {
                                handleExportHistory('md');
                                setShowExportMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[11px] text-slate-350 hover:text-white hover:bg-slate-800/45 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <FileText size={13} className="text-pink-400" />
                              Markdown Report (.md)
                            </button>
                            <button
                              onClick={() => {
                                handleExportHistory('json');
                                setShowExportMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[11px] text-slate-350 hover:text-white hover:bg-slate-800/45 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Code size={13} className="text-indigo-400" />
                              Structured Data (.json)
                            </button>
                            <button
                              onClick={() => {
                                handleExportHistory('csv');
                                setShowExportMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[11px] text-slate-350 hover:text-white hover:bg-slate-800/45 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Table size={13} className="text-amber-400" />
                              Excel Comma Separated (.csv)
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveRightTab(activeRightTab === 'settings' ? 'none' : 'settings')}
                        className={`p-2 rounded-lg transition-all ${
                          activeRightTab === 'settings' 
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' 
                            : 'text-slate-450 hover:text-white hover:bg-slate-800/40'
                        }`}
                        title="Dynamic device sync settings"
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Inline In-Chat Highlight Search Bar */}
              {showChatSearch && (
                <div className="bg-[#101422] border-b border-amber-500/10 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs z-10 select-none shrink-0 animate-fade-in font-sans">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <span className="p-1 px-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-extrabold select-none">
                      IN-CHAT SEARCH
                    </span>
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search text in active stream..."
                        value={chatSearchQuery}
                        onChange={(e) => {
                          setChatSearchQuery(e.target.value);
                          setChatSearchMatchIndex(0);
                        }}
                        className="w-full bg-[#1A1F30] border border-slate-800 rounded-lg py-1.5 pl-3 pr-20 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 font-mono transition-all"
                      />
                      {chatSearchQuery && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] font-mono font-bold text-slate-400">
                          {activeChatMatches.length > 0 ? (
                            <span className="text-amber-400 font-extrabold">
                              {chatSearchMatchIndex + 1}/{activeChatMatches.length} FOUND
                            </span>
                          ) : (
                            <span className="text-rose-500">NO MATCH</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={activeChatMatches.length <= 1}
                      onClick={() => {
                        const nextIdx = (chatSearchMatchIndex - 1 + activeChatMatches.length) % activeChatMatches.length;
                        setChatSearchMatchIndex(nextIdx);
                        const targetId = activeChatMatches[nextIdx];
                        if (targetId) handleScrollToMessage(targetId);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-lg text-[10px] text-slate-300 hover:text-white font-mono uppercase tracking-wider select-none cursor-pointer duration-150 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                      ← PREV
                    </button>
                    <button
                      type="button"
                      disabled={activeChatMatches.length <= 1}
                      onClick={() => {
                        const nextIdx = (chatSearchMatchIndex + 1) % activeChatMatches.length;
                        setChatSearchMatchIndex(nextIdx);
                        const targetId = activeChatMatches[nextIdx];
                        if (targetId) handleScrollToMessage(targetId);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-lg text-[10px] text-slate-350 hover:text-white font-mono uppercase tracking-wider select-none cursor-pointer duration-150 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                    >
                      NEXT →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatSearch(false);
                        setChatSearchQuery('');
                        setChatSearchMatchIndex(0);
                      }}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-450 cursor-pointer"
                      title="Clear & Close finder"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const activeChat = chats.find(c => c.id === activeChatId);
                if (!activeChat || !activeChat.pinnedMessageId) return null;
                
                const pinnedMessage = messages.find(m => m.id === activeChat.pinnedMessageId) || allMyMessages.find(m => m.id === activeChat.pinnedMessageId);
                
                let displayedContent = '[Plain text not found]';
                if (pinnedMessage) {
                  displayedContent = pinnedMessage.content;
                  if (pinnedMessage.isEncrypted) {
                    const cached = decryptedCache[pinnedMessage.id];
                    if (cached) {
                      try {
                        const parsed = JSON.parse(cached);
                        displayedContent = parsed.text || cached;
                      } catch (e) {
                        displayedContent = cached;
                      }
                    } else {
                      displayedContent = '🔐 Encrypted secure message';
                    }
                  }
                } else {
                  displayedContent = '📌 Secure pinned message (click to locate in stream)';
                }

                return (
                  <div className="bg-[#111622] border-b border-sky-500/20 px-6 py-2.5 flex items-center justify-between gap-4 text-xs z-10 select-none shrink-0">
                    <div 
                      onClick={() => {
                        const element = document.getElementById(`message-bubble-${activeChat.pinnedMessageId}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group/pin hover:opacity-90 transition-all flex-1"
                    >
                      <Pin size={13} className="text-sky-400 rotate-45 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wider font-mono">Pinned Message</span>
                        <span className="text-slate-350 truncate text-[11px]">
                          {displayedContent}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePinMessage(activeChat.id, null)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                      title="Unpin Message"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })()}

              {/* Messages Thread list */}
              <div
                id="messages-canvas-viewport"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/40 relative"
              >
                {/* Drag and Drop visual feedback overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-[#0A0C12]/95 border-2 border-dashed border-sky-500/40 m-2 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-sm z-50 transition-all pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 animate-pulse">
                      <Paperclip size={24} className="rotate-45" />
                    </div>
                    <span className="text-sm font-bold text-sky-400">Drop file here to share</span>
                    <span className="text-[10px] text-slate-500 font-mono text-center max-w-xs leading-relaxed">
                      Files are cryptographically protected client-side under the peer's identity key before transmitting.
                    </span>
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="w-16 h-16 rounded-full bg-slate-800/40 border border-slate-700/50 flex items-center justify-center text-slate-500 mb-4 animate-bounce">
                      <Lock size={26} />
                    </div>
                    <span className="text-xs font-bold text-slate-350">Cryptic Tunnel Initialized</span>
                    <p className="text-[11px] text-slate-500 max-w-xs mt-1.5 leading-relaxed font-mono">
                      All messages in this session are fully encrypted client-side using strong cryptographic algorithms. Nobody can read your transmissions!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (!currentUser) return null;
                    const isSelf = msg.senderId === currentUser.id;
                    const isRecalled = msg.recalled;
                    const reactionsList = msg.reactions || [];

                    // Retrieve decrypted text from cache if E2EE
                    let displayedContent = msg.content;
                    let decryptedFileUrl = msg.fileUrl;
                    let decryptedFileName = msg.fileName;
                    let decryptedFileSize = msg.fileSize;

                    if (msg.isEncrypted && !isRecalled) {
                      const cached = decryptedCache[msg.id];
                      if (cached) {
                        try {
                          const parsed = JSON.parse(cached);
                          displayedContent = parsed.text;
                          decryptedFileUrl = parsed.fileUrl;
                          decryptedFileName = parsed.fileName;
                          decryptedFileSize = parsed.fileSize;
                        } catch (e) {
                          displayedContent = cached;
                        }
                      } else {
                        displayedContent = '🔐 Encrypted Package... Decrypting...';
                      }
                    }

                    // Self destruct ticks rendering
                    let remainingSelfDestructSeconds: number | null = null;
                    if (msg.selfDestructAt && !isRecalled) {
                      remainingSelfDestructSeconds = Math.max(0, Math.ceil((msg.selfDestructAt - Date.now()) / 1000));
                    }

                    // Parse custom location / card / transfer payloads
                    let locationPayload: { lat: number; lng: number; address: string } | null = null;
                    let cardPayload: { cardNumber: string; cardType: 'Visa' | 'Mastercard'; bankName: string; holderName: string } | null = null;
                    let transferPayload: { amount: string; currency: string; cardLast4: string; bankName: string; cardType: string; holderName: string; transactionId: string; status: string } | null = null;

                    if (!isRecalled) {
                      if (msg.isEncrypted) {
                        const cached = decryptedCache[msg.id];
                        if (cached) {
                          try {
                            const parsed = JSON.parse(cached);
                            if (parsed.location) locationPayload = parsed.location;
                            if (parsed.card) cardPayload = parsed.card;
                            if (parsed.transfer) transferPayload = parsed.transfer;
                          } catch (e) {
                            // Raw decrypted packet
                          }
                        }
                      } else {
                        try {
                          const parsed = JSON.parse(msg.content);
                          if (parsed.lat && parsed.lng) locationPayload = parsed as any;
                          if (parsed.cardNumber) cardPayload = parsed as any;
                          if (parsed.amount) transferPayload = parsed as any;
                        } catch (e) {
                          // open text
                        }
                      }
                    }

                    return (
                      <motion.div
                        key={msg.id}
                        id={`message-bubble-${msg.id}`}
                        layout="position"
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} group/msg relative`}
                      >
                        {/* Reaction Trigger Panel */}
                        {!isRecalled && (
                          <div
                            className={`absolute -top-7 z-10 hidden group-hover/msg:flex items-center gap-1.5 bg-[#0E121A] p-1.5 rounded-xl border border-slate-800 shadow-xl ${
                              isSelf ? 'right-2' : 'left-2'
                            }`}
                          >
                            {['👍', '❤️', '🔥', '😂', '😮', '😢'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleSelectReaction(msg.id, emoji)}
                                className="hover:scale-130 transition-transform px-1 focus:outline-none"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mb-1.5 max-w-[80%]">
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            {isSelf ? 'You' : `@${msg.senderName}`}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">
                            • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {starredMessageIds[msg.id] && (
                            <Star size={11} className="text-amber-450 fill-amber-450/40 shrink-0 ml-1 animate-pulse" title="Starred Secure Message" />
                          )}
                        </div>

                        {/* Bubble Body wrapper */}
                        <div
                          className={`relative p-3.5 rounded-2xl max-w-[80%] border flex flex-col gap-1.5 ${
                            isSelf
                              ? 'bg-sky-500/10 border-sky-500/30 text-sky-100 rounded-tr-none shadow-[0_4px_20px_rgba(14,165,233,0.08)]'
                              : 'bg-[#1A1F2B] border-slate-700/50 text-slate-200 rounded-tl-none'
                          } ${isRecalled ? 'italic text-slate-600 border-slate-800 bg-[#0E121A]/30' : ''} ${
                            showChatSearch && activeChatMatches[chatSearchMatchIndex] === msg.id
                              ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-[#070A10] bg-amber-500/5 border-amber-550/50 shadow-[0_0_25px_rgba(245,158,11,0.25)] scale-[1.01]'
                              : ''
                          } transition-all duration-300`}
                        >
                          {/* Secure Inline Deletion Warn Panel */}
                          {messageDeletingId === msg.id ? (
                            <div className="p-1.5 text-left select-none max-w-xs font-sans">
                              <span className="block text-[11px] font-extrabold text-rose-500 mb-2 font-mono uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                                <AlertTriangle size={13} className="text-rose-500" />
                                PURGE MESSAGE MEMORY?
                              </span>
                              <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                                Permanently purge transmission bytes? This deletes the message on all devices immediately.
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="px-2.5 py-1 text-[9.5px] bg-rose-600 hover:bg-rose-500 text-white rounded font-bold uppercase tracking-wider cursor-pointer font-sans transition-colors border border-rose-500/10 active:scale-95"
                                >
                                  PURGE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMessageDeletingId(null)}
                                  className="px-2.5 py-1 text-[9.5px] bg-[#1A1F2B] hover:bg-slate-800 text-slate-350 rounded font-bold uppercase tracking-wider cursor-pointer border border-slate-700/60 transition-colors active:scale-95"
                                >
                                  CANCEL
                                </button>
                              </div>
                            </div>
                          ) : (
                            isSelf && !isRecalled && (
                              <button
                                onClick={() => handleRecallMessage(msg.id)}
                                className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white bg-[#0E121A] rounded-lg border border-slate-800 hidden group-hover/msg:block transition-all shadow"
                                title="Recall Message from Timeline"
                              >
                                <Undo2 size={13} />
                              </button>
                            )
                          )}

                          {msg.isForwarded && (
                            <div className="flex items-center gap-1 text-[9.5px] text-emerald-400 font-mono font-bold select-none pb-0.5 border-b border-emerald-500/10 mb-0.5">
                              <CornerUpRight size={10} className="text-emerald-400 shrink-0 animate-pulse" />
                              <span>Forwarded from {msg.forwardedFromName || 'Unknown'}</span>
                            </div>
                          )}

                          {/* Unified Hover Action Menu (Star, Reply, Forward, Pin, Hard Delete) */}
                          {!isRecalled && (
                            <div className={`absolute ${isSelf ? '-left-[142px]' : '-right-[142px]'} flex items-center gap-1.5 bg-[#0A0C14]/93 backdrop-blur-md px-1.5 py-1 rounded-xl border border-slate-800/85 hover:border-slate-700/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hidden group-hover/msg:flex z-20 transition-all top-1/2 -translate-y-1/2`}>
                              {/* Star / Unstar Action */}
                              <button
                                onClick={() => handleToggleStarMessage(msg.id)}
                                className={`p-1 rounded-md transition-all cursor-pointer hover:bg-amber-500/10 ${
                                  starredMessageIds[msg.id]
                                    ? 'text-amber-450'
                                    : 'text-slate-400 hover:text-amber-400'
                                }`}
                                title={starredMessageIds[msg.id] ? "Unstar Message" : "Star Message"}
                              >
                                <Star size={12} className={starredMessageIds[msg.id] ? "fill-amber-450" : ""} />
                              </button>

                              <button
                                onClick={() => {
                                  setActiveThreadMessage(msg);
                                  setActiveRightTab('thread');
                                  setReplyToId(msg.id);
                                }}
                                className="p-1 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-md transition-all cursor-pointer"
                                title="Reply & Start E2EE Thread"
                              >
                                <CornerUpLeft size={12} />
                              </button>
                              <button
                                onClick={() => setForwardMessage(msg)}
                                className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-all cursor-pointer"
                                title="Forward message"
                              >
                                <CornerUpRight size={12} />
                              </button>
                              
                              {/* Pin Toggle Control right next to Delete */}
                              {(() => {
                                const activeChat = chats.find(c => c.id === activeChatId);
                                if (!activeChat) return null;
                                const isPinned = activeChat.pinnedMessageId === msg.id;
                                return (
                                  <button
                                    onClick={() => handleTogglePinMessage(activeChat.id, isPinned ? null : msg.id)}
                                    className={`p-1 rounded-md transition-all cursor-pointer hover:bg-amber-500/10 ${
                                      isPinned 
                                        ? 'text-amber-450' 
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                    title={isPinned ? "Unpin message" : "Pin message to chat"}
                                  >
                                    <Pin size={12} className={isPinned ? "rotate-45" : ""} />
                                  </button>
                                );
                              })()}

                              {/* Hard Deletion Action */}
                              <button
                                onClick={() => setMessageDeletingId(msg.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 rounded-md transition-all cursor-pointer"
                                title="Hard Delete message"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}

                          {/* Visual thread / reply link */}
                          {msg.replyToId && (() => {
                            const parentMsg = messages.find(m => m.id === msg.replyToId);
                            let parentContent = '';
                            let parentSender = 'Unknown';
                            
                            if (parentMsg) {
                              parentSender = parentMsg.senderName;
                              parentContent = parentMsg.content || '';
                              if (parentMsg.isEncrypted) {
                                const cachedParent = decryptedCache[parentMsg.id];
                                if (cachedParent) {
                                  try {
                                    const parsed = JSON.parse(cachedParent);
                                    parentContent = parsed.text || '[Attachment]';
                                  } catch (e) {
                                    parentContent = cachedParent;
                                  }
                                } else {
                                  parentContent = '🔐 Encrypted secure message';
                                }
                              }
                              if (parentMsg.recalled) {
                                parentContent = '🚫 This message was recalled.';
                              }
                            } else {
                              parentContent = 'Original message is unavailable';
                            }

                             return (
                               <div
                                 onClick={() => parentMsg && handleScrollToMessage(parentMsg.id)}
                                 className={`mb-1.5 py-1 px-3 border-l-2 bg-[#0C101B]/40 text-[10.5px] rounded-r-lg flex flex-col gap-0.5 select-none transition-all text-left cursor-pointer hover:bg-[#0C101B]/80 group/reply relative active:scale-[0.99] duration-150 ${
                                   isSelf
                                     ? 'border-sky-500 text-sky-200'
                                     : 'border-emerald-500 text-emerald-100'
                                 }`}
                                 title="Click to locate original message in stream"
                               >
                                 <div className="flex items-center gap-1">
                                   <CornerUpLeft size={10} className={`shrink-0 transition-transform group-hover/reply:-translate-x-0.5 ${isSelf ? 'text-sky-450' : 'text-emerald-450'}`} />
                                   <span className={`font-extrabold text-[9px] uppercase tracking-wider font-mono ${isSelf ? 'text-sky-450' : 'text-emerald-450'}`}>
                                     {parentSender === currentUser?.displayName ? 'You' : parentSender}
                                   </span>
                                 </div>
                                 <span className="truncate max-w-sm block text-slate-400 text-[10px] leading-normal font-sans pt-0.5">
                                   {parentContent}
                                 </span>
                               </div>
                             );
                          })()}

                          {/* Message Content Text */}
                          {locationPayload ? (
                            <div className="my-1 text-left">
                              <div className="p-3 bg-[#0D101A]/95 border border-emerald-500/25 rounded-2xl flex flex-col gap-2.5 font-sans w-72 max-w-full shadow-lg">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
                                    <MapPin size={16} className="animate-pulse" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-white block truncate">{locationPayload.address || "Curated Sandbox Location"}</span>
                                    <span className="text-[9px] text-emerald-400 font-mono font-bold tracking-tight uppercase block">Secure GPS Signal</span>
                                  </div>
                                </div>
                                <div className="relative h-28 bg-[#0F121D] rounded-lg border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center p-3 parent-radar-glow">
                                  {/* Cyber Grid Lines Overlay */}
                                  <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                                  
                                  {/* Radar Sweep Effect */}
                                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_50%,rgba(16,185,129,0.1)_100%)] animate-[spin_5s_linear_infinite]" />
                                  
                                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent)] animate-pulse" />
                                  
                                  {/* Dynamic Radar Ring */}
                                  <div className="absolute w-20 h-20 rounded-full border border-emerald-500/15 animate-[ping_3s_infinite]" />
                                  <div className="absolute w-10 h-10 rounded-full border border-emerald-400/25 animate-[ping_1.5s_infinite]" />
                                  
                                  {/* Center Pin Indicator */}
                                  <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 relative z-10 shadow-[0_0_15px_rgba(52,211,153,1)] animate-bounce duration-1000" />
                                  
                                  <div className="relative z-10 bg-slate-950/70 border border-slate-850 px-2 py-0.5 rounded mt-3 backdrop-blur-sm shadow-sm">
                                    <span className="text-[8.5px] text-slate-400 font-mono tracking-widest uppercase font-bold">
                                      COORD: {locationPayload.lat.toFixed(5)}, {locationPayload.lng.toFixed(5)}
                                    </span>
                                  </div>
                                </div>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${locationPayload.lat},${locationPayload.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-450 border border-emerald-500/30 font-extrabold text-[10px] text-slate-950 font-sans tracking-wider uppercase rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer decoration-none"
                                >
                                  <Compass size={11} />
                                  Launch Satellite Radar
                                </a>
                              </div>
                            </div>
                          ) : cardPayload ? (
                            <div className="my-1">
                              <div className="flex flex-col gap-2.5">
                                {(() => {
                                  const theme = (cardPayload as any).theme || (cardPayload.cardType === 'Visa' ? 'blue' : 'gold');
                                  let bgClass = 'bg-gradient-to-br from-[#12141D] via-[#1A1E29] to-[#0A0C12] border-slate-705 shadow-xl';
                                  if (theme === 'blue') {
                                    bgClass = 'bg-gradient-to-br from-[#0b1b3d] via-[#122b61] to-[#070e1e] border-sky-500/40 shadow-sky-500/5';
                                  } else if (theme === 'platinum') {
                                    bgClass = 'bg-gradient-to-br from-[#2b303c] via-[#454c5c] to-[#1d212b] border-slate-500/40 shadow-lg';
                                  } else if (theme === 'gold') {
                                    bgClass = 'bg-gradient-to-br from-[#261d10] via-[#4a361c] to-[#14100b] border-amber-500/40 shadow-amber-500/5';
                                  }

                                  return (
                                    <div className={`p-4 rounded-2xl w-72 h-44 border flex flex-col justify-between shadow-2xl relative overflow-hidden text-left transition-all ${bgClass}`}>
                                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                                      <div className="flex items-center justify-between z-10">
                                        <span className="text-[10px] font-extrabold text-slate-300 font-mono tracking-widest uppercase">
                                          {cardPayload.bankName || 'Sovereign Bank'}
                                        </span>
                                        {cardPayload.cardType === 'Visa' ? (
                                          <span className="text-white font-extrabold text-xs tracking-tight italic font-mono uppercase">VISA</span>
                                        ) : (
                                          <span className="text-white font-extrabold text-xs tracking-tight italic font-mono uppercase">MC</span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between z-10 mt-1">
                                        <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-amber-500 rounded border border-yellow-200/20 relative shadow-[0_2px_10px_rgba(0,0,0,0.3)] shrink-0">
                                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1),transparent)]" />
                                        </div>
                                        <div className="flex gap-0.5 text-slate-400 rotate-90 scale-75 font-mono select-none">
                                          <span>(((</span>
                                        </div>
                                        <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest leading-none shrink-0 self-center">E2EE CHIP SECURE</span>
                                      </div>
                                      <div className="text-sm font-semibold tracking-widest text-white font-mono my-2 z-10 select-all">
                                        ••••  ••••  ••••  {cardPayload.cardNumber.slice(-4)}
                                      </div>
                                      <div className="flex items-end justify-between font-mono z-10 leading-none">
                                        <div className="flex flex-col min-w-0 pr-2">
                                          <span className="text-[7.5px] uppercase text-slate-400 tracking-wider">Card Holder</span>
                                          <span className="text-[10.5px] font-bold text-slate-100 truncate uppercase mt-0.5">{cardPayload.holderName || "Global Agent"}</span>
                                        </div>
                                        <div className="flex flex-col text-center shrink-0">
                                          <span className="text-[7.5px] uppercase text-slate-450 tracking-wider">EXP</span>
                                          <span className="text-[10px] font-bold text-slate-100 mt-0.5">{(cardPayload as any).expiry || "12/31"}</span>
                                        </div>
                                        <div className="flex flex-col text-right shrink-0">
                                          <span className="text-[7.5px] uppercase text-slate-455 tracking-wider">CVV</span>
                                          <span className="text-[10px] font-bold text-slate-100 mt-0.5">{(cardPayload as any).cvv || "•••"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {!isSelf && (
                                  <button
                                    onClick={() => {
                                      setTransferAmount('250.00');
                                      setActiveTransferCard(cardPayload);
                                      setTransferTargetMsgId(msg.id);
                                      setTransferStep(0);
                                    }}
                                    className="w-full py-2 bg-amber-550 hover:bg-amber-500 font-extrabold text-[10.5px] text-slate-950 font-sans tracking-wide uppercase rounded-xl transition-all shadow-[0_4px_12px_rgba(245,158,11,0.15)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                                  >
                                    <CreditCard size={12} className="text-slate-950" />
                                    PROCEED TRANSFER / SEND FUNDS
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : transferPayload ? (
                            <div className="my-1 text-left">
                              <div className="p-3.5 bg-[#121624] border border-slate-800 rounded-2xl font-sans w-72 max-w-full shadow-lg">
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-2.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9.5px] font-bold text-slate-400 font-mono tracking-wider uppercase">LEDGER RECEIVED</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[8px] font-mono font-bold uppercase select-none">
                                    SETTLED
                                  </span>
                                </div>
                                <div className="text-center my-3">
                                  <div className="text-2xl font-black text-emerald-400 tracking-tight font-mono">
                                    +${parseFloat(transferPayload.amount).toFixed(2)}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">USD TRANSFERRED VALUE</div>
                                </div>
                                <div className="space-y-1.5 border-t border-slate-800/60 pt-2.5 text-[9.5px] font-mono text-slate-400">
                                  <div className="flex justify-between">
                                    <span>DEST BANK:</span>
                                    <span className="text-slate-200 uppercase truncate max-w-[160px] text-right">{transferPayload.bankName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>TARGET CARD:</span>
                                    <span className="text-slate-200">•••• {transferPayload.cardLast4} ({transferPayload.cardType})</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>HOLDER ACCT:</span>
                                    <span className="text-slate-200 truncate max-w-[140px] text-right uppercase">{transferPayload.holderName}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-slate-850/40 pt-1.5 mt-1.5 text-slate-500">
                                    <span>TXID BLOCK:</span>
                                    <span className="text-slate-400">{transferPayload.transactionId}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs whitespace-pre-wrap leading-relaxed break-words font-sans">
                              {highlightMatchedText(displayedContent, chatSearchQuery)}
                            </p>
                          )}

                          {/* Render File Attachments */}
                          {decryptedFileUrl && !isRecalled && (() => {
                            const mediaType = getMediaType(decryptedFileName, msg.fileMimeType);
                            const isImg = mediaType === 'image';
                            const isVid = mediaType === 'video';
                            const isAudio = msg.fileMimeType?.startsWith('audio/') || decryptedFileName?.includes('voice-message') || decryptedFileName?.endsWith('.webm') || decryptedFileName?.endsWith('.ogg');

                            return (
                              <div className="mt-2 flex flex-col gap-2">
                                {/* If voice or audio file, show visual player */}
                                {isAudio && (
                                  <VoiceAudioPlayer src={decryptedFileUrl!} />
                                )}

                                {/* If image or video, show visual thumbnail */}
                                {(isImg || isVid) && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxMedia({
                                      url: decryptedFileUrl!,
                                      name: decryptedFileName || 'Media Preview',
                                      type: mediaType
                                    })}
                                    className="group relative max-w-sm rounded-lg overflow-hidden border border-slate-800 bg-slate-950/40 hover:border-sky-500/40 transition-all text-left flex items-center justify-center cursor-pointer"
                                  >
                                    {isImg ? (
                                      <img
                                        src={decryptedFileUrl}
                                        alt={decryptedFileName}
                                        referrerPolicy="no-referrer"
                                        className="max-h-48 w-auto object-cover rounded-lg group-hover:scale-102 transition-all"
                                      />
                                    ) : (
                                      <div className="relative flex items-center justify-center w-full h-36 bg-slate-950">
                                        <video
                                          src={decryptedFileUrl}
                                          referrerPolicy="no-referrer"
                                          className="h-full w-auto object-cover opacity-80"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
                                          <Video size={32} className="text-white drop-shadow" />
                                        </div>
                                      </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-[#0E121A]/85 p-1 px-2 rounded-md border border-slate-800 text-[8.5px] text-slate-300 font-bold font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-all">
                                      CLICK TO PLAY/PREVIEW
                                    </div>
                                  </button>
                                )}

                                <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between gap-5 font-mono">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isImg || isVid) {
                                        setLightboxMedia({
                                          url: decryptedFileUrl!,
                                          name: decryptedFileName || 'Media Preview',
                                          type: mediaType
                                        });
                                      }
                                    }}
                                    className={`flex items-center gap-2.5 min-w-0 text-left ${isImg || isVid ? 'cursor-pointer hover:text-white' : 'pointer-events-none'}`}
                                  >
                                    {isImg ? (
                                      <Eye size={16} className="text-sky-400 shrink-0" />
                                    ) : isVid ? (
                                      <Video size={16} className="text-emerald-400 shrink-0" />
                                    ) : (
                                      <File size={16} className="text-slate-400 shrink-0" />
                                    )}
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[11px] font-bold text-slate-200 truncate group-hover:text-white">
                                        {decryptedFileName}
                                      </span>
                                      <span className="text-[9px] text-slate-500">
                                        {decryptedFileSize ? formatBytes(decryptedFileSize) : 'Shared encrypted stream'}
                                      </span>
                                    </div>
                                  </button>
                                  <a
                                    href={decryptedFileUrl}
                                    download={decryptedFileName}
                                    referrerPolicy="no-referrer"
                                    className="p-1 px-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-[9px] text-sky-400 font-bold rounded-md border border-sky-500/30 transition-colors flex items-center gap-1 select-none"
                                  >
                                    <Download size={11} />
                                    DOWNLOAD
                                  </a>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Encryption status tag */}
                          {msg.isEncrypted && !isRecalled && (
                            <div className="flex items-center gap-1 text-[9px] text-sky-400 font-mono mt-0.5 font-bold uppercase tracking-wider">
                              <Lock size={10} className="text-sky-400/85" />
                              End-to-End Cryptic
                            </div>
                          )}

                          {/* Self destructing timer tags */}
                          {remainingSelfDestructSeconds !== null && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-red-450 font-mono text-red-450/90 tracking-wider mt-0.5 animate-pulse flex-wrap">
                              <Flame size={12} className="text-red-500 shrink-0 animate-bounce" />
                              <span className="uppercase">SELF-DESTRUCT IN 00:{remainingSelfDestructSeconds.toString().padStart(2, '0')}s</span>
                            </div>
                          )}

                          {/* Thread sub-conversation indicator link */}
                          {(() => {
                            const count = messages.filter(m => m.replyToId === msg.id).length;
                            if (count === 0) return null;
                            return (
                              <button
                                onClick={() => {
                                  setActiveThreadMessage(msg);
                                  setActiveRightTab('thread');
                                }}
                                className="mt-2 text-[10px] text-sky-450 font-mono font-semibold flex items-center gap-1.5 hover:underline cursor-pointer bg-sky-500/10 py-1.5 px-2.5 border border-sky-500/15 rounded-lg saturate-75 w-max tracking-wide text-left"
                              >
                                <MessageSquare size={10} />
                                <span>{count} {count === 1 ? 'thread reply' : 'thread replies'}</span>
                              </button>
                            );
                          })()}
                        </div>

                        {/* Message Reactions render row */}
                        {reactionsList.length > 0 && (
                          <div className={`flex items-center gap-1.5 mt-1 pl-2 pr-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            {(() => {
                              // group reactions by emoji
                              const grouped: { [emoji: string]: number } = {};
                              reactionsList.forEach(r => {
                                grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
                              });

                              return Object.entries(grouped).map(([emoji, count]) => (
                                <div
                                  key={emoji}
                                  className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-full text-[10.5px] font-bold font-mono flex items-center gap-1 text-slate-300"
                                >
                                  <span>{emoji}</span>
                                  <span>{count}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        )}

                        {/* Overlapping "Read by" participant avatars under the message */}
                        {(() => {
                          const readers = msg.viewedBy.filter((rId: string) => rId !== msg.senderId);
                          if (readers.length === 0) return null;

                          return (
                            <div className={`flex items-center gap-1.5 mt-1.5 pl-2 pr-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Read by:</span>
                              <div className="flex -space-x-1 overflow-hidden">
                                {readers.map((rId: string) => {
                                  const readerObj = allUsers.find(u => u.id === rId);
                                  if (!readerObj) return null;
                                  return (
                                    <img
                                      key={rId}
                                      src={readerObj.avatarUrl}
                                      alt={readerObj.displayName}
                                      title={`Read by ${readerObj.displayName}`}
                                      referrerPolicy="no-referrer"
                                      className="w-4 h-4 rounded-full border border-slate-900 bg-[#1A1F2B] hover:scale-115 hover:z-10 transition-all cursor-help object-cover"
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Typing Panel */}
              {(() => {
                const activeChat = chats.find(c => c.id === activeChatId);
                const isGroup = activeChat?.type === 'group';

                return (
                  <form
                    onSubmit={handleSendMessage}
                    className="p-4 bg-[#0E121A]/80 backdrop-blur-md border-t border-slate-800/50 flex flex-col gap-2.5 shrink-0"
                  >
                    {/* Scheduled Messages Queue Status Indicator */}
                    {scheduledMessages.length > 0 && (
                      <div className="px-3 py-1.5 rounded-lg bg-[#0C1525]/90 border border-sky-500/15 text-sky-400 font-mono text-[10px] flex items-center justify-between gap-3 font-semibold shrink-0 shadow-[0_2px_8px_rgba(14,165,233,0.03)] animate-fade-in">
                        <div className="flex items-center gap-2.5 uppercase tracking-wide">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-400"></span>
                          </span>
                          <span>{scheduledMessages.length} message{scheduledMessages.length > 1 ? 's' : ''} scheduled for dispatch</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowScheduledListModal(true)}
                          className="px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500 hover:text-slate-950 border border-sky-500/20 rounded text-[8.5px] font-mono font-bold uppercase transition-all tracking-widest cursor-pointer"
                        >
                          View Queue
                        </button>
                      </div>
                    )}

                    {/* Attachment Warning Banner */}
                    {attachmentWarning && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3 text-[11px] text-red-400 font-sans">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-red-400 shrink-0" />
                          <span>{attachmentWarning}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachmentWarning(null)}
                          className="text-xs hover:text-white transition-colors p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Selected File Ribbon preview */}
                    {selectedFile && (() => {
                      const mType = getMediaType(selectedFile.name, selectedFile.type);
                      return (
                        <div className="p-3 rounded-lg bg-[#1A1F2B] border border-slate-800/80 flex items-center justify-between gap-4 font-mono animate-fade-in select-none">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {mType === 'image' ? (
                              <Eye size={14} className="text-sky-450 text-sky-400 shrink-0" />
                            ) : mType === 'video' ? (
                              <Video size={14} className="text-emerald-450 text-emerald-400 shrink-0" />
                            ) : (
                              <File size={14} className="text-slate-450 text-slate-400 shrink-0" />
                            )}
                            <div className="flex flex-col min-w-0 font-sans">
                              <span className="text-xs font-bold text-slate-200 truncate">{selectedFile.name}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                                <span>{formatBytes(selectedFile.size)}</span>
                                <span className="text-slate-700">•</span>
                                <span className={mType === 'binary' ? 'text-slate-400' : 'text-sky-400'}>
                                  {mType === 'binary' ? 'Unsupported media (sent as file)' : 'Secured media packet'}
                                </span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="px-2.5 py-1 text-[10px] text-red-400 hover:bg-red-500/10 rounded border border-[#ef4444]/25 transition-colors font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Discard
                          </button>
                        </div>
                      );
                    })()}

                    {/* Reply to Message Preview Ribbon */}
                    {replyToId && (() => {
                      const parentMsg = messages.find(m => m.id === replyToId);
                      if (!parentMsg) return null;
                      let parentContent = parentMsg.content || '';
                      if (parentMsg.isEncrypted) {
                        const cachedParent = decryptedCache[parentMsg.id];
                        if (cachedParent) {
                          try {
                            const parsed = JSON.parse(cachedParent);
                            parentContent = parsed.text || '[Attachment]';
                          } catch (e) {
                            parentContent = cachedParent;
                          }
                        } else {
                          parentContent = '🔐 Encrypted secure packet';
                        }
                      }
                      if (parentMsg.recalled) {
                        parentContent = 'This message was recalled.';
                      }
                      
                      return (
                        <div className="p-3 rounded-lg bg-[#111622] border-l-2 border-sky-500 border-y border-r border-slate-800/80 flex items-center justify-between gap-4 animate-fade-in select-none">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CornerUpLeft size={14} className="text-sky-400 shrink-0" />
                            <div className="flex flex-col min-w-0 font-sans">
                              <span className="text-[10px] font-bold text-sky-400 font-mono tracking-wide">
                                Replying to {parentMsg.senderId === currentUser?.id ? 'Yourself' : `@${parentMsg.senderName}`}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-lg">
                                {parentContent}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyToId(null)}
                            className="px-2.5 py-1 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded border border-slate-850/40 transition-all font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-3">
                      {/* Attachment File Trigger & Microphone */}
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="file"
                            id="chat-file-attachment-element"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('chat-file-attachment-element')?.click()}
                            className="h-10 w-10 flex items-center justify-center bg-[#1A1F2B] hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-800/60 active:scale-95 cursor-pointer"
                            title="Attach document or graphic"
                          >
                            <Paperclip size={15} />
                          </button>
                        </div>

                        {!isRecording && (
                          <>
                            <button
                              type="button"
                              onClick={startVoiceRecording}
                              className="h-10 w-10 flex items-center justify-center bg-[#1A1F2B] hover:bg-[#201518] text-rose-500 hover:text-rose-450 rounded-lg transition-all border border-slate-800/60 active:scale-95 cursor-pointer"
                              title="Record voice message"
                            >
                              <Mic size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowLocationModal(true)}
                              className="h-10 w-10 flex items-center justify-center bg-[#1A1F2B] hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-450 rounded-lg transition-all border border-slate-800/60 active:scale-95 cursor-pointer"
                              title="Share geo-location coordinate"
                            >
                              <MapPin size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCardNoInput('');
                                setCardHolderInput(currentUser?.displayName || '');
                                setShowCardModal(true);
                              }}
                              className="h-10 w-10 flex items-center justify-center bg-[#1A1F2B] hover:bg-amber-500/10 text-amber-500 hover:text-amber-450 rounded-lg transition-all border border-slate-800/60 active:scale-95 cursor-pointer"
                              title="Attach Visa / Mastercard secure transfer card"
                            >
                              <CreditCard size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const defaultTime = new Date(Date.now() + 5 * 60000); // Default schedule to +5 mins
                                const tzOffset = defaultTime.getTimezoneOffset() * 60000;
                                const localISOTime = (new Date(defaultTime.getTime() - tzOffset)).toISOString().slice(0, 16);
                                setScheduledTime(localISOTime);
                                setShowScheduleModal(true);
                              }}
                              className="h-10 w-10 flex items-center justify-center bg-[#1A1F2B] hover:bg-sky-505/10 hover:bg-sky-500/10 text-sky-400 hover:text-sky-350 rounded-lg transition-all border border-slate-800/60 active:scale-95 cursor-pointer"
                              title="Schedule message for automated delivery"
                            >
                              <Clock size={15} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Main Input or Recording HUD */}
                      {isRecording ? (
                        <div className="flex-1 flex items-center justify-between h-10 px-3 bg-rose-950/25 border border-rose-500/30 rounded-lg font-sans shadow-[0_0_12px_rgba(239,68,68,0.05)]">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            
                            <span className="text-[10.5px] font-bold text-rose-455 text-rose-400 font-mono tracking-wider uppercase flex items-center gap-1.5">
                              RECORDING VOICE • {formatSeconds(recordingSeconds)}
                            </span>

                            {/* Tactical Audio Sync Wave */}
                            <div className="flex items-end gap-[2px] h-2.5 ml-1 leading-none shrink-0 select-none">
                              <span className="w-[1.5px] h-1.5 bg-rose-500 rounded-full animate-pulse [animation-delay:0.1s]"></span>
                              <span className="w-[1.5px] h-2.5 bg-rose-500 rounded-full animate-pulse [animation-delay:0.3s]"></span>
                              <span className="w-[1.5px] h-1 bg-rose-500 rounded-full animate-pulse [animation-delay:0s]"></span>
                              <span className="w-[1.5px] h-2 bg-rose-500 rounded-full animate-pulse [animation-delay:0.5s]"></span>
                              <span className="w-[1.5px] h-1.5 bg-rose-500 rounded-full animate-pulse [animation-delay:0.2s]"></span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={cancelVoiceRecording}
                              className="px-2.5 py-1 text-[9.5px] text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/85 rounded font-bold uppercase tracking-wider cursor-pointer font-sans transition-all active:scale-95"
                            >
                              Discard
                            </button>
                            <button
                              type="button"
                              onClick={stopVoiceRecording}
                              className="px-2.5 py-1 text-[9.5px] bg-rose-500 hover:bg-rose-450 text-slate-950 rounded font-bold uppercase tracking-wider cursor-pointer font-sans flex items-center gap-1 transition-all shadow-[0_2px_8px_rgba(239,68,68,0.2)] active:scale-95"
                            >
                              <MicOff size={10} /> STOP & ATTACH
                            </button>
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder={
                            isGroup 
                              ? 'Broadcast standard public text channel message...' 
                              : 'Compose End-to-End Encrypted message...'
                          }
                          value={messageInput}
                          onChange={(e) => handleMessageInputChange(e.target.value)}
                          onBlur={() => {
                            if (amTypingRef.current) {
                              amTypingRef.current = false;
                              broadcastTyping(false);
                            }
                          }}
                          className="flex-1 h-10 px-3.5 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all font-sans"
                        />
                      )}

                      {/* Self Destruct Countdown Panel Options (Only in direct E2EE chats) */}
                      {!isGroup && !isRecording && (
                        <div className="flex items-center gap-1 h-10 bg-[#1A1F2B] border border-slate-800/80 rounded-lg px-2">
                          <Clock size={14} className="text-slate-500" />
                          <select
                            value={selfDestructSecs}
                            onChange={(e) => setSelfDestructSecs(Number(e.target.value))}
                            className="bg-transparent border-0 text-[11px] text-slate-400 font-mono outline-none py-1.5 pr-1 select-none active:scale-95 cursor-pointer"
                            title="Auto-delete message after receipt view"
                          >
                            <option value={0} className="bg-[#0E121A] text-slate-300">No Destruct</option>
                            <option value={5} className="bg-[#0E121A] text-slate-300">5s</option>
                            <option value={10} className="bg-[#0E121A] text-slate-300">10s</option>
                            <option value={30} className="bg-[#0E121A] text-slate-300">30s</option>
                            <option value={60} className="bg-[#0E121A] text-slate-300">1m</option>
                          </select>
                        </div>
                      )}

                      {/* Send submit button */}
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="h-10 w-10 bg-sky-500 hover:bg-sky-450 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-40 font-bold shadow-[0_0_15px_rgba(14,165,233,0.3)] shrink-0"
                      >
                        {isUploading ? <RefreshCw className="animate-spin" size={15} /> : <Send size={15} />}
                      </button>
                    </div>
                  </form>
                );
              })()}
            </>
          ) : (
            // No active session chat opened
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#0A0C12]/40">
              <div className="w-16 h-16 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(14,165,233,0.15)] relative animate-pulse">
                <Lock size={24} className="text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select thread to synch</h3>
              <p className="text-[11px] text-slate-500 font-mono mt-1.5 pr-6 pl-6 max-w-xs leading-relaxed">
                Choose an alias above to initiate a hardware-synchronized encryption tunnel or create a multi-party group channel.
              </p>
            </div>
          )}
        </main>

        {/* 4. Split Right Dynamic Tabs Drawers */}
        {activeRightTab === 'notes' && activeChatId && (
          <NotesTab
            chatId={activeChatId}
            initialValue={chats.find(c => c.id === activeChatId)?.sharedNotes || ''}
            senderId={currentUser?.id || ''}
            lastModified={chats.find(c => c.id === activeChatId)?.sharedNotesLastModified}
            modifiedBy={chats.find(c => c.id === activeChatId)?.sharedNotesModifiedBy}
            allUsers={allUsers}
            onSaveNotes={handleSaveNotes}
          />
        )}

        {activeRightTab === 'settings' && currentUser && (
          <DeviceManager
            user={currentUser}
            currentDeviceId={deviceId}
            onRefreshDevices={fetchUsers}
            onTerminateDevice={handleTerminateRemoteDevice}
            onBackupKey={handleBackupPrivateKey}
            onRestoreKey={handleDeviceRestoreKeyring}
            onUpdateSettings={handleUpdatePrivacySettings}
            onUpdateProfile={handleUpdateProfileSettings}
          />
        )}

        {activeRightTab === 'thread' && activeThreadMessage && activeChatId && (
          <ThreadTab
            parentMessage={activeThreadMessage}
            messages={messages}
            decryptedCache={decryptedCache}
            currentUser={currentUser}
            onSendReply={async (content) => {
              await handleSendThreadReply(content);
            }}
            onClose={() => {
              setActiveRightTab('none');
              setActiveThreadMessage(null);
            }}
            onScrollToMessage={(msgId) => {
              handleScrollToMessage(msgId);
            }}
          />
        )}

      </div>

      {/* Lightbox Media Player Overlay */}
      {lightboxMedia && (
        <div id="media-lightbox-overlay" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070B]/95 backdrop-blur-md p-4 select-none animate-fade-in">
          {/* Header Actions */}
          <div className="absolute top-0 inset-x-0 p-4 bg-slate-950/60 border-b border-slate-900/60 backdrop-blur flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              {lightboxMedia.type === 'image' ? (
                <Eye size={16} className="text-sky-400" />
              ) : (
                <Video size={16} className="text-emerald-400" />
              )}
              <span className="text-xs font-bold font-mono text-slate-200 truncate max-w-xs sm:max-w-md md:max-w-lg">
                {lightboxMedia.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxMedia.url}
                download={lightboxMedia.name}
                referrerPolicy="no-referrer"
                className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:text-sky-350 rounded-lg text-[10.5px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-colors"
                title="Download folder stream"
              >
                <Download size={13} />
                <span>SAVE</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors cursor-pointer flex items-center justify-center"
                title="Close Viewer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Media Canvas render area */}
          <div className="flex-1 flex items-center justify-center w-full max-w-5xl max-h-[80vh] relative mt-16 z-10" onClick={() => setLightboxMedia(null)}>
            {lightboxMedia.type === 'image' ? (
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.name}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800/80"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800/80"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-mono tracking-wider uppercase z-20">
            Click outside or tap X to close viewer
          </div>

          {/* Background overlay click-off */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setLightboxMedia(null)} />
        </div>
      )}

      {/* 5. Direct Registers / Logins Auth overlay screen */}
      {showRegisterModal && (
        <div id="auth-register-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C12]/90 backdrop-blur-md">
          <div id="auth-login-card" className="w-full max-w-md p-8 rounded-2xl bg-[#0E121A] border border-slate-800 flex flex-col gap-6 animate-fade-in text-left shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            
            {/* Header Identity banner */}
            <div>
              <h2 className="text-lg font-bold text-white font-sans uppercase tracking-tight">
                {showRestorePrompt ? 'Restore Keyring' : authTab === 'login' ? 'Secure Sign In' : 'Generate Identity'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {showRestorePrompt 
                  ? 'Input your master password to unlock your private key backup and sync.' 
                  : 'Welcome to Deep Talk. Access your decentralized encrypted chat sandbox safely.'}
              </p>
            </div>

            {/* Login / Register tabs selector */}
            {!showRestorePrompt && (
              <div className="flex border-b border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider font-mono transition-all text-center border-b-2 ${
                    authTab === 'login'
                      ? 'border-sky-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider font-mono transition-all text-center border-b-2 ${
                    authTab === 'register'
                      ? 'border-sky-500 text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Register
                </button>
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start gap-2 leading-relaxed font-mono">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            {showRestorePrompt ? (
              /* Sync Private Key Recover Form */
              <form onSubmit={handleRestoreDecrypt} className="flex flex-col gap-4">
                <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200 leading-relaxed font-sans">
                  🔑 <strong>Sync Lock detected:</strong> Alias <strong>@{registerUsername}</strong> has a secure cloud backup on the server.
                  Enter your master restoration password to decrypt and synchronize.
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 font-mono uppercase tracking-wider">RECOVERY PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Input Master password to decrypt keyring"
                    value={loginRestorePassword}
                    onChange={(e) => setLoginRestorePassword(e.target.value)}
                    className="p-3 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 font-mono"
                  />
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestorePrompt(false);
                      setAuthError(null);
                    }}
                    className="flex-1 py-2.5 bg-[#1A1F2B] hover:bg-slate-800 border border-slate-800/60 text-slate-300 text-xs font-bold rounded-lg active:scale-98 transition-colors uppercase font-mono tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={restoreInProgress}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-98 transition-colors uppercase font-mono tracking-wider"
                  >
                    {restoreInProgress ? 'Decrypting...' : 'Unlock Account'}
                  </button>
                </div>
              </form>
            ) : authTab === 'login' ? (
              /* Secure Log In Form */
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 font-mono uppercase tracking-wider">ENTER YOUR USERNAME ALIAS</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alice, bob, charlie"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="p-3 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 font-mono uppercase tracking-wider">PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your personal password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="p-3 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none font-mono"
                  />
                  <span className="text-[9.5px] text-slate-500 font-mono leading-tight">Logs in with browser local storage keys, or requests cloud restoration backup.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-sky-500 hover:bg-sky-450 text-white font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] active:scale-98 transition-colors uppercase font-mono tracking-wider mt-2 cursor-pointer"
                >
                  Connect Secure Tunnel
                </button>
              </form>
            ) : (
              /* Registration Form */
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 font-mono uppercase tracking-wider">CREATE UNIQUE USERNAME</label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="e.g. alice, bob, charlie"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    className="p-3 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none font-mono"
                  />
                  <span className="text-[9.5px] text-slate-500 font-mono leading-tight">Choose a unique handle. E2EE hardware keys will generate inside this browser sandbox.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 font-mono uppercase tracking-wider">CREATE SECURITY PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Choose a secret login password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="p-3 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 font-mono uppercase tracking-wider">CHOOSE A DISPLAY NAME</label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="e.g. Alice Smith (Optional)"
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    className="p-3 bg-[#1A1F2B] border border-slate-800/80 rounded-lg text-xs text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none"
                  />
                </div>

                {/* Profile Avatar custom roller */}
                <div className="p-3.5 rounded-xl bg-[#0A0C12] border border-slate-800/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={registerAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=fallback'}
                        alt="Avatar Preview"
                        referrerPolicy="no-referrer"
                        className="w-13 h-13 rounded-full border border-sky-500/25 bg-[#1A1F2B] p-0.5 object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-sky-400 font-mono uppercase">Decentralized Icon</span>
                        <span className="text-[11px] text-slate-400 leading-none font-sans mt-0.5">Custom avatar generator</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => rollNewAvatar()}
                      className="px-3 py-1.5 border border-slate-800 hover:border-slate-700/80 text-[10.5px] font-bold font-mono tracking-wider uppercase text-slate-300 rounded-lg bg-[#11141F] hover:text-white transition-all active:scale-95"
                    >
                      Roll seed
                    </button>
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-bold text-slate-450 font-mono uppercase tracking-wider mb-1.5 text-left">CHOOSE AVATAR CATEGORY / STYLE</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'identicon', name: 'Identicon' },
                        { id: 'bottts', name: 'Robots' },
                        { id: 'pixel-art', name: 'Pixel Art' },
                        { id: 'fun-emoji', name: 'Emojis' },
                        { id: 'lorelei', name: 'Animes' },
                        { id: 'shapes', name: 'Abstract' }
                      ].map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            setAvatarStyle(style.id as any);
                            rollNewAvatar(style.id, avatarSeed);
                          }}
                          className={`py-1 text-[10px] font-bold font-sans rounded-md transition-all ${
                            avatarStyle === style.id 
                              ? 'bg-sky-500 text-slate-950 font-extrabold shadow' 
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-sky-500 hover:bg-sky-450 text-white font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] active:scale-98 transition-colors uppercase font-mono tracking-wider mt-2 cursor-pointer"
                >
                  Generate Keyring & Register
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* 6. Multi-Party / Group Creator Dialog pop */}
      {showGroupCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C12]/90 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-[#0E121A] border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-left animate-fade-in">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Create Group Channel</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Unlike Direct chats which are strictly End-to-End Encrypted, Group channels support public shared broadcasts with multiple concurrent members.
            </p>

            <form onSubmit={handleStartGroupChat} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-505 font-mono uppercase tracking-wider text-slate-450">CHANNEL TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Delta, Family Sync"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="p-2.5 bg-[#1A1F2B] border border-slate-800/80 text-xs text-white rounded-lg focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 outline-none font-sans"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-slate-505 font-mono uppercase tracking-wider text-slate-450">Select Channels Members</span>
                <div className="max-h-36 overflow-y-auto bg-[#0A0C12] rounded-lg p-2 border border-slate-800/80 flex flex-col gap-1">
                  {allUsers
                    .filter(u => currentUser && u.id !== currentUser.id)
                    .map(user => {
                      const isSelected = groupParticipants.includes(user.id);
                      return (
                        <button
                          type="button"
                          key={user.id}
                          onClick={() => {
                            if (isSelected) {
                              setGroupParticipants(groupParticipants.filter(p => p !== user.id));
                            } else {
                              setGroupParticipants([...groupParticipants, user.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded border text-left text-xs transition-all ${
                            isSelected 
                              ? 'bg-sky-500/10 border-sky-500/20 text-sky-450 text-sky-400' 
                              : 'border-transparent hover:bg-slate-900 text-slate-400'
                          }`}
                        >
                          <span>{user.displayName} (@{user.username})</span>
                          {isSelected && <Check size={12} className="text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={() => setShowGroupCreator(false)}
                  className="flex-1 py-2.5 bg-[#1A1F2B] hover:bg-slate-800 border border-slate-800/60 text-slate-300 text-xs font-bold rounded-lg active:scale-98 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={groupParticipants.length === 0}
                  className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-455 text-white text-xs font-bold rounded-lg active:scale-98 disabled:opacity-40 transition-colors cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                >
                  Launch Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Forward Message Conversation target selector Pop */}
      {forwardMessage && (
        <div id="forward-message-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C12]/90 backdrop-blur-md">
          <div className="w-full max-w-md p-6 bg-[#0E121A] border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-4 text-left animate-fade-in animate-duration-200">
            <div className="flex items-center justify-between flex-row">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CornerUpRight size={16} className="text-emerald-400 animate-pulse" />
                Forward Message
              </h3>
              <button
                type="button"
                onClick={() => {
                  setForwardMessage(null);
                  setForwardSearchQuery('');
                }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                title="Cancel forward"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Choose a conversation to forward this message. In E2EE chats, the message content will be re-encrypted locally under the target recipient's lock keys.
            </p>

            {/* Preview of message content to forward */}
            <div className="p-3 bg-[#111420] border border-slate-850 rounded-lg relative overflow-hidden">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider font-mono block mb-1">Message Preview:</span>
              <p className="text-xs text-slate-350 italic line-clamp-2 pr-4 break-words">
                {(() => {
                  let previewText = forwardMessage.content;
                  if (forwardMessage.isEncrypted) {
                    const cached = decryptedCache[forwardMessage.id];
                    if (cached) {
                      try {
                        const parsed = JSON.parse(cached);
                        previewText = parsed.text || '';
                      } catch (e) {
                        previewText = cached;
                      }
                    } else {
                      previewText = '🔐 Encrypted secure content';
                    }
                  }
                  return previewText || '[Attachment shared]';
                })()}
              </p>
              {forwardMessage.fileName && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-sky-400 font-mono">
                  <Paperclip size={10} className="shrink-0 rotate-45" />
                  <span className="truncate max-w-xs">{forwardMessage.fileName}</span>
                </div>
              )}
            </div>

            {/* Search target conversations */}
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={forwardSearchQuery}
                onChange={(e) => setForwardSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-2 bg-[#1A1F2B] border border-slate-800 text-xs text-white rounded-lg placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all outline-none"
              />
            </div>

            {/* List of target conversations */}
            <div className="max-h-56 overflow-y-auto bg-[#0a0c12] rounded-xl border border-slate-800/80 p-2 flex flex-col gap-1.5">
              {chats
                .filter(chat => {
                  let nameToSearch = chat.name || '';
                  if (chat.type === 'saved') {
                    nameToSearch = 'Saved Messages';
                  } else if (chat.type === 'direct') {
                    const otherId = chat.participants.find(p => p !== currentUser?.id);
                    const userObj = allUsers.find(u => u.id === otherId);
                    nameToSearch = userObj ? userObj.displayName : (otherId || '');
                  }
                  return nameToSearch.toLowerCase().includes(forwardSearchQuery.trim().toLowerCase());
                })
                .map(chat => {
                  let chatName = chat.name || 'Group Chat';
                  let chatAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`;

                  if (chat.type === 'saved') {
                    chatName = 'Saved Messages 📌';
                    chatAvatar = 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=saved';
                  } else if (chat.type === 'direct') {
                    const otherId = chat.participants.find(p => p !== currentUser?.id);
                    const userObj = allUsers.find(u => u.id === otherId);
                    if (userObj) {
                      chatName = userObj.displayName;
                      chatAvatar = userObj.avatarUrl;
                    }
                  }

                  return (
                    <button
                      type="button"
                      key={chat.id}
                      onClick={() => handleForwardMessage(chat.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:bg-[#1A1F2B] hover:border-emerald-500/20 text-left transition-all group/fbutton cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={chatAvatar}
                          alt="avatar"
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg bg-slate-800 object-cover border border-slate-700/60"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 block truncate group-hover/fbutton:text-emerald-400 transition-colors">{chatName}</span>
                          <span className="text-[9px] text-slate-500 font-mono block capitalize mt-0.5">{chat.type} chat</span>
                        </div>
                      </div>
                      <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] rounded uppercase font-mono font-bold opacity-0 group-hover/fbutton:opacity-100 transition-opacity">
                        Send
                      </div>
                    </button>
                  );
                })}
              {chats.length === 0 && (
                <div className="p-6 text-center text-[11px] text-slate-500 font-mono">
                  No active conversations found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal Overlay */}
      {showAdminModal && currentUser?.username === 'admin' && (
        <div id="admin-panel-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0C12]/90 backdrop-blur-md p-4 animate-fade-in">
          <div id="admin-panel-box" className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col h-[650px]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-[#111420]/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Systems Administrator command deck</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-wide">Secure User Administration Core Node</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminSearchQuery('');
                }}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700/50"
                title="Exit Deck"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter bar */}
            <div className="px-6 py-4 border-b border-slate-850/60 bg-[#090B11] flex items-center gap-3 shrink-0">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Query user database by username or display alias..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141824] border border-slate-800 text-xs rounded-lg text-white placeholder-slate-500 focus:border-rose-500/30 focus:ring-1 focus:ring-rose-500/30 outline-none transition-all"
                />
              </div>
              <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-450 font-mono font-bold uppercase shrink-0">
                Registered: {allUsers.length} Users
              </div>
            </div>

            {/* Interactive database grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-900/10">
              {allUsers
                .filter(u => {
                  const q = adminSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  return u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
                })
                .map(user => {
                  const isUserAdmin = user.username === 'admin';
                  const devicesList = user.devices || [];
                  
                  return (
                    <div 
                      key={user.id} 
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                        isUserAdmin 
                          ? 'bg-rose-500/5 border-rose-500/15 shadow-[inset_0_1px_15px_rgba(244,63,94,0.03)]' 
                          : 'bg-[#121622]/80 hover:bg-[#151926] border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      {/* Identity Column */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <img 
                          src={user.avatarUrl} 
                          alt="avatar" 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg bg-slate-950/60 p-0.5 border border-slate-800 shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate max-w-[200px]">
                              {user.displayName}
                            </span>
                            <span className="text-[10px] text-slate-455 font-mono">
                              @{user.username}
                            </span>
                            {isUserAdmin && (
                              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 font-mono text-[8px] font-bold rounded border border-rose-500/30 uppercase tracking-widest leading-none">
                                ROOT
                              </span>
                            )}
                          </div>
                          
                          {/* Devices line */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-500 font-mono">
                              ID: <code className="text-slate-400 select-all">{user.id}</code>
                            </span>
                            <span className="text-slate-650">•</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Devices: <strong className="text-sky-400">{devicesList.length} Active</strong>
                            </span>
                          </div>

                          {/* Settings / Security Passwords */}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {user.password && (
                              <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-mono rounded">
                                Password: <code className="text-slate-200 select-all">{user.password}</code>
                              </span>
                            )}
                            {user.disableReadReceipts && (
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/15 text-[9px] text-amber-500 font-mono rounded">
                                Stealth Mode (No receipts)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Configured Devices list */}
                      {devicesList.length > 0 && (
                        <div className="hidden md:flex flex-col gap-1 max-w-[200px] text-right truncate">
                          <span className="text-[8.5px] font-bold text-slate-500 font-mono uppercase tracking-wider">Device Keys Linked</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {devicesList.map((dev: any) => (
                              <span key={dev.deviceId} className="px-1.5 py-0.5 bg-[#171D2E] border border-slate-800 text-[8.5px] font-mono text-slate-350 rounded" title={dev.deviceId}>
                                {dev.deviceName || 'Cryptic Link'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Administrative Actions Column */}
                      <div className="flex items-center gap-2 justify-end">
                        {!isUserAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white border border-rose-500/25 hover:border-transparent font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98 shadow-md"
                            title={`Deregister @${user.username} from service`}
                          >
                            <Trash2 size={13} />
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold pr-1">Deregister</span>
                          </button>
                        ) : (
                          <span className="text-[9.5px] font-mono select-none px-3 text-rose-500 font-bold uppercase tracking-widest">
                            IMMUNE
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              
              {allUsers.filter(u => {
                const q = adminSearchQuery.trim().toLowerCase();
                if (!q) return true;
                return u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
              }).length === 0 && (
                <div className="p-12 text-center flex flex-col items-center justify-center bg-[#131722]/40 rounded-2xl border border-dashed border-slate-800/80">
                  <div className="w-12 h-12 rounded-full bg-slate-800/20 border border-slate-800/60 flex items-center justify-center text-slate-400 mb-3 grayscale">
                    <Search size={18} />
                  </div>
                  <span className="text-xs font-bold text-slate-400">No security nodes match query</span>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Refine your username or display name search terms</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-850 bg-[#07090F] flex items-center justify-between shrink-0">
              <span className="text-[9px] text-slate-500 font-mono leading-none flex items-center gap-1.5 uppercase">
                <Shield size={10} className="text-rose-555" />
                Root Authority Terminal
              </span>
              <span className="text-[9px] text-slate-500 font-mono leading-none">
                DATABASE SYNC STATE: <strong className="text-emerald-500">SECURED</strong>
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 7. Voice/Video Call Overlay Modal */}
      {ongoingCall && currentUser && (
        <CallWindow
          call={ongoingCall}
          currentUserId={currentUser.id}
          onAccept={handleAcceptCall}
          onReject={handleDeclineCall}
          onEnd={handleEndCall}
        />
      )}

      {/* 8. QR Code Handshake Scanner Modal */}
      {showQrModal && (
        <div id="qr-scanner-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/90 backdrop-blur-md p-4 animate-fade-in animate-duration-200 font-sans">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col p-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                  <QrCode size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Secure Fingerprint QR Sync</h3>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5 uppercase font-bold">Zero-Knowledge Secure Handshaking</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              
              {/* Camera Scanner Viewfinder Simulation Box */}
              <div className="relative aspect-square w-full max-w-[280px] mx-auto bg-[#07090E] border-2 border-slate-850 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
                {/* Simulated Lens Viewfinder Corner Brackets */}
                <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-amber-500 rounded-tl-md"></div>
                <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-amber-500 rounded-tr-md"></div>
                <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-amber-500 rounded-bl-md"></div>
                <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-amber-500 rounded-br-md"></div>
                
                {qrProgressState === 'scanning' && (
                  /* Red sweeping laser line */
                  <div className="absolute inset-x-0 w-full h-[3px] bg-red-400 shadow-[0_0_15px_#f87171] animate-bounce z-10" />
                )}

                {/* Simulated QR Code Asset */}
                <div className="p-3.5 bg-white rounded-xl shadow-lg border border-slate-200 transition-transform duration-350 hover:scale-102 flex flex-col items-center justify-center gap-1">
                  <div className="w-36 h-36 relative select-none">
                    {/* Generates a gorgeous, very detailed pixel QR mockup based on selected peer or default */}
                    <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white">
                      {Array.from({ length: 36 }).map((_, idx) => {
                        const isCorner = idx === 0 || idx === 1 || idx === 4 || idx === 5 || idx === 6 || idx === 7 || idx === 10 || idx === 11 || idx === 24 || idx === 25 || idx === 30 || idx === 31;
                        const seedRandom = Math.sin(idx + (selectedScanPeer ? selectedScanPeer.charCodeAt(0) : 1)) * 1000;
                        const fillBlack = isCorner || (seedRandom - Math.floor(seedRandom) > 0.45);
                        return (
                          <div 
                            key={idx} 
                            className={`rounded-sm transition-colors duration-350 ${
                              fillBlack ? 'bg-slate-950' : 'bg-transparent'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="text-[7.5px] font-mono text-slate-500 uppercase select-none tracking-tight font-extrabold">Public Key Envelope</span>
                </div>

                {/* Scan state overlays */}
                {qrProgressState === 'scanning' && (
                  <div className="absolute inset-0 bg-amber-500/5 flex items-center justify-center backdrop-blur-[0.5px]">
                    <div className="px-3 py-1.5 bg-slate-950/90 border border-amber-500/40 rounded-xl text-center shadow-xl">
                      <span className="block text-[10px] font-bold text-amber-400 font-mono animate-pulse uppercase tracking-widest">HANDSHAKING...</span>
                      <span className="text-[7.5px] font-mono text-slate-500 uppercase font-bold">ANALYZING ENVELOPE</span>
                    </div>
                  </div>
                )}

                {qrProgressState === 'matched' && (
                  <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-[0.8px]">
                    <div className="px-3.5 py-2.5 bg-slate-950/95 border border-emerald-500/40 rounded-xl text-center shadow-xl animate-scale-in">
                      <span className="block text-xs font-black text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1.5 justify-center">
                        <CheckCheck size={14} className="text-emerald-400" />
                        LINK ESTABLISHED
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wide block mt-1 font-bold font-mono">HANDSHAKE SIGNED SECURELY</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Selection helper block */}
              <div className="flex flex-col gap-2.5 text-left border-t border-slate-800/55 pt-4">
                <div>
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">Select Active Network Participant to Scan</label>
                  <select
                    value={selectedScanPeer}
                    onChange={(e) => {
                      setSelectedScanPeer(e.target.value);
                      setQrProgressState('idle');
                    }}
                    className="w-full bg-[#1A1F30] border border-slate-800/80 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 outline-none font-mono"
                  >
                    <option value="" disabled>--- Select Participant ---</option>
                    {allUsers
                      .filter(u => u.id !== currentUser?.id)
                      .map((user) => (
                        <option key={user.id} value={user.id} className="font-mono">
                          @{user.username} ({user.displayName || 'No Name'})
                        </option>
                      ))
                    }
                  </select>
                </div>

                {/* Displays derived public-key fingerprint slice */}
                {selectedScanPeer && (() => {
                  const targetUser = allUsers.find(u => u.id === selectedScanPeer);
                  if (!targetUser) return null;
                  return (
                    <div className="p-3 bg-[#0A0C12] border border-slate-850/50 rounded-xl flex flex-col gap-1 select-none animate-fade-in font-mono">
                      <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold">
                        <span>FINGERPRINT VALUE:</span>
                        <span className="text-amber-500/80 font-bold uppercase">SHA256 SECURE ENVELOPE</span>
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-200 uppercase tracking-widest text-center py-0.5">
                        {getUserFingerprint(targetUser.publicKey)}
                      </span>
                    </div>
                  );
                })()}

                {/* Scan triggers Button */}
                <button
                  type="button"
                  disabled={!selectedScanPeer || qrProgressState === 'scanning' || qrProgressState === 'matched'}
                  onClick={() => {
                    const targetUser = allUsers.find(u => u.id === selectedScanPeer);
                    if (!targetUser) return;
                    
                    setQrProgressState('scanning');
                    // Sweep for 1.8 seconds, then trigger matched state, then transition to conversation
                    setTimeout(() => {
                      setQrProgressState('matched');
                      setTimeout(() => {
                        setShowQrModal(false);
                        startDirectSecureChatWithUser(targetUser);
                      }, 1200);
                    }, 1800);
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-450 text-slate-950 font-black text-xs rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.25)] active:scale-98 transition-all uppercase font-mono tracking-wider cursor-pointer flex flex-center gap-2 mt-1.5 disabled:opacity-40 disabled:pointer-events-none items-center justify-center font-bold"
                >
                  <Scan size={14} className="text-slate-950 animate-pulse" />
                  INITIATE HANDSHAKE SCAN
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Dynamic Geolocation Broadcast Modal */}
      {showLocationModal && (
        <div id="location-sharing-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/90 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col p-6 font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                  <MapPin size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Location Broadcast Node</h3>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5 uppercase">Cryptographically Authenticated GPS</p>
                </div>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tab Selector for Location Modal */}
            <div className="flex bg-[#070A11] p-1 rounded-lg border border-slate-800/60 gap-1 select-none shrink-0 mb-4 mt-2">
              <button
                type="button"
                onClick={() => setLocationActiveType('current')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  locationActiveType === 'current'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                Secure Presets
              </button>
              <button
                type="button"
                onClick={() => setLocationActiveType('custom')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider transition-all duration-155 cursor-pointer ${
                  locationActiveType === 'custom'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                Custom GPS Node
              </button>
            </div>

            <div className="space-y-4">
              {locationActiveType === 'current' ? (
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold text-left">Select Preset Secure Vault Coordinates</label>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    {[
                      { label: 'Zurich Bank Head', lat: 47.3686, lng: 8.5391, addr: 'Swiss Vault, Bahnhofstrasse 45, Zurich' },
                      { label: 'London GCHQ Node', lat: 51.5074, lng: -0.1278, addr: 'GCHQ Core, Westminster, London' },
                      { label: 'Wall Street Intel', lat: 40.7061, lng: -74.0092, addr: 'Trading Ledger Core, New York Wall St' },
                      { label: 'Tokyo Cyber Sector', lat: 35.6762, lng: 139.6503, addr: 'Shibuya Net Hub, Sector 9, Tokyo' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendLocation(preset.lat, preset.lng, preset.addr)}
                        className="px-3 py-2 bg-[#141824] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 border border-slate-800/80 hover:border-emerald-500/35 rounded-xl text-[10.5px] transition-all font-sans text-left cursor-pointer flex flex-col justify-between"
                      >
                        <strong className="block text-[10px] uppercase font-mono tracking-tight font-extrabold">{preset.label}</strong>
                        <span className="text-[8.5px] text-slate-500 truncate block mt-0.5">{preset.addr}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-left">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Latitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 47.3686"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Longitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 8.5391"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Broadcast Address / Location Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Zurich Vault Complex"
                      value={manualAddr}
                      onChange={(e) => setManualAddr(e.target.value)}
                      className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white placeholder-slate-650"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lat = parseFloat(manualLat) || 0;
                      const lng = parseFloat(manualLng) || 0;
                      handleSendLocation(lat, lng, manualAddr || 'Custom Decoupled Node');
                    }}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-bold font-mono tracking-wider uppercase rounded-xl transition-all shadow-md mt-1 cursor-pointer"
                  >
                    Broadcast Custom Telemetry
                  </button>
                </div>
              )}

              <div className="p-3 bg-[#111421] border border-slate-800/60 rounded-xl space-y-1 text-slate-400 text-[10px] leading-relaxed text-left">
                <span className="block text-[9.5px] text-emerald-400 font-mono font-bold tracking-wider uppercase mb-1">AUTOMATED DETECT-GEOPATH</span>
                Once broadcast, recipient devices decrypt the node signal and visualize a customized visual live tracking map inside the active chat timeline.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Visa/Mastercard Attachment Creator Modal */}
      {showCardModal && (
        <div id="payment-card-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/90 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col p-6 font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg animate-pulse">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Net Transfer Card Layout</h3>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5 uppercase">E2EE Account Attachment</p>
                </div>
              </div>
              <button
                onClick={() => setShowCardModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <X size={14} />
              </button>
            </div>

            {/* Visual Real-time Interactive Card Preview */}
            <div className="mb-6 flex justify-center">
              {(() => {
                let bgClass = 'bg-gradient-to-br from-[#12141D] via-[#1A1E29] to-[#0A0C12] border-slate-700/80 shadow-[#12141d]/15';
                if (cardTheme === 'blue') {
                  bgClass = 'bg-gradient-to-br from-[#0c2461] via-[#0f3286] to-[#0a1631] border-sky-500/30';
                } else if (cardTheme === 'platinum') {
                  bgClass = 'bg-gradient-to-br from-[#2E3440] via-[#4C566A] to-[#1E222B] border-slate-400/30';
                } else if (cardTheme === 'gold') {
                  bgClass = 'bg-gradient-to-br from-[#221a0f] via-[#473318] to-[#14100b] border-amber-500/35';
                }

                return (
                  <div className={`p-4 rounded-2xl w-full h-40 border flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 text-left ${bgClass}`}>
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center justify-between z-10 leading-none">
                      <span className="text-[9.5px] font-extrabold text-slate-300 font-mono tracking-widest uppercase truncate max-w-[130px]">
                        {cardBankInput || 'Sovereign Bank'}
                      </span>
                      <span className="text-white font-extrabold text-xs tracking-tight italic font-mono uppercase">{cardTypeInput}</span>
                    </div>

                    <div className="flex items-center justify-between z-10 mt-1 leading-none shrink-0">
                      <div className="w-8 h-5.5 bg-gradient-to-br from-yellow-300 to-amber-500 rounded border border-yellow-200/20 shadow" />
                      <div className="flex gap-0.5 text-slate-400 rotate-90 scale-75 font-mono select-none">
                        <span>(((</span>
                      </div>
                    </div>

                    <div className="text-sm font-bold tracking-widest text-white font-mono z-10 my-1 select-all">
                      {cardNoInput ? cardNoInput.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                    </div>

                    <div className="flex items-end justify-between font-mono z-10 leading-none">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[7px] uppercase text-slate-400 tracking-wider">Card Holder</span>
                        <span className="text-[10px] font-bold text-slate-100 truncate uppercase mt-0.5">{cardHolderInput || 'Global Agent'}</span>
                      </div>
                      <div className="flex flex-col text-center shrink-0">
                        <span className="text-[7px] uppercase text-slate-400 tracking-wider">EXP</span>
                        <span className="text-[9.5px] font-bold text-slate-100 mt-0.5">{cardExpiry || '12/31'}</span>
                      </div>
                      <div className="flex flex-col text-right shrink-0">
                        <span className="text-[7px] uppercase text-slate-400 tracking-wider">CVV</span>
                        <span className="text-[9.5px] font-bold text-slate-100 mt-0.5">{cardCvv || '•••'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-3 px-1 text-left mb-5">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Network Core</label>
                  <select
                    value={cardTypeInput}
                    onChange={(e) => setCardTypeInput(e.target.value as any)}
                    className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white focus:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <option value="Visa">Visa Transfer Network</option>
                    <option value="Mastercard">Mastercard Wire Core</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Sovereign Issuer</label>
                  <input
                    type="text"
                    placeholder="e.g. Swiss Sovereign Bank"
                    value={cardBankInput}
                    onChange={(e) => setCardBankInput(e.target.value)}
                    className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white placeholder-slate-650 focus:border-amber-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Expiration Date</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="e.g. 12/32"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white placeholder-slate-650 focus:border-amber-500/50 transition-colors font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">CVV Code</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 303"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white placeholder-slate-650 focus:border-amber-500/50 transition-colors font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Card Aesthetic Theme</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {(['obsidian', 'blue', 'platinum', 'gold'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCardTheme(t)}
                      className={`py-1.5 rounded-lg text-[9px] uppercase font-mono tracking-wider font-extrabold border transition-all cursor-pointer ${
                        cardTheme === t
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md'
                          : 'bg-[#131722]/50 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-[#1C202F]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">Holder Account Authorization Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={cardHolderInput}
                  onChange={(e) => setCardHolderInput(e.target.value)}
                  className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white placeholder-slate-650 focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">ATM Card Number (12-16 Digits)</label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="e.g. 4000 1234 5678 9010"
                  value={cardNoInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCardNoInput(val);
                  }}
                  className="w-full text-xs h-9 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-white placeholder-slate-650 focus:border-amber-500/50 transition-colors font-mono tracking-widest text-center font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  const formattedNo = cardNoInput ? cardNoInput.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••';
                  const copyText = `Card Number: ${formattedNo}\nExpiry: ${cardExpiry || '12/31'}\nCVV: ${cardCvv || '•••'}`;
                  navigator.clipboard.writeText(copyText)
                    .then(() => {
                      setCardCopied(true);
                      setTimeout(() => setCardCopied(false), 2000);
                    })
                    .catch(err => {
                      console.error('Failed to copy text: ', err);
                    });
                }}
                className={`flex-1 py-1 px-2.5 h-9 rounded-xl border text-[10.5px] font-bold font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  cardCopied
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/45 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                }`}
              >
                {cardCopied ? (
                  <>
                    <Check size={13} className="text-emerald-400 animate-bounce" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Copy Card Info
                  </>
                )}
              </button>

              <button
                onClick={handleSendCard}
                disabled={!cardNoInput || cardNoInput.length < 12}
                className="flex-1 py-1 px-2.5 h-9 bg-amber-500 hover:bg-amber-450 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-[10.5px] font-bold font-sans uppercase tracking-wider text-slate-950 rounded-xl transition-all shadow-[0_4px_12px_rgba(245,158,11,0.15)] active:scale-98 cursor-pointer"
              >
                Attach to Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Interactive Wire Transfer Checkout & Simulation Overlay */}
      {activeTransferCard && (
        <div id="transfer-processing-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/95 backdrop-blur-md p-4 animate-fade-in animate-duration-350">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col p-6 font-sans overflow-hidden">
            
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-rose-500" />
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg animate-bounce">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Bilateral Settlement Gate</h3>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5 uppercase">E2EE Financial Clearinghouse</p>
                </div>
              </div>
              {transferStep === 0 && (
                <button
                  onClick={() => {
                    setActiveTransferCard(null);
                    setTransferStep(0);
                  }}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* STEP 0: SENDER INPUT FORM */}
            {transferStep === 0 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center bg-[#131722]/50 border border-slate-850 py-3.5 rounded-xl">
                  <span className="text-[9.5px] uppercase font-mono tracking-widest text-[#B5C2E0]">PAYMENT RECIPIENT</span>
                  <span className="text-[11.5px] font-bold text-slate-200 uppercase tracking-wide block mt-1.5 font-mono">{activeTransferCard.holderName}</span>
                  <span className="text-[10px] text-slate-500 tracking-tight block mt-0.5 font-mono uppercase">
                    •••• •••• •••• {activeTransferCard.cardNumber.slice(-4)} ({activeTransferCard.cardType})
                  </span>
                </div>

                <div className="text-left">
                  <label className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">Transfer Amount (USD Value)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-sans font-extrabold text-[#707F9E] text-sm">$</span>
                    <input
                      type="text"
                      placeholder="100.00"
                      value={transferAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d.]/g, '');
                        setTransferAmount(val);
                      }}
                      className="w-full text-sm h-11 pl-8 pr-12 bg-[#131722] border border-slate-800 rounded-lg outline-none text-emerald-400 font-bold font-mono focus:border-emerald-500/50 text-left transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[10px] text-slate-500 uppercase tracking-widest">USD</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#141824] border border-slate-800 rounded-xl space-y-1.5 text-[9.5px] leading-relaxed text-slate-400 tracking-tight font-sans text-left">
                  <div className="flex items-center gap-1.5 text-slate-350 font-bold font-mono uppercase text-[9px]">
                    <Shield size={11} className="text-emerald-500 shrink-0" />
                    Ledger Tunnel Shielding active
                  </div>
                  Settlement operates client-to-client cryptographically. Clearing occurs on Swiss digital servers. All credentials remain encrypted and local.
                </div>

                <button
                  type="button"
                  onClick={handleProcessTransfer}
                  disabled={!transferAmount || isNaN(parseFloat(transferAmount)) || parseFloat(transferAmount) <= 0}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-450 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-bold font-sans uppercase tracking-wider text-slate-950 rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.15)] active:scale-98 cursor-pointer"
                >
                  Confirm & Route Vault Funds
                </button>
              </div>
            )}

            {/* STEP 1: TUNNEL CONNECTIVITY */}
            {transferStep === 1 && (
              <div className="py-8 text-center space-y-5 animate-fade-in flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-sky-500/20 border-t-sky-500 animate-spin" />
                  <div className="absolute p-3 bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20 animate-pulse">
                    <Radio size={20} />
                  </div>
                </div>
                <div className="space-y-1 max-w-xs">
                  <span className="text-xs font-black text-white font-mono uppercase tracking-wider block">SHIELDING CONNECTIVITY TUNNEL</span>
                  <p className="text-[10px] text-slate-400 font-sans leading-normal">
                    Establishing client-to-node routing via Sovereign Core Gateway...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: CLEARANCE PARITY CHECK */}
            {transferStep === 2 && (
              <div className="py-8 text-center space-y-5 animate-fade-in flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-amber-500/20 border-t-amber-500 animate-spin" />
                  <div className="absolute p-3 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 animate-pulse">
                    <Layers size={20} />
                  </div>
                </div>
                <div className="space-y-1 max-w-xs">
                  <span className="text-xs font-black text-white font-mono uppercase tracking-wider block">CRYPTOGRAPHIC CLEARANCE PARITY</span>
                  <p className="text-[10px] text-slate-400 font-sans leading-normal">
                    Resolving credentials inside Swiss Decryption Vault. Verification score: 100/100...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: TRANSACTION SETTLED */}
            {transferStep === 3 && (
              <div className="py-6 text-center space-y-5 animate-fade-in flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <CheckCheck size={24} className="animate-bounce" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <span className="text-xs font-black text-white font-mono uppercase tracking-wider block text-emerald-450">TRANSACTION MUTATION SETTLED</span>
                  <p className="text-[10px] text-slate-400 font-sans leading-normal">
                    Wire complete. Settlement ledger block written to the chat feed timeline...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTransferCard(null);
                    setTransferStep(0);
                  }}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-450 border border-emerald-500/20 text-slate-950 font-bold text-[10.5px] uppercase tracking-wider rounded-xl transition-all font-sans cursor-pointer active:scale-95 shadow"
                >
                  Return to Chat Feed
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 9. Post Scheduled Message Picker Modal */}
      {showScheduleModal && (
        <div id="schedule-message-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/90 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col p-6 font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg animate-pulse">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Automated Delivery Scheduler</h3>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5 uppercase">E2EE Queued Transmission</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <label className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 font-bold">Select Delivery Date & Time (Local)</label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full text-xs h-11 px-3 bg-[#131722] border border-slate-800 rounded-lg outline-none text-sky-400 font-bold font-mono focus:border-sky-500/50 transition-colors"
                />
              </div>

              {/* Convenience presets */}
              <div className="text-left space-y-1.5">
                <span className="block text-[8.5px] font-mono text-slate-500 uppercase font-bold tracking-widest">Speed presets</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: '+1 Minute (Test)', gap: 1 * 60000 },
                    { label: '+5 Minutes', gap: 5 * 60000 },
                    { label: '+1 Hour', gap: 60 * 60000 },
                    { label: 'Tomorrow morning', gap: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                      return d.getTime() - Date.now();
                    })() }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const targetDate = new Date(Date.now() + preset.gap);
                        const tzOffset = targetDate.getTimezoneOffset() * 60000;
                        const localTimeStr = (new Date(targetDate.getTime() - tzOffset)).toISOString().slice(0, 16);
                        setScheduledTime(localTimeStr);
                      }}
                      className="py-1.5 px-2 bg-[#1A1F2B] hover:bg-sky-500/10 text-[9.5px] font-mono text-slate-350 hover:text-sky-300 rounded border border-slate-800 hover:border-sky-500/25 transition-all text-left cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#141824] border border-slate-800 rounded-xl space-y-1 text-[9.5px] leading-relaxed text-slate-400 tracking-tight font-sans text-left">
                <span className="block text-[9px] text-sky-400 font-mono font-bold uppercase">Automated Server Release</span>
                Message contents, attachments and metadata are fully secured and scheduled locally. Deep Talk's background dispatch cycle transmits E2EE packets securely at the selected epoch threshold.
              </div>

              <button
                type="button"
                onClick={handleConfirmScheduleMessage}
                disabled={isScheduling}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-450 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-bold font-sans uppercase tracking-wider text-slate-950 rounded-xl transition-all shadow-[0_4px_12px_rgba(14,165,233,0.15)] active:scale-98 cursor-pointer"
              >
                {isScheduling ? 'Queueing Secure Packet...' : 'Schedule Secure Transmission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Queued Scheduled Messages List Modal */}
      {showScheduledListModal && (
        <div id="scheduled-queue-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/90 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col p-6 font-sans max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Transmission Delay queue</h3>
                  <p className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5 uppercase">Awaiting Epoch Threshold Release</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduledListModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
              >
                <X size={14} />
              </button>
            </div>

            {/* List queue items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left">
              {scheduledMessages.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
                  <Clock size={28} className="text-slate-600 animate-pulse" />
                  <span className="text-xs font-sans text-slate-400">All transmissions dispatched successfully.</span>
                </div>
              ) : (
                scheduledMessages.map((msg, idx) => {
                  let decryptedText = msg.content;
                  if (msg.isEncrypted) {
                    decryptedText = '🔐 [Secure encrypted payload: Scheduled message]';
                  }
                  const departsInSecs = Math.max(0, Math.round((msg.scheduledAt - Date.now()) / 1000));
                  const departsInStr = departsInSecs > 120 
                    ? `Departing in ${Math.round(departsInSecs / 60)} min` 
                    : `Departing in ${departsInSecs}s`;

                  const targetTimeStr = new Date(msg.scheduledAt).toISOString().replace('T', ' ').substring(11, 19);

                  return (
                    <div key={msg.id || idx} className="p-3 bg-[#131722] border border-slate-850 hover:border-slate-800 rounded-xl space-y-2 transition-all">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/40 pb-1.5 shrink-0">
                        <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 border border-sky-500/20 rounded font-black tracking-wide uppercase">
                          {departsInStr}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">Release: {targetTimeStr} UTC</span>
                      </div>
                      <div className="text-xs text-slate-300 break-words line-clamp-2 pr-1 select-none leading-relaxed font-sans">
                        {decryptedText}
                      </div>
                      {msg.fileName && (
                        <div className="inline-flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                          <span>📎 Attachment: {msg.fileName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-end pt-1.5">
                        <button
                          onClick={() => handleCancelScheduledMessage(msg.id)}
                          className="px-2 py-1 text-rose-450 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-thin border-rose-500/20 hover:border-transparent rounded font-mono font-bold text-[8.5px] uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Cancel Delivery
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-850 shrink-0 text-center text-[9px] text-slate-500 font-mono uppercase font-bold">
              Current queue: {scheduledMessages.length} Pending
            </div>
          </div>
        </div>
      )}

      {/* 11. Peer User Cryptographic Profile Modal */}
      {viewingUserProfile && (
        <div id="peer-profile-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#010204]/90 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-[#0E121A] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col font-sans">
            
            {/* Colorful Cyber Banner */}
            <div className="h-24 bg-[#0d1527] relative flex items-end px-5 pb-3 font-sans">
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute right-4 top-4 z-10">
                <button
                  onClick={() => setViewingUserProfile(null)}
                  className="p-1.5 bg-black/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer border border-transparent hover:border-slate-700/50"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Avatar Position Overlay */}
            <div className="relative px-5 pb-6">
              <div className="absolute -top-12 left-5">
                <img
                  src={viewingUserProfile.avatarUrl}
                  alt={viewingUserProfile.displayName}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl bg-[#1A1F2B] object-cover border-4 border-[#0E121A] shadow-lg"
                />
              </div>

              {/* Identity Details */}
              <div className="pt-10 text-left space-y-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight">{viewingUserProfile.displayName}</h3>
                    <span className="px-1.5 py-0.5 bg-emerald-550/10 text-emerald-450 font-mono text-[8.5px] rounded border border-emerald-500/20 uppercase font-black tracking-wider leading-none">
                      Active
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono tracking-tight block mt-0.5">@{viewingUserProfile.username}</span>
                </div>

                <div className="space-y-1 p-3 bg-[#131722] border border-slate-850 rounded-xl text-left">
                  <span className="text-[8.5px] uppercase font-mono text-slate-500 tracking-wider block font-bold">Secure Account Registry</span>
                  <div className="text-xs text-slate-350 pr-1 select-none leading-relaxed italic">
                    "{viewingUserProfile.bio || 'This cryptographically synchronized Deep Talk agent is verifying secure packets over local devices.'}"
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <span className="block text-[8.5px] font-mono text-slate-500 uppercase tracking-widest font-black">E2EE Cryptographic fingerprint</span>
                  <div className="p-2.5 bg-black/45 border border-slate-850 rounded-lg text-slate-400 text-[10px] font-mono select-all break-all tracking-wider text-center leading-relaxed">
                    {viewingUserProfile.publicKey ? viewingUserProfile.publicKey.substring(0, 32).toUpperCase().replace(/.{4}/g, '$& ') + '...' : 'Key Not Synced'}
                  </div>
                  <span className="text-[9px] text-[#A2AEC4] font-semibold flex items-center gap-1 px-1 mt-1 font-mono uppercase bg-emerald-500/10 py-1 border border-emerald-500/15 rounded justify-center leading-none">
                    ✓ Identity Verified via E2EE Keys
                  </span>
                </div>

                {currentUser && viewingUserProfile.id !== currentUser.id && (
                  <button
                    onClick={() => handleToggleBlockUser(viewingUserProfile.id)}
                    disabled={blockingInProgress}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      currentUser.blockedUsers?.includes(viewingUserProfile.id)
                        ? 'bg-[#E11D48]/15 hover:bg-[#E11D48]/25 text-[#FB7185] border-[#F43F5E]/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'bg-[#B91C1C] hover:bg-[#DC2626] text-white border-transparent shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                    }`}
                  >
                    <Ban size={13} />
                    {currentUser.blockedUsers?.includes(viewingUserProfile.id) 
                      ? 'Unblock User' 
                      : 'Block User'}
                  </button>
                )}

                <button
                  onClick={() => setViewingUserProfile(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-755 text-xs text-slate-200 font-bold tracking-wider rounded-xl transition-all cursor-pointer border border-slate-700/40 font-mono uppercase"
                >
                  Close Profile card
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
