import { useState, useEffect, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";

// ─── Types ───────────────────────────────────────────────────────

type AssetType = "Mutual Fund" | "Stock" | "Gold" | "FD" | "Real Estate";

const ASSET_TYPES: { type: AssetType; emoji: string; color: string; bg: string; desc: string }[] = [
  { type: "Mutual Fund", emoji: "📈", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", desc: "SIP / Lumpsum" },
  { type: "Stock", emoji: "📊", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", desc: "NSE / BSE" },
  { type: "Gold", emoji: "🏅", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", desc: "Physical / SGB / Digital" },
  { type: "FD", emoji: "🏦", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", desc: "Fixed Deposit" },
  { type: "Real Estate", emoji: "🏠", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", desc: "Property / Plot" },
];

const MF_CATEGORIES = ["Equity", "Debt", "Hybrid", "ELSS", "Index Fund", "Overnight", "Liquid"];
const GOLD_FORMS = ["Physical", "Sovereign Gold Bond (SGB)", "Digital Gold"];
const GOLD_PURITIES = ["24K", "22K", "18K"];
const FD_COMPOUNDING = ["Quarterly", "Monthly", "Annually", "Cumulative", "Simple Interest"];
const RE_TYPES = ["Residential", "Commercial", "Plot", "Land"];
const EXCHANGES = ["NSE", "BSE"];
const SECTORS = ["Banking", "IT", "FMCG", "Pharma", "Auto", "Energy", "Telecom", "Metals", "Real Estate", "Other"];

// Compounding frequency map — avoids fragile nested ternaries
const COMPOUNDING_FREQ: Record<string, number> = {
    "Monthly": 12,
    "Quarterly": 4,
    "Annually": 1,
    "Cumulative": 4, // banks typically compound quarterly for cumulative FDs
    "Simple Interest": 0,
};

// Safe month addition — JS Date.setMonth overflows (e.g. Jan 31 + 1 = Mar 3)
const addMonths = (dateStr: string, months: number): string => {
    const d = new Date(dateStr);
    const originalDay = d.getDate();
    d.setDate(1); // go to 1st to prevent overflow
    d.setMonth(d.getMonth() + months);
    // Clamp to last day of target month if original day exceeds it
    const daysInTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(originalDay, daysInTarget));
    return d.toISOString().slice(0, 10);
};

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// ─── Component ──────────────────────────────────────────────────

const AddInvestment = () => {
  const { accountTypes } = useAccountTypes();
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recent, setRecent] = useState<any[]>([]);

  // Common fields
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [accountType, setAccountType] = useState("");
  const [notes, setNotes] = useState("");

  // MF
  const [mf, setMf] = useState({ fund_house: "", fund_category: "Equity", folio_number: "", units: "", nav_at_purchase: "", is_sip: false, sip_day: "" });
  // Stock
  const [stock, setStock] = useState({ ticker: "", exchange: "NSE", quantity: "", buy_price: "", sector: "" });
  // Gold
  const [gold, setGold] = useState({ gold_form: "Physical", grams: "", purity: "24K", buy_price_per_gram: "" });
  // FD
  const [fd, setFd] = useState({ bank_name: "", fd_number: "", principal: "", interest_rate: "", tenure_months: "", start_date: date, compounding: "Quarterly", maturity_amount: "" });
  // RE
  const [re, setRe] = useState({ property_type: "Residential", address: "", area_sqft: "", buy_price_per_sqft: "", monthly_rental: "", loan_emi: "" });

  // Auto-calculate amount for each type
  useEffect(() => {
    if (selectedType === "Mutual Fund") {
      const u = parseFloat(mf.units), n = parseFloat(mf.nav_at_purchase);
      if (!isNaN(u) && !isNaN(n) && u > 0 && n > 0) setAmount((u * n).toFixed(2));
    } else if (selectedType === "Stock") {
      const q = parseFloat(stock.quantity), p = parseFloat(stock.buy_price);
      if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) setAmount((q * p).toFixed(2));
    } else if (selectedType === "Gold") {
      const g = parseFloat(gold.grams), p = parseFloat(gold.buy_price_per_gram);
      if (!isNaN(g) && !isNaN(p) && g > 0 && p > 0) setAmount((g * p).toFixed(2));
    } else if (selectedType === "FD") {
      if (fd.principal) setAmount(fd.principal);
    } else if (selectedType === "Real Estate") {
      const a = parseFloat(re.area_sqft), p = parseFloat(re.buy_price_per_sqft);
      if (!isNaN(a) && !isNaN(p) && a > 0 && p > 0) setAmount((a * p).toFixed(2));
    }
  }, [mf.units, mf.nav_at_purchase, stock.quantity, stock.buy_price, gold.grams, gold.buy_price_per_gram, fd.principal, re.area_sqft, re.buy_price_per_sqft, selectedType]);

  // Auto-calculate FD maturity date and amount
  useEffect(() => {
    if (selectedType === "FD" && fd.start_date && fd.tenure_months) {
      const p = parseFloat(fd.principal);
      const r = parseFloat(fd.interest_rate) / 100;
      const t = parseFloat(fd.tenure_months) / 12;
      if (!isNaN(p) && !isNaN(r) && p > 0 && r > 0) {
        const n = COMPOUNDING_FREQ[fd.compounding];
        const maturityAmt = n === 0
          ? p * (1 + r * t)             // Simple Interest
          : p * Math.pow(1 + r / n, n * t); // Compound Interest
        setFd(prev => ({ ...prev, maturity_amount: maturityAmt.toFixed(2) }));
      }
    }
  }, [fd.principal, fd.interest_rate, fd.tenure_months, fd.start_date, fd.compounding, selectedType]);

  const fetchRecent = async () => {
    try {
      // Limit=5 at the API level — avoids fetching all records and slicing on frontend
      const data = await api.get("/api/investments?limit=5");
      setRecent(data || []);
    } catch {}
  };

  useEffect(() => { fetchRecent(); }, []);

  const resetAll = () => {
    setSelectedType(null); setAction("buy");
    setName(""); setDate(new Date().toISOString().slice(0, 10)); setAmount(""); setAccountType(""); setNotes("");
    setMf({ fund_house: "", fund_category: "Equity", folio_number: "", units: "", nav_at_purchase: "", is_sip: false, sip_day: "" });
    setStock({ ticker: "", exchange: "NSE", quantity: "", buy_price: "", sector: "" });
    setGold({ gold_form: "Physical", grams: "", purity: "24K", buy_price_per_gram: "" });
    setFd({ bank_name: "", fd_number: "", principal: "", interest_rate: "", tenure_months: "", start_date: new Date().toISOString().slice(0, 10), compounding: "Quarterly", maturity_amount: "" });
    setRe({ property_type: "Residential", address: "", area_sqft: "", buy_price_per_sqft: "", monthly_rental: "", loan_emi: "" });
  };

  const buildDetail = (): any => {
    if (selectedType === "Mutual Fund") return { ...mf, units: parseFloat(mf.units), nav_at_purchase: mf.nav_at_purchase ? parseFloat(mf.nav_at_purchase) : null, sip_day: mf.sip_day ? parseInt(mf.sip_day) : null };
    if (selectedType === "Stock") return { ...stock, quantity: parseInt(stock.quantity), buy_price: parseFloat(stock.buy_price) };
    if (selectedType === "Gold") return { ...gold, grams: parseFloat(gold.grams), buy_price_per_gram: gold.buy_price_per_gram ? parseFloat(gold.buy_price_per_gram) : null };
    if (selectedType === "FD") {
      // Use safe addMonths to avoid JS Date overflow bug (e.g. Jan 31 + 1mo = Mar 3)
      const maturity_date = addMonths(fd.start_date, parseInt(fd.tenure_months));
      return { ...fd, maturity_date, principal: parseFloat(fd.principal), interest_rate: parseFloat(fd.interest_rate), tenure_months: parseInt(fd.tenure_months), maturity_amount: fd.maturity_amount ? parseFloat(fd.maturity_amount) : null };
    }
    if (selectedType === "Real Estate") return { property_name: name, ...re, area_sqft: re.area_sqft ? parseFloat(re.area_sqft) : null, buy_price_per_sqft: re.buy_price_per_sqft ? parseFloat(re.buy_price_per_sqft) : null, monthly_rental: parseFloat(re.monthly_rental) || 0, loan_emi: parseFloat(re.loan_emi) || 0 };
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!selectedType || !name || !amount || !date) { setError("Please fill all required fields"); return; }
    if (Number(amount) <= 0) { setError("Amount must be greater than 0"); return; }
    setLoading(true);
    try {
      await api.post("/api/investments", {
        type: selectedType, name, action,
        amount: Number(amount), date,
        account_type: accountType || null,
        notes: notes || null,
        detail: buildDetail(),
      });
      setSuccess(`${selectedType} ${action === "buy" ? "investment" : "redemption"} logged successfully!`);
      resetAll();
      fetchRecent();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "block w-full rounded-xl border border-white/10 bg-slate-700/50 backdrop-blur px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all outline-none text-sm";
  const labelCls = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center p-3 bg-amber-500/10 rounded-2xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">Log Investment</h1>
          <p className="text-slate-400">Track your MF, Stock, Gold, FD, and Real Estate holdings.</p>
        </header>

        {error && <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">{error}</div>}
        {success && <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm text-center font-semibold">✓ {success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Step 1: Select Asset Type */}
          <div className="glass-card p-6 animate-fade-in">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Step 1 — Select Asset Class</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {ASSET_TYPES.map(({ type, emoji, color, bg, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setSelectedType(type); setError(""); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center ${
                    selectedType === type
                      ? `${bg} border-opacity-100 scale-[1.03] shadow-lg`
                      : "border-white/5 bg-slate-700/30 hover:bg-slate-700/60 hover:border-white/10"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className={`text-xs font-bold ${selectedType === type ? color : "text-white"}`}>{type}</p>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Fill Details */}
          {selectedType && (
            <div className="glass-card p-6 sm:p-8 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Step 2 — Details</p>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedType}</h2>
                </div>
                {/* Buy / Sell toggle — available for all asset types */}
                <div className="flex p-1 bg-slate-700/50 rounded-xl border border-white/5">
                  <button type="button" onClick={() => setAction("buy")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${action === "buy" ? "bg-amber-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>📈 Buy</button>
                  <button type="button" onClick={() => setAction("sell")} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${action === "sell" ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}>
                    {selectedType === "FD" ? "💰 Premature Closure" : selectedType === "Real Estate" ? "🏠 Sell Property" : "📉 Sell / Redeem"}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 relative z-10">

                {/* ── Common: Name ── */}
                <div className={selectedType === "Real Estate" ? "sm:col-span-2" : ""}>
                  <label className={labelCls}>
                    {selectedType === "Mutual Fund" ? "Fund Name" : selectedType === "Stock" ? "Company Name" : selectedType === "Gold" ? "Reference Name" : selectedType === "FD" ? "FD Label" : "Property Name"} *
                  </label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls}
                    placeholder={selectedType === "Mutual Fund" ? "HDFC Small Cap Fund" : selectedType === "Stock" ? "HDFC Bank" : selectedType === "Gold" ? "Gold Purchase Apr 2026" : selectedType === "FD" ? "SBI FD" : "My Apartment — Chennai"}
                    required />
                </div>

                {/* ── Mutual Fund specific ── */}
                {selectedType === "Mutual Fund" && (<>
                  <div>
                    <label className={labelCls}>Fund House</label>
                    <input type="text" value={mf.fund_house} onChange={e => setMf(p => ({ ...p, fund_house: e.target.value }))} className={inputCls} placeholder="HDFC, SBI, Axis, Mirae..." />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select value={mf.fund_category} onChange={e => setMf(p => ({ ...p, fund_category: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      {MF_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Units *</label>
                    <input type="number" step="any" value={mf.units} onChange={e => setMf(p => ({ ...p, units: e.target.value }))} className={inputCls} placeholder="e.g. 125.543" required />
                  </div>
                  <div>
                    <label className={labelCls}>NAV at Purchase</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" step="any" value={mf.nav_at_purchase} onChange={e => setMf(p => ({ ...p, nav_at_purchase: e.target.value }))} className={inputCls + " pl-8"} placeholder="39.84" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Folio Number</label>
                    <input type="text" value={mf.folio_number} onChange={e => setMf(p => ({ ...p, folio_number: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${mf.is_sip ? "bg-emerald-500" : "bg-slate-600"}`}
                        onClick={() => setMf(p => ({ ...p, is_sip: !p.is_sip }))}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${mf.is_sip ? "translate-x-5" : ""}`} />
                      </div>
                      <span className="text-sm text-slate-300">SIP (recurring)</span>
                    </label>
                    {mf.is_sip && <input type="number" min="1" max="31" value={mf.sip_day} onChange={e => setMf(p => ({ ...p, sip_day: e.target.value }))} className="w-20 rounded-xl border border-white/10 bg-slate-700/50 px-3 py-2 text-sm text-white outline-none" placeholder="Day" />}
                  </div>
                </>)}

                {/* ── Stock specific ── */}
                {selectedType === "Stock" && (<>
                  <div>
                    <label className={labelCls}>Ticker Symbol *</label>
                    <input type="text" value={stock.ticker} onChange={e => setStock(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} className={inputCls + " font-mono"} placeholder="HDFCBANK" required />
                  </div>
                  <div>
                    <label className={labelCls}>Exchange</label>
                    <select value={stock.exchange} onChange={e => setStock(p => ({ ...p, exchange: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      {EXCHANGES.map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Quantity (Shares) *</label>
                    <input type="number" min="1" step="1" value={stock.quantity} onChange={e => setStock(p => ({ ...p, quantity: e.target.value }))} className={inputCls} placeholder="10" required />
                  </div>
                  <div>
                    <label className={labelCls}>Buy Price / Share *</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" step="any" value={stock.buy_price} onChange={e => setStock(p => ({ ...p, buy_price: e.target.value }))} className={inputCls + " pl-8"} placeholder="1500.00" required />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Sector</label>
                    <select value={stock.sector} onChange={e => setStock(p => ({ ...p, sector: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      <option value="">Select sector...</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>)}

                {/* ── Gold specific ── */}
                {selectedType === "Gold" && (<>
                  <div>
                    <label className={labelCls}>Form</label>
                    <select value={gold.gold_form} onChange={e => setGold(p => ({ ...p, gold_form: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      {GOLD_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Purity</label>
                    <select value={gold.purity} onChange={e => setGold(p => ({ ...p, purity: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      {GOLD_PURITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Weight (grams) *</label>
                    <input type="number" step="any" value={gold.grams} onChange={e => setGold(p => ({ ...p, grams: e.target.value }))} className={inputCls} placeholder="10" required />
                  </div>
                  <div>
                    <label className={labelCls}>Buy Price / gram *</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" step="any" value={gold.buy_price_per_gram} onChange={e => setGold(p => ({ ...p, buy_price_per_gram: e.target.value }))} className={inputCls + " pl-8"} placeholder="6800" required />
                    </div>
                  </div>
                </>)}

                {/* ── FD specific ── */}
                {selectedType === "FD" && (<>
                  <div>
                    <label className={labelCls}>Bank Name *</label>
                    <input type="text" value={fd.bank_name} onChange={e => setFd(p => ({ ...p, bank_name: e.target.value }))} className={inputCls} placeholder="SBI, HDFC Bank, PNB..." required />
                  </div>
                  <div>
                    <label className={labelCls}>FD / Account Number</label>
                    <input type="text" value={fd.fd_number} onChange={e => setFd(p => ({ ...p, fd_number: e.target.value }))} className={inputCls} placeholder="Optional" />
                  </div>
                  <div>
                    <label className={labelCls}>Principal Amount *</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" value={fd.principal} onChange={e => setFd(p => ({ ...p, principal: e.target.value }))} className={inputCls + " pl-8"} placeholder="100000" required />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Interest Rate (% p.a.) *</label>
                    <input type="number" step="0.01" value={fd.interest_rate} onChange={e => setFd(p => ({ ...p, interest_rate: e.target.value }))} className={inputCls} placeholder="7.5" required />
                  </div>
                  <div>
                    <label className={labelCls}>Tenure (months) *</label>
                    <input type="number" step="1" value={fd.tenure_months} onChange={e => setFd(p => ({ ...p, tenure_months: e.target.value }))} className={inputCls} placeholder="12" required />
                  </div>
                  <div>
                    <label className={labelCls}>Start Date *</label>
                    <input type="date" value={fd.start_date} onChange={e => setFd(p => ({ ...p, start_date: e.target.value }))} className={inputCls + " cursor-pointer"} required />
                  </div>
                  <div>
                    <label className={labelCls}>Compounding</label>
                    <select value={fd.compounding} onChange={e => setFd(p => ({ ...p, compounding: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      {FD_COMPOUNDING.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {fd.maturity_amount && (
                    <div className="sm:col-span-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                      <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">Estimated Maturity Amount</p>
                      <p className="text-2xl font-bold text-white font-mono">{currencyFormatter.format(parseFloat(fd.maturity_amount))}</p>
                      <p className="text-xs text-slate-400 mt-1">Gain: +{currencyFormatter.format(parseFloat(fd.maturity_amount) - parseFloat(fd.principal))}</p>
                    </div>
                  )}
                </>)}

                {/* ── Real Estate specific ── */}
                {selectedType === "Real Estate" && (<>
                  <div>
                    <label className={labelCls}>Property Type</label>
                    <select value={re.property_type} onChange={e => setRe(p => ({ ...p, property_type: e.target.value }))} className={inputCls + " appearance-none cursor-pointer"}>
                      {RE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Area (sq.ft.)</label>
                    <input type="number" step="any" value={re.area_sqft} onChange={e => setRe(p => ({ ...p, area_sqft: e.target.value }))} className={inputCls} placeholder="1200" />
                  </div>
                  <div>
                    <label className={labelCls}>Buy Price / sq.ft.</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" step="any" value={re.buy_price_per_sqft} onChange={e => setRe(p => ({ ...p, buy_price_per_sqft: e.target.value }))} className={inputCls + " pl-8"} placeholder="5000" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Monthly Rental Income</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" value={re.monthly_rental} onChange={e => setRe(p => ({ ...p, monthly_rental: e.target.value }))} className={inputCls + " pl-8"} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Loan EMI (if any)</label>
                    <div className="relative"><span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                      <input type="number" value={re.loan_emi} onChange={e => setRe(p => ({ ...p, loan_emi: e.target.value }))} className={inputCls + " pl-8"} placeholder="0" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address</label>
                    <input type="text" value={re.address} onChange={e => setRe(p => ({ ...p, address: e.target.value }))} className={inputCls} placeholder="Optional — street, city" />
                  </div>
                </>)}

                {/* ── Common: Date, Total Amount, Account ── */}
                <div>
                  <label className={labelCls}>Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls + " cursor-pointer"} required />
                </div>

                <div>
                  <label className={labelCls}>
                    Total Amount {selectedType !== "FD" && <span className="text-amber-400 text-xs ml-1">(auto-calculated)</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
                    <input
                      type="number" step="any"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      readOnly={selectedType !== "FD" && selectedType !== "Real Estate" && !!amount}
                      className={inputCls + ` pl-8 font-mono font-bold ${
                        selectedType !== "FD" && selectedType !== "Real Estate" && amount
                          ? "opacity-80 cursor-not-allowed bg-slate-800/50"
                          : ""
                      }`}
                      placeholder="0.00" required
                    />
                  </div>
                  {selectedType !== "FD" && selectedType !== "Real Estate" && amount && (
                    <p className="text-[10px] text-slate-500 mt-1 ml-1">Auto-calculated from the fields above</p>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Account (fund source)</label>
                  <select value={accountType} onChange={e => setAccountType(e.target.value)} className={inputCls + " appearance-none cursor-pointer"}>
                    <option value="">No account</option>
                    {accountTypes.map(at => <option key={at} value={at}>{at}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Notes</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Optional..." />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={resetAll} className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  Clear
                </button>
                <button type="submit" disabled={loading}
                  className="rounded-xl px-8 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? "Saving..." : `Log ${action === "buy" ? "Investment" : "Redemption"}`}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Recent Activity */}
        {recent.length > 0 && (
          <div className="mt-12 animate-fade-in">
            <h2 className="text-xl font-bold font-heading text-white mb-6 px-2">Recent Activity</h2>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-700/40 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map(inv => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-400">{new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                      <td className="px-6 py-4 text-sm font-medium text-white">{inv.name}</td>
                      <td className="px-6 py-4"><span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-white/5">{inv.type}</span></td>
                      <td className="px-6 py-4"><span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${inv.action === "buy" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>{inv.action === "buy" ? "↑ Buy" : "↓ Sell"}</span></td>
                      <td className={`px-6 py-4 text-sm font-bold text-right font-mono ${inv.action === "buy" ? "text-amber-400" : "text-emerald-400"}`}>{currencyFormatter.format(inv.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddInvestment;
