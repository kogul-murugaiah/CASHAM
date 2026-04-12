import { useState } from "react";
import { FiUser, FiList, FiCreditCard, FiSliders, FiCheck } from "react-icons/fi";

const TABS = [
  { id: "profile", label: "Profile & Identity", icon: FiUser },
  { id: "categories", label: "Custom Categories", icon: FiList },
  { id: "accounts", label: "Wallets & Accounts", icon: FiCreditCard },
  { id: "system", label: "System Preferences", icon: FiSliders },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="pb-24 pt-8 md:pb-8 animate-fade-in">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-slate-400 font-medium text-sm uppercase tracking-wider mb-1">Configuration</p>
          <h1 className="text-4xl font-bold font-heading text-white">Settings</h1>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 flex-shrink-0">
            <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 hide-scrollbar">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap text-left ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-emerald-400" : "text-slate-500"} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 glass-card p-6 md:p-8 min-h-[60vh]">
            {activeTab === "profile" && (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">Profile & Identity</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage your account details and display name.</p>
                </div>
                {/* Form placeholder */}
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                    <input type="text" placeholder="e.g. John Doe" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                    <p className="text-[10px] text-slate-500 mt-1">This will be used to greet you on the dashboard.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                    <input type="email" disabled placeholder="user@example.com" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed" />
                  </div>
                  <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold transition-all text-sm">
                    <FiCheck /> Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div className="animate-fade-in space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white font-heading">Custom Categories</h2>
                  <p className="text-sm text-slate-400 mt-1">Add, edit, or remove your tracking categories.</p>
                </div>
                <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                    <FiList size={32} className="text-slate-600 mb-3" />
                    <p className="text-slate-400 font-medium">Category Management coming here.</p>
                </div>
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="animate-fade-in space-y-6">
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
              <div className="animate-fade-in space-y-6">
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
