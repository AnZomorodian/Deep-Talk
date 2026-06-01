import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { BookOpen, RefreshCw, FileText, CheckCircle2, User, HelpCircle } from 'lucide-react';

interface NotesTabProps {
  chatId: string;
  initialValue: string;
  senderId: string;
  lastModified?: number;
  modifiedBy?: string;
  allUsers: { id: string; username: string; displayName: string }[];
  onSaveNotes: (notes: string) => Promise<void>;
}

export default function NotesTab({
  chatId,
  initialValue,
  senderId,
  lastModified,
  modifiedBy,
  allUsers,
  onSaveNotes,
}: NotesTabProps) {
  const [notesText, setNotesText] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if initialValue updates from server broadcast
  useEffect(() => {
    setNotesText(initialValue);
  }, [initialValue, chatId]);

  // Handle text modifications with smart debounced autosave
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotesText(text);
    setSaving(true);
    setSuccess(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await onSaveNotes(text);
        setSaving(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        setSaving(false);
        console.error('Notes auto-saving failed:', err);
      }
    }, 1200); // Debounce time: 1.2s
  };

  // Helper formatting insert tags
  const insertMarkdown = (syntax: string) => {
    const notepad = document.getElementById('shared-notepads-textarea') as HTMLTextAreaElement;
    if (!notepad) return;

    const start = notepad.selectionStart;
    const end = notepad.selectionEnd;
    const text = notepad.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end);

    let formatted = '';
    if (syntax === 'bold') formatted = `**${selected || 'bold text'}**`;
    else if (syntax === 'heading') formatted = `\n### ${selected || 'Section Heading'}\n`;
    else if (syntax === 'bullet') formatted = `\n- ${selected || 'list item'}\n`;
    else if (syntax === 'todo') formatted = `\n[ ] ${selected || 'to-do task'}\n`;

    const nextVal = before + formatted + after;
    setNotesText(nextVal);
    
    // Auto sync
    onSaveNotes(nextVal);
  };

  // Find who modified last
  const lastModifier = allUsers.find(u => u.id === modifiedBy);
  const modifierName = lastModifier ? lastModifier.displayName : (modifiedBy || 'System');

  return (
    <div className="flex flex-col h-full bg-[#0A0C12] overflow-hidden">
      
      {/* Editor Subheader Details */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-[#0E121A] border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-sky-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Shared Notebook</h4>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-mono">
          {saving && (
            <span className="flex items-center gap-1.5 text-sky-400 font-bold">
              <RefreshCw size={11} className="animate-spin text-sky-400" />
              SAVING...
            </span>
          )}
          {success && (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 size={11} />
              SYNCED & ENCRYPTED
            </span>
          )}
          {!saving && !success && lastModified && (
            <span className="flex items-center gap-1 text-slate-500">
              <User size={11} className="shrink-0 text-slate-600" />
              Modified by <strong className="text-slate-400 font-sans font-medium">{modifierName}</strong> 
              ({new Date(lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </div>
      </div>

      {/* Styled Markdown Quick Toolbar */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-[#1A1F2B] border-b border-slate-800/80">
        <button
          onClick={() => insertMarkdown('heading')}
          className="p-1 px-2.5 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-mono active:scale-95 transition-all font-bold"
          title="Section Heading"
        >
          H3
        </button>
        <button
          onClick={() => insertMarkdown('bold')}
          className="p-1 px-2.5 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-bold active:scale-95 transition-all"
          title="Bold Text"
        >
          B
        </button>
        <button
          onClick={() => insertMarkdown('bullet')}
          className="p-1 px-2.5 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-mono active:scale-95 transition-all"
          title="Bullet Point"
        >
          • List
        </button>
        <button
          onClick={() => insertMarkdown('todo')}
          className="p-1 px-2.5 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-mono active:scale-95 transition-all"
          title="To-do Task"
        >
          [ ] Checkbox
        </button>
      </div>

      {/* Note Edit Area */}
      <div className="flex-1 p-6 flex flex-col relative bg-[#0A0C12]/40">
        <textarea
          id="shared-notepads-textarea"
          value={notesText}
          onChange={handleChange}
          placeholder="Start writing private collaborative notes with other users of this chatroom... (Markdown elements like #, - and ** bold are supported)"
          className="flex-1 w-full bg-transparent resize-none border-0 p-0 text-xs leading-relaxed text-slate-300 outline-none focus:ring-0 placeholder-slate-500 font-sans"
        />

        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[9px] text-slate-650 text-slate-500 font-mono tracking-wider pointer-events-none uppercase">
          <FileText size={11} className="text-slate-500" />
          <span>Realtime Sync Area</span>
        </div>
      </div>

    </div>
  );
}
