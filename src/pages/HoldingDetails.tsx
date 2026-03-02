import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const HoldingDetails = () => {
    const { symbol } = useParams();
    const [holdings, setHoldings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<any>(null);

    const fetchHistory = async () => {
        try {
            const result = await api.get('/api/wealth?action=assets');
            if (result && result.holdings) {
                // Find the specific holding and its records
                const holding = result.holdings.find((h: any) => h.symbol === symbol || h.id === symbol);
                if (holding) {
                    setHoldings(holding.records || []);
                }
            }
        } catch (error) {
            console.error('Failed to fetch transaction history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [symbol]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this specific transaction?')) return;
        try {
            await api.delete(`/api/wealth?action=assets&id=${id}`);
            fetchHistory();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    };

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/api/wealth?action=assets&id=${editingRecord.id}`, editingRecord);
            setEditingRecord(null);
            fetchHistory();
        } catch (error) {
            console.error('Failed to update transaction:', error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const firstRecord = holdings[0] || {};
    const holdingName = firstRecord.name || symbol;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            {/* Header */}
            <div className="mb-8">
                <Link to={`/assets/${firstRecord.type || ''}`} className="text-slate-500 hover:text-white transition flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4 group">
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    Back to Category
                </Link>
                <h1 className="text-3xl font-bold font-heading text-white">{holdingName}</h1>
                <p className="text-sm text-slate-400 mt-1">Transaction history and record management</p>
            </div>

            {/* Transaction Table */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Units</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Price</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {holdings.map((record: any) => (
                                <tr key={record.id} className="hover:bg-white/[0.01] transition-colors group">
                                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">
                                        {new Date(record.purchase_date || record.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300 font-mono text-right">{record.units || '1'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300 font-mono text-right">{formatCurrency(record.purchase_price || record.value)}</td>
                                    <td className="px-6 py-4 text-sm text-white font-bold font-mono text-right">
                                        {formatCurrency((record.units || 1) * (record.purchase_price || record.value))}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingRecord({ ...record })}
                                                className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition"
                                                title="Edit Record"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(record.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                                                title="Delete Record"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal (Simulated overlay) */}
            {editingRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setEditingRecord(null)}></div>
                    <form
                        onSubmit={handleUpdate}
                        className="relative bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-scale-in"
                    >
                        <h2 className="text-xl font-bold text-white mb-6">Edit Transaction</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Purchase Date</label>
                                <input
                                    type="date"
                                    value={editingRecord.purchase_date?.split('T')[0] || ''}
                                    onChange={(e) => setEditingRecord({ ...editingRecord, purchase_date: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Units</label>
                                    <input
                                        type="number" step="any"
                                        value={editingRecord.units || ''}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, units: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Price</label>
                                    <input
                                        type="number" step="any"
                                        value={editingRecord.purchase_price || editingRecord.value || ''}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, purchase_price: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-white focus:border-blue-500 transition outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setEditingRecord(null)}
                                className="flex-1 px-6 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default HoldingDetails;
