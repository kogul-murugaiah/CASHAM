import { useState, useEffect } from "react";
import { FiUser, FiList, FiCreditCard, FiSliders, FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { FiEdit2, FiAlertTriangle } from "react-icons/fi";

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

  return (
    <div className="pb-24 pt-8 md:pb-8 animate-fade-in">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-slate-400 font-medium text-sm uppercase tracking-wider mb-1">Configuration</p>
          <h1 className="text-4xl font-bold font-heading text-white">Settings</h1>
        </header>

        <div className="flex flex-col gap-8">
          {/* Top Horizontal Nav */}
          <div className="w-full border-b border-slate-800">
            <nav className="flex overflow-x-auto hide-scrollbar gap-6">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 pb-3 transition-all whitespace-nowrap border-b-2 relative top-[1px] ${
                      isActive
                        ? "text-emerald-400 border-emerald-400"
                        : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-emerald-400" : "text-slate-500"} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 w-full min-h-[60vh]">
            {activeTab === "profile" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-8 rounded-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">Profile & Identity</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage your account details and display name.</p>
                </div>
                {/* Form placeholder */}
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={loading}
                      placeholder="e.g. John Doe" 
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">This will be used to greet you on the dashboard.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input type="email" value={email} disabled placeholder="user@example.com" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed" />
                  </div>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving || loading}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2.5 rounded-lg font-bold transition-all text-sm w-max min-w-[140px]"
                  >
                    {saving ? "Saving..." : <><FiCheck /> Save Changes</>}
                  </button>
                  {successMsg && <p className="text-emerald-400 text-sm font-medium animate-fade-in">{successMsg}</p>}
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-8 rounded-2xl max-w-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">Custom Categories</h2>
                  <p className="text-sm text-slate-400 mt-1">Add, edit, or remove your tracking categories. Default categories cannot be removed.</p>
                </div>
                
                <div className="space-y-4">
                  {/* Add New Category */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Create New Template</label>
                      <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                            placeholder="e.g. Subscriptions, Travel" 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                        />
                        <button 
                            onClick={handleAddCategory}
                            disabled={addingCat || !newCatName.trim()}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            {addingCat ? "..." : <FiPlus />} Add
                        </button>
                      </div>
                      {catError && <p className="text-rose-400 text-xs mt-2">{catError}</p>}
                  </div>

                  {/* List Categories */}
                  <div className="mt-8">
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Your Categories</label>
                     {categoriesLoading ? (
                         <div className="text-slate-400 text-sm animate-pulse">Loading categories...</div>
                     ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {categories.map((cat) => (
                                <div key={cat.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                                    {editingItem?.type === "category" && editingItem.id === cat.id ? (
                                        <div className="flex-1 flex gap-2">
                                            <input 
                                                autoFocus
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveRename}
                                                onKeyDown={(e) => e.key === "Enter" && saveRename()}
                                                className="bg-slate-800 border border-emerald-500/50 rounded-lg px-2 py-0.5 text-sm text-white focus:outline-none w-full"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-slate-200 font-medium text-sm">{cat.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => startRename({ id: cat.id, name: cat.name, type: "category" })}
                                                    className="text-slate-500 hover:text-emerald-400 p-1.5 transition-colors"
                                                    title="Rename"
                                                >
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                                    className="text-slate-500 hover:text-rose-400 transition-colors p-1.5"
                                                    title="Delete Category"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <div className="col-span-2 text-center p-8 border border-dashed border-slate-700 rounded-xl text-slate-500">
                                    No custom categories created yet.
                                </div>
                            )}
                         </div>
                     )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-8 rounded-2xl max-w-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">Wallets & Accounts</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage physical bank accounts and virtual wallets. Renaming an account updates all historic records.</p>
                </div>
                
                <div className="space-y-4">
                  {/* Add New Account */}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Configure New Account</label>
                      <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newAccName}
                            onChange={(e) => setNewAccName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                            placeholder="e.g. HDFC, Petrol Card" 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" 
                        />
                        <button 
                            onClick={handleAddAccount}
                            disabled={addingAcc || !newAccName.trim()}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            {addingAcc ? "..." : <FiPlus />} Add
                        </button>
                      </div>
                      {accError && <p className="text-rose-400 text-xs mt-2">{accError}</p>}
                  </div>

                  {/* List Accounts */}
                  <div className="mt-8">
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Your Tracked Wallets</label>
                     {accountsLoading ? (
                         <div className="text-slate-400 text-sm animate-pulse">Loading accounts...</div>
                     ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {accountTypes.map((accName) => (
                                <div key={accName} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
                                    {editingItem?.type === "account" && editingItem.name === accName ? (
                                        <div className="flex-1 flex gap-2">
                                            <input 
                                                autoFocus
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={saveRename}
                                                onKeyDown={(e) => e.key === "Enter" && saveRename()}
                                                className="bg-slate-800 border border-emerald-500/50 rounded-lg px-2 py-0.5 text-sm text-white focus:outline-none w-full"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-slate-200 font-medium text-sm">{accName}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => startRename({ name: accName, type: "account" })}
                                                    className="text-slate-500 hover:text-emerald-400 p-1.5 transition-colors"
                                                    title="Rename Account"
                                                >
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteAccount(accName)}
                                                    className="text-slate-500 hover:text-rose-400 transition-colors p-1.5"
                                                    title="Delete Account"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {accountTypes.length === 0 && (
                                <div className="col-span-2 text-center p-8 border border-dashed border-slate-700 rounded-xl text-slate-500">
                                    No accounts configured yet.
                                </div>
                            )}
                         </div>
                     )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "system" && (
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-8 rounded-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">System Preferences</h2>
                  <p className="text-sm text-slate-400 mt-1">Control application behavior and data exports.</p>
                </div>
                <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                    <FiSliders size={32} className="text-slate-600 mb-3" />
                    <p className="text-slate-400 font-medium">Data Export & Theme Settings coming here.</p>
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
