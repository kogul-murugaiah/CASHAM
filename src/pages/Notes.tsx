import { useState, useMemo, useCallback, useRef } from 'react';
import { useNotes, type Note, NOTE_COLORS, NOTE_CATEGORIES } from '../hooks/useNotes';
import { useTheme } from '../contexts/ThemeContext';
import { NoteCard } from '../components/notes/NoteCard';
import { NoteModal } from '../components/notes/NoteModal';
import {
    FiEdit3,
    FiSearch,
    FiBookmark,
    FiDatabase,
    FiCopy,
    FiCheck,
    FiX,
} from 'react-icons/fi';

export default function Notes() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const {
        notes,
        pinnedNotes,
        otherNotes,
        loading,
        needsSqlMigration,
        createNote,
        updateNote,
        togglePin,
        deleteNote,
    } = useNotes();

    // Quick-take bar state (inline Keep-style)
    const [isExpanded, setIsExpanded] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newColor, setNewColor] = useState('#10b981');
    const [newIsPinned, setNewIsPinned] = useState(false);
    const [newCategory, setNewCategory] = useState('General');
    const [creating, setCreating] = useState(false);

    // Active note modal state
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedColor, setSelectedColor] = useState('All');

    // SQL copy feedback
    const [sqlCopied, setSqlCopied] = useState(false);
    const [dismissSqlBanner, setDismissSqlBanner] = useState(false);

    const quickTakeRef = useRef<HTMLDivElement>(null);

    const handleCreateNote = async () => {
        if (!newTitle.trim() && !newContent.trim()) {
            setIsExpanded(false);
            return;
        }

        setCreating(true);
        try {
            await createNote({
                title: newTitle.trim(),
                content: newContent.trim(),
                color: newColor,
                is_pinned: newIsPinned,
                category: newCategory,
            });
            setNewTitle('');
            setNewContent('');
            setNewColor('#10b981');
            setNewIsPinned(false);
            setNewCategory('General');
            setIsExpanded(false);
        } finally {
            setCreating(false);
        }
    };

    const handleQuickKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleCreateNote();
        } else if (e.key === 'Escape') {
            if (!newTitle && !newContent) {
                setIsExpanded(false);
            }
        }
    };

    const handleCopySql = () => {
        const sql = `-- CASHAM: Quick Notes Schema
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '' NOT NULL,
    content TEXT DEFAULT '' NOT NULL,
    color TEXT DEFAULT '#10b981' NOT NULL,
    is_pinned BOOLEAN DEFAULT false NOT NULL,
    category TEXT DEFAULT 'General' NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notes" ON public.notes;
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON public.notes(user_id, is_pinned DESC, updated_at DESC);`;
        navigator.clipboard.writeText(sql);
        setSqlCopied(true);
        setTimeout(() => setSqlCopied(false), 3000);
    };

    // Filter notes
    const filterFn = useCallback((n: Note) => {
        const matchQ =
            !searchQuery.trim() ||
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = selectedCategory === 'All' || n.category === selectedCategory;
        const matchCol = selectedColor === 'All' || n.color === selectedColor;
        return matchQ && matchCat && matchCol;
    }, [searchQuery, selectedCategory, selectedColor]);

    const filteredPinned = useMemo(() => pinnedNotes.filter(filterFn), [pinnedNotes, filterFn]);
    const filteredOther = useMemo(() => otherNotes.filter(filterFn), [otherNotes, filterFn]);

    const allFilteredCount = filteredPinned.length + filteredOther.length;

    const textPrimary = isDark ? 'text-slate-50' : 'text-slate-900';
    const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24 pt-6 md:pt-8 md:pb-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-2xl sm:text-3xl font-black font-heading tracking-tight flex items-center gap-2.5 ${textPrimary}`}>
                        <span className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                            <FiEdit3 size={20} />
                        </span>
                        Quick Notes & Brain Dump
                    </h1>
                    <p className={`text-sm mt-1.5 ${textSecondary}`}>
                        Write everything that comes to mind. Instant local save with cross-device backup.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        isDark ? 'bg-slate-800/80 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                        {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                    </span>
                </div>
            </div>

            {/* SQL Migration Callout Banner (if table not in DB yet) */}
            {needsSqlMigration && !dismissSqlBanner && (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                    <div className="flex items-start gap-2.5">
                        <FiDatabase size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                        <div>
                            <span className="font-bold block">Cross-Device Cloud Sync Ready</span>
                            <span className="opacity-90 block mt-0.5">
                                Your notes are safely auto-saved on this device. Run the quick SQL migration in your Supabase SQL Editor to sync them to your phone and laptop!
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleCopySql}
                            className="px-3 py-1.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                            {sqlCopied ? <FiCheck size={13} /> : <FiCopy size={13} />}
                            <span>{sqlCopied ? 'SQL Copied!' : 'Copy SQL'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDismissSqlBanner(true)}
                            className="p-1.5 rounded-lg opacity-70 hover:opacity-100"
                            title="Dismiss"
                        >
                            <FiX size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* Google Keep Style Inline Quick-Take Bar */}
            <div className="max-w-2xl mx-auto w-full">
                <div
                    ref={quickTakeRef}
                    onKeyDown={handleQuickKeyDown}
                    className={`rounded-2xl border shadow-lg transition-all duration-300 overflow-hidden ${
                        isDark ? 'bg-slate-800/90 border-white/10' : 'bg-white border-slate-200 shadow-slate-200/50'
                    } ${isExpanded ? 'p-4 sm:p-5' : 'p-3.5'}`}
                >
                    {!isExpanded ? (
                        <div
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center justify-between cursor-text select-none text-sm"
                        >
                            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                                <FiEdit3 size={17} />
                                <span>Write a note, dump your thoughts...</span>
                            </div>
                            <span className="text-xs text-emerald-500 font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10">
                                Quick Dump
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Title (optional)"
                                    className={`w-full font-bold font-heading text-base sm:text-lg outline-none bg-transparent ${
                                        isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setNewIsPinned(!newIsPinned)}
                                    title={newIsPinned ? 'Unpin' : 'Pin to top'}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        newIsPinned
                                            ? 'text-amber-500 bg-amber-500/15'
                                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                >
                                    <FiBookmark size={16} className={newIsPinned ? 'fill-current' : ''} />
                                </button>
                            </div>

                            <textarea
                                rows={4}
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="Write everything on your mind..."
                                className={`w-full text-sm leading-relaxed outline-none resize-none bg-transparent whitespace-pre-wrap ${
                                    isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'
                                }`}
                            />

                            {/* Toolbar */}
                            <div className="pt-2 border-t border-inherit flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    {/* Color chips */}
                                    <div className="flex items-center gap-1.5">
                                        {NOTE_COLORS.map(c => (
                                            <button
                                                type="button"
                                                key={c.key}
                                                onClick={() => setNewColor(c.hex)}
                                                title={c.label}
                                                style={{ backgroundColor: c.hex }}
                                                className={`w-4 h-4 rounded-full transition-transform ${
                                                    newColor === c.hex ? 'ring-2 ring-offset-2 ring-emerald-500 scale-125' : 'hover:scale-110 opacity-75'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Category */}
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className={`text-xs font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                                            isDark ? 'bg-slate-900 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {NOTE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newTitle && !newContent) {
                                                setIsExpanded(false);
                                            } else {
                                                handleCreateNote();
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                                            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateNote}
                                        disabled={creating || (!newTitle.trim() && !newContent.trim())}
                                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition-all shadow-sm"
                                    >
                                        {creating ? 'Saving…' : 'Save Note'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your notes by keyword or thought..."
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                            isDark
                                ? 'bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500/50'
                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/50 shadow-sm'
                        }`}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                            <FiX size={15} />
                        </button>
                    )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    {['All', ...NOTE_CATEGORIES].map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                                selectedCategory === cat
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : isDark
                                        ? 'bg-slate-800/60 border-white/10 text-slate-400 hover:border-slate-600'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Color Filter Dots */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                    <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">Color:</span>
                    <button
                        type="button"
                        onClick={() => setSelectedColor('All')}
                        title="All colors"
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-bold transition-all ${
                            selectedColor === 'All'
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
                        }`}
                    >
                        All
                    </button>
                    {NOTE_COLORS.map(c => (
                        <button
                            type="button"
                            key={c.key}
                            onClick={() => setSelectedColor(selectedColor === c.hex ? 'All' : c.hex)}
                            title={`Filter by ${c.label}`}
                            style={{ backgroundColor: c.hex }}
                            className={`w-3.5 h-3.5 rounded-full transition-transform ${
                                selectedColor === c.hex ? 'ring-2 ring-offset-2 ring-emerald-500 scale-125' : 'hover:scale-110 opacity-70'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Empty state */}
            {notes.length === 0 && !loading && (
                <div className={`p-12 text-center rounded-2xl border border-dashed ${
                    isDark ? 'border-white/10 bg-slate-800/20' : 'border-slate-200 bg-white/50'
                }`}>
                    <FiEdit3 size={36} className="mx-auto text-emerald-500/40 mb-3" />
                    <h3 className={`text-base font-bold font-heading ${textPrimary}`}>Your mind is clear</h3>
                    <p className={`text-xs mt-1 ${textSecondary}`}>
                        Click the box above to dump your thoughts, save a link, plan an idea, or take quick notes.
                    </p>
                </div>
            )}

            {/* No search results */}
            {notes.length > 0 && allFilteredCount === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                    No notes match &quot;{searchQuery}&quot; {selectedCategory !== 'All' ? `in ${selectedCategory}` : ''}.
                </div>
            )}

            {/* Pinned Section */}
            {filteredPinned.length > 0 && (
                <div className="space-y-3">
                    <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${textSecondary}`}>
                        <FiBookmark className="text-amber-500 fill-current" size={13} />
                        Pinned Notes ({filteredPinned.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPinned.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isDark={isDark}
                                onClick={() => setActiveNote(note)}
                                onTogglePin={togglePin}
                                onDelete={deleteNote}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Other Notes Section */}
            {filteredOther.length > 0 && (
                <div className="space-y-3">
                    {filteredPinned.length > 0 && (
                        <p className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                            Other Notes ({filteredOther.length})
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredOther.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isDark={isDark}
                                onClick={() => setActiveNote(note)}
                                onTogglePin={togglePin}
                                onDelete={deleteNote}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Active Note Modal for Editing & Expanded Reading */}
            {activeNote && (
                <NoteModal
                    key={activeNote.id}
                    note={activeNote}
                    isDark={isDark}
                    onClose={() => setActiveNote(null)}
                    onSave={async (payload) => {
                        await updateNote(payload);
                    }}
                    onDelete={async (id) => {
                        await deleteNote(id);
                    }}
                />
            )}
        </div>
    );
}

