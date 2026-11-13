import { useState } from 'react';
import { type Note, NOTE_COLORS } from '../../hooks/useNotes';
import { FiBookmark, FiCopy, FiCheck, FiTrash2, FiEdit2 } from 'react-icons/fi';

interface NoteCardProps {
    note: Note;
    isDark: boolean;
    onClick: () => void;
    onTogglePin: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NoteCard({
    note,
    isDark,
    onClick,
    onTogglePin,
    onDelete,
}: NoteCardProps) {
    const [copied, setCopied] = useState(false);

    const colorConfig = NOTE_COLORS.find(c => c.hex === note.color) || NOTE_COLORS[5];

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const textToCopy = (note.title ? `${note.title}\n\n` : '') + note.content;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 select-none ${
                isDark ? `${colorConfig.darkBg} ${colorConfig.border}` : `${colorConfig.lightBg} ${colorConfig.border}`
            }`}
        >
            <div>
                {/* Header: Title & Pin */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    {note.title ? (
                        <h3 className={`text-base font-bold font-heading line-clamp-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                            {note.title}
                        </h3>
                    ) : (
                        <span />
                    )}

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(note.id);
                        }}
                        title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                            note.is_pinned
                                ? 'text-amber-500 bg-amber-500/15'
                                : isDark
                                    ? 'text-slate-500 hover:text-slate-300 hover:bg-white/10 opacity-60 group-hover:opacity-100'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 opacity-60 group-hover:opacity-100'
                        }`}
                    >
                        <FiBookmark size={15} className={note.is_pinned ? 'fill-current' : ''} />
                    </button>
                </div>

                {/* Content */}
                <p className={`text-xs sm:text-sm whitespace-pre-wrap break-words line-clamp-6 leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                    {note.content}
                </p>

                {/* Category Chip */}
                {note.category && note.category !== 'General' && (
                    <div className="mt-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDark
                                ? 'bg-slate-800/80 border-white/10 text-slate-300'
                                : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                        }`}>
                            {note.category}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer with Timestamp & Hover Actions */}
            <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-xs">
                <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {formatTime(note.updated_at)}
                </span>

                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={handleCopy}
                        title="Copy note"
                        className={`p-1.5 rounded-lg transition-colors ${
                            copied
                                ? 'text-emerald-500'
                                : isDark
                                    ? 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                        }`}
                    >
                        {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                        title="Edit note"
                        className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                                ? 'text-slate-400 hover:text-emerald-400 hover:bg-white/10'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-200/50'
                        }`}
                    >
                        <FiEdit2 size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(note.id);
                        }}
                        title="Delete note"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                        <FiTrash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

