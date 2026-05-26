import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FiUsers, FiPlus, FiArrowUpRight, FiArrowDownLeft, FiCheckCircle, FiTrash2, FiX, FiAlertCircle } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';

interface LedgerTransaction {
    id: string;
    amount: string;
    type: 'gave' | 'got' | 'settled';
    note: string | null;
    date: string;
    created_at: string;
}

interface LedgerContact {
    id: string;
    name: string;
    created_at: string;
    net_balance: number;
    ledger_transactions?: LedgerTransaction[];
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

export default function Ledger() {
    const { theme } = useTheme();
    const [contacts, setContacts] = useState<LedgerContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI States
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [selectedContact, setSelectedContact] = useState<LedgerContact | null>(null);
    const [contactTransactions, setContactTransactions] = useState<LedgerTransaction[]>([]);
    const [txLoading, setTxLoading] = useState(false);

    // New Transaction States
    const [txAmount, setTxAmount] = useState('');
    const [txType, setTxType] = useState<'gave' | 'got'>('gave');
    const [txNote, setTxNote] = useState('');
    const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (selectedContact) {
            fetchTransactions(selectedContact.id);
        }
    }, [selectedContact?.id]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const data = await api.get('/api/ledger/contacts');
            setContacts(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async (contactId: string) => {
        try {
            setTxLoading(true);
            const data = await api.get(`/api/ledger/transactions?contact_id=${contactId}`);
            setContactTransactions(data || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setTxLoading(false);
        }
    };

    const handleAddContact = async () => {
        if (!newContactName.trim()) return;
        try {
            const newContact = await api.post('/api/ledger/contacts', { name: newContactName });
            setContacts(prev => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
            setNewContactName('');
            setIsAddingContact(false);
        } catch (err: any) {
            setError(err.message || 'Failed to add contact');
        }
    };

    const handleDeleteContact = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this contact and all associated transactions?')) return;
        try {
            await api.delete(`/api/ledger/contacts?id=${id}`);
            setContacts(prev => prev.filter(c => c.id !== id));
            if (selectedContact?.id === id) setSelectedContact(null);
        } catch (err: any) {
            setError(err.message || 'Failed to delete contact');
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContact || !txAmount || isNaN(Number(txAmount))) return;

        try {
            const newTx = await api.post('/api/ledger/transactions', {
                contact_id: selectedContact.id,
                amount: Number(txAmount),
                type: txType,
                note: txNote,
                date: txDate
            });

            // Update local state
            setContactTransactions(prev => [newTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            // Update contact net balance
            setContacts(prev => prev.map(c => {
                if (c.id === selectedContact.id) {
                    let newBalance = c.net_balance;
                    if (newTx.type === 'gave') newBalance += Number(newTx.amount);
                    if (newTx.type === 'got') newBalance -= Number(newTx.amount);
                    if (newTx.type === 'settled') newBalance = 0;
                    return { ...c, net_balance: newBalance };
                }
                return c;
            }));

            // Also update selectedContact so the header updates instantly
            setSelectedContact(prev => prev ? { ...prev, net_balance: prev.net_balance + (newTx.type === 'gave' ? Number(newTx.amount) : newTx.type === 'got' ? -Number(newTx.amount) : 0) } : null);

            // Reset form
            setTxAmount('');
            setTxNote('');
            setTxDate(new Date().toISOString().slice(0, 10));
        } catch (err: any) {
            alert(err.message || 'Failed to add transaction');
        }
    };

    const handleSettleUp = async () => {
        if (!selectedContact) return;
        if (selectedContact.net_balance === 0) return alert('Balance is already settled!');
        
        if (!confirm(`Mark balance with ${selectedContact.name} as settled?`)) return;

        try {
            // A settled transaction effectively zeros out the balance from our logic
            const newTx = await api.post('/api/ledger/transactions', {
                contact_id: selectedContact.id,
                amount: Math.abs(selectedContact.net_balance),
                type: 'settled',
                note: 'Settled up',
                date: new Date().toISOString().slice(0, 10)
            });

            setContactTransactions(prev => [newTx, ...prev]);
            
            // Update balances to 0
            setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, net_balance: 0 } : c));
            setSelectedContact(prev => prev ? { ...prev, net_balance: 0 } : null);

        } catch (err: any) {
            alert(err.message || 'Failed to settle up');
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await api.delete(`/api/ledger/transactions?id=${id}`);
            // Fully reload everything for safety since net balance recalculation can be complex if we delete a 'settled' marker
            fetchContacts();
            if (selectedContact) fetchTransactions(selectedContact.id);
        } catch (err: any) {
            alert(err.message || 'Failed to delete transaction');
        }
    };

    // Calculate totals
    const totalYouAreOwed = contacts.filter(c => c.net_balance > 0).reduce((acc, c) => acc + c.net_balance, 0);
    const totalYouOwe = Math.abs(contacts.filter(c => c.net_balance < 0).reduce((acc, c) => acc + c.net_balance, 0));

    return (
        <div className="pb-24 pt-8 md:pb-8">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                
                {/* Header */}
                <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <FiUsers className="text-emerald-500 text-xl" strokeWidth={2.5} />
                            </span>
                            <h1 className="text-3xl font-bold font-heading text-white">Ledger</h1>
                        </div>
                        <p className="text-slate-400">Track who owes you and whom you owe.</p>
                    </div>

                    {!isAddingContact && (
                        <button 
                            onClick={() => setIsAddingContact(true)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <FiPlus size={18} /> Add Contact
                        </button>
                    )}
                </div>

                {error && <div className="mb-6 p-4 glass-card bg-red-500/10 border-red-500/20 text-red-400 text-sm">{error}</div>}

                {/* Dashboard Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-fade-in">
                    <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                        <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-2">Total You Are Owed</p>
                        <p className="text-3xl font-bold font-mono text-emerald-300">{currencyFormatter.format(totalYouAreOwed)}</p>
                    </div>
                    <div className="glass-card p-6 border-orange-500/20 bg-orange-500/5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                        <p className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-2">Total You Owe</p>
                        <p className="text-3xl font-bold font-mono text-orange-300">{currencyFormatter.format(totalYouOwe)}</p>
                    </div>
                </div>

                {/* Add Contact Inline Form */}
                {isAddingContact && (
                    <div className="mb-8 glass-card p-5 border-emerald-500/30 bg-slate-800/80 flex items-center gap-3 animate-slide-up">
                        <input 
                            type="text" 
                            placeholder="Friend's Name" 
                            value={newContactName}
                            onChange={e => setNewContactName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddContact()}
                            autoFocus
                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <button onClick={handleAddContact} disabled={!newContactName.trim()} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50">Save</button>
                        <button onClick={() => setIsAddingContact(false)} className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl"><FiX size={20} /></button>
                    </div>
                )}

                {/* Contacts List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-800/50 animate-pulse rounded-2xl border border-white/5"></div>)}
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="text-center py-16 glass-card border-white/5 border-dashed">
                        <FiUsers className="mx-auto text-4xl text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">No contacts yet</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">Add friends, family, or colleagues to start tracking shared expenses or IOUs.</p>
                        <button onClick={() => setIsAddingContact(true)} className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white font-medium rounded-xl transition-all border border-emerald-500/20">Add First Contact</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                        {contacts.map(contact => (
                            <div 
                                key={contact.id} 
                                onClick={() => setSelectedContact(contact)}
                                className="glass-card p-5 cursor-pointer hover:bg-slate-700/60 transition-all border-white/5 hover:border-emerald-500/30 group"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600/80 to-teal-800/80 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <button onClick={(e) => handleDeleteContact(contact.id, e)} className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-white/5">
                                        <FiTrash2 size={15} />
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{contact.name}</h3>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    {contact.net_balance === 0 ? (
                                        <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5"><FiCheckCircle size={14} className="text-emerald-500" /> Settled up</span>
                                    ) : contact.net_balance > 0 ? (
                                        <div className="text-sm">
                                            <span className="text-emerald-400 font-medium text-[11px] uppercase tracking-wider block mb-0.5">Owes you</span>
                                            <span className="text-emerald-400 font-bold font-mono text-lg">{currencyFormatter.format(contact.net_balance)}</span>
                                        </div>
                                    ) : (
                                        <div className="text-sm">
                                            <span className="text-orange-400 font-medium text-[11px] uppercase tracking-wider block mb-0.5">You owe</span>
                                            <span className="text-orange-400 font-bold font-mono text-lg">{currencyFormatter.format(Math.abs(contact.net_balance))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Selected Contact Modal */}
            {selectedContact && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedContact(null)}></div>
                    
                    {/* Drawer */}
                    <div className="relative w-full md:w-[480px] h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
                        
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-white/5 bg-slate-800/30 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                    {selectedContact.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedContact.name}</h2>
                                    {selectedContact.net_balance === 0 ? (
                                        <p className="text-sm text-slate-400">Settled up</p>
                                    ) : selectedContact.net_balance > 0 ? (
                                        <p className="text-sm text-emerald-400 font-medium">Owes you <span className="font-bold font-mono">{currencyFormatter.format(selectedContact.net_balance)}</span></p>
                                    ) : (
                                        <p className="text-sm text-orange-400 font-medium">You owe <span className="font-bold font-mono">{currencyFormatter.format(Math.abs(selectedContact.net_balance))}</span></p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedContact(null)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl"><FiX size={20} /></button>
                        </div>

                        {/* Add Transaction Section */}
                        <div className="p-6 border-b border-white/5 bg-slate-800/10">
                            <form onSubmit={handleAddTransaction} className="space-y-4">
                                <div className="flex gap-2 p-1 bg-slate-800 rounded-xl border border-white/5">
                                    <button 
                                        type="button" 
                                        onClick={() => setTxType('gave')} 
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${txType === 'gave' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <FiArrowUpRight size={16} /> I Gave
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setTxType('got')} 
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${txType === 'got' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <FiArrowDownLeft size={16} /> I Got
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                        <input 
                                            type="number" 
                                            placeholder="Amount" 
                                            value={txAmount} onChange={e => setTxAmount(e.target.value)}
                                            required
                                            className="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                    <input 
                                        type="date"
                                        value={txDate} onChange={e => setTxDate(e.target.value)}
                                        style={{ colorScheme: theme }}
                                        className="w-36 px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="What was this for? (optional)" 
                                        value={txNote} onChange={e => setTxNote(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <button type="submit" className={`px-6 py-2.5 font-bold rounded-xl text-white shadow-lg transition-all ${txType === 'gave' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20'}`}>
                                        Save
                                    </button>
                                </div>
                            </form>

                            {selectedContact.net_balance !== 0 && (
                                <button 
                                    onClick={handleSettleUp}
                                    className="w-full mt-4 py-3 flex items-center justify-center gap-2 border border-slate-600 text-slate-300 hover:bg-white/5 font-bold rounded-xl text-sm transition-all"
                                >
                                    <FiCheckCircle size={16} /> Settle Up Balance
                                </button>
                            )}
                        </div>

                        {/* Transaction History */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                            <h4 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Transaction History</h4>
                            
                            {txLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800/50 animate-pulse rounded-xl"></div>)}
                                </div>
                            ) : contactTransactions.length === 0 ? (
                                <div className="text-center py-10">
                                    <FiAlertCircle className="mx-auto text-3xl text-slate-600 mb-2" />
                                    <p className="text-slate-400 text-sm">No transactions yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {contactTransactions.map(tx => (
                                        <div key={tx.id} className="group flex items-center justify-between p-4 glass-card border-white/5 hover:bg-slate-800/80 transition-all rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                    tx.type === 'gave' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    tx.type === 'got' ? 'bg-orange-500/10 text-orange-400' :
                                                    'bg-slate-500/10 text-slate-400'
                                                }`}>
                                                    {tx.type === 'gave' ? <FiArrowUpRight size={16} /> :
                                                     tx.type === 'got' ? <FiArrowDownLeft size={16} /> :
                                                     <FiCheckCircle size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">
                                                        {tx.type === 'gave' ? 'You Gave' : tx.type === 'got' ? 'You Got' : 'Settled'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <span>{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                                        {tx.note && (
                                                            <>
                                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                                <span className="truncate max-w-[120px]">{tx.note}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-mono font-bold ${
                                                    tx.type === 'gave' ? 'text-emerald-400' :
                                                    tx.type === 'got' ? 'text-orange-400' :
                                                    'text-slate-400'
                                                }`}>
                                                    {currencyFormatter.format(Number(tx.amount))}
                                                </span>
                                                <button onClick={() => handleDeleteTransaction(tx.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
