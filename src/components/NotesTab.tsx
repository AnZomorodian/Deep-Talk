import { useEffect, useState, useRef, ChangeEvent } from 'react';
import { BookOpen, RefreshCw, FileText, CheckCircle2, User, Eye, Search, History, CheckSquare, BarChart2, Plus, ArrowRight, Trash } from 'lucide-react';

interface NotesTabProps {
  chatId: string;
  initialValue: string;
  senderId: string;
  lastModified?: number;
  modifiedBy?: string;
  allUsers: { id: string; username: string; displayName: string }[];
  onSaveNotes: (notes: string) => Promise<void>;
}

interface NoteSnapshot {
  id: string;
  timestamp: number;
  authorName: string;
  content: string;
  title: string;
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

  // States for 4 New Advanced Notepad Ideas
  const [activeNotesSubTab, setActiveNotesSubTab] = useState<'editor' | 'checklists' | 'snapshots' | 'stats'>('editor');
  
  // Search & Replace state
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceMessage, setReplaceMessage] = useState('');

  // Snapshots State (Persists locally per chat room)
  const [snapshots, setSnapshots] = useState<NoteSnapshot[]>([]);
  const [snapshotTitleInput, setSnapshotTitleInput] = useState('');

  // Sync state if initialValue updates from server broadcast
  useEffect(() => {
    setNotesText(initialValue);
  }, [initialValue, chatId]);

  // Load Snapshots from local persistence
  useEffect(() => {
    const saved = localStorage.getItem(`secure_talk_notes_snapshots_${chatId}`);
    if (saved) {
      try {
        setSnapshots(JSON.parse(saved));
      } catch (e) {
        setSnapshots([]);
      }
    } else {
      setSnapshots([]);
    }
  }, [chatId]);

  const saveSnapshotsToStorage = (updatedList: NoteSnapshot[]) => {
    setSnapshots(updatedList);
    localStorage.setItem(`secure_talk_notes_snapshots_${chatId}`, JSON.stringify(updatedList));
  };

  // Helper trigger save
  const triggerSelfNotesSave = async (updatedText: string) => {
    setSaving(true);
    setSuccess(false);
    try {
      await onSaveNotes(updatedText);
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setSaving(false);
      console.error('Notes saving failed:', err);
    }
  };

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
      await triggerSelfNotesSave(text);
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
    triggerSelfNotesSave(nextVal);
  };

  // Idea 1: Finder & Replacer
  const handleReplaceAll = () => {
    if (!findText) {
      setReplaceMessage('Query string is required');
      return;
    }
    const occurrenceCount = (notesText.match(new RegExp(findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
    if (occurrenceCount === 0) {
      setReplaceMessage(`"${findText}" not found`);
      return;
    }
    const nextVal = notesText.replaceAll(findText, replaceText);
    setNotesText(nextVal);
    triggerSelfNotesSave(nextVal);
    setReplaceMessage(`Replaced ${occurrenceCount} occurrence(s) successfully!`);
    setTimeout(() => setReplaceMessage(''), 3000);
  };

  // Idea 2: Interactive Task list sync
  const parsedChecklists = (() => {
    const lines = notesText.split('\n');
    const checklistItems: { index: number; text: string; done: boolean; rawLine: string }[] = [];
    
    lines.forEach((line, index) => {
      // Regex checking for [ ] or [x] or [X] formatted task lists
      const match = line.match(/^\s*[-*]?\s*\[([ xX])\]\s*(.+)$/);
      if (match) {
        checklistItems.push({
          index,
          done: match[1] === 'x' || match[1] === 'X',
          text: match[2].trim(),
          rawLine: line
        });
      }
    });
    return checklistItems;
  })();

  const toggleChecklistItem = (item: { index: number; done: boolean; text: string }) => {
    const lines = notesText.split('\n');
    const targetLine = lines[item.index];
    
    // Replace [ ] with [x] or vice versa
    let updatedLine = '';
    if (item.done) {
      // Uncheck
      updatedLine = targetLine.replace(/\[[xX]\]/, '[ ]');
    } else {
      // Check
      updatedLine = targetLine.replace(/\[\s*\]/, '[x]');
    }
    
    lines[item.index] = updatedLine;
    const nextVal = lines.join('\n');
    setNotesText(nextVal);
    triggerSelfNotesSave(nextVal);
  };

  // Idea 3: Notes backup list / Snapshots
  const handleCreateSnapshot = () => {
    const author = allUsers.find(u => u.id === senderId);
    const authorName = author ? author.displayName : 'Operator';
    const title = snapshotTitleInput.trim() || `Manual Snapshot #${snapshots.length + 1}`;
    
    const newSnapshot: NoteSnapshot = {
      id: 'snap_' + Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      authorName,
      content: notesText,
      title
    };

    const nextList = [newSnapshot, ...snapshots];
    saveSnapshotsToStorage(nextList);
    setSnapshotTitleInput('');
  };

  const handleRestoreSnapshot = (snap: NoteSnapshot) => {
    if (window.confirm(`Are you sure you want to revert the notebook to "${snap.title}"? Your current changes will be overwritten.`)) {
      setNotesText(snap.content);
      triggerSelfNotesSave(snap.content);
      setActiveNotesSubTab('editor');
    }
  };

  const handleDeleteSnapshot = (id: string, e: any) => {
    e.stopPropagation();
    const nextList = snapshots.filter(s => s.id !== id);
    saveSnapshotsToStorage(nextList);
  };

  // Idea 4: Text stats calculators
  const stats = (() => {
    const charCount = notesText.length;
    const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;
    const lineCount = notesText ? notesText.split('\n').length : 0;
    const readingTimeMins = Math.ceil(wordCount / 200); // Average 200 words per minute
    
    // Compute list tasks count
    const totalTasks = parsedChecklists.length;
    const completedTasks = parsedChecklists.filter(t => t.done).length;
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { charCount, wordCount, lineCount, readingTimeMins, totalTasks, completedTasks, completionPercent };
  })();

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

      {/* Modern Horizontal Tabs for the 4 New Ideas */}
      <div className="grid grid-cols-4 border-b border-slate-800/80 bg-[#0E121A] text-center text-[10px] font-bold font-mono uppercase tracking-wider">
        <button
          onClick={() => setActiveNotesSubTab('editor')}
          className={`py-2.5 border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeNotesSubTab === 'editor'
              ? 'border-sky-500 text-sky-400 bg-sky-500/5'
              : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <FileText size={11} />
          <span>Editor</span>
        </button>
        <button
          onClick={() => setActiveNotesSubTab('checklists')}
          className={`py-2.5 border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer relative ${
            activeNotesSubTab === 'checklists'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <CheckSquare size={11} />
          <span>Checklist</span>
          {stats.totalTasks > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] flex items-center justify-center border border-emerald-500/40">
              {stats.totalTasks - stats.completedTasks}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveNotesSubTab('snapshots')}
          className={`py-2.5 border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer relative ${
            activeNotesSubTab === 'snapshots'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <History size={11} />
          <span>Snapshots</span>
          {snapshots.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[8px] flex items-center justify-center border border-purple-500/40">
              {snapshots.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveNotesSubTab('stats')}
          className={`py-2.5 border-b-2 flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeNotesSubTab === 'stats'
              ? 'border-amber-500 text-amber-500 bg-amber-500/5'
              : 'border-transparent text-slate-450 hover:text-slate-200 hover:bg-slate-800/20'
          }`}
        >
          <BarChart2 size={11} />
          <span>Stats</span>
        </button>
      </div>

      {/* Sub tabs content areas */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0A0C12]/40">
        
        {activeNotesSubTab === 'editor' && (
          <>
            {/* Styled Markdown Quick Toolbar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#1A1F2B] border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => insertMarkdown('heading')}
                  className="p-1 px-2 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-mono active:scale-95 transition-all font-bold"
                  title="Section Heading"
                >
                  H3
                </button>
                <button
                  onClick={() => insertMarkdown('bold')}
                  className="p-1 px-2 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-bold active:scale-95 transition-all"
                  title="Bold Text"
                >
                  B
                </button>
                <button
                  onClick={() => insertMarkdown('bullet')}
                  className="p-1 px-2 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-mono active:scale-95 transition-all"
                  title="Bullet Point"
                >
                  • List
                </button>
                <button
                  onClick={() => insertMarkdown('todo')}
                  className="p-1 px-2 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-sky-400 font-mono active:scale-95 transition-all"
                  title="To-do Task"
                >
                  [ ] Checkbox
                </button>
              </div>

              {/* Realtime Character Counter bar */}
              <span className="text-[9.5px] font-mono text-slate-500 uppercase select-none">
                {stats.wordCount} Words • {stats.charCount} Chars
              </span>
            </div>

            {/* Note Edit Area */}
            <div className="flex-1 p-6 flex flex-col relative min-h-0">
              <textarea
                id="shared-notepads-textarea"
                value={notesText}
                onChange={handleChange}
                placeholder="Start writing private collaborative notes with other users of this chatroom... (Markdown elements like H3, bullet points and checkboxes are synchronized in real-time)"
                className="flex-1 w-full bg-transparent resize-none border-0 p-0 text-xs leading-relaxed text-slate-350 outline-none focus:ring-0 placeholder-slate-600 font-sans"
              />

              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[8.5px] text-slate-500 font-mono tracking-wider pointer-events-none uppercase">
                <FileText size={10} className="text-slate-600" />
                <span>Realtime Workspace</span>
              </div>
            </div>

            {/* Idea 1: Finder & Replacer Sub-tool bar (Sleek collapsible footer) */}
            <div className="border-t border-slate-850 p-3 bg-[#0C1019] flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-1 text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1">
                <Search size={10} className="text-sky-400" />
                <span>Find & Replace Across Notebook</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Find text..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="flex-1 p-1.5 bg-[#07090E] border border-slate-800/80 rounded text-[11px] text-slate-200 outline-none placeholder-slate-600 focus:border-sky-500/40"
                />
                <input
                  type="text"
                  placeholder="Replace with..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="flex-1 p-1.5 bg-[#07090E] border border-slate-800/80 rounded text-[11px] text-slate-200 outline-none placeholder-slate-600 focus:border-sky-500/40"
                />
                <button
                  onClick={handleReplaceAll}
                  className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500 border border-sky-500/20 text-sky-400 hover:text-white rounded text-[10px] font-mono font-bold transition-all uppercase cursor-pointer"
                >
                  Replace All
                </button>
              </div>
              {replaceMessage && (
                <span className="text-[10px] font-mono text-amber-400 font-semibold animate-pulse mt-1">
                  {replaceMessage}
                </span>
              )}
            </div>
          </>
        )}

        {/* Idea 2: Interactive Smart Checklists */}
        {activeNotesSubTab === 'checklists' && (
          <div className="flex-1 p-5 flex flex-col min-h-0 overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-4 shrink-0">
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Checklist Control Deck</h5>
                <p className="text-[10px] text-slate-500 mt-1">Extracted from notebooks. Tap tasks to toggler actual Markdown status sync</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
                {stats.completedTasks} / {stats.totalTasks} DONE ({stats.completionPercent}%)
              </span>
            </div>

            {parsedChecklists.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-2">
                <CheckSquare size={36} className="text-slate-755 text-slate-705 text-slate-700 mb-1" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">No to-do checklists recognized</span>
                <p className="text-[10.5px] max-w-xs text-slate-600 font-sans mt-0.5">
                  Insert checkable goals like <code className="font-mono text-sky-400">[ ] Buy milk</code> into your editor, and they will populate automatically right here as clickable items!
                </p>
                <button
                  onClick={() => {
                    insertMarkdown('todo');
                    setActiveNotesSubTab('editor');
                  }}
                  className="mt-3 px-3 py-1.5 bg-sky-550/10 border border-sky-500/30 hover:bg-sky-500 rounded text-[10px] text-sky-400 hover:text-white font-mono uppercase font-bold cursor-pointer transition-all active:scale-95"
                >
                  + Add Checkbox
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 min-h-0 pr-1">
                {parsedChecklists.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleChecklistItem(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      item.done
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-slate-550 line-through'
                        : 'bg-[#111420]/80 hover:bg-[#121626]/95 border-slate-800/80 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        item.done 
                          ? 'bg-emerald-500 border-transparent text-slate-950 font-black' 
                          : 'border-slate-700 bg-[#0E121A]'
                      }`}>
                        {item.done && '✓'}
                      </div>
                      <span className="text-xs font-semibold truncate leading-none">{item.text}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 uppercase pr-1 group-hover:text-slate-400">
                      Line {item.index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Idea 3: Backup Snapshots Timeline */}
        {activeNotesSubTab === 'snapshots' && (
          <div className="flex-1 p-5 flex flex-col min-h-0 font-sans">
            <div className="flex flex-col border-b border-slate-800/60 pb-3 mb-4 shrink-0">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Notebook Snapshot Timelines</h5>
              <p className="text-[10px] text-slate-500 mt-1">Take visual backups before major co-authoring changes or text purges</p>
            </div>

            {/* Backup Form creation */}
            <div className="flex items-center gap-2 mb-4 bg-[#0E121D] p-2.5 rounded-xl border border-slate-800">
              <input
                type="text"
                placeholder="Give this snapshot a label..."
                value={snapshotTitleInput}
                onChange={(e) => setSnapshotTitleInput(e.target.value)}
                maxLength={45}
                className="flex-1 p-2 rounded-lg bg-[#07090F] border border-slate-800 text-xs text-white focus:border-purple-500/50 outline-none placeholder-slate-600"
              />
              <button
                onClick={handleCreateSnapshot}
                className="p-2 border border-purple-500/30 hover:border-transparent bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition-all active:scale-95 font-bold text-xs uppercase cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Capture Snapshot"
              >
                <Plus size={14} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">COMMIT</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1">
              {snapshots.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-500 gap-2 text-center p-4">
                  <History size={26} className="text-slate-700 animate-pulse" />
                  <span className="text-[10.5px] text-slate-500 font-mono uppercase tracking-wider">Timeline empty</span>
                  <p className="text-[10px] text-slate-600 max-w-[200px]">Save snapshots to prevent accidental data overwrites during live collaboration.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="p-3 bg-[#131724]/90 hover:bg-[#151A2C] border border-slate-800/80 rounded-xl transition-all cursor-pointer group flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors uppercase font-sans tracking-wide truncate">{snap.title}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                          title="Purge snapshot"
                        >
                          <Trash size={12} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase mt-0.5 border-t border-slate-800/40 pt-1.5">
                        <span className="flex items-center gap-1 text-slate-400">
                          <User size={10} className="text-slate-500" />
                          <span>Owner: {snap.authorName}</span>
                        </span>
                        <span>{new Date(snap.timestamp).toLocaleTimeString()} ({new Date(snap.timestamp).toLocaleDateString()})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idea 4: Analytics HUD */}
        {activeNotesSubTab === 'stats' && (
          <div className="flex-1 p-5 flex flex-col min-h-0 overflow-y-auto font-sans text-xs">
            <div className="flex flex-col border-b border-slate-800/60 pb-3 mb-4 shrink-0">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Content Performance Stats</h5>
              <p className="text-[10px] text-slate-500 mt-1">Real-time analysis and statistics of this collaborative board</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#0F131F]/90 border border-slate-800 flex flex-col gap-1 font-mono">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Character Index</span>
                <span className="text-xl font-bold text-white mt-1">{stats.charCount}</span>
                <span className="text-[8.5px] text-slate-650 text-slate-550 uppercase">Total characters</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0F131F]/90 border border-slate-800 flex flex-col gap-1 font-mono">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Metrics Word Count</span>
                <span className="text-xl font-bold text-sky-400 mt-1">{stats.wordCount}</span>
                <span className="text-[8.5px] text-slate-550 uppercase">Words in stream</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0F131F]/90 border border-slate-800 flex flex-col gap-1 font-mono">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Reading Estimate</span>
                <span className="text-xl font-bold text-amber-500 mt-1">~{stats.readingTimeMins} min</span>
                <span className="text-[8.5px] text-slate-550 uppercase">Read speed (200 WPM)</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0F131F]/90 border border-slate-800 flex flex-col gap-1 font-mono">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Total Linebreaks</span>
                <span className="text-xl font-bold text-purple-400 mt-1">{stats.lineCount}</span>
                <span className="text-[8.5px] text-slate-550 uppercase">Rows of plaintext</span>
              </div>
            </div>

            {/* Checklist progress bar */}
            <div className="mt-5 p-4 rounded-xl bg-[#0F131F]/50 border border-slate-850 flex flex-col gap-3">
              <div className="flex items-center justify-between font-mono text-[9.5px] text-slate-400 uppercase tracking-wider">
                <span>Checklist Completion Metrics</span>
                <span className="text-emerald-400 font-bold">{stats.completionPercent}%</span>
              </div>
              
              <div className="w-full h-2 bg-[#080B12] rounded-full overflow-hidden border border-slate-800/80">
                <div
                  style={{ width: `${stats.completionPercent}%` }}
                  className="h-full bg-emerald-500 transition-all duration-300"
                />
              </div>

              <span className="text-[9.5px] text-slate-500 text-center font-sans tracking-tight mt-0.5">
                Completed <strong>{stats.completedTasks}</strong> tasks out of <strong>{stats.totalTasks}</strong> total detected checklist markers.
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
