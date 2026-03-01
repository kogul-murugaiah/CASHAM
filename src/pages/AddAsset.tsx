import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const AddAsset = () => {
    const navigate = useNavigate();
    const [assetType, setAssetType] = useState('stocks');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form fields
    const [form, setForm] = useState({
        name: "",
        value: "",
        purchase_price: "",
        purchase_date: "",
        units: "",
        notes: "",
    });

    // Search fields
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState("");

    // Detect if current type uses live tracking
    const isLiveTracked = ['stocks', 'mutual_funds', 'crypto'].includes(assetType);

    // Debounce search effect without external hook
    useEffect(() => {
        if (!isLiveTracked || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await api.get(`/api/wealth?action=search&type=${assetType}&q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(results || []);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, assetType, isLiveTracked]);

    // Handle Asset Type Change - Reset form partially
    const handleTypeChange = (id: string) => {
        setAssetType(id);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedSymbol("");
        setForm(prev => ({ ...prev, name: "", value: "", units: "" }));
        setError("");
    };

    const handleSelectSymbol = (item: any) => {
        setSelectedSymbol(item.symbol);
        setForm(prev => ({ ...prev, name: item.name }));
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (!form.name) {
            setError("Asset Name is required.");
            return;
        }

        if (isLiveTracked && !selectedSymbol && !form.value) {
            setError("Please search and select a valid symbol, or manually enter a current value.");
            return;
        }

        if (!isLiveTracked && !form.value) {
            setError("Current Value is required.");
            return;
        }

        if (selectedSymbol && !form.units) {
            setError("Number of units is required when a tracking symbol is selected.");
            return;
        }

        setLoading(true);

        try {
            // If it's a trackable asset with units, the backend expects unit price for purchase_price.
            // But our UI asks for TOTAL. So we divide. 
            const unitsNum = Number(form.units);
            const totalInvested = form.purchase_price ? Number(form.purchase_price) : null;
            const unitPurchasePrice = (totalInvested && unitsNum > 0)
                ? totalInvested / unitsNum
                : totalInvested;

            await api.post('/api/wealth?action=assets', {
                type: assetType,
                name: form.name,
                symbol: selectedSymbol || null,
                units: unitsNum > 0 ? unitsNum : null,
                purchase_price: unitPurchasePrice,
                purchase_date: form.purchase_date || null,
                value: form.value ? Number(form.value) : null,
                notes: form.notes || null
            });

            navigate('/assets');
        } catch (err: any) {
            setError(err.message || "Failed to add asset");
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto w-full animate-fade-in relative z-10 pb-24">
            <button
                onClick={() => navigate('/assets')}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Assets
            </button>

            <div className="mb-8">
                <h1 className="text-3xl font-bold font-heading text-white">Add Asset</h1>
                <p className="text-sm text-slate-400 mt-1">Track a new investment, property, or valuable item.</p>
            </div>

            {error && (
                <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 rounded-xl text-red-300 text-sm text-center">
                    {error}
                </div>
            )}

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Asset Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">Asset Type</label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { id: 'stocks', icon: '📈', label: 'Stocks' },
                                { id: 'mutual_funds', icon: '📊', label: 'Mutual Funds' },
                                { id: 'gold', icon: '🥇', label: 'Gold' },
                                { id: 'real_estate', icon: '🏠', label: 'Real Estate' },
                                { id: 'crypto', icon: '₿', label: 'Crypto' },
                                { id: 'cash', icon: '💵', label: 'Cash/Savings' },
                                { id: 'vehicle', icon: '🚗', label: 'Vehicle' },
                                { id: 'other', icon: '📦', label: 'Other' },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => handleTypeChange(type.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${assetType === type.id
                                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-2xl mb-1">{type.icon}</span>
                                    <span className="text-xs font-semibold text-center">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Live Tracking Search UI */}
                    {isLiveTracked && !selectedSymbol && (
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 relative">
                            <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Live Tracking Available
                            </h3>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">
                                Search for a {assetType.replace('_', ' ')} to enable automatic price updates
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Search e.g. "Reliance" or "SBI Mutual Fund"...`}
                                    className="w-full bg-slate-950/80 border border-blue-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute z-50 left-5 right-5 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                    {searchResults.map((item, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSelectSymbol(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex flex-col transition"
                                        >
                                            <span className="text-sm font-bold text-white">{item.name}</span>
                                            <div className="flex gap-2 text-xs text-slate-400 mt-1">
                                                <span className="text-blue-400">{item.symbol}</span>
                                                {item.exchange && <span>• {item.exchange}</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-3 flex items-center justify-between text-xs">
                                <p className="text-slate-500">Powered by {assetType === 'mutual_funds' ? 'MFAPI.in' : 'Yahoo Finance'}</p>
                                <button type="button" onClick={() => setSelectedSymbol('MANUAL')} className="text-blue-400 hover:text-blue-300 font-medium">Skip & enter manually</button>
                            </div>
                        </div>
                    )}

                    {/* Selected Symbol Banner */}
                    {isLiveTracked && selectedSymbol && selectedSymbol !== 'MANUAL' && (
                        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                            <div>
                                <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">Live Tracked Asset</p>
                                <p className="text-white font-medium">{form.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{selectedSymbol}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setSelectedSymbol(''); setForm(prev => ({ ...prev, name: '' })) }}
                                className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Asset Name - Disabled if auto-filled via search */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Asset Name</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                disabled={selectedSymbol !== '' && selectedSymbol !== 'MANUAL'}
                                placeholder="e.g., AAPL Shares or Home at 123 Main St"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition disabled:opacity-50"
                            />
                        </div>

                        {/* Current Value (Only if NOT live tracking) */}
                        {(!isLiveTracked || selectedSymbol === 'MANUAL') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Value (₹)</label>
                                <input
                                    type="number"
                                    name="value"
                                    value={form.value}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition font-mono"
                                />
                            </div>
                        )}

                        {/* Units (Only if Live Tracking IS enabled) */}
                        {(isLiveTracked && selectedSymbol !== '' && selectedSymbol !== 'MANUAL') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantity / Units Owned</label>
                                <input
                                    type="number"
                                    name="units"
                                    value={form.units}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="any"
                                    placeholder="e.g., 100"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition font-mono border-l-4 border-l-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Purchase Details (Crucial for PnL) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border border-blue-500/20 rounded-2xl bg-blue-500/[0.03]">
                        <div className="md:col-span-2">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Investment Info
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">Providing these details enables <span className="text-blue-400 font-bold">Profit & Loss tracking</span> for this asset.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex justify-between">
                                <span>Total Invested (₹)</span>
                                <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider italic">Optional but recommended</span>
                            </label>
                            <input
                                type="number"
                                name="purchase_price"
                                value={form.purchase_price}
                                onChange={handleChange}
                                min="0"
                                step="any"
                                placeholder="Total amount paid for all units"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex justify-between">
                                <span>Date of Purchase</span>
                                <span className="text-[10px] text-slate-500 font-normal uppercase tracking-wider italic">Optional</span>
                            </label>
                            <input
                                type="date"
                                name="purchase_date"
                                value={form.purchase_date}
                                onChange={handleChange}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Notes (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                        <textarea
                            rows={2}
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            placeholder="Add any extra details here..."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition resize-none"
                        ></textarea>
                    </div>

                    {/* Submit Area */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => navigate('/assets')}
                            className="px-6 py-3 rounded-xl bg-transparent text-slate-400 font-medium hover:text-white hover:bg-white/5 transition"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (isLiveTracked && !selectedSymbol && !form.value)}
                            className={`px-8 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold transition shadow-lg flex items-center justify-center gap-2 ${loading || (isLiveTracked && !selectedSymbol && !form.value) ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-500 hover:to-emerald-500 shadow-green-500/25'}`}
                        >
                            {loading ? (
                                <span className="inline-block w-5 h-5 border-2 border-t-white border-white/30 rounded-full animate-spin"></span>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            )}
                            Save Asset
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AddAsset;
