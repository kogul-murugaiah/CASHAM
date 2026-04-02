import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Types ──────────────────────────────────────────────────────

type Tab = "overview" | "mf" | "stock" | "gold" | "fd" | "realestate";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "overview", label: "Overview", emoji: "📊" },
  { key: "mf", label: "Mutual Funds", emoji: "📈" },
  { key: "stock", label: "Stocks", emoji: "💹" },
  { key: "gold", label: "Gold", emoji: "🏅" },
  { key: "fd", label: "Fixed Deposits", emoji: "🏦" },
  { key: "realestate", label: "Real Estate", emoji: "🏠" },
];

const TYPE_MAP: Record<Tab, string> = {
  overview: "", mf: "Mutual Fund", stock: "Stock", gold: "Gold", fd: "FD", realestate: "Real Estate",
};

const TYPE_COLORS: Record<string, string> = {
  "Mutual Fund": "#10b981",
  "Stock": "#f59e0b",
  "Gold": "#fbbf24",
  "FD": "#3b82f6",
  "Real Estate": "#f43f5e",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const pctFmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

// ─── Days to maturity helper ────────────────────────────────────
const daysLeft = (matDate: string) => {
  const diff = new Date(matDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── Inline Price Update Modal ──────────────────────────────────
const PriceModal = ({ inv, onClose, onSave }: { inv: any; onClose: () => void; onSave: (id: string, val: number, meta?: any) => void }) => {
  const [val, setVal] = useState("");

  const getLabel = () => {
    if (inv.type === "Mutual Fund") return "Current NAV (₹)";
    if (inv.type === "Stock") return "Current Price / Share (₹)";
    if (inv.type === "Gold") return "Current Price / gram (₹)";
    if (inv.type === "Real Estate") return "Current Property Value (₹)";
    return "Current Value (₹)";
  };

  const computeValue = () => {
    if (!val) return 0;
    if (inv.type === "Mutual Fund" && inv.investment_mf?.[0]?.units) return parseFloat(val) * inv.investment_mf[0].units;
    if (inv.type === "Stock" && inv.investment_stock?.[0]?.quantity) return parseFloat(val) * inv.investment_stock[0].quantity;
    if (inv.type === "Gold" && inv.investment_gold?.[0]?.grams) return parseFloat(val) * inv.investment_gold[0].grams;
    if (inv.type === "FD") return parseFloat(inv.investment_fd?.[0]?.maturity_amount || inv.amount);
    return parseFloat(val);
  };

  const handleSave = () => {
    const cv = computeValue();
    if (cv <= 0) return;
    let meta: any = {};
    if (inv.type === "Mutual Fund") meta = { current_nav: parseFloat(val) };
    else if (inv.type === "Stock") meta = { current_price: parseFloat(val) };
    else if (inv.type === "Gold") meta = { current_price_per_gram: parseFloat(val) };
    else if (inv.type === "Real Estate") meta = { current_value: parseFloat(val) };
    onSave(inv.id, inv.type === "Real Estate" ? parseFloat(val) : cv, meta);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm glass-card p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Update Price</h3>
        <p className="text-sm text-slate-400 mb-4">{inv.name}</p>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{getLabel()}</label>
        <div className="relative mb-4">
          <span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
          <input type="number" step="any" value={val} onChange={e => setVal(e.target.value)} autoFocus
            className="block w-full rounded-xl border border-white/10 bg-slate-700/50 pl-8 pr-4 py-3 text-white text-sm focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none" />
        </div>
        {val && inv.type !== "Real Estate" && inv.type !== "FD" && (
          <p className="text-xs text-slate-400 mb-4">→ Current Value: <span className="text-white font-bold">{currencyFormatter.format(computeValue())}</span></p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all">Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Portfolio Component ────────────────────────────────────

const Portfolio = () => {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [priceModal, setPriceModal] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const data = await api.get("/api/investments?summary=true");
      setSummary(data);
    } catch {}
  };

  const fetchRecords = async (type: string) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/investments?type=${encodeURIComponent(type)}`);
      setRecords(data || []);
    } catch {
      setRecords([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (tab !== "overview") fetchRecords(TYPE_MAP[tab]);
    else setLoading(false);
  }, [tab]);

  const handlePriceUpdate = async (id: string, current_value: number, meta?: any) => {
    setUpdating(id);
    try {
      const type = records.find(r => r.id === id)?.type;
      await api.put("/api/investments", { id, current_value, type, detail: meta });
      setRecords(prev => prev.map(r => r.id === id ? { ...r, current_value } : r));
      fetchSummary();
    } finally { setUpdating(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investment record?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/investments?id=${id}`);
      setRecords(prev => prev.filter(r => r.id !== id));
      fetchSummary();
    } finally { setDeleting(null); }
  };

  const pnlColor = (pnl: number) => pnl >= 0 ? "text-emerald-400" : "text-red-400";

  // ── Overview Tab ─────────────────────────────────────────────
  const OverviewTab = () => {
    if (!summary) return <div className="h-32 animate-pulse rounded-3xl bg-slate-700/50" />;
    const { total_invested, total_current_value, total_pnl, total_return_pct, by_type } = summary;
    const pieData = (by_type || []).filter((t: any) => t.current_value > 0).map((t: any) => ({ name: t.type, value: t.current_value }));

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Portfolio KPIs */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[
            { label: "Total Invested", value: currencyFormatter.format(total_invested || 0), color: "text-white", glow: "bg-slate-500" },
            { label: "Current Value", value: currencyFormatter.format(total_current_value || 0), color: "text-amber-400", glow: "bg-amber-500" },
            { label: "Total P&L", value: currencyFormatter.format(total_pnl || 0), color: pnlColor(total_pnl || 0), glow: total_pnl >= 0 ? "bg-emerald-500" : "bg-red-500" },
            { label: "Overall Return", value: pctFmt(total_return_pct || 0), color: pnlColor(total_return_pct || 0), glow: total_return_pct >= 0 ? "bg-emerald-500" : "bg-red-500" },
          ].map(({ label, value, color, glow }) => (
            <div key={label} className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><div className={`w-16 h-16 rounded-full ${glow} blur-2xl`} /></div>
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <div className={`mt-2 text-2xl font-bold font-heading font-mono ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Asset Allocation */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 font-heading">Asset Allocation</h3>
            {pieData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry: any) => <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "#64748b"} stroke="rgba(0,0,0,0)" />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }} formatter={(v: any) => currencyFormatter.format(v)} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={v => <span className="text-slate-400 text-sm ml-1">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-500 text-sm">No investments yet</div>
            )}
          </div>

          {/* Per-type breakdown table */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-slate-700/30">
              <h3 className="text-lg font-bold text-white font-heading">By Asset Class</h3>
            </div>
            <div className="divide-y divide-white/5">
              {(by_type || []).map((t: any) => (
                <div key={t.type} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[t.type] }} />
                    <div>
                      <p className="text-sm font-medium text-white">{t.type}</p>
                      <p className="text-xs text-slate-500">{t.count} holding{t.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white font-mono">{currencyFormatter.format(t.current_value)}</p>
                    <p className={`text-xs font-mono ${pnlColor(t.pnl)}`}>{pctFmt(t.return_pct)}</p>
                  </div>
                </div>
              ))}
              {(!by_type || by_type.length === 0) && (
                <div className="px-6 py-12 text-center text-slate-500 text-sm">No investments logged yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Reusable row skeleton ────────────────────────────────────
  const LoadingRows = () => (
    <div className="space-y-3 p-6">
      {[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-700/50" />)}
    </div>
  );

  // ── Price update cell ─────────────────────────────────────────
  const PriceCell = ({ inv, currentVal, invested }: { inv: any; currentVal: number | null; invested: number }) => {
    const val = currentVal ?? invested;
    const pnl = val - invested;
    const pct = invested > 0 ? (pnl / invested) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <div>
          <p className="text-sm font-bold text-white font-mono">{currencyFormatter.format(val)}</p>
          <p className={`text-xs font-mono ${pnlColor(pnl)}`}>{pctFmt(pct)}</p>
        </div>
        <button onClick={() => setPriceModal(inv)} disabled={!!updating}
          title="Update current price"
          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all opacity-60 hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
        </button>
        {updating === inv.id && <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />}
      </div>
    );
  };

  const DeleteBtn = ({ id }: { id: string }) => (
    <button onClick={() => handleDelete(id)} disabled={deleting === id}
      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
      {deleting === id
        ? <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
        : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
      }
    </button>
  );

  // ── Mutual Fund Table ─────────────────────────────────────────
  const MFTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-white/5 bg-slate-700/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-6 py-4 text-left">Fund</th>
          <th className="px-6 py-4">Category</th>
          <th className="px-6 py-4">Units</th>
          <th className="px-6 py-4">NAV (buy)</th>
          <th className="px-6 py-4">Invested</th>
          <th className="px-6 py-4">Current Value / P&L</th>
          <th className="px-6 py-4">SIP</th>
          <th className="px-6 py-4"></th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {records.map(inv => {
            const mf = inv.investment_mf?.[0];
            return (
              <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{inv.name}</p>
                  <p className="text-xs text-slate-500">{mf?.fund_house || "—"}</p>
                </td>
                <td className="px-6 py-4 text-center"><span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">{mf?.fund_category || "—"}</span></td>
                <td className="px-6 py-4 text-sm text-slate-300 text-center font-mono">{mf?.units ?? "—"}</td>
                <td className="px-6 py-4 text-sm text-slate-400 text-center font-mono">{mf?.nav_at_purchase ? `₹${mf.nav_at_purchase}` : "—"}</td>
                <td className="px-6 py-4 text-sm text-amber-400 font-bold font-mono text-center">{currencyFormatter.format(inv.amount)}</td>
                <td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} /></td>
                <td className="px-6 py-4 text-center">{mf?.is_sip ? <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">SIP {mf.sip_day && `(${mf.sip_day}th)`}</span> : "—"}</td>
                <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Stock Table ───────────────────────────────────────────────
  const StockTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-white/5 bg-slate-700/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-6 py-4 text-left">Company</th>
          <th className="px-6 py-4">Ticker</th>
          <th className="px-6 py-4">Sector</th>
          <th className="px-6 py-4">Qty</th>
          <th className="px-6 py-4">Buy Price</th>
          <th className="px-6 py-4">Invested</th>
          <th className="px-6 py-4">Current Value / P&L</th>
          <th className="px-6 py-4"></th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {records.map(inv => {
            const s = inv.investment_stock?.[0];
            return (
              <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{inv.name}</p>
                  <span className="text-[10px] text-slate-500">{s?.exchange || "NSE"}</span>
                </td>
                <td className="px-6 py-4 text-center"><span className="font-mono font-bold text-amber-400 text-sm">{s?.ticker || "—"}</span></td>
                <td className="px-6 py-4 text-center text-xs text-slate-400">{s?.sector || "—"}</td>
                <td className="px-6 py-4 text-center text-sm text-slate-300 font-mono">{s?.quantity ?? "—"}</td>
                <td className="px-6 py-4 text-center text-sm text-slate-400 font-mono">{s?.buy_price ? `₹${s.buy_price}` : "—"}</td>
                <td className="px-6 py-4 text-center text-sm font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td>
                <td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} /></td>
                <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Gold Table ────────────────────────────────────────────────
  const GoldTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-white/5 bg-slate-700/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-6 py-4 text-left">Name</th>
          <th className="px-6 py-4">Form</th>
          <th className="px-6 py-4">Purity</th>
          <th className="px-6 py-4">Grams</th>
          <th className="px-6 py-4">Buy Price/g</th>
          <th className="px-6 py-4">Invested</th>
          <th className="px-6 py-4">Current Value / P&L</th>
          <th className="px-6 py-4"></th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {records.map(inv => {
            const g = inv.investment_gold?.[0];
            return (
              <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">{inv.name}</td>
                <td className="px-6 py-4 text-center"><span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-lg">{g?.gold_form || "—"}</span></td>
                <td className="px-6 py-4 text-center text-sm text-slate-300">{g?.purity || "24K"}</td>
                <td className="px-6 py-4 text-center text-sm font-mono text-slate-300">{g?.grams ? `${g.grams}g` : "—"}</td>
                <td className="px-6 py-4 text-center text-sm text-slate-400 font-mono">{g?.buy_price_per_gram ? `₹${g.buy_price_per_gram}/g` : "—"}</td>
                <td className="px-6 py-4 text-center text-sm font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td>
                <td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} /></td>
                <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── FD Table ──────────────────────────────────────────────────
  const FDTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-white/5 bg-slate-700/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-6 py-4 text-left">Bank / Label</th>
          <th className="px-6 py-4">Principal</th>
          <th className="px-6 py-4">Rate</th>
          <th className="px-6 py-4">Tenure</th>
          <th className="px-6 py-4">Start → Maturity</th>
          <th className="px-6 py-4">Days Left</th>
          <th className="px-6 py-4">Maturity Amount</th>
          <th className="px-6 py-4"></th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {records.map(inv => {
            const fd = inv.investment_fd?.[0];
            const dl = fd?.maturity_date ? daysLeft(fd.maturity_date) : null;
            const maturing = dl !== null && dl <= 30 && dl >= 0;
            const matured = dl !== null && dl < 0;
            return (
              <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{fd?.bank_name || inv.name}</p>
                  <p className="text-xs text-slate-500">{inv.name}</p>
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-white font-mono">{fd?.principal ? currencyFormatter.format(fd.principal) : "—"}</td>
                <td className="px-6 py-4 text-center"><span className="text-sm text-blue-400 font-bold">{fd?.interest_rate ? `${fd.interest_rate}%` : "—"}</span></td>
                <td className="px-6 py-4 text-center text-sm text-slate-400">{fd?.tenure_months ? `${fd.tenure_months}m` : "—"}</td>
                <td className="px-6 py-4 text-center text-xs text-slate-400">
                  {fd?.start_date && fd?.maturity_date
                    ? <>{new Date(fd.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} → {new Date(fd.maturity_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</>
                    : "—"}
                </td>
                <td className="px-6 py-4 text-center">
                  {dl === null ? "—" : matured
                    ? <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full border border-slate-500/20">Matured</span>
                    : <span className={`text-xs font-bold px-2 py-1 rounded-full border ${maturing ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>{dl}d</span>
                  }
                </td>
                <td className="px-6 py-4 text-center text-sm font-bold text-emerald-400 font-mono">{fd?.maturity_amount ? currencyFormatter.format(fd.maturity_amount) : "—"}</td>
                <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Real Estate Table ─────────────────────────────────────────
  const RETable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-white/5 bg-slate-700/40 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <th className="px-6 py-4 text-left">Property</th>
          <th className="px-6 py-4">Type</th>
          <th className="px-6 py-4">Area</th>
          <th className="px-6 py-4">Buy Price</th>
          <th className="px-6 py-4">Monthly Rent</th>
          <th className="px-6 py-4">Annual Yield</th>
          <th className="px-6 py-4">Current Value / Gain</th>
          <th className="px-6 py-4"></th>
        </tr></thead>
        <tbody className="divide-y divide-white/5">
          {records.map(inv => {
            const re = inv.investment_real_estate?.[0];
            const annualRent = (re?.monthly_rental || 0) * 12;
            const currentVal = inv.current_value || inv.amount;
            const yield_ = currentVal > 0 ? (annualRent / currentVal) * 100 : 0;
            return (
              <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-white">{inv.name}</p>
                  <p className="text-xs text-slate-500">{re?.address || "—"}</p>
                </td>
                <td className="px-6 py-4 text-center"><span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg">{re?.property_type || "—"}</span></td>
                <td className="px-6 py-4 text-center text-sm text-slate-400">{re?.area_sqft ? `${re.area_sqft} sqft` : "—"}</td>
                <td className="px-6 py-4 text-center text-sm font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td>
                <td className="px-6 py-4 text-center text-sm text-emerald-400 font-mono">{re?.monthly_rental > 0 ? currencyFormatter.format(re.monthly_rental) : "—"}</td>
                <td className="px-6 py-4 text-center"><span className={`text-xs font-bold ${yield_ > 0 ? "text-emerald-400" : "text-slate-500"}`}>{yield_ > 0 ? `${yield_.toFixed(2)}%` : "—"}</span></td>
                <td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} /></td>
                <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const tabContent: Record<Tab, React.ReactNode> = {
    overview: <OverviewTab />,
    mf: <MFTable />,
    stock: <StockTable />,
    gold: <GoldTable />,
    fd: <FDTable />,
    realestate: <RETable />,
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Portfolio</p>
            <h1 className="text-4xl font-bold font-heading text-white">Investment Tracker</h1>
            <p className="text-slate-400 mt-1">Track your wealth across all asset classes.</p>
          </div>
          <a href="/add-investment" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:scale-[1.02] transition-all self-start sm:self-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Log Investment
          </a>
        </header>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 p-1 bg-slate-700/40 rounded-2xl border border-white/5 mb-8 backdrop-blur-sm">
          {TABS.map(({ key, label, emoji }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${tab === key ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" ? (
          <OverviewTab />
        ) : (
          <div className="glass-card overflow-hidden animate-fade-in">
            <div className="border-b border-white/5 bg-slate-700/30 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white font-heading">
                {TABS.find(t => t.key === tab)?.emoji} {TABS.find(t => t.key === tab)?.label}
              </h2>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                {records.length} holding{records.length !== 1 ? "s" : ""}
              </span>
            </div>
            {loading ? <LoadingRows /> : records.length === 0 ? (
              <div className="p-16 text-center">
                <p className="text-slate-400 text-sm mb-3">No {TABS.find(t => t.key === tab)?.label.toLowerCase()} recorded yet.</p>
                <a href="/add-investment" className="text-amber-400 text-sm font-bold hover:text-amber-300 transition-colors">+ Log your first investment →</a>
              </div>
            ) : tabContent[tab]}
          </div>
        )}

        {/* Update Price Modal */}
        {priceModal && (
          <PriceModal inv={priceModal} onClose={() => setPriceModal(null)} onSave={handlePriceUpdate} />
        )}
      </div>
    </div>
  );
};

export default Portfolio;
