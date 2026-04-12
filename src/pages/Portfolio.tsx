import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { xirr, xirrFmt, timeAgo } from "../lib/xirr";
import type { CashFlow } from "../lib/xirr";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useAccountTypes } from "../hooks/useAccountTypes";

// ─── Types ──────────────────────────────────────────────────────

type Tab = "overview" | "mf" | "stock" | "gold" | "fd" | "realestate" | "crypto" | "pf" | "analysis";

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: "overview", label: "Overview", emoji: "📊" },
  { key: "mf", label: "Mutual Funds", emoji: "📈" },
  { key: "stock", label: "Stocks", emoji: "💹" },
  { key: "gold", label: "Gold", emoji: "🏅" },
  { key: "fd", label: "Fixed Deposits", emoji: "🏦" },
  { key: "realestate", label: "Real Estate", emoji: "🏠" },
  { key: "crypto", label: "Crypto", emoji: "🪙" },
  { key: "pf", label: "PF / Retirement", emoji: "🛡️" },
  { key: "analysis", label: "Risk & Analysis", emoji: "⚖️" },
];

const TYPE_MAP: Record<Tab, string> = {
  overview: "", mf: "Mutual Fund", stock: "Stock", gold: "Gold", fd: "FD", realestate: "Real Estate", crypto: "Crypto", pf: "PF", analysis: "",
};

const TYPE_COLORS: Record<string, string> = {
  "Mutual Fund": "#10b981",
  "Stock": "#f59e0b",
  "Gold": "#fbbf24",
  "FD": "#3b82f6",
  "Real Estate": "#f43f5e",
  "Crypto": "#a855f7",
  "PF": "#64748b",
};

const COLORS = ["#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6", "#f97316"];
const currencyFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const pctFmt = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

// ─── Helpers ────────────────────────────────────────────────────

