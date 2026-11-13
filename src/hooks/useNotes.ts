import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';

export interface Note {
    id: string;
    user_id?: string;
    title: string;
    content: string;
    color: string;
    is_pinned: boolean;
    category: string;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface NewNotePayload {
    title?: string;
    content?: string;
    color?: string;
    is_pinned?: boolean;
    category?: string;
    tags?: string[];
}

export interface UpdateNotePayload {
    id: string;
    title?: string;
    content?: string;
    color?: string;
    is_pinned?: boolean;
    category?: string;
    tags?: string[];
}

export const NOTE_COLORS = [
    { key: 'emerald', label: 'Emerald', hex: '#10b981', border: 'border-emerald-500/30', lightBg: 'bg-emerald-50/60', darkBg: 'bg-emerald-950/20' },
    { key: 'teal', label: 'Teal', hex: '#14b8a6', border: 'border-teal-500/30', lightBg: 'bg-teal-50/60', darkBg: 'bg-teal-950/20' },
    { key: 'sky', label: 'Sky', hex: '#0ea5e9', border: 'border-sky-500/30', lightBg: 'bg-sky-50/60', darkBg: 'bg-sky-950/20' },
    { key: 'amber', label: 'Amber', hex: '#f59e0b', border: 'border-amber-500/30', lightBg: 'bg-amber-50/60', darkBg: 'bg-amber-950/20' },
    { key: 'rose', label: 'Rose', hex: '#f43f5e', border: 'border-rose-500/30', lightBg: 'bg-rose-50/60', darkBg: 'bg-rose-950/20' },
    { key: 'slate', label: 'Default', hex: '#64748b', border: 'border-slate-500/20', lightBg: 'bg-slate-50/60', darkBg: 'bg-slate-800/40' },
];

export const NOTE_CATEGORIES = ['General', 'Idea', 'Work', 'Finance', 'Personal', 'To-Do', 'Meeting'];

const STORAGE_KEY = 'casham_notes_cache_v1';

function loadCachedNotes(): Note[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (err) {
        console.error('Failed to parse cached notes:', err);
    }
    return [];
}

function saveCachedNotes(notes: Note[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (err) {
        console.error('Failed to save cached notes:', err);
    }
}

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>(() => loadCachedNotes());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsSqlMigration, setNeedsSqlMigration] = useState(false);

    const sortNotes = (items: Note[]): Note[] => {
        return [...items].sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) {
                return a.is_pinned ? -1 : 1;
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    };

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data: Note[] = await api.get('/api/notes?action=list_notes');
            if (Array.isArray(data)) {
                const sorted = sortNotes(data);
                setNotes(sorted);
                saveCachedNotes(sorted);
                setNeedsSqlMigration(false);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch notes';
            setError(msg);
            if (msg.includes('relation "notes" does not exist') || msg.includes('notes') && msg.includes('does not exist')) {
                setNeedsSqlMigration(true);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const createNote = async (payload: NewNotePayload): Promise<Note> => {
        const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        const now = new Date().toISOString();
        const optimisticNote: Note = {
            id: tempId,
            title: payload.title?.trim() || '',
            content: payload.content?.trim() || '',
            color: payload.color || '#10b981',
            is_pinned: Boolean(payload.is_pinned),
            category: payload.category || 'General',
            tags: payload.tags || [],
            created_at: now,
            updated_at: now,
        };

        // Optimistic update
        setNotes(prev => {
            const updated = sortNotes([optimisticNote, ...prev]);
            saveCachedNotes(updated);
            return updated;
        });

        try {
            const created = await api.post('/api/notes?action=create_note', payload);
            setNotes(prev => {
                const updated = sortNotes(prev.map(n => (n.id === tempId ? created : n)));
                saveCachedNotes(updated);
                return updated;
            });
            return created;
        } catch (err: unknown) {
            console.warn('Saved note locally; cloud sync failed:', err);
            // Retain the optimistic note in local storage so user does not lose thoughts
            return optimisticNote;
        }
    };

    const updateNote = async (payload: UpdateNotePayload): Promise<void> => {
        const now = new Date().toISOString();

        // Optimistic update
        setNotes(prev => {
            const updated = sortNotes(
                prev.map(n => (n.id === payload.id ? { ...n, ...payload, updated_at: now } : n))
            );
            saveCachedNotes(updated);
            return updated;
        });

        try {
            await api.put('/api/notes?action=update_note', payload);
        } catch (err: unknown) {
            console.warn('Updated note locally; cloud sync failed:', err);
        }
    };

    const togglePin = async (id: string): Promise<void> => {
        const target = notes.find(n => n.id === id);
        if (!target) return;
        const newPinned = !target.is_pinned;
        const now = new Date().toISOString();

        setNotes(prev => {
            const updated = sortNotes(
                prev.map(n => (n.id === id ? { ...n, is_pinned: newPinned, updated_at: now } : n))
            );
            saveCachedNotes(updated);
            return updated;
        });

        try {
            await api.put('/api/notes?action=toggle_pin', { id, is_pinned: newPinned });
        } catch (err: unknown) {
            console.warn('Toggled pin locally; cloud sync failed:', err);
        }
    };

    const deleteNote = async (id: string): Promise<void> => {
        setNotes(prev => {
            const updated = prev.filter(n => n.id !== id);
            saveCachedNotes(updated);
            return updated;
        });

        try {
            await api.delete(`/api/notes?action=delete_note&id=${id}`);
        } catch (err: unknown) {
            console.warn('Deleted note locally; cloud sync failed:', err);
        }
    };

    const pinnedNotes = useMemo(() => notes.filter(n => n.is_pinned), [notes]);
    const otherNotes = useMemo(() => notes.filter(n => !n.is_pinned), [notes]);

    return {
        notes,
        pinnedNotes,
        otherNotes,
        loading,
        error,
        needsSqlMigration,
        fetchNotes,
        createNote,
        updateNote,
        togglePin,
        deleteNote,
    };
}

