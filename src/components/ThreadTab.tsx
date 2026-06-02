import React, { useState, useRef, useEffect } from 'react';
import { X, Send, CornerDownRight, MessageSquare, Shield, Clock } from 'lucide-react';
import { Message, UserProfile } from '../types';

interface ThreadTabProps {
  parentMessage: Message;
  messages: Message[];
  decryptedCache: { [key: string]: string };
  currentUser: UserProfile | null;
  onSendReply: (content: string) => Promise<void>;
  onClose: () => void;
  onScrollToMessage: (msgId: string) => void;
}

export default function ThreadTab({
  parentMessage,
  messages,
  decryptedCache,
  currentUser,
  onSendReply,
  onClose,
  onScrollToMessage
}: ThreadTabProps) {
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  // Filter replies matching this specific parent message
  const replies = messages.filter(m => m.replyToId === parentMessage.id);

  const getDecryptedText = (msg: Message) => {
    if (!msg.isEncrypted) return msg.content || '';
    const cached = decryptedCache[msg.id];
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed.text || '[Decrypted Attachment]';
      } catch {
        return cached;
      }
    }
    return '🔒 Encrypted message (Device key required)';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || sending) return;
    try {
      setSending(true);
      await onSendReply(replyInput.trim());
      setReplyInput('');
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  return (
    <div
      id="thread-sub-conversation-drawer"
      className="w-80 h-full border-l border-slate-800/80 bg-[#0E121A] flex flex-col shrink-0 font-sans"
    >
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0E121A]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-sky-400" size={16} />
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Thread Room
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              E2EE Sub-conversation
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Close Thread panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Body with Connecting Tracks */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        
        {/* Parent Message Card */}
        <div 
          onClick={() => onScrollToMessage(parentMessage.id)}
          className="p-3 bg-[#131722] hover:bg-[#181D2A] border border-slate-850 rounded-xl transition-all duration-200 cursor-pointer group text-left relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-sky-400 saturate-75">
              {parentMessage.senderName}
            </span>
            <span className="text-[8px] text-slate-500 font-mono">
              {new Date(parentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed break-words font-sans whitespace-pre-wrap">
            {getDecryptedText(parentMessage)}
          </p>

          {parentMessage.isEncrypted && (
            <div className="mt-1.5 flex items-center gap-1 text-[8.5px] text-emerald-450 font-mono bg-emerald-500/10 py-0.5 px-1.5 border border-emerald-500/15 rounded w-max">
              <Shield size={9} />
              E2EE Secured Node
            </div>
          )}

          <div className="mt-2 text-[8px] text-slate-500 font-mono flex items-center gap-1 group-hover:text-sky-400 transition-colors">
            <CornerDownRight size={10} />
            Jump to main message
          </div>
        </div>

        {/* Divider / Connecting Visual track */}
        <div className="my-2 flex items-center justify-between px-1">
          <div className="h-px bg-slate-850 flex-1"></div>
          <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 mx-3 font-bold">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </span>
          <div className="h-px bg-slate-850 flex-1"></div>
        </div>

        {/* Reply List */}
        <div className="space-y-3 pb-8 pl-1 relative">
          {replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
              <MessageSquare className="text-slate-600/50" size={24} />
              <p className="text-[11px] text-slate-500 max-w-[180px] leading-relaxed">
                No sub-messages sent yet. Start the conversation below!
              </p>
            </div>
          ) : (
            replies.map((reply, idx) => {
              const isMe = reply.senderId === currentUser?.id;
              return (
                <div 
                  key={reply.id} 
                  id={`thread-reply-bubble-${reply.id}`}
                  className="flex flex-col text-left space-y-0.5 group animate-fade-in animate-duration-150"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className={`text-[10px] font-bold ${isMe ? 'text-indigo-400' : 'text-emerald-450'}`}>
                      {reply.senderName} {isMe && '(You)'}
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">
                      {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl text-xs break-words font-sans relative ${
                    isMe 
                      ? 'bg-indigo-600/15 border border-indigo-500/20 text-slate-200' 
                      : 'bg-[#151B27] border border-slate-850 text-slate-200'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{getDecryptedText(reply)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={repliesEndRef} />
        </div>

      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit} 
        className="p-3 border-t border-slate-800 bg-[#0E121A] flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          placeholder={`Reply in thread...`}
          disabled={sending}
          className="flex-1 bg-[#131722] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
        />
        <button
          type="submit"
          disabled={!replyInput.trim() || sending}
          className="p-2 bg-sky-500 hover:bg-sky-450 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(14,165,233,0.25)] flex items-center justify-center shrink-0"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
