import { useState, useEffect, useMemo } from "react";
import { useRent } from "../hooks/useRent";
import { useRent, type RentProperty } from "../hooks/useRent";
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
  FiCheck
  FiCheck,
  FiEdit2,
  FiChevronDown,
  FiChevronUp,
  FiPhone,
  FiCalendar,
  FiShield,
  FiFileText
} from "react-icons/fi";

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
    markPending
  } = useRent();

  const { currencyStyle } = useUserPreferences();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Month selector state (defaults to current month)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthYearStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Add Property Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingProperty, setAddingProperty] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "house",
    tenant_name: "",
    rent_amount: "",
    due_day: "5"
  });

  // Add/Edit Property Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<RentProperty | null>(null);
  const [savingProperty, setSavingProperty] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [formError, setFormError] = useState("");

  // Expandable detail row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCollections(monthYearStr);
  }, [monthYearStr, fetchCollections]);

  // Derived Summary Stats
  const summary = useMemo(() => {
    let expected = 0;
    let collected = 0;
    let pending = 0;
    let depositsHeld = 0;

    properties.forEach(p => {
      expected += p.rent_amount;
      if (p.collection.status === 'paid') {
        collected += p.rent_amount;
      } else {
        pending += p.rent_amount;
      }
      depositsHeld += (p.security_deposit || 0);
    });

    return { expected, collected, pending };
    return { expected, collected, pending, depositsHeld };
  }, [properties]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const formatMonthTitle = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProperty(null);
    setForm({ ...INITIAL_FORM });
    setFormError("");
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (prop: RentProperty) => {
    setEditingProperty(prop);
    setForm({
      name: prop.name,
      type: prop.type,
      tenant_name: prop.tenant_name || "",
      tenant_phone: prop.tenant_phone || "",
      tenant_id_proof: prop.tenant_id_proof || "",
      tenant_move_in: prop.tenant_move_in || "",
      tenant_move_out: prop.tenant_move_out || "",
      rent_amount: String(prop.rent_amount),
      due_day: String(prop.due_day),
      security_deposit: String(prop.security_deposit || ""),
      advance_rent: String(prop.advance_rent || ""),
      notes: prop.notes || ""
    });
    setFormError("");
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.rent_amount || !form.due_day) {
      setFormError("Name, Rent Amount, and Due Day are required.");
      return;
    }

    setAddingProperty(true);
    setSavingProperty(true);
    try {
      await addProperty({
      const payload = {
        name: form.name,
        type: form.type,
        tenant_name: form.tenant_name,
        tenant_name: form.tenant_name || undefined,
        tenant_phone: form.tenant_phone || undefined,
        tenant_id_proof: form.tenant_id_proof || undefined,
        tenant_move_in: form.tenant_move_in || undefined,
        tenant_move_out: form.tenant_move_out || undefined,
        rent_amount: Number(form.rent_amount),
        due_day: Number(form.due_day)
      });
      setShowAddModal(false);
      setForm({ name: "", type: "house", tenant_name: "", rent_amount: "", due_day: "5" });
        due_day: Number(form.due_day),
        security_deposit: form.security_deposit ? Number(form.security_deposit) : 0,
        advance_rent: form.advance_rent ? Number(form.advance_rent) : 0,
        notes: form.notes || undefined
      };

      if (editingProperty) {
        await updateProperty(editingProperty.id, payload);
      } else {
        await addProperty(payload);
      }

      setShowModal(false);
      setForm({ ...INITIAL_FORM });
      setEditingProperty(null);
      fetchCollections(monthYearStr); // Refresh list
    } catch (err: any) {
      setFormError(err.message || "Failed to add property");
      setFormError(err.message || "Failed to save property");
    } finally {
      setAddingProperty(false);
      setSavingProperty(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? All its collection history will also be removed.`)) return;
    await deleteProperty(id);
  };

  const toggleCollectionStatus = async (prop: any) => {
  const toggleCollectionStatus = async (prop: RentProperty) => {
    if (prop.collection.status === 'paid') {
      await markPending(prop.id, monthYearStr);
    } else {
      await markCollected(
        prop.id,
        monthYearStr,
        prop.rent_amount,
        new Date().toISOString().slice(0, 10)
      );
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getOrdinalSuffix = (day: number) => {
    if ([1, 21, 31].includes(day)) return 'st';
    if ([2, 22].includes(day)) return 'nd';
    if ([3, 23].includes(day)) return 'rd';
    return 'th';
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Styles
  const cardBg = isDark ? "bg-slate-800 border-white/5" : "bg-white border-slate-200";
  const modalBg = isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";
  const textPrimary = isDark ? "text-slate-50" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const divider = isDark ? "border-white/5" : "border-slate-200";
  const theadBg = isDark ? "bg-slate-900/50" : "bg-slate-50/50";
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${isDark ? "bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"}`;
  const detailBg = isDark ? "bg-slate-900/40" : "bg-slate-50";
  const detailChip = isDark ? "bg-slate-800 border-white/10" : "bg-white border-slate-200";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
    <div className="max-w-7xl mx-auto space-y-6 pb-24 pt-8 md:pb-8 px-4 sm:px-6 lg:px-8">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${textPrimary}`}>
            <FiHome className="text-emerald-500" /> Rent Tracker
          </h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Manage monthly rent collections from houses and shops.</p>
          <p className={`text-sm mt-1 ${textSecondary}`}>Manage properties, tenant details, and monthly rent collections.</p>
        </div>

        <div className={`flex items-center gap-4 px-4 py-2 rounded-2xl border shadow-sm ${cardBg}`}>
          <button onClick={handlePrevMonth} className={`p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors ${textSecondary}`}>
            <FiChevronLeft size={20} />
          </button>
          <span className={`text-sm font-bold min-w-[120px] text-center ${textPrimary}`}>
            {formatMonthTitle(currentDate)}
          </span>
          <button onClick={handleNextMonth} className={`p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors ${textSecondary}`}>
            <FiChevronRight size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${textSecondary}`}>Total Expected</p>
          <p className={`text-2xl font-bold font-heading text-blue-500`}>{formatCurrency(summary.expected, currencyStyle)}</p>
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
          <p className={`text-xs mt-1 ${textSecondary}`}>Security deposits across all</p>
        </div>
      </div>

      {/* Properties Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        <div className={`p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${divider}`}>
          <div>
            <h3 className={`text-base font-bold ${textPrimary}`}>Collection Checklist</h3>
            <p className={`text-xs mt-0.5 ${textSecondary}`}>Track who has paid rent for {formatMonthTitle(currentDate)}.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            onClick={handleOpenAdd}
            className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2"
          >
            <FiPlus size={14} /> Add Property
          </button>
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
                  <th className="px-6 py-4 w-8"></th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Rent / Due Day</th>
                  <th className="px-6 py-4">Paid On</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {properties.map((prop) => {
                  const isPaid = prop.collection.status === 'paid';
                  const isExpanded = expandedId === prop.id;
                  return (
                    <tr key={prop.id} className={`transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                      <td className={`px-6 py-4 text-sm font-semibold ${textPrimary}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${prop.type === 'shop' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                            {prop.type === 'shop' ? <FiBriefcase size={14} /> : <FiHome size={14} />}
                          </span>
                          {prop.name}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${textSecondary}`}>{prop.tenant_name || "—"}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-bold text-blue-500 font-mono">{formatCurrency(prop.rent_amount, currencyStyle)}</div>
                        <div className={`text-[10px] mt-0.5 ${textSecondary}`}>Due on {prop.due_day}{[1,21,31].includes(prop.due_day)?'st':[2,22].includes(prop.due_day)?'nd':[3,23].includes(prop.due_day)?'rd':'th'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleCollectionStatus(prop)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                              : `${isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-300 hover:bg-amber-100"}`
                          }`}
                        >
                          {isPaid ? <><FiCheckCircle size={12} /> Paid</> : <><FiClock size={12} /> Pending</>}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(prop.id, prop.name)}
                          className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Property"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    <>
                      <tr key={prop.id} className={`transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                        {/* Expand toggle */}
                        <td className="px-3 py-4">
                          <button
                            onClick={() => toggleExpand(prop.id)}
                            className={`p-1 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-500 hover:text-slate-300" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"}`}
                            title="Show details"
                          >
                            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          </button>
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold ${textPrimary}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${prop.type === 'shop' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                              {prop.type === 'shop' ? <FiBriefcase size={14} /> : <FiHome size={14} />}
                            </span>
                            {prop.name}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-sm ${textSecondary}`}>
                          <div>{prop.tenant_name || "—"}</div>
                          {prop.tenant_phone && (
                            <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                              <FiPhone size={9} /> {prop.tenant_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-bold text-blue-500 font-mono">{formatCurrency(prop.rent_amount, currencyStyle)}</div>
                          <div className={`text-[10px] mt-0.5 ${textSecondary}`}>Due on {prop.due_day}{getOrdinalSuffix(prop.due_day)}</div>
                        </td>
                        <td className={`px-6 py-4 text-sm ${textSecondary}`}>
                          {isPaid && prop.collection.paid_on ? (
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                              <FiCalendar size={12} />
                              {formatDateDisplay(prop.collection.paid_on)}
                            </span>
                          ) : (
                            <span className={isDark ? "text-slate-600" : "text-slate-300"}>—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleCollectionStatus(prop)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isPaid
                                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/25"
                                : `${isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-300 hover:bg-amber-100"}`
                            }`}
                          >
                            {isPaid ? <><FiCheckCircle size={12} /> Paid</> : <><FiClock size={12} /> Pending</>}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(prop)}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}
                              title="Edit Property"
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(prop.id, prop.name)}
                              className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete Property"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detail Row */}
                      {isExpanded && (
                        <tr key={`${prop.id}-detail`}>
                          <td colSpan={7} className={`px-6 py-4 ${detailBg}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {/* Tenant Details */}
                              <div className={`rounded-xl border p-3 space-y-1.5 ${detailChip}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Tenant Details</p>
                                <div className="space-y-1">
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>Name: </span>{prop.tenant_name || "—"}
                                  </div>
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>Phone: </span>
                                    {prop.tenant_phone ? (
                                      <a href={`tel:${prop.tenant_phone}`} className="text-emerald-500 hover:underline">{prop.tenant_phone}</a>
                                    ) : "—"}
                                  </div>
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>ID Proof: </span>{prop.tenant_id_proof || "—"}
                                  </div>
                                </div>
                              </div>

                              {/* Tenancy Period */}
                              <div className={`rounded-xl border p-3 space-y-1.5 ${detailChip}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Tenancy Period</p>
                                <div className="space-y-1">
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>Move-in: </span>{formatDateDisplay(prop.tenant_move_in)}
                                  </div>
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>Move-out: </span>
                                    {prop.tenant_move_out ? (
                                      <span className="text-red-400">{formatDateDisplay(prop.tenant_move_out)}</span>
                                    ) : (
                                      <span className="text-emerald-500 text-[10px] font-semibold">Active</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Financial Details */}
                              <div className={`rounded-xl border p-3 space-y-1.5 ${detailChip}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Financial</p>
                                <div className="space-y-1">
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>Security Deposit: </span>
                                    <span className="font-semibold text-indigo-500 font-mono">
                                      {prop.security_deposit ? formatCurrency(prop.security_deposit, currencyStyle) : "—"}
                                    </span>
                                  </div>
                                  <div className={`text-xs ${textPrimary}`}>
                                    <span className={textSecondary}>Advance Rent: </span>
                                    <span className="font-semibold text-blue-500 font-mono">
                                      {prop.advance_rent ? formatCurrency(prop.advance_rent, currencyStyle) : "—"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Notes */}
                              <div className={`rounded-xl border p-3 space-y-1.5 ${detailChip}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${textSecondary}`}>Notes</p>
                                <p className={`text-xs leading-relaxed ${prop.notes ? textPrimary : textSecondary}`}>
                                  {prop.notes || "No notes added."}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Property Modal */}
      {showAddModal && (
      {/* Add / Edit Property Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
          <div className={`max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 rounded-2xl shadow-2xl border ${modalBg}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${divider}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${textPrimary}`}>
                <FiHome className="text-emerald-500" /> Add Property
                {editingProperty ? <><FiEdit2 className="text-blue-500" /> Edit Property</> : <><FiHome className="text-emerald-500" /> Add Property</>}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}>
              <button type="button" onClick={() => { setShowModal(false); setEditingProperty(null); }} className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}>
                <FiX size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium border border-red-500/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Property Name</label>
                  <input type="text" placeholder="e.g. Ground Floor Shop" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Property Details Section */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}>
                  <FiHome size={12} /> Property Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Property Name *</label>
                    <input type="text" placeholder="e.g. Ground Floor Shop" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                      <option value="house">House</option>
                      <option value="shop">Shop</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Due Day (1-31) *</label>
                    <input type="number" min="1" max="31" placeholder="5" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} className={inputClass} required />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                    <option value="house">House</option>
                    <option value="shop">Shop</option>
                  </select>
                </div>
              </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Tenant Name (Optional)</label>
                  <input type="text" placeholder="e.g. John Doe" value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} className={inputClass} />
              {/* Tenant Details Section */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}>
                  <FiPhone size={12} /> Tenant Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Tenant Name</label>
                    <input type="text" placeholder="e.g. John Doe" value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Phone Number</label>
                    <input type="tel" placeholder="e.g. 9876543210" value={form.tenant_phone} onChange={(e) => setForm({ ...form, tenant_phone: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>ID Proof (Aadhaar/PAN)</label>
                    <input type="text" placeholder="e.g. XXXX-XXXX-1234" value={form.tenant_id_proof} onChange={(e) => setForm({ ...form, tenant_id_proof: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Move-in Date</label>
                    <input type="date" value={form.tenant_move_in} onChange={(e) => setForm({ ...form, tenant_move_in: e.target.value })} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Move-out Date (leave empty if active)</label>
                    <input type="date" value={form.tenant_move_out} onChange={(e) => setForm({ ...form, tenant_move_out: e.target.value })} className={inputClass} />
                  </div>
                </div>
              </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Monthly Rent Amount</label>
                  <input type="number" min="0" step="any" placeholder="10000" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} className={inputClass} required />
              {/* Financial Details Section */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}>
                  <FiShield size={12} /> Financial Details
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Monthly Rent Amount *</label>
                    <input type="number" min="0" step="any" placeholder="10000" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} className={inputClass} required />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Security Deposit</label>
                    <input type="number" min="0" step="any" placeholder="50000" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: e.target.value })} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Advance Rent</label>
                    <input type="number" min="0" step="any" placeholder="20000" value={form.advance_rent} onChange={(e) => setForm({ ...form, advance_rent: e.target.value })} className={inputClass} />
                  </div>
                </div>
              </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${textSecondary}`}>Due Day (1-31)</label>
                  <input type="number" min="1" max="31" placeholder="5" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} className={inputClass} required />
                </div>
              {/* Notes Section */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${textSecondary}`}>
                  <FiFileText size={12} /> Notes
                </p>
                <textarea
                  rows={3}
                  placeholder="Any additional notes about this property or tenant..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                <button type="submit" disabled={addingProperty} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  {addingProperty ? "Saving..." : <><FiCheck size={16} /> Save Property</>}
                <button type="button" onClick={() => { setShowModal(false); setEditingProperty(null); }} className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Cancel</button>
                <button type="submit" disabled={savingProperty} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingProperty ? "Saving..." : <><FiCheck size={16} /> {editingProperty ? "Update" : "Save"} Property</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentTracker;
