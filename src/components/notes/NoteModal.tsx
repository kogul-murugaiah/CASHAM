import { useState, useEffect, useRef } from 'react';
import { type Note, NOTE_COLORS, NOTE_CATEGORIES } from '../../hooks/useNotes';
import { FiX, FiBookmark, FiTrash2, FiSave } from 'react-icons/fi';

interface NoteModalProps {
    note: Note | null;
    isDark: boolean;
    onClose: () => void;
    onSave: (payload: { id: string; title: string; content: string; color: string; is_pinned: boolean; category: string }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function NoteModal({
    note,
    isDark,
    onClose,
    onSave,
    onDelete,
}: NoteModalProps) {
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [color, setColor] = useState(note?.color || '#10b981');
    const [isPinned, setIsPinned] = useState(Boolean(note?.is_pinned));
    const [category, setCategory] = useState(note?.category || 'General');
    const [saving, setSaving] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setColor(note.color);
            setIsPinned(Boolean(note.is_pinned));
            setCategory(note.category || 'General');
        }
    }, [note]);

    if (!note) return null;

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        setSaving(true);
        try {
            await onSave({
                id: note.id,
                title: title.trim(),
                content: content.trim(),
                color,
                is_pinned: isPinned,
                category,
            });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                onKeyDown={handleKeyDown}
                className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl transition-all overflow-hidden ${
                    isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
            >
                {/* Header Toolbar */}
                <div className={`p-4 border-b flex items-center justify-between gap-3 ${
                    isDark ? 'border-white/10 bg-slate-800/40' : 'border-slate-100 bg-slate-50/60'
                }`}>
                    <div className="flex items-center gap-2">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${
                                isDark
                                    ? 'bg-slate-800 border-white/10 text-slate-200 focus:border-emerald-500/50'
                                    : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-500/50'
                            }`}
                        >
                            {NOTE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={() => setIsPinned(!isPinned)}
                            title={isPinned ? 'Unpin note' : 'Pin to top'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                isPinned
                                    ? 'text-amber-500 bg-amber-500/15'
                                    : isDark
                                        ? 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                            }`}
                        >
                            <FiBookmark size={15} className={isPinned ? 'fill-current' : ''} />
                            <span className="hidden sm:inline">{isPinned ? 'Pinned' : 'Pin'}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Color Selector */}
                        <div className="flex items-center gap-1.5 mr-2">
                            {NOTE_COLORS.map(c => (
                                <button
                                    type="button"
                                    key={c.key}
                                    onClick={() => setColor(c.hex)}
                                    title={c.label}
                                    style={{ backgroundColor: c.hex }}
                                    className={`w-5 h-5 rounded-full transition-transform ${
                                        color === c.hex ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'hover:scale-105 opacity-80'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className={`p-1.5 rounded-lg transition-colors ${
                                isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                {/* Body: Inputs */}
                <div className="p-5 overflow-y-auto flex-1 space-y-3">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        className={`w-full text-lg sm:text-xl font-bold font-heading outline-none bg-transparent ${
                            isDark ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                        }`}
                    />

                    <textarea
                        ref={textareaRef}
                        rows={12}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write everything on your mind..."
                        className={`w-full text-sm leading-relaxed outline-none resize-none bg-transparent whitespace-pre-wrap ${
                            isDark ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'
                        }`}
                    />
                </div>

                {/* Footer Toolbar */}
                <div className={`p-4 border-t flex items-center justify-between gap-3 ${
                    isDark ? 'border-white/10 bg-slate-800/40' : 'border-slate-100 bg-slate-50/60'
                }`}>
                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('Delete this note?')) {
                                await onDelete(note.id);
                                onClose();
                            }
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                    >
                        <FiTrash2 size={14} />
                        <span>Delete</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Ctrl + Enter to save
                        </span>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || (!title.trim() && !content.trim())}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                        >
                            <FiSave size={14} />
                            <span>{saving ? 'Saving…' : 'Save'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

