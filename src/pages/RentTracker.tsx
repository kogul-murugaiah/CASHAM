import { useState, useEffect, useMemo } from "react";
import { useRent, type RentProperty, type RentCollection } from "../hooks/useRent";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { useTheme } from "../contexts/ThemeContext";
import { formatCurrency } from "../lib/formatters";
import {
  FiPlus,
  FiCheckCircle,
  FiHome,
  FiBriefcase,
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCheck,
  FiEdit2,
  FiPhone,
  FiCalendar,
  FiShield,
  FiFileText,
  FiDollarSign,
  FiArrowRight,
  FiUser
} from "react-icons/fi";

const PAYMENT_MODES = [
  { value: "cash", label: "💵 Cash" },
  { value: "upi", label: "📱 UPI / GPay" },
  { value: "bank_transfer", label: "🏦 Bank Transfer" },
  { value: "cheque", label: "📝 Cheque" },
  { value: "online", label: "💻 Online" },
  { value: "other", label: "📦 Other" },
];

const INITIAL_FORM = {
  name: "",
  type: "house",
  tenant_name: "",
  tenant_phone: "",
  tenant_id_proof: "",
  tenant_move_in: "",
  tenant_move_out: "",
  rent_amount: "",
  due_day: "5",
  security_deposit: "",
  advance_rent: "",
  notes: ""
};

const getOrdinalSuffix = (day: number) => {
  if ([1, 21, 31].includes(day)) return 'st';
  if ([2, 22].includes(day)) return 'nd';
  if ([3, 23].includes(day)) return 'rd';
  return 'th';
};

const formatDateDisplay = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getPaymentModeLabel = (mode?: string) => {
  const found = PAYMENT_MODES.find(m => m.value === mode);
  return found ? found.label : mode || "—";
};

