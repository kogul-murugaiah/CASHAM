import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { formatCurrency } from "../lib/formatters";
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck } from "react-icons/fi";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  color: string;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
};

const EMOJI_OPTIONS = ["🎯", "🏠", "✈️", "🚗", "💻", "📱", "💎", "🎓", "💰", "🏥", "🛡️", "🎁", "🏖️", "📈", "🔧"];
const COLOR_OPTIONS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const ProgressRing = ({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-700/50" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

export default function SavingsGoals() {
  const { currencyStyle } = useUserPreferences();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target_amount: "", icon: "🎯", color: "#10b981", deadline: "" });

  // Contribution
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", target_amount: "", icon: "", color: "", deadline: "" });

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/goals");
      setGoals(data || []);
    } catch (err: any) {
      if (err.status !== 401) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleCreate = async () => {
    if (!newGoal.name || !newGoal.target_amount) {
      setError("Name and target amount are required");
      return;
    }
    try {
      setError(null);
      await api.post("/api/goals", {
        name: newGoal.name,
        target_amount: Number(newGoal.target_amount),
        icon: newGoal.icon,
        color: newGoal.color,
        deadline: newGoal.deadline || null,
      });
      setSuccess("Goal created!");
      setShowCreate(false);
      setNewGoal({ name: "", target_amount: "", icon: "🎯", color: "#10b981", deadline: "" });
      fetchGoals();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleContribute = async (goalId: string) => {
    if (!contributionAmount || Number(contributionAmount) <= 0) return;
    try {
      setError(null);
      await api.put("/api/goals", { id: goalId, add_amount: Number(contributionAmount) });
      setContributingId(null);
      setContributionAmount("");
      setSuccess("Contribution added!");
      fetchGoals();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = async (goalId: string) => {
    try {
      setError(null);
      await api.put("/api/goals", {
        id: goalId,
        name: editData.name,
        target_amount: Number(editData.target_amount),
        icon: editData.icon,
        color: editData.color,
        deadline: editData.deadline || null,
      });
      setEditingId(null);
      setSuccess("Goal updated!");
      fetchGoals();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this goal?")) return;
    try {
      await api.delete(`/api/goals?id=${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
      setSuccess("Goal deleted");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  const totalTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = activeGoals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-emerald-500/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10" /><path d="m16 10-5.5 5.5L8 13" /></svg>
              </span>
              <h1 className="text-3xl font-bold font-heading text-white">Savings Goals</h1>
            </div>
            <p className="text-slate-400">Track progress toward your financial targets.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
          >
            <FiPlus size={16} /> New Goal
          </button>
        </div>

        {error && <div className="mb-6 glass-card border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm text-center">{error}</div>}
        {success && <div className="mb-6 glass-card border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300 text-sm text-center animate-fade-in font-semibold">{success}</div>}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-700/50" />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="glass-card p-12 text-center border-emerald-500/10 animate-fade-in">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-lg font-bold text-white mb-2">No Goals Yet</h3>
            <p className="text-slate-400 mb-6">Create your first savings goal to start tracking progress.</p>
            <button onClick={() => setShowCreate(true)} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition-all">
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Summary */}
            {activeGoals.length > 0 && (
              <div className="glass-card p-6 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border-emerald-500/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Goals</p>
                    <p className="text-2xl font-bold text-white mt-1">{activeGoals.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Target</p>
                    <p className="text-2xl font-bold text-white mt-1 font-mono">{formatCurrency(totalTarget, currencyStyle)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Saved</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{formatCurrency(totalSaved, currencyStyle)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overall Progress</p>
                    <p className="text-2xl font-bold text-white mt-1">{totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Goals Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => {
                const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                const remaining = Math.max(0, goal.target_amount - goal.current_amount);
                const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                return (
                  <div key={goal.id} className="glass-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: goal.color }} />

                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{goal.icon}</span>
                          <div>
                            <h3 className="text-lg font-bold text-white">{goal.name}</h3>
                            {daysLeft !== null && (
                              <p className={`text-xs font-medium ${daysLeft > 30 ? 'text-slate-500' : daysLeft > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                {daysLeft > 0 ? `${daysLeft} days left` : 'Past deadline'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(goal.id); setEditData({ name: goal.name, target_amount: goal.target_amount.toString(), icon: goal.icon, color: goal.color, deadline: goal.deadline || "" }); }} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"><FiEdit2 size={12} /></button>
                          <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-all"><FiTrash2 size={12} /></button>
                        </div>
                      </div>

                      {/* Progress Ring */}
                      <div className="flex items-center justify-center mb-6">
                        <div className="relative">
                          <ProgressRing pct={pct} color={goal.color} />
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-white">{pct.toFixed(0)}%</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">saved</span>
                          </div>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="flex justify-between text-sm mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Saved</p>
                          <p className="font-bold text-emerald-400 font-mono">{formatCurrency(goal.current_amount, currencyStyle)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining</p>
                          <p className="font-bold text-slate-300 font-mono">{formatCurrency(remaining, currencyStyle)}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden mb-4">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: goal.color }} />
                      </div>

                      {/* Contribute */}
                      {contributingId === goal.id ? (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                            <input
                              type="number" autoFocus value={contributionAmount}
                              onChange={(e) => setContributionAmount(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleContribute(goal.id)}
                              className="w-full rounded-lg border border-white/10 bg-slate-700/50 pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                              placeholder="Amount"
                            />
                          </div>
                          <button onClick={() => handleContribute(goal.id)} className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all"><FiCheck size={16} /></button>
                          <button onClick={() => { setContributingId(null); setContributionAmount(""); }} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"><FiX size={16} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setContributingId(goal.id)}
                          className="w-full rounded-xl py-2.5 text-sm font-bold border transition-all"
                          style={{ color: goal.color, borderColor: `${goal.color}33`, backgroundColor: `${goal.color}10` }}
                        >
                          + Add Contribution
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4 font-heading flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Completed Goals
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedGoals.map((goal) => (
                    <div key={goal.id} className="glass-card p-4 opacity-70 hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{goal.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{goal.name}</p>
                            <p className="text-xs text-emerald-400 font-mono">{formatCurrency(goal.target_amount, currencyStyle)}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-all"><FiTrash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4 animate-fade-in">
          <div className="w-full max-w-lg glass-card p-6 sm:p-8 animate-float-slow shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1 font-bold">New</p>
                <h3 className="text-2xl font-bold text-white font-heading">Create Savings Goal</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-full p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goal Name</label>
                <input type="text" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="e.g., Emergency Fund" className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Amount (₹)</label>
                  <input type="number" value={newGoal.target_amount} onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} placeholder="500000" className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deadline (Optional)</label>
                  <input type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((e) => (
                    <button key={e} type="button" onClick={() => setNewGoal({ ...newGoal, icon: e })} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${newGoal.icon === e ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50 scale-110' : 'bg-slate-700/50 hover:bg-slate-700'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} type="button" onClick={() => setNewGoal({ ...newGoal, color: c })} className={`w-8 h-8 rounded-full transition-all ${newGoal.color === c ? 'ring-2 ring-offset-2 ring-offset-slate-800 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c, '--tw-ring-color': c } as any} />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowCreate(false)} className="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={handleCreate} className="rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold text-white shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all">Create Goal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4 animate-fade-in">
          <div className="w-full max-w-lg glass-card p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-xl font-bold text-white font-heading">Edit Goal</h3>
              <button onClick={() => setEditingId(null)} className="rounded-full p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"><FiX size={18} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              <input type="number" value={editData.target_amount} onChange={(e) => setEditData({ ...editData, target_amount: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-mono" />
              <input type="date" value={editData.deadline} onChange={(e) => setEditData({ ...editData, deadline: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-700/50 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer" />
              <div className="flex flex-wrap gap-2">{EMOJI_OPTIONS.map((e) => (<button key={e} type="button" onClick={() => setEditData({ ...editData, icon: e })} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${editData.icon === e ? 'bg-emerald-500/20 ring-2 ring-emerald-500/50' : 'bg-slate-700/50 hover:bg-slate-700'}`}>{e}</button>))}</div>
              <div className="flex flex-wrap gap-2">{COLOR_OPTIONS.map((c) => (<button key={c} type="button" onClick={() => setEditData({ ...editData, color: c })} className={`w-8 h-8 rounded-full transition-all ${editData.color === c ? 'ring-2 ring-offset-2 ring-offset-slate-800' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />))}</div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingId(null)} className="rounded-xl px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-white transition-all">Cancel</button>
                <button onClick={() => handleEdit(editingId)} className="rounded-xl bg-emerald-600 px-8 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