const daysLeft = (matDate: string) => {
  const diff = new Date(matDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const PriceModal = ({ inv, onClose, onSave }: { inv: any; onClose: () => void; onSave: (id: string, val: number, meta?: any) => void }) => {
  const [val, setVal] = useState("");
  const computeValue = () => {
    if (!val) return 0;
    if (inv.type === "Mutual Fund" && inv.investment_mf?.[0]?.units) return parseFloat(val) * inv.investment_mf[0].units;
    if (inv.type === "Stock" && inv.investment_stock?.[0]?.quantity) return parseFloat(val) * inv.investment_stock[0].quantity;
    if (inv.type === "Gold" && inv.investment_gold?.[0]?.grams) return parseFloat(val) * inv.investment_gold[0].grams;
    if (inv.type === "Crypto" && inv.investment_crypto?.[0]?.quantity) return parseFloat(val) * inv.investment_crypto[0].quantity;
    if (inv.type === "FD") return parseFloat(inv.investment_fd?.[0]?.maturity_amount || inv.amount);
    if (inv.type === "PF") return parseFloat(val);
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
    else if (inv.type === "Crypto") meta = { current_price_inr: parseFloat(val) };
    else if (inv.type === "PF") meta = { current_balance: parseFloat(val) };
    onSave(inv.id, inv.type === "Real Estate" ? parseFloat(val) : cv, meta);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-sm glass-card p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-1">Update Price</h3>
        <p className="text-sm text-slate-400 mb-4">{inv.name}</p>
        <div className="relative mb-4">
          <span className="absolute left-4 top-3 text-slate-400 text-sm">₹</span>
          <input type="number" step="any" value={val} onChange={e => setVal(e.target.value)} autoFocus
            className="block w-full rounded-xl border border-white/10 bg-slate-700/50 pl-8 pr-4 py-3 text-white text-sm focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all">Save</button>
        </div>
      </div>
    </div>
  );
};

const AssetHistoryModal = ({ asset, history, onClose }: { asset: any; history: any[]; onClose: () => void }) => {
  const latestRow = history[0]; 
  const totalInvested = history.reduce((sum, h) => sum + (h.action === 'buy' ? h.amount : -h.amount), 0);
  const currentVal = latestRow.current_value ?? latestRow.amount;
  const absPnl = currentVal - totalInvested;
  
  const isCategoryMode = !!asset.isCategory;

  // Weighted Average Cost calculation
  const buyRows = history.filter(h => h.action === 'buy');
  const totalCost = buyRows.reduce((sum, h) => sum + h.amount, 0);
  const totalQty = buyRows.reduce((sum, h) => sum + (h.investment_mf?.[0]?.units || h.investment_stock?.[0]?.quantity || h.investment_gold?.[0]?.grams || h.investment_crypto?.[0]?.quantity || 0), 0);
  const avgCost = totalQty > 0 ? (totalCost / totalQty) : 0;
  
  const canAverage = ['Stock', 'Mutual Fund', 'Gold', 'Crypto'].includes(asset.type) && !isCategoryMode;

  const individualXirr = (() => {
    const cfs: CashFlow[] = history.map(cf => ({ amount: cf.action === 'buy' ? -cf.amount : cf.amount, date: new Date(cf.date) }));
    if (currentVal > 0 && !isCategoryMode) cfs.push({ amount: currentVal, date: new Date() });
    return xirr(cfs);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto pt-10 pb-10" onClick={onClose}>
      <div className="w-full max-w-2xl glass-card p-8 animate-scale-up mt-auto mb-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isCategoryMode ? `Global ${asset.type} Ledger` : `${asset.type} History`}</span>
            <h2 className="text-3xl font-heading font-black text-white">{isCategoryMode ? `All ${asset.type}s` : asset.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {canAverage ? (
              <div className="p-4 rounded-3xl bg-slate-800/40 border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Avg. Cost</p>
                <p className="text-lg font-mono font-bold text-white">{currencyFormatter.format(avgCost)}</p>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-slate-800/40 border border-white/5 bg-slate-800/10 opacity-50">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Avg. Cost</p>
                <p className="text-sm font-bold text-slate-600">N/A</p>
              </div>
            )}
            <div className="p-4 rounded-3xl bg-slate-800/40 border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{isCategoryMode ? 'Total Deployed' : 'Net Invested'}</p>
                <p className="text-lg font-mono font-bold text-amber-400">{currencyFormatter.format(totalInvested)}</p>
            </div>
            <div className="p-4 rounded-3xl bg-slate-800/40 border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">XIRR</p>
                <p className={`text-lg font-mono font-bold ${(individualXirr !== null && individualXirr >= 0) ? 'text-emerald-400' : 'text-red-400'}`}>{xirrFmt(individualXirr)}</p>
            </div>
            <div className="p-4 rounded-3xl bg-slate-800/40 border border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Abs. P&L</p>
                <p className={`text-lg font-mono font-bold ${absPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{currencyFormatter.format(absPnl)}</p>
            </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction History</h3>
          <div className="overflow-x-auto rounded-3xl border border-white/5 bg-slate-900/50">
            <table className="w-full text-xs">
              <thead className="bg-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-3 text-left">Date</th>
                  {isCategoryMode && <th className="px-6 py-3 text-left">Asset</th>}
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(h => {
                   const detail = h.investment_mf?.[0] || h.investment_stock?.[0] || h.investment_gold?.[0] || h.investment_crypto?.[0] || h.investment_pf?.[0] || {};
                   return (
                    <tr key={h.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-slate-300 font-mono">{h.date}</td>
                      {isCategoryMode && <td className="px-6 py-4 text-white font-bold">{h.name}</td>}
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${h.action === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white font-mono">{currencyFormatter.format(h.amount)}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {detail.units && `${detail.units} Units `}
                        {detail.quantity && `${detail.quantity} Qt / Shares `}
                        {detail.grams && `${detail.grams}g `}
                        {h.type === 'Crypto' && `${detail.token_symbol} `}
                        {h.type === 'PF' && `${detail.pf_type} `}
                      </td>
                    </tr>
                )})}
              </tbody>
            </table>
          </div>
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
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priceModal, setPriceModal] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const { accountTypes } = useAccountTypes();
  const [netWorthCash, setNetWorthCash] = useState(0);

  const fetchBankBalances = async () => {
    try {
      const [exps, incs] = await Promise.all([
        api.get("/api/expenses"),
        api.get("/api/incomes")
      ]);
      
      const balances = accountTypes.map(type => {
        const totalInc = (incs || []).filter((i: any) => i.account_type === type).reduce((s: number, i: any) => s + i.amount, 0);
        const totalExp = (exps || []).filter((e: any) => e.account_type === type).reduce((s: number, e: any) => s + e.amount, 0);
        const totalInv = (allRecords || []).filter((inv: any) => inv.account_type === type && inv.action === 'buy').reduce((s: number, i: any) => s + i.amount, 0);
        const totalRed = (allRecords || []).filter((inv: any) => inv.account_type === type && inv.action === 'sell').reduce((s: number, i: any) => s + i.amount, 0);
        return totalInc - totalExp - totalInv + totalRed;
      });
      setNetWorthCash(balances.reduce((a, b) => a + b, 0));
    } catch {}
  };

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
      // Also fetch ALL for history lookups if not already done
      if (allRecords.length === 0) {
        const all = await api.get("/api/investments");
        setAllRecords(all || []);
      }
    } catch { setRecords([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab !== "overview" && tab !== "analysis") {
        fetchRecords(TYPE_MAP[tab as Tab]);
    } else {
        setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (accountTypes.length > 0 && (summary || allRecords.length > 0)) {
        fetchBankBalances();
    }
  }, [accountTypes, summary, allRecords]);

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      await api.get("/api/prices/refresh");
      await fetchSummary();
      if (tab !== "overview" && tab !== "analysis") await fetchRecords(TYPE_MAP[tab]);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePriceUpdate = async (id: string, current_value: number, meta?: any) => {
    try {
      const type = (records.find(r => r.id === id) || allRecords.find(r => r.id === id))?.type;
      await api.put("/api/investments", { id, current_value, type, detail: meta });
      setRecords(prev => prev.map(r => r.id === id ? { ...r, current_value } : r));
      setAllRecords(prev => prev.map(r => r.id === id ? { ...r, current_value } : r));
      fetchSummary();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this investment record?")) return;
    try {
      await api.delete(`/api/investments?id=${id}`);
      setRecords(prev => prev.filter(r => r.id !== id));
      setAllRecords(prev => prev.filter(r => r.id !== id));
      fetchSummary();
    } catch {}
  };

  const pnlColor = (pnl: number) => pnl >= 0 ? "text-emerald-400" : "text-red-400";

  const OverviewTab = () => {
    if (!summary) return <div className="h-32 animate-pulse rounded-3xl bg-slate-700/50" />;
    const { total_invested, total_current_value, total_pnl, total_return_pct, by_type, cashflows } = summary;
    const pieData = (by_type || []).filter((t: any) => t.current_value > 0).map((t: any) => ({ name: t.type, value: t.current_value }));
    const portfolioXirr = (() => {
      if (!cashflows?.length || total_current_value <= 0) return null;
      const cfs: CashFlow[] = (cashflows as { date: string; amount: number }[]).map(cf => ({ amount: cf.amount, date: new Date(cf.date) }));
      cfs.push({ amount: total_current_value, date: new Date() });
      return xirr(cfs);
    })();
    const xirrColor = portfolioXirr === null ? 'text-slate-400' : portfolioXirr >= 0 ? 'text-emerald-400' : 'text-red-400';
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
          {[
            { label: 'Total Invested', value: currencyFormatter.format(total_invested || 0), color: 'text-white', glow: 'bg-slate-500' },
            { label: 'Current Value', value: currencyFormatter.format(total_current_value || 0), color: 'text-amber-400', glow: 'bg-amber-500' },
            { label: 'Total P&L', value: currencyFormatter.format(total_pnl || 0), color: pnlColor(total_pnl || 0), glow: total_pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
            { label: 'Simple Return', value: pctFmt(total_return_pct || 0), color: pnlColor(total_return_pct || 0), glow: total_return_pct >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
          ].map(({ label, value, color, glow }) => (
            <div key={label} className="glass-card p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><div className={`w-16 h-16 rounded-full ${glow} blur-2xl`} /></div>
              <p className="text-xs font-medium text-slate-400">{label}</p>
              <div className={`mt-2 text-2xl font-bold font-heading font-mono ${color}`}>{value}</div>
            </div>
          ))}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><div className={`w-16 h-16 rounded-full ${portfolioXirr !== null && portfolioXirr >= 0 ? 'bg-emerald-500' : 'bg-red-500'} blur-2xl`} /></div>
            <p className="text-xs font-medium text-slate-400">XIRR <span className="text-slate-600 text-[10px] ml-1">(annual)</span></p>
            <div className={`mt-2 text-2xl font-bold font-heading font-mono ${xirrColor}`}>{xirrFmt(portfolioXirr)}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 font-heading">Asset Allocation</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((entry: any) => <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "#64748b"} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} itemStyle={{ color: '#94a3b8' }} labelStyle={{ color: '#f8fafc' }} formatter={(v: any) => currencyFormatter.format(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-slate-700/30">
              <h3 className="text-lg font-bold text-white font-heading">By Asset Class</h3>
            </div>
            <div className="divide-y divide-white/5">
              {(by_type || []).map((t: any) => (
                <div key={t.type} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS[t.type] }} />
                    <p className="text-sm font-medium text-white">{t.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white font-mono">{currencyFormatter.format(t.current_value)}</p>
                    <p className={`text-xs font-mono ${pnlColor(t.pnl)}`}>{pctFmt(t.return_pct)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AnalysisTab = () => {
    if (!summary) return <LoadingRows />;
    const { total_current_value, holdings } = summary;
    const totalValue = total_current_value || 1;
    
    // Net Worth Composition (Liquid vs Illiquid)
    const liquidAssets = ['Mutual Fund', 'Stock', 'Gold'];
    const illiquidAssets = ['FD', 'Real Estate'];
    const liquidValue = (holdings || []).filter((h: any) => liquidAssets.includes(h.type)).reduce((s: number, h: any) => s + (h.current_value || 0), 0);
    const illiquidValue = (holdings || []).filter((h: any) => illiquidAssets.includes(h.type)).reduce((s: number, h: any) => s + (h.current_value || 0), 0);

    const stockHoldings = (holdings || []).filter((h: any) => h.type === 'Stock');
    const sectorMap: Record<string, number> = {};
    stockHoldings.forEach((h: any) => { const s = h.sector || 'Other'; sectorMap[s] = (sectorMap[s] || 0) + (h.current_value || 0); });
    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

    // Concentration across ALL assets
    const entityConcat: Record<string, number> = {};
    (holdings || []).forEach((h: any) => { entityConcat[h.name] = (entityConcat[h.name] || 0) + (h.current_value || 0); });
    const riskyEntities = Object.entries(entityConcat)
        .map(([name, value]) => ({ name, value, pct: (value / totalValue) * 100 }))
        .filter(e => e.pct > 15)
        .sort((a,b) => b.pct - a.pct);

    return (
      <div className="space-y-8 animate-fade-in p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Liquidity Meter */}
           <div className="glass-card p-6 bg-slate-800/20">
            <h3 className="text-lg font-heading font-bold text-white mb-6">Portfolio Liquidity</h3>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Liquid</p>
                        <p className="text-xl font-mono font-bold text-emerald-400">{currencyFormatter.format(liquidValue)}</p>
                    </div>
                    <p className="text-sm font-black text-slate-400">{((liquidValue/totalValue)*100).toFixed(1)}%</p>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
                    <div style={{ width: `${(liquidValue/totalValue)*100}%` }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000" />
                    <div style={{ width: `${(illiquidValue/totalValue)*100}%` }} className="h-full bg-red-500/50" />
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Illiquid (FD/RE)</p>
                        <p className="text-xl font-mono font-bold text-red-400">{currencyFormatter.format(illiquidValue)}</p>
                    </div>
                    <p className="text-sm font-black text-slate-400">{((illiquidValue/totalValue)*100).toFixed(1)}%</p>
                </div>
            </div>
          </div>
          {/* Sector Exposure (Existing) */}
          <div className="glass-card p-6 bg-slate-800/20">
            <h3 className="text-lg font-heading font-bold text-white mb-6">Stock Sector Exposure</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value">
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }} itemStyle={{ color: '#94a3b8' }} labelStyle={{ color: '#f8fafc' }} formatter={(v: any) => currencyFormatter.format(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Global Concentration Risk */}
        <div className="glass-card p-6 border-amber-500/10 bg-slate-800/20">
          <h3 className="text-lg font-heading font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-amber-400">⚖️</span> Portfolio Concentration Risk
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {riskyEntities.length > 0 ? riskyEntities.map((e: any) => (
              <div key={e.name} className="flex items-center justify-between p-5 rounded-3xl bg-red-500/5 border border-red-500/10">
                <div>
                    <h4 className="font-bold text-white text-sm">{e.name}</h4>
                    <p className="text-[10px] text-slate-500">Global Concentration</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-red-400 font-mono">{e.pct.toFixed(1)}%</p>
                    <p className="text-[10px] text-slate-500">{currencyFormatter.format(e.value)}</p>
                </div>
              </div>
            )) : <div className="col-span-2 py-10 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xl font-bold">✓</div>
                    <p className="text-center text-emerald-400 font-bold text-sm">Portfolio is well-diversified across assets. No single holding exceeds 15% threshold.</p>
                </div>}
          </div>
        </div>
      </div>
    );
  };

  const LoadingRows = () => (
    <div className="space-y-3 p-6">
      {[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-700/50" />)}
    </div>
  );

  const PriceCell = ({ inv, currentVal, invested }: { inv: any; currentVal: number | null; invested: number; name: string }) => {
    const val = currentVal ?? invested;
    const pnl = val - invested;
    const staleness = timeAgo(inv.current_value_updated_at);
    return (
      <div className="flex items-start justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="cursor-default">
          <p className="text-sm font-bold text-white font-mono">{currencyFormatter.format(val)}</p>
          <p className={`text-[10px] font-mono ${pnlColor(pnl)}`}>{pctFmt(invested > 0 ? (pnl / invested) * 100 : 0)}</p>
          {inv.current_value !== null && <p className="text-[9px] text-slate-600 mt-0.5">{staleness}</p>}
        </div>
        <button onClick={() => setPriceModal(inv)} className="p-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
        </button>
      </div>
    );
  };

  const DeleteBtn = ({ id }: { id: string }) => (
    <button onClick={(e) => { e.stopPropagation(); handleDelete(id); }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
    </button>
  );

  const openAssetHistory = (name: string, type: string) => {
    const history = allRecords.filter(r => r.name === name && r.type === type);
    setSelectedAsset({ name, type, history });
  };

  const openCategoryHistory = (type: string) => {
    const history = allRecords.filter(r => r.type === type);
    setSelectedAsset({ name: "All", type, history, isCategory: true });
  };

  const HistoryBtn = ({ type }: { type: string }) => (
    <button onClick={() => openCategoryHistory(type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest border border-white/5">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20v-6M6 20V10M18 20V4" /></svg>
        Full History
    </button>
  );

  const MFTable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="Mutual Fund" /></div>
        <div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500"><th className="px-6 py-4 text-left">Fund</th><th className="px-6 py-4">Units</th><th className="px-6 py-4">Invested</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">SIP</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-white/5">{records.map(inv => { const mf = inv.investment_mf?.[0]; return (<tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-left font-medium text-white text-sm">{inv.name}</td><td className="px-6 py-4 text-xs font-mono text-slate-300">{mf?.units || "—"}</td><td className="px-6 py-4 text-xs font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td><td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} name={inv.name} /></td><td className="px-6 py-4 text-[10px] text-blue-400">{mf?.sip_day ? `Day ${mf.sip_day}` : "—"}</td><td className="px-6 py-3"><DeleteBtn id={inv.id} /></td></tr>); })}</tbody></table></div>
    </div>
  );

  const StockTable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="Stock" /></div>
        <div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500"><th className="px-6 py-4 text-left">Stock</th><th className="px-6 py-4">Qty</th><th className="px-6 py-4">Invested</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Sector</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-white/5">{records.map(inv => { const s = inv.investment_stock?.[0]; return (<tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-left font-medium text-white text-sm">{inv.name} <span className="text-[10px] text-slate-500">{s?.ticker}</span></td><td className="px-6 py-4 text-xs font-mono text-slate-300">{s?.quantity || "—"}</td><td className="px-6 py-4 text-xs font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td><td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} name={inv.name} /></td><td className="px-6 py-4 text-[10px] text-slate-500">{s?.sector || "—"}</td><td className="px-6 py-3"><DeleteBtn id={inv.id} /></td></tr>); })}</tbody></table></div>
    </div>
  );

  const GoldTable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="Gold" /></div>
        <div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500"><th className="px-6 py-4 text-left">Gold</th><th className="px-6 py-4">Grams</th><th className="px-6 py-4">Invested</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Type</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-white/5">{records.map(inv => { const g = inv.investment_gold?.[0]; return (<tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-left font-medium text-white text-sm">{inv.name}</td><td className="px-6 py-4 text-xs font-mono text-slate-300">{g?.grams}g</td><td className="px-6 py-4 text-xs font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td><td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} name={inv.name} /></td><td className="px-6 py-4 text-[10px] text-yellow-500 font-bold uppercase">{g?.gold_form}</td><td className="px-6 py-3"><DeleteBtn id={inv.id} /></td></tr>); })}</tbody></table></div>
    </div>
  );

  const FDTable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="FD" /></div>
        <div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500"><th className="px-6 py-4 text-left">FD</th><th className="px-6 py-4">Principal</th><th className="px-6 py-4">Maturity Date</th><th className="px-6 py-4">Days Left</th><th className="px-6 py-4">Maturity Val</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-white/5">{records.map(inv => { const fd = inv.investment_fd?.[0]; const dl = fd?.maturity_date ? daysLeft(fd.maturity_date) : null; return (<tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-left font-medium text-white text-sm">{fd?.bank_name || inv.name}</td><td className="px-6 py-4 text-xs font-mono text-slate-300">{fd?.principal ? currencyFormatter.format(fd.principal) : "—"}</td><td className="px-6 py-4 text-xs text-slate-400">{fd?.maturity_date || "—"}</td><td className="px-6 py-4 text-xs font-bold text-blue-400">{dl !== null ? `${dl}d` : "—"}</td><td className="px-6 py-4 text-xs font-bold text-emerald-400 font-mono">{fd?.maturity_amount ? currencyFormatter.format(fd.maturity_amount) : "—"}</td><td className="px-6 py-3"><DeleteBtn id={inv.id} /></td></tr>); })}</tbody></table></div>
    </div>
  );

  const RETable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="Real Estate" /></div>
        <div className="overflow-x-auto"><table className="w-full text-center"><thead><tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500"><th className="px-6 py-4 text-left">Property</th><th className="px-6 py-4">Invested</th><th className="px-6 py-4">Rent</th><th className="px-6 py-4">EMI</th><th className="px-6 py-4">Current Value</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-white/5">{records.map(inv => { const re = inv.investment_real_estate?.[0]; return (<tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors"><td className="px-6 py-4 text-left font-medium text-white text-sm">{inv.name}</td><td className="px-6 py-4 text-xs font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td><td className="px-6 py-4 text-xs text-emerald-400 font-mono">{re?.monthly_rental ? currencyFormatter.format(re.monthly_rental) : "—"}</td><td className="px-6 py-4 text-xs text-red-400 font-mono">{re?.loan_emi ? currencyFormatter.format(re.loan_emi) : "—"}</td><td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} name={inv.name} /></td><td className="px-6 py-3"><DeleteBtn id={inv.id} /></td></tr>); })}</tbody></table></div>
    </div>
  );

  const CryptoTable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="Crypto" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead>
              <tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4 text-left">Token</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Invested</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Exchange</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map(inv => { 
                const c = inv.investment_crypto?.[0]; 
                return (
                  <tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-left font-medium text-white text-sm">{inv.name} <span className="text-[10px] text-slate-500">{c?.token_symbol}</span></td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-300">{c?.quantity}</td>
                    <td className="px-6 py-4 text-xs font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td>
                    <td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} name={inv.name} /></td>
                    <td className="px-6 py-4 text-[10px] text-slate-500">{c?.exchange || "—"}</td>
                    <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
    </div>
  );

  const PFTable = () => (
    <div className="space-y-4">
        <div className="flex justify-end px-2"><HistoryBtn type="PF" /></div>
        <div className="overflow-x-auto">
          <table className="w-full text-center">
            <thead>
              <tr className="border-b border-white/5 bg-slate-700/40 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4 text-left">Scheme</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Invested</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Interest</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map(inv => { 
                const pf = inv.investment_pf?.[0]; 
                return (
                  <tr key={inv.id} onClick={() => openAssetHistory(inv.name, inv.type)} className="group cursor-pointer hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-left font-medium text-white text-sm">{inv.name}</td>
                    <td className="px-6 py-4 text-[10px] text-slate-300 uppercase font-bold">{pf?.pf_type || "PF"}</td>
                    <td className="px-6 py-4 text-xs font-bold text-amber-400 font-mono">{currencyFormatter.format(inv.amount)}</td>
                    <td className="px-6 py-4"><PriceCell inv={inv} currentVal={inv.current_value} invested={inv.amount} name={inv.name} /></td>
                    <td className="px-6 py-4 text-xs font-bold text-blue-400">{pf?.interest_rate ? `${pf.interest_rate}%` : "—"}</td>
                    <td className="px-6 py-3"><DeleteBtn id={inv.id} /></td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        </div>
    </div>
  );

  const tabContent: Record<Tab, React.ReactNode> = {
    overview: <OverviewTab />,
    analysis: <AnalysisTab />,
    mf: <MFTable />,
    stock: <StockTable />,
    gold: <GoldTable />,
    fd: <FDTable />,
    realestate: <RETable />,
    crypto: <CryptoTable />,
    pf: <PFTable />,
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div><p className="text-slate-400 text-sm uppercase font-bold tracking-widest">Portfolio</p><h1 className="text-4xl font-bold font-heading text-white">Wealth Tracker</h1></div>
          <div className="flex gap-3">
            <button 
              onClick={handleRefreshPrices} 
              disabled={refreshing}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all border border-white/10 ${refreshing ? "bg-slate-700 text-slate-500 opacity-50 cursor-not-allowed" : "bg-slate-800 text-white hover:bg-slate-700"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={refreshing ? "animate-spin" : ""}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
              {refreshing ? "Syncing..." : "Refresh Prices"}
            </button>
            <a href="/add-investment" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-all">Log Investment</a>
          </div>
        </header>

        {/* Premium Global Net Worth Header */}
        <div className="mb-10 glass-card p-10 relative overflow-hidden group border-amber-500/10 bg-slate-800/20">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all transform group-hover:scale-110"><div className="w-64 h-64 rounded-full bg-amber-500 blur-3xl" /></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">Global Net Worth</p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase tracking-tighter">Live Assets</span>
                </div>
                <div className="text-6xl md:text-8xl font-black font-heading text-white tracking-tighter mb-10 drop-shadow-2xl">
                    {currencyFormatter.format((summary?.total_current_value || 0) + netWorthCash)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portfolio Value</p>
                        <p className="text-xl font-bold text-amber-400 font-mono mt-1">{currencyFormatter.format(summary?.total_current_value || 0)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cash & Bank</p>
                        <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{currencyFormatter.format(netWorthCash)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Change (Abs)</p>
                        <p className={`text-xl font-bold font-mono mt-1 ${summary?.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {currencyFormatter.format(summary?.total_pnl || 0)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portfolio Return</p>
                        <p className={`text-xl font-bold font-mono mt-1 ${summary?.total_return_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {pctFmt(summary?.total_return_pct || 0)}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex overflow-x-auto gap-1 p-1 bg-slate-700/40 rounded-2xl border border-white/5 mb-8 backdrop-blur-sm">
          {TABS.map(({ key, label, emoji }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${tab === key ? "bg-amber-500 text-white" : "text-slate-400 hover:text-white"}`}><span>{emoji}</span> {label}</button>
          ))}
        </div>
        {loading ? <LoadingRows /> : tabContent[tab]}
      </div>
      {priceModal && <PriceModal inv={priceModal} onClose={() => setPriceModal(null)} onSave={handlePriceUpdate} />}
      {selectedAsset && <AssetHistoryModal asset={selectedAsset} history={selectedAsset.history} onClose={() => setSelectedAsset(null)} />}
    </div>
  );
};

export default Portfolio;