const RentTracker = () => {
  const {
    properties,
    loading,
    error,
    fetchCollections,
    addProperty,
    updateProperty,
    deleteProperty,
    markCollected,
    markPending,
    fetchCollectionHistory
  } = useRent();

  const { currencyStyle } = useUserPreferences();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const monthYearStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentProperty | null>(null);
  const [savingProperty, setSavingProperty] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [formError, setFormError] = useState("");

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectingProp, setCollectingProp] = useState<RentProperty | null>(null);
  const [collectForm, setCollectForm] = useState({
    amount_paid: "",
    paid_on: new Date().toISOString().slice(0, 10),
    payment_mode: "cash",
    payment_notes: ""
  });
  const [collecting, setCollecting] = useState(false);

  const [detailProperty, setDetailProperty] = useState<RentProperty | null>(null);
  const [collectionHistory, setCollectionHistory] = useState<RentCollection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchCollections(monthYearStr);
  }, [monthYearStr, fetchCollections]);

  const summary = useMemo(() => {
    let expected = 0, collected = 0, pending = 0, depositsHeld = 0;
    properties.forEach(p => {
      expected += p.rent_amount;
      if (p.collection.status === 'paid') collected += (p.collection.amount_paid || p.rent_amount);
      else pending += p.rent_amount;
      depositsHeld += (p.security_deposit || 0);
    });
    return { expected, collected, pending, depositsHeld };
  }, [properties]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const formatMonthTitle = (date: Date) => date.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleOpenAdd = () => {
    setEditingProperty(null);
    setForm({ ...INITIAL_FORM });
    setFormError("");
    setShowPropertyModal(true);
  };

  const handleOpenEdit = (prop: RentProperty) => {
    setEditingProperty(prop);
    setForm({
      name: prop.name, type: prop.type,
      tenant_name: prop.tenant_name || "", tenant_phone: prop.tenant_phone || "",
      tenant_id_proof: prop.tenant_id_proof || "",
      tenant_move_in: prop.tenant_move_in || "", tenant_move_out: prop.tenant_move_out || "",
      rent_amount: String(prop.rent_amount), due_day: String(prop.due_day),
      security_deposit: prop.security_deposit ? String(prop.security_deposit) : "",
      advance_rent: prop.advance_rent ? String(prop.advance_rent) : "",
      notes: prop.notes || ""
    });
    setFormError("");
    setShowPropertyModal(true);
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.rent_amount || !form.due_day) {
      setFormError("Name, Rent Amount, and Due Day are required.");
      return;
    }
    setSavingProperty(true);
    try {
      const payload = {
        name: form.name, type: form.type,
        tenant_name: form.tenant_name || undefined,
        tenant_phone: form.tenant_phone || undefined,
        tenant_id_proof: form.tenant_id_proof || undefined,
        tenant_move_in: form.tenant_move_in || undefined,
        tenant_move_out: form.tenant_move_out || undefined,
        rent_amount: Number(form.rent_amount), due_day: Number(form.due_day),
        security_deposit: form.security_deposit ? Number(form.security_deposit) : 0,
        advance_rent: form.advance_rent ? Number(form.advance_rent) : 0,
        notes: form.notes || undefined
      };
      if (editingProperty) await updateProperty(editingProperty.id, payload);
      else await addProperty(payload);
      setShowPropertyModal(false);
      setEditingProperty(null);
      fetchCollections(monthYearStr);
    } catch (err: any) {
      setFormError(err.message || "Failed to save property");
    } finally {
      setSavingProperty(false);
    }
  };

  const handleOpenCollect = (prop: RentProperty) => {
    setCollectingProp(prop);
    setCollectForm({
      amount_paid: String(prop.rent_amount),
      paid_on: new Date().toISOString().slice(0, 10),
      payment_mode: "cash",
      payment_notes: ""
    });
    setShowCollectModal(true);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingProp || !collectForm.amount_paid || !collectForm.paid_on) return;
    setCollecting(true);
    try {
      await markCollected(
        collectingProp.id,
        monthYearStr,
        Number(collectForm.amount_paid),
        collectForm.paid_on,
        collectForm.payment_mode,
        collectForm.payment_notes || undefined
      );
      setShowCollectModal(false);
      setCollectingProp(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCollecting(false);
    }
  };

  const handleOpenDetail = async (prop: RentProperty) => {
    setDetailProperty(prop);
    setLoadingHistory(true);
    try {
      const history = await fetchCollectionHistory(prop.id);
      setCollectionHistory(history);
    } catch {
      setCollectionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? All collection history will also be removed.`)) return;
    await deleteProperty(id);
    if (detailProperty?.id === id) setDetailProperty(null);
  };

  const handleMarkPending = async (prop: RentProperty) => {
    if (!window.confirm(`Mark rent for "${prop.name}" as pending again?`)) return;
    await markPending(prop.id, monthYearStr);
  };

  const cardBg = isDark ? "bg-slate-800 border-white/5" : "bg-white border-slate-200";
  const modalBg = isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-white/5" : "border-slate-200";
  const theadBg = isDark ? "bg-slate-900/50" : "bg-slate-50/50";
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDark ? "bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"}`;
  const detailChip = isDark ? "bg-slate-900/40 border-white/10" : "bg-slate-50 border-slate-200";

  if (detailProperty) {
    const prop = properties.find(p => p.id === detailProperty.id) || detailProperty;
    const isPaid = prop.collection.status === 'paid';

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-8 md:pb-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setDetailProperty(null)} className={`p-2 rounded-xl border transition-colors ${isDark ? "border-white/10 hover:bg-white/5 text-slate-400 hover:text-white" : "border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900"}`}>
            <FiChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${prop.type === 'shop' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                {prop.type === 'shop' ? <FiBriefcase size={20} /> : <FiHome size={20} />}
              </span>
              <div>
                <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>{prop.name}</h1>
                <p className={`text-sm ${textSecondary}`}>{prop.type === 'shop' ? 'Shop' : 'House'} · Due on {prop.due_day}{getOrdinalSuffix(prop.due_day)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleOpenEdit(prop)} className={`p-2 rounded-xl border transition-colors ${isDark ? "border-white/10 hover:bg-white/5 text-slate-400 hover:text-white" : "border-slate-200 hover:bg-slate-50 text-slate-500"}`}>
              <FiEdit2 size={16} />
            </button>
            <button onClick={() => handleDelete(prop.id, prop.name)} className="p-2 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors">
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Monthly Rent</p>
            <p className="text-xl font-bold font-heading text-blue-500">{formatCurrency(prop.rent_amount, currencyStyle)}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>This Month</p>
            <p className={`text-xl font-bold font-heading ${isPaid ? "text-emerald-500" : "text-amber-500"}`}>
              {isPaid ? "✓ Paid" : "⏳ Pending"}
            </p>
          </div>
          <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Security Deposit</p>
            <p className={`text-xl font-bold font-heading text-indigo-500`}>{prop.security_deposit ? formatCurrency(prop.security_deposit, currencyStyle) : "—"}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${textSecondary}`}>Advance Rent</p>
            <p className={`text-xl font-bold font-heading ${textPrimary}`}>{prop.advance_rent ? formatCurrency(prop.advance_rent, currencyStyle) : "—"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${textSecondary}`}><FiUser size={14} /> Tenant Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className={`text-xs ${textSecondary}`}>Name</span><span className={`text-sm font-medium ${textPrimary}`}>{prop.tenant_name || "—"}</span></div>
              <div className="flex justify-between items-center"><span className={`text-xs ${textSecondary}`}>Phone</span>{prop.tenant_phone ? <a href={`tel:${prop.tenant_phone}`} className="text-sm font-medium text-emerald-500 hover:underline">{prop.tenant_phone}</a> : <span className={`text-sm font-medium ${textPrimary}`}>—</span>}</div>
              <div className="flex justify-between items-center"><span className={`text-xs ${textSecondary}`}>ID Proof</span><span className={`text-sm font-medium ${textPrimary}`}>{prop.tenant_id_proof || "—"}</span></div>
              <div className="flex justify-between items-center"><span className={`text-xs ${textSecondary}`}>Move-in</span><span className={`text-sm font-medium ${textPrimary}`}>{formatDateDisplay(prop.tenant_move_in)}</span></div>
              <div className="flex justify-between items-center"><span className={`text-xs ${textSecondary}`}>Move-out</span>{prop.tenant_move_out ? <span className={`text-sm font-medium ${textPrimary}`}>{formatDateDisplay(prop.tenant_move_out)}</span> : <span className="text-xs font-semibold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10">Active Tenant</span>}</div>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${textSecondary}`}><FiFileText size={14} /> Notes & Info</h3>
            <p className={`text-sm leading-relaxed ${prop.notes ? textPrimary : textSecondary}`}>{prop.notes || "No notes added for this property."}</p>
            {isPaid && prop.collection.paid_on && (
              <div className={`rounded-xl border p-3 space-y-1.5 ${detailChip}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>This Month's Payment</p>
                <div className="flex justify-between text-xs"><span className={textSecondary}>Amount</span><span className="font-bold text-emerald-500 font-mono">{formatCurrency(prop.collection.amount_paid || 0, currencyStyle)}</span></div>
                <div className="flex justify-between text-xs"><span className={textSecondary}>Date</span><span className={`font-medium ${textPrimary}`}>{formatDateDisplay(prop.collection.paid_on)}</span></div>
                <div className="flex justify-between text-xs"><span className={textSecondary}>Mode</span><span className={`font-medium ${textPrimary}`}>{getPaymentModeLabel(prop.collection.payment_mode)}</span></div>
                {prop.collection.payment_notes && <div className="flex justify-between text-xs"><span className={textSecondary}>Note</span><span className={`font-medium ${textPrimary}`}>{prop.collection.payment_notes}</span></div>}
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-sm font-bold ${textPrimary}`}>{formatMonthTitle(currentDate)} — {isPaid ? "Rent Collected ✓" : "Rent Pending"}</h3>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>{isPaid ? `Received ${formatCurrency(prop.collection.amount_paid || 0, currencyStyle)} via ${getPaymentModeLabel(prop.collection.payment_mode)} on ${formatDateDisplay(prop.collection.paid_on)}` : "Click to record rent collection with payment details."}</p>
            </div>
            {isPaid ? (
              <button onClick={() => handleMarkPending(prop)} className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors ${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>Mark as Pending</button>
            ) : (
              <button onClick={() => handleOpenCollect(prop)} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-2">Collect Rent</button>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
          <div className={`p-4 sm:p-5 border-b ${divider}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${textPrimary}`}><FiCalendar size={14} className="text-emerald-500" /> Payment History</h3>
            <p className={`text-xs mt-0.5 ${textSecondary}`}>All recorded rent payments for this property.</p>
          </div>
          {loadingHistory ? (
            <div className={`p-8 text-center text-sm ${textSecondary}`}>Loading history...</div>
          ) : collectionHistory.length === 0 ? (
            <div className={`p-8 text-center text-sm ${textSecondary}`}>No payment history yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b text-left text-[10px] font-bold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                    <th className="px-5 py-3">Month</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Paid On</th>
                    <th className="px-5 py-3">Mode</th>
                    <th className="px-5 py-3">Notes</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${divider}`}>
                  {collectionHistory.map((col) => (
                    <tr key={col.id || col.month_year} className={`${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"} transition-colors`}>
                      <td className={`px-5 py-3.5 text-sm font-semibold ${textPrimary}`}>{col.month_year}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-emerald-500 font-mono">{formatCurrency(col.amount_paid || 0, currencyStyle)}</td>
                      <td className={`px-5 py-3.5 text-sm ${textSecondary}`}>{formatDateDisplay(col.paid_on)}</td>
                      <td className={`px-5 py-3.5 text-sm ${textPrimary}`}>{getPaymentModeLabel(col.payment_mode)}</td>
                      <td className={`px-5 py-3.5 text-xs ${textSecondary} max-w-[200px] truncate`}>{col.payment_notes || "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${col.status === 'paid' ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : `${isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200"}`}`}>
                          {col.status === 'paid' ? <><FiCheckCircle size={10} /> Paid</> : <><FiClock size={10} /> Pending</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 pt-8 md:pb-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${textPrimary}`}><FiHome className="text-emerald-500" /> Rent Tracker</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Manage properties, tenant details, and monthly rent collections.</p>
        </div>
        <div className={`flex items-center gap-4 px-4 py-2 rounded-2xl border shadow-sm ${cardBg}`}>
          <button onClick={handlePrevMonth} className={`p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors ${textSecondary}`}><FiChevronLeft size={20} /></button>
          <span className={`text-sm font-bold min-w-[120px] text-center ${textPrimary}`}>{formatMonthTitle(currentDate)}</span>
          <button onClick={handleNextMonth} className={`p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors ${textSecondary}`}><FiChevronRight size={20} /></button>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Total Expected</p>
          <p className="text-2xl font-bold font-heading text-blue-500">{formatCurrency(summary.expected, currencyStyle)}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>{properties.length} properties</p>
        </div>
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Cash Collected</p>
          <p className="text-2xl font-bold font-heading text-emerald-500">{formatCurrency(summary.collected, currencyStyle)}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>{properties.filter(p => p.collection.status === 'paid').length} received</p>
        </div>
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Still Pending</p>
          <p className={`text-2xl font-bold font-heading ${summary.pending > 0 ? "text-amber-500" : "text-emerald-500"}`}>{formatCurrency(summary.pending, currencyStyle)}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>{properties.filter(p => p.collection.status === 'pending').length} pending</p>
        </div>
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Deposits Held</p>
          <p className="text-2xl font-bold font-heading text-indigo-500">{formatCurrency(summary.depositsHeld, currencyStyle)}</p>
          <p className={`text-xs mt-1 ${textSecondary}`}>Security deposits total</p>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${divider}`}>
          <div>
            <h3 className={`text-base font-bold ${textPrimary}`}>Collection Checklist</h3>
            <p className={`text-xs mt-0.5 ${textSecondary}`}>Track rent for {formatMonthTitle(currentDate)}. Click a property to view full details.</p>
          </div>
          <button onClick={handleOpenAdd} className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2"><FiPlus size={14} /> Add Property</button>
        </div>

        {loading && properties.length === 0 ? (
          <div className={`p-12 text-center text-sm ${textSecondary}`}>Loading properties...</div>
        ) : properties.length === 0 ? (
          <div className={`p-12 text-center space-y-2 ${textSecondary}`}>
            <FiHome size={32} className="mx-auto opacity-30" />
            <p className="text-sm">No properties added yet.</p>
            <p className="text-xs opacity-70">Add your first house or shop to start tracking rent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${textSecondary} ${theadBg} ${divider}`}>
                  <th className="px-5 py-4">Property</th>
                  <th className="px-5 py-4">Tenant</th>
                  <th className="px-5 py-4">Rent / Due</th>
                  <th className="px-5 py-4">Paid On</th>
                  <th className="px-5 py-4">Mode</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {properties.map((prop) => {
                  const isPaid = prop.collection.status === 'paid';
                  return (
                    <tr key={prop.id} className={`transition-colors cursor-pointer ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`} onClick={() => handleOpenDetail(prop)}>
                      <td className={`px-5 py-4 text-sm font-semibold ${textPrimary}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${prop.type === 'shop' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{prop.type === 'shop' ? <FiBriefcase size={14} /> : <FiHome size={14} />}</span>
                          <div>
                            {prop.name}
                            {(prop.security_deposit || 0) > 0 && <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-500"}`}>Dep: {formatCurrency(prop.security_deposit || 0, currencyStyle)}</span>}
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-4 text-sm ${textSecondary}`}>
                        <div>{prop.tenant_name || "—"}</div>
                        {prop.tenant_phone && <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}><FiPhone size={9} /> {prop.tenant_phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div className="font-bold text-blue-500 font-mono">{formatCurrency(prop.rent_amount, currencyStyle)}</div>
                        <div className={`text-[10px] mt-0.5 ${textSecondary}`}>Due {prop.due_day}{getOrdinalSuffix(prop.due_day)}</div>
                      </td>
                      <td className={`px-5 py-4 text-sm ${textSecondary}`}>{isPaid && prop.collection.paid_on ? <span className="text-emerald-500 font-medium text-xs">{formatDateDisplay(prop.collection.paid_on)}</span> : "—"}</td>
                      <td className={`px-5 py-4 text-sm ${textPrimary}`}>{isPaid ? <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}>{getPaymentModeLabel(prop.collection.payment_mode)}</span> : "—"}</td>
                      <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                        {isPaid ? (
                          <button onClick={() => handleMarkPending(prop)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"><FiCheckCircle size={12} /> Paid</button>
                        ) : (
                          <button onClick={() => handleOpenCollect(prop)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition-all">Collect</button>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEdit(prop)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`} title="Edit"><FiEdit2 size={14} /></button>
                          <button onClick={() => handleOpenDetail(prop)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`} title="View Details"><FiArrowRight size={14} /></button>
                          <button onClick={() => handleDelete(prop.id, prop.name)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><FiTrash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCollectModal && collectingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}><FiCheckCircle className="text-emerald-500" /> Collect Rent</h3>
              <button onClick={() => { setShowCollectModal(false); setCollectingProp(null); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-400"}`}><FiX size={16} /></button>
            </div>
            <div className={`p-3 rounded-xl ${detailChip} border`}>
              <div className="flex items-center justify-between text-sm"><span className={textSecondary}>Property</span><span className={`font-bold ${textPrimary}`}>{collectingProp.name}</span></div>
              <div className="flex items-center justify-between text-sm mt-1"><span className={textSecondary}>Tenant</span><span className={`font-medium ${textPrimary}`}>{collectingProp.tenant_name || "—"}</span></div>
              <div className="flex items-center justify-between text-sm mt-1"><span className={textSecondary}>Expected</span><span className="font-bold text-blue-500 font-mono">{formatCurrency(collectingProp.rent_amount, currencyStyle)}</span></div>
            </div>
            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Amount Received *</label>
                  <input type="number" min="0" step="any" value={collectForm.amount_paid} onChange={e => setCollectForm({...collectForm, amount_paid: e.target.value})} className={inputClass} required />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Date Received *</label>
                  <input type="date" value={collectForm.paid_on} onChange={e => setCollectForm({...collectForm, paid_on: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map(mode => (
                    <button key={mode.value} type="button" onClick={() => setCollectForm({...collectForm, payment_mode: mode.value})} className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${collectForm.payment_mode === mode.value ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 ring-1 ring-emerald-500/30" : `${isDark ? "border-white/10 text-slate-400 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}`}>{mode.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Payment Notes (optional)</label>
                <input type="text" placeholder="e.g. Cheque #12345, Partial payment..." value={collectForm.payment_notes} onChange={e => setCollectForm({...collectForm, payment_notes: e.target.value})} className={inputClass} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowCollectModal(false); setCollectingProp(null); }} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                <button type="submit" disabled={collecting} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{collecting ? "Saving..." : <><FiCheck size={16} /> Confirm Collection</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>{editingProperty ? <><FiEdit2 className="text-blue-500" /> Edit Property</> : <><FiHome className="text-emerald-500" /> Add Property</>}</h3>
              <button type="button" onClick={() => { setShowPropertyModal(false); setEditingProperty(null); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-100 text-slate-400"}`}><FiX size={16} /></button>
            </div>
            {formError && <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20">{formError}</div>}
            <form onSubmit={handlePropertySubmit} className="space-y-5">
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}><FiHome size={12} /> Property Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Property Name *</label><input type="text" placeholder="e.g. Ground Floor Shop" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputClass} required /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Type</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputClass}><option value="house">House</option><option value="shop">Shop</option></select></div>
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Due Day (1-31) *</label><input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({...form, due_day: e.target.value})} className={inputClass} required /></div>
                </div>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}><FiUser size={12} /> Tenant Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Tenant Name</label><input type="text" placeholder="e.g. Senthil" value={form.tenant_name} onChange={e => setForm({...form, tenant_name: e.target.value})} className={inputClass} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Phone</label><input type="tel" placeholder="9876543210" value={form.tenant_phone} onChange={e => setForm({...form, tenant_phone: e.target.value})} className={inputClass} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>ID Proof (Aadhaar/PAN)</label><input type="text" placeholder="XXXX-XXXX-1234" value={form.tenant_id_proof} onChange={e => setForm({...form, tenant_id_proof: e.target.value})} className={inputClass} /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Move-in Date</label><input type="date" value={form.tenant_move_in} onChange={e => setForm({...form, tenant_move_in: e.target.value})} className={inputClass} /></div>
                  <div className="col-span-2"><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Move-out Date (leave empty if active)</label><input type="date" value={form.tenant_move_out} onChange={e => setForm({...form, tenant_move_out: e.target.value})} className={inputClass} /></div>
                </div>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}><FiShield size={12} /> Financial</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Monthly Rent *</label><input type="number" min="0" step="any" placeholder="10000" value={form.rent_amount} onChange={e => setForm({...form, rent_amount: e.target.value})} className={inputClass} required /></div>
                  <div><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Security Deposit</label><input type="number" min="0" step="any" placeholder="50000" value={form.security_deposit} onChange={e => setForm({...form, security_deposit: e.target.value})} className={inputClass} /></div>
                  <div className="col-span-2"><label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Advance Rent</label><input type="number" min="0" step="any" placeholder="20000" value={form.advance_rent} onChange={e => setForm({...form, advance_rent: e.target.value})} className={inputClass} /></div>
                </div>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}><FiFileText size={12} /> Notes</p>
                <textarea rows={3} placeholder="Any notes about this property or tenant..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={inputClass} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowPropertyModal(false); setEditingProperty(null); }} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                <button type="submit" disabled={savingProperty} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">{savingProperty ? "Saving..." : <><FiCheck size={16} /> {editingProperty ? "Update" : "Save"} Property</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentTracker;
