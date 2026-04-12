import { useState, useEffect } from "react";
import { FiUser, FiList, FiCreditCard, FiSliders, FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import { api } from "../lib/api";
import { useExpenseCategories } from "../hooks/useExpenseCategories";

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
  
  const { categories, addCategory, deleteCategory, loading: categoriesLoading } = useExpenseCategories();
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catError, setCatError] = useState("");

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

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
        await deleteCategory(id);
    } catch (err: any) {
        setCatError(err.message || "Failed to delete category");
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
                                    <span className="text-slate-200 font-medium text-sm">{cat.name}</span>
                                    <button 
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="text-slate-600 hover:text-rose-400 transition-colors p-1.5 opacity-0 group-hover:opacity-100"
                                        title="Delete Category"
                                    >
                                        <FiTrash2 size={16} />
                                    </button>
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
              <div className="animate-fade-in space-y-6 glass-card p-6 md:p-8 rounded-2xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">Wallets & Accounts</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage physical bank accounts and virtual wallets.</p>
                </div>
                <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                    <FiCreditCard size={32} className="text-slate-600 mb-3" />
                    <p className="text-slate-400 font-medium">Wallet Builder coming here.</p>
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
    </div>
  );
};

export default Settings;
