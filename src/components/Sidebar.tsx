import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import Logo from "./Logo";
import { useTheme } from "../contexts/ThemeContext";
import {
    FiHome, FiPlusCircle, FiMinusCircle, FiTrendingUp,
    FiList, FiBarChart2, FiLogOut, FiChevronLeft, FiMenu, FiX,
    FiSun, FiMoon, FiPieChart, FiRepeat
} from "react-icons/fi";

const NAV_GROUPS = [
    {
        label: "Overview",
        items: [
            { to: "/dashboard", icon: FiHome, label: "Dashboard" },
        ],
    },
    {
        label: "Add Transaction",
        items: [
            { to: "/add", icon: FiMinusCircle, label: "Add Expense" },
            { to: "/add-income", icon: FiPlusCircle, label: "Add Income" },
            { to: "/transfer", icon: FiRepeat, label: "Transfer" },
            { to: "/add-investment", icon: FiTrendingUp, label: "Log Investment" },
        ],
    },
    {
        label: "History & Tracking",
        items: [
            { to: "/expense-tracking", icon: FiList, label: "Expense Tracker" },
            { to: "/income-tracking", icon: FiBarChart2, label: "Income Tracker" },
            { to: "/portfolio", icon: FiTrendingUp, label: "Portfolio" },
        ],
    },
    {
        label: "Planning",
        items: [
            { to: "/budget-planner", icon: FiPieChart, label: "Budget Planner" },
        ],
    },
];

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.get("/api/auth/user")
            .then((d) => setUser(d?.user || null))
            .catch(() => setUser(null));
    }, []);

    // Close mobile drawer on navigation
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    // Close mobile drawer on outside click
    useEffect(() => {
        if (!mobileOpen) return;
        const handler = (e: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
                setMobileOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [mobileOpen]);

    const handleLogout = async () => {
        try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
        navigate("/");
    };

    const getInitials = (email: string) => email?.charAt(0).toUpperCase() || "?";

    const SidebarContent = ({ isCollapsed }: { isCollapsed: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${isCollapsed ? "justify-center" : ""}`}>
                <Logo size="sm" className="flex-shrink-0" />
                {!isCollapsed && (
                    <span className="text-lg font-bold font-heading text-white tracking-tight">CASHAM</span>
                )}
            </div>

            {/* Nav Groups */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-6 px-2">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        {!isCollapsed && (
                            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                {group.label}
                            </p>
                        )}
                        <ul className="space-y-1">
                            {group.items.map(({ to, icon: Icon, label }) => (
                                <li key={to}>
                                    <NavLink
                                        to={to}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${isActive
                                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                                : "text-slate-400 hover:bg-white/5 hover:text-slate-100 border border-transparent"
                                            } ${isCollapsed ? "justify-center" : ""}`
                                        }
                                        title={isCollapsed ? label : undefined}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <Icon
                                                    size={18}
                                                    strokeWidth={isActive ? 2.5 : 1.8}
                                                    className="flex-shrink-0"
                                                />
                                                {!isCollapsed && (
                                                    <span className="text-sm font-medium font-heading">{label}</span>
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Theme toggle + User + Logout */}
            <div className="border-t border-white/5 p-3 space-y-1">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-100 transition-all border border-transparent hover:border-white/5 ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? (theme === "dark" ? "Switch to Light" : "Switch to Dark") : undefined}
                >
                    {theme === "dark" ? (
                        <FiSun size={16} strokeWidth={1.8} className="flex-shrink-0 text-amber-400" />
                    ) : (
                        <FiMoon size={16} strokeWidth={1.8} className="flex-shrink-0 text-teal-400" />
                    )}
                    {!isCollapsed && (
                        <span className="text-sm font-medium font-heading">
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </span>
                    )}
                </button>

                {user && (
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/3 ${isCollapsed ? "justify-center" : ""}`}>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-lg">
                            {getInitials(user.email)}
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <p className="text-xs font-semibold text-slate-300 truncate">{user.email}</p>
                                <p className="text-[10px] text-slate-500">Signed in</p>
                            </div>
                        )}
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? "Logout" : undefined}
                >
                    <FiLogOut size={16} strokeWidth={1.8} className="flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium font-heading">Logout</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
            <aside
                className={`hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 bg-slate-900/60 backdrop-blur-2xl border-r border-white/5 transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[240px]"
                    }`}
            >
                <SidebarContent isCollapsed={collapsed} />

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg z-50"
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <FiChevronLeft
                        size={14}
                        className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
                    />
                </button>
            </aside>

            {/* ── MOBILE TOP BAR ──────────────────────────────────────────────── */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3.5 bg-slate-700/80 backdrop-blur-2xl border-b border-white/5">
                {/* Hamburger LEFT */}
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white active:bg-white/10 transition-all flex-shrink-0"
                >
                    <FiMenu size={20} />
                </button>

                {/* Logo + name CENTERED */}
                <div className="flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
                    <Logo size="sm" className="flex-shrink-0" />
                    <span className="text-lg font-bold font-heading text-white">CASHAM</span>
                </div>

                {/* Spacer to balance hamburger */}
                <div className="w-10 flex-shrink-0" />
            </header>

            {/* ── MOBILE DRAWER OVERLAY ───────────────────────────────────────── */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
                        onClick={() => setMobileOpen(false)}
                    />

                    {/* Drawer panel */}
                    <div
                        ref={drawerRef}
                        className="relative w-[280px] h-full bg-slate-900 border-r border-white/5 shadow-2xl flex flex-col animate-slide-in-left"
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"
                        >
                            <FiX size={18} />
                        </button>

                        <SidebarContent isCollapsed={false} />
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
