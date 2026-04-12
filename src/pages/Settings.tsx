import { useState, useEffect } from "react";
import { FiUser, FiList, FiCreditCard, FiSliders, FiPlus, FiTrash2 } from "react-icons/fi";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useUserPreferences } from "../hooks/useUserPreferences";
import { FiEdit2, FiAlertTriangle, FiDownload, FiGlobe, FiEye, FiEyeOff } from "react-icons/fi";

const TABS = [
  { id: "profile", label: "Profile & Identity", icon: FiUser },
  { id: "categories", label: "Custom Categories", icon: FiList },
  { id: "accounts", label: "Wallets & Accounts", icon: FiCreditCard },
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
