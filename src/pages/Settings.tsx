import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiList, FiCreditCard, FiSliders, FiPlus, FiTrash2, FiRefreshCw, FiRepeat } from "react-icons/fi";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { FiEdit2, FiAlertTriangle, FiDownload, FiGlobe, FiEye, FiEyeOff, FiCheck, FiX, FiZap } from "react-icons/fi";
import { CustomDropdown } from "../components/CustomDropdown";
import { formatCurrency } from "../lib/formatters";

const APP_VERSION = "2.0.0";
const APP_BUILD_DATE = "2026";

type ExpenseTemplate = {
  id: string;
  item: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  account_type: string;
  categories: { id: string; name: string } | null;
};

const TABS = [
  { id: "profile", label: "Profile & Identity", icon: FiUser },
  { id: "categories", label: "Custom Categories", icon: FiList },
  { id: "accounts", label: "Wallets & Accounts", icon: FiCreditCard },
  { id: "templates", label: "Expense Templates", icon: FiRepeat },
  { id: "system", label: "System Preferences", icon: FiSliders },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  const { categories, addCategory, deleteCategory, updateCategory, loading: categoriesLoading } = useExpenseCategories();
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catError, setCatError] = useState("");

  const { accountTypes, addAccountType, renameAccountType, deleteAccountType, loading: accountsLoading } = useAccountTypes();
  const [newAccName, setNewAccName] = useState("");
  const [addingAcc, setAddingAcc] = useState(false);
  const [accError, setAccError] = useState("");

  const [editingItem, setEditingItem] = useState<{ id?: number; name: string; type: "category" | "account" } | null>(null);
  const [editValue, setEditValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id?: number; name: string; type: "category" | "account" } | null>(null);

  const { hideBalance, currencyStyle, language, updatePreference } = useUserPreferences();
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  // ── Expense Templates state ──────────────────────────────────────────
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [templateSuccess, setTemplateSuccess] = useState("");

  // Add form
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [tplForm, setTplForm] = useState({ item: "", amount: "", description: "", category_id: "", account_type: "" });
  const [tplAdding, setTplAdding] = useState(false);

  // Edit form
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [tplEditForm, setTplEditForm] = useState({ item: "", amount: "", description: "", category_id: "", account_type: "" });
  const [tplEditing, setTplEditing] = useState(false);

  // Quick-add flash
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { user } = await api.get('/api/auth/user');
        if (user) {
          setEmail(user.email || "");
          setDisplayName(user.display_name || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Fetch templates when tab is activated
  useEffect(() => {
    if (activeTab === "templates") fetchTemplates();
  }, [activeTab]);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    setTemplateError("");
    try {
      const data = await api.get('/api/expenses?templates=true');
      setTemplates(data || []);
    } catch (err: any) {
      setTemplateError(err.message || "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  };

  const showTplSuccess = (msg: string) => {
    setTemplateSuccess(msg);
    setTimeout(() => setTemplateSuccess(""), 3000);
  };

  const handleAddTemplate = async () => {
    if (!tplForm.item.trim() || !tplForm.amount || !tplForm.account_type) {
      setTemplateError("Item name, amount and account are required");
      return;
    }
    setTplAdding(true);
    setTemplateError("");
    try {
      await api.post('/api/expenses?template=true', {
        item: tplForm.item.trim(),
        amount: Number(tplForm.amount),
        description: tplForm.description || null,
        category_id: tplForm.category_id || null,
        account_type: tplForm.account_type,
      });
      // Re-fetch to get joined categories
      await fetchTemplates();
      setTplForm({ item: "", amount: "", description: "", category_id: "", account_type: "" });
      setShowAddTemplate(false);
      showTplSuccess("Template created!");
    } catch (err: any) {
      setTemplateError(err.message || "Failed to create template");
    } finally {
      setTplAdding(false);
    }
  };

  const openEditTemplate = (t: ExpenseTemplate) => {
    setEditingTemplate(t);
    setTplEditForm({
      item: t.item,
      amount: String(t.amount),
      description: t.description || "",
      category_id: t.category_id || "",
      account_type: t.account_type,
    });
    setTemplateError("");
  };

  const handleEditTemplate = async () => {
    if (!editingTemplate) return;
    if (!tplEditForm.item.trim() || !tplEditForm.amount || !tplEditForm.account_type) {
      setTemplateError("Item name, amount and account are required");
      return;
    }
    setTplEditing(true);
    setTemplateError("");
    try {
      await api.put('/api/expenses?template=true', {
        id: editingTemplate.id,
        item: tplEditForm.item.trim(),
        amount: Number(tplEditForm.amount),
        description: tplEditForm.description || null,
        category_id: tplEditForm.category_id || null,
        account_type: tplEditForm.account_type,
      });
      await fetchTemplates();
      setEditingTemplate(null);
      showTplSuccess("Template updated!");
    } catch (err: any) {
      setTemplateError(err.message || "Failed to update template");
    } finally {
      setTplEditing(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template? This won't affect past expenses.")) return;
    try {
      await api.delete(`/api/expenses?template=true&id=${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showTplSuccess("Template deleted.");
    } catch (err: any) {
      setTemplateError(err.message || "Failed to delete template");
    }
  };

  const handleQuickAdd = async (id: string) => {
    setQuickAddingId(id);
    try {
      await api.post(`/api/expenses?quickadd=true&id=${id}`, {});
      showTplSuccess("Expense logged from template!");
    } catch (err: any) {
      setTemplateError(err.message || "Quick-add failed");
    } finally {
      setQuickAddingId(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSuccessMsg("");
    try {
      await api.post('/api/profile', { displayName });
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    setCatError("");
    try {
        await addCategory(newCatName);
        setNewCatName("");
    } catch (err: any) {
        setCatError(err.message || "Failed to add category");
    } finally {
        setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    setDeleteTarget({ id, name, type: "category" });
  };

  const handleAddAccount = async () => {
    if (!newAccName.trim()) return;
    setAddingAcc(true);
    setAccError("");
    try {
        await addAccountType(newAccName);
        setNewAccName("");
    } catch (err: any) {
        setAccError(err.message || "Failed to add account");
    } finally {
        setAddingAcc(false);
    }
  };

  const handleDeleteAccount = async (name: string) => {
    setDeleteTarget({ name, type: "account" });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
        if (deleteTarget.type === "category" && deleteTarget.id) {
            await deleteCategory(deleteTarget.id);
        } else if (deleteTarget.type === "account") {
            await deleteAccountType(deleteTarget.name);
        }
        setDeleteTarget(null);
    } catch (err: any) {
        alert(err.message || "Failed to delete");
    }
  };

  const startRename = (item: { id?: number; name: string; type: "category" | "account" }) => {
    setEditingItem(item);
    setEditValue(item.name);
  };

  const saveRename = async () => {
    if (!editingItem || !editValue.trim() || editValue === editingItem.name) {
      setEditingItem(null);
      return;
    }

    try {
      if (editingItem.type === "category" && editingItem.id) {
        await updateCategory(editingItem.id, editValue);
      } else if (editingItem.type === "account") {
        await renameAccountType(editingItem.name, editValue);
      }
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message || "Failed to rename");
    }
  };

  const handleSyncCarryover = async () => {
    setSyncing(true);
    try {
      const now = new Date();
      await api.post('/api/dashboard', { year: now.getFullYear(), month: now.getMonth() + 1 });
      navigate('/dashboard');
    } catch (e) { console.error(e); } finally { setSyncing(false); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const expenses = await api.get('/api/expenses');
      if (!expenses || expenses.length === 0) {
        alert("No expenses to export!");
        return;
      }

      // Basic CSV Generation
      const headers = ["Date", "Item", "Amount", "Category", "Account", "Description"];
      const rows = expenses.map((ex: any) => [
        ex.date,
        ex.item,
        ex.amount,
        ex.categories?.name || "Uncategorized",
        ex.account_type || "Unknown",
        ex.description || ""
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `CASHAM_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pb-24 pt-8 md:pb-8 animate-fade-in text-left">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-slate-400 font-medium text-sm uppercase tracking-wider mb-1">Configuration</p>
          <h1 className="text-4xl font-bold font-heading text-white">Settings</h1>
        </header>

        <div className="flex flex-col gap-8">
          {/* Top Horizontal Nav */}
          <div className="w-full border-b border-white/5">
            <nav className="flex overflow-x-auto hide-scrollbar gap-6">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 pb-3 transition-all whitespace-nowrap border-b-2 relative top-[1px] group ${
                      isActive
                        ? "text-emerald-500 border-emerald-500 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.3)]"
                        : "text-slate-500 border-transparent hover:text-slate-800"
                    }`}
                  >
                    <Icon size={16} className={`${isActive ? "text-emerald-500" : "text-slate-400 group-hover:text-slate-600"} transition-colors`} />
                    <span className="font-bold text-sm tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 w-full min-h-[60vh]">
            {activeTab === "profile" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Profile Details</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage your identity within the CASHAM protocol.</p>
                </div>
                <div className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      placeholder="e.g. Kogul Murugaiah" 
                      className="w-full bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                    <input type="email" value={email} disabled className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3 text-slate-500 italic cursor-not-allowed" />
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving || loading}
                    className="btn-primary w-full md:w-auto px-10"
                  >
                    {saving ? "Updating..." : "Save Identity"}
                  </button>
                  {successMsg && <p className="text-emerald-500 dark:text-emerald-400 text-sm font-bold animate-fade-in text-center md:text-left">{successMsg}</p>}
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-10 max-w-3xl">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Custom Categories</h2>
                  <p className="text-sm text-slate-500 mt-1">Personalize your expense categories to match your lifestyle.</p>
                </div>
                
                <div className="space-y-6">
                  {/* Add New Category */}
                  <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">New Category Template</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                            placeholder="e.g. Subscriptions, Gifts..." 
                            className="flex-1 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" 
                        />
                        <button 
                            onClick={handleAddCategory}
                            disabled={addingCat || !newCatName.trim()}
                            className="btn-primary"
                        >
                            <FiPlus className="mr-2 inline" /> Add Category
                        </button>
                      </div>
                      {catError && <p className="text-rose-500 text-xs font-bold">{catError}</p>}
                  </div>

                  {/* List Categories */}
                      <div>
                         <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-4">Your Active Categories</label>
                         {categoriesLoading ? (
                             <div className="text-slate-400 text-sm animate-pulse">Consulting ledger...</div>
                         ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 {categories.map((cat) => (
                                    <div key={cat.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex items-center justify-between group hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all">
                                        {editingItem?.type === "category" && editingItem.id === cat.id ? (
                                            <div className="flex-1 flex gap-2">
                                                <input 
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveRename}
                                                    onKeyDown={(e) => e.key === "Enter" && saveRename()}
                                                    className="bg-white dark:bg-slate-950 border-2 border-emerald-500 rounded-xl px-3 py-1 text-sm text-slate-900 dark:text-white focus:outline-none w-full shadow-lg"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight">{cat.name}</span>
                                                <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                                                    <button 
                                                        onClick={() => startRename({ id: cat.id, name: cat.name, type: "category" })}
                                                        className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                                        title="Rename"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                        className="p-2.5 rounded-xl bg-rose-100/50 dark:bg-rose-500/5 text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-all"
                                                        title="Delete Category"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                             </div>
                         )}
                      </div>
                </div>
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-10 max-w-3xl">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Wallets & Accounts</h2>
                  <p className="text-sm text-slate-500 mt-1">Manage physical bank accounts and virtual payment methods.</p>
                </div>
                
                <div className="space-y-6">
                  {/* Add New Account */}
                  <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest">New Wallet Setup</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            value={newAccName}
                            onChange={(e) => setNewAccName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                            placeholder="e.g. ICICI, GPay, Cash..." 
                            className="flex-1 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all" 
                        />
                        <button 
                            onClick={handleAddAccount}
                            disabled={addingAcc || !newAccName.trim()}
                            className="btn-primary"
                        >
                            <FiPlus className="mr-2 inline" /> Add Account
                        </button>
                      </div>
                      {accError && <p className="text-rose-400 text-xs font-bold">{accError}</p>}
                  </div>

                  {/* List Accounts */}
                      <div>
                         <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-4">Configured Wallets</label>
                         {accountsLoading ? (
                             <div className="text-slate-400 text-sm animate-pulse">Loading accounts...</div>
                         ) : (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 {accountTypes.map((accName) => (
                                    <div key={accName} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 flex items-center justify-between group hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all">
                                        {editingItem?.type === "account" && editingItem.name === accName ? (
                                            <div className="flex-1 flex gap-2">
                                                <input 
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveRename}
                                                    onKeyDown={(e) => e.key === "Enter" && saveRename()}
                                                    className="bg-white dark:bg-slate-950 border-2 border-emerald-500 rounded-xl px-3 py-1 text-sm text-slate-900 dark:text-white focus:outline-none w-full shadow-lg"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight">{accName}</span>
                                                <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                                                    <button 
                                                        onClick={() => startRename({ name: accName, type: "account" })}
                                                        className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                                        title="Rename Account"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteAccount(accName)}
                                                        className="p-2.5 rounded-xl bg-rose-100/50 dark:bg-rose-500/5 text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-all"
                                                        title="Delete Account"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                             </div>
                         )}
                      </div>
                </div>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-10 max-w-4xl">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">Expense Templates</h2>
                    <p className="text-sm text-slate-500 mt-1">Save reusable expense presets to log them with one tap.</p>
                  </div>
                  <button
                    onClick={() => { setShowAddTemplate(true); setEditingTemplate(null); setTemplateError(""); }}
                    className="btn-primary flex items-center gap-2 px-5 py-2.5"
                  >
                    <FiPlus size={16} /> New Template
                  </button>
                </div>

                {templateError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{templateError}</div>
                )}
                {templateSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium animate-fade-in">{templateSuccess}</div>
                )}

                {/* Add Form */}
                {showAddTemplate && !editingTemplate && (
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-emerald-500/20 rounded-3xl p-6 space-y-4 animate-fade-in">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest">New Template</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name *</label>
                        <input
                          type="text"
                          value={tplForm.item}
                          onChange={e => setTplForm(p => ({ ...p, item: e.target.value }))}
                          placeholder="e.g. Netflix, Gym membership"
                          className="w-full bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount *</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            value={tplForm.amount}
                            onChange={e => setTplForm(p => ({ ...p, amount: e.target.value }))}
                            placeholder="0"
                            className="w-full bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-white/10 rounded-2xl pl-8 pr-4 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account *</label>
                        <CustomDropdown
                          value={tplForm.account_type}
                          onChange={v => setTplForm(p => ({ ...p, account_type: v }))}
                          options={accountTypes.map(t => ({ value: t, label: t }))}
                          placeholder="Select account"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                        <CustomDropdown
                          value={tplForm.category_id}
                          onChange={v => setTplForm(p => ({ ...p, category_id: v }))}
                          options={categories.map(c => ({ value: c.id.toString(), label: c.name }))}
                          placeholder="Select category"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                        <input
                          type="text"
                          value={tplForm.description}
                          onChange={e => setTplForm(p => ({ ...p, description: e.target.value }))}
                          placeholder="Optional notes"
                          className="w-full bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setShowAddTemplate(false)} className="px-5 py-2.5 rounded-2xl text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                        Cancel
                      </button>
                      <button onClick={handleAddTemplate} disabled={tplAdding} className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-60">
                        {tplAdding ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheck size={15} />}
                        Create Template
                      </button>
                    </div>
                  </div>
                )}

                {/* Template Grid */}
                {templatesLoading ? (
                  <div className="text-slate-400 text-sm animate-pulse py-4">Loading templates...</div>
                ) : templates.length === 0 && !showAddTemplate ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-white/10 rounded-3xl">
                    <span className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500"><FiRepeat size={28} /></span>
                    <p className="text-slate-400 font-medium">No templates yet</p>
                    <p className="text-slate-600 text-xs max-w-xs">Create templates for recurring expenses like rent, subscriptions or utilities and log them in one tap.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {templates.map(t => (
                      <div key={t.id} className="group relative bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all overflow-hidden">
                        {/* Subtle glow */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

                        {editingTemplate?.id === t.id ? (
                          /* Inline Edit Form */
                          <div className="space-y-3 animate-fade-in">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Editing</p>
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Item Name</label>
                              <input
                                autoFocus
                                type="text"
                                value={tplEditForm.item}
                                onChange={e => setTplEditForm(p => ({ ...p, item: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Amount</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                <input
                                  type="number"
                                  value={tplEditForm.amount}
                                  onChange={e => setTplEditForm(p => ({ ...p, amount: e.target.value }))}
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl pl-7 pr-3 py-2 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Account</label>
                              <CustomDropdown
                                value={tplEditForm.account_type}
                                onChange={v => setTplEditForm(p => ({ ...p, account_type: v }))}
                                options={accountTypes.map(a => ({ value: a, label: a }))}
                                placeholder="Select account"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Category</label>
                              <CustomDropdown
                                value={tplEditForm.category_id}
                                onChange={v => setTplEditForm(p => ({ ...p, category_id: v }))}
                                options={categories.map(c => ({ value: c.id.toString(), label: c.name }))}
                                placeholder="Select category"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Description</label>
                              <input
                                type="text"
                                value={tplEditForm.description}
                                onChange={e => setTplEditForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="Optional"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => setEditingTemplate(null)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                                <FiX size={13} /> Cancel
                              </button>
                              <button onClick={handleEditTemplate} disabled={tplEditing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all disabled:opacity-60">
                                {tplEditing ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheck size={13} />}
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Card View */
                          <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{t.item}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {t.categories && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-white/5">
                                      {t.categories.name}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {t.account_type}
                                  </span>
                                </div>
                                {t.description && (
                                  <p className="text-xs text-slate-500 mt-1.5 truncate">{t.description}</p>
                                )}
                              </div>
                              <span className="text-lg font-black text-red-400 font-mono whitespace-nowrap flex-shrink-0">
                                {formatCurrency(t.amount, currencyStyle)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-200 dark:border-white/5">
                              <button
                                onClick={() => handleQuickAdd(t.id)}
                                disabled={quickAddingId === t.id}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all disabled:opacity-60"
                                title="Log as today's expense"
                              >
                                {quickAddingId === t.id ? (
                                  <span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                ) : (
                                  <FiZap size={12} />
                                )}
                                Quick Add
                              </button>
                              <button
                                onClick={() => openEditTemplate(t)}
                                className="p-2 rounded-xl text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                                title="Edit template"
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(t.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Delete template"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "system" && (
              <div className="animate-fade-in space-y-8 glass-card p-6 md:p-10 max-w-2xl text-left">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">System Controls</h2>
                  <p className="text-sm text-slate-500 mt-1">Adjust core application behavior and localizations.</p>
                </div>

                <div className="space-y-6">
                  {/* Privacy Mode */}
                   <div className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl transition-all ${hideBalance ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500'}`}>
                        {hideBalance ? <FiEyeOff size={24} /> : <FiEye size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Privacy Projection</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Hide sensitive balances globally</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updatePreference("hideBalance", !hideBalance)}
                      className={`w-14 h-7 rounded-full transition-all relative p-1 ${hideBalance ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md ${hideBalance ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Currency Styling */}
                   <div className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500">
                        <FiCreditCard size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Currency Format</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Toggle between symbols (₹) and text (Rs.)</p>
                      </div>
                    </div>
                    <div className="flex bg-slate-200/50 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <button 
                         onClick={() => updatePreference("currencyStyle", "symbol")}
                         className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${currencyStyle === 'symbol' ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                      >
                        ₹
                      </button>
                      <button 
                         onClick={() => updatePreference("currencyStyle", "text")}
                         className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${currencyStyle === 'text' ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                      >
                        Rs.
                      </button>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500">
                        <FiGlobe size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">App Dialect</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Localized experience for your preference</p>
                      </div>
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => updatePreference("language", e.target.value as any)}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[10px] font-black px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500 cursor-pointer outline-none appearance-none text-center min-w-[120px] shadow-sm"
                    >
                      <option value="en">ENGLISH</option>
                      <option value="hi">HINDI (हिन्दी)</option>
                    </select>
                  </div>

                  {/* Balance Carryover Sync */}
                  <div className="group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500">
                        <FiRefreshCw size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Balance Carryover</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">Sync last month's closing balance forward</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSyncCarryover}
                      disabled={syncing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                    >
                      <FiRefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>

                  {/* Data Export */}
                  <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                    <button 
                        onClick={handleExportCSV}
                        disabled={exporting}
                        className="btn-primary w-full py-5 rounded-3xl text-sm tracking-widest uppercase"
                    >
                        {exporting ? (
                            "Compiling Ledger..."
                        ) : (
                            <span className="flex items-center justify-center gap-3">
                                <FiDownload strokeWidth={3} /> Download Financial Report
                            </span>
                        )}
                    </button>
                    <p className="text-[10px] text-slate-500 mt-6 text-center leading-relaxed font-bold uppercase tracking-tighter">Your secure transaction history will be prepared in <b>.CSV format</b>, structured for high-performance analysis.</p>
                  </div>

                  {/* About */}
                  <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                    <div className="rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <span className="text-emerald-500 text-xl font-black font-mono">C</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">CASHAM</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Wealth Tracker · Budget Planner · Investment Suite</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-black font-mono tracking-widest">
                          v{APP_VERSION}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Built {APP_BUILD_DATE}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Deletion Warning */}
      {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-left">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                      <FiAlertTriangle size={32} />
                  </div>
                  <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Critical Deletion Warning</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                          Deleting <span className="text-white font-semibold">"{deleteTarget.name}"</span> will de-link it from all historic transactions. 
                          This can break your analytics consistency.
                      </p>
                      <p className="text-slate-300 text-sm font-medium">
                          We strongly recommend <span className="text-emerald-400 font-bold">Renaming</span> it instead if the name has changed.
                      </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                      <button 
                          onClick={() => setDeleteTarget(null)}
                          className="flex-1 px-6 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmDelete}
                          className="flex-1 px-6 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all"
                      >
                          Delete Anyway
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
