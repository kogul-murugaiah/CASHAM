import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import {
    FiSun,
    FiMoon,
    FiCreditCard,
    FiTrendingUp,
    FiActivity,
    FiPieChart,
    FiCheckCircle,
    FiShield,
    FiSmartphone,
    FiCheck,
    FiArrowRight,
    FiCalendar,
    FiCheckSquare,
    FiDollarSign
} from 'react-icons/fi';

const LandingPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await api.get('/api/auth/user');
                if (data?.user) {
                    setIsAuthenticated(true);
                }
            } catch {
                // Not authenticated
            }
        };
        checkAuth();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="landing-page min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30 transition-colors duration-200">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-white/10 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-3" onClick={() => window.scrollTo(0, 0)}>
                            <Logo size="md" />
                            <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent tracking-tight">
                                CASHAM
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center gap-6">
                            <button
                                onClick={() => scrollToSection('features')}
                                className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Features
                            </button>
                            <button
                                onClick={() => scrollToSection('modules')}
                                className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Platform Modules
                            </button>
                            <button
                                onClick={() => scrollToSection('why-free')}
                                className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                100% Free
                            </button>
                            <button
                                onClick={() => scrollToSection('footer')}
                                className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                About
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle Theme"
                            className="p-2.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm"
                        >
                            {theme === "dark" ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-slate-600" />}
                        </button>
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 shadow-sm"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/login"
                                    className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 shadow-sm"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 transition-colors">
                {/* Radial Backdrop Glows */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent dark:from-emerald-900/20 dark:via-transparent dark:to-transparent pointer-events-none"></div>
                <div className="absolute top-[8%] left-[10%] w-[38%] h-[38%] bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[40%] bg-teal-500/10 dark:bg-teal-600/15 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        {/* Left Column - Text Content */}
                        <div className="text-left animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600 dark:bg-emerald-500"></span>
                                </span>
                                All-in-One Life & Finance OS • 100% Free
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900 dark:text-white">
                                Master Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-green-400">
                                    Finances & Habits
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed max-w-xl pr-4">
                                Track expenses, reconcile credit card bills with smart date settlement, monitor investments, and log gym workouts. A modern, all-in-one system without paywalls or subscriptions.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 items-center sm:justify-start">
                                {isAuthenticated ? (
                                    <Link
                                        to="/dashboard"
                                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-600 text-white font-bold text-base sm:text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 text-center flex items-center justify-center gap-2"
                                    >
                                        Go to Dashboard <FiArrowRight />
                                    </Link>
                                ) : (
                                    <Link
                                        to="/signup"
                                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-600 text-white font-bold text-base sm:text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 text-center flex items-center justify-center gap-2"
                                    >
                                        Start Free — No Credit Card Needed <FiArrowRight />
                                    </Link>
                                )}
                                <button
                                    onClick={() => scrollToSection('modules')}
                                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base sm:text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-white/10 shadow-sm cursor-pointer"
                                >
                                    Explore Modules
                                </button>
                            </div>

                            {/* Trust badges */}
                            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-700 dark:text-slate-300 font-semibold">
                                <div className="flex items-center gap-2">
                                    <FiCheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    100% Free Forever
                                </div>
                                <div className="flex items-center gap-2">
                                    <FiShield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    Bank-grade Privacy
                                </div>
                                <div className="flex items-center gap-2">
                                    <FiSmartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                                    PWA & Mobile Ready
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Dashboard Mockup */}
                        <div className="relative mx-auto w-full max-w-lg lg:max-w-[110%] xl:max-w-[120%] lg:ml-4 mt-8 lg:mt-0 xl:-mr-12">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-[80px] -z-10 rounded-full"></div>

                            {/* The Glass Mockup Frame */}
                            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl shadow-2xl shadow-emerald-950/10 dark:shadow-emerald-950/40 overflow-hidden transform lg:rotate-[-1deg] hover:rotate-0 transition-transform duration-500">
                                {/* Mockup Header */}
                                <div className="h-12 border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/60 flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="h-6 max-w-[240px] bg-slate-200/70 dark:bg-slate-800 rounded mx-auto flex items-center px-2">
                                            <FiShield className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                                            <span className="text-[10px] text-slate-600 dark:text-slate-300 ml-1.5 font-semibold tracking-wider">app.casham.com</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mockup Body */}
                                <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-transparent space-y-4">
                                    {/* Top stats row */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm">
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">NET WORTH</div>
                                            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">₹4,82,500</div>
                                            <span className="text-[10px] text-emerald-600 font-bold">+14.2% YoY</span>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm">
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">CARD DUES</div>
                                            <div className="text-base sm:text-lg font-extrabold text-amber-500 mt-0.5">₹18,420</div>
                                            <span className="text-[10px] text-slate-500 font-medium">Due in 12 days</span>
                                        </div>
                                        <div className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm col-span-2 sm:col-span-1">
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">GYM STREAK</div>
                                            <div className="text-base sm:text-lg font-extrabold text-emerald-500 mt-0.5">18 Sessions</div>
                                            <span className="text-[10px] text-emerald-600 font-bold">5 PRs this month</span>
                                        </div>
                                    </div>

                                    {/* Interactive Mock Activity Banner */}
                                    <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                                <FiCreditCard size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white">Smart Statement Settlement</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Reconciled up to statement cut-off date</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                            Settled ✓
                                        </span>
                                    </div>

                                    {/* Chart area */}
                                    <div className="h-40 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 p-4 flex items-end gap-2 relative overflow-hidden shadow-sm">
                                        <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-10">
                                            <div className="text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-400">MONTHLY CASH FLOW & SAVINGS</div>
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Live Sync</span>
                                        </div>

                                        <div className="w-full h-[40%] bg-emerald-500/90 rounded-t border-t border-emerald-400"></div>
                                        <div className="w-full h-[65%] bg-teal-500/90 rounded-t border-t border-teal-400"></div>
                                        <div className="w-full h-[50%] bg-emerald-500/90 rounded-t border-t border-emerald-400"></div>
                                        <div className="w-full h-[90%] bg-teal-600/90 rounded-t border-t border-teal-400"></div>
                                        <div className="w-full h-[45%] bg-emerald-500/90 rounded-t border-t border-emerald-400 hidden sm:block"></div>
                                        <div className="w-full h-[80%] bg-teal-500/90 rounded-t border-t border-teal-400 hidden sm:block"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Casham Pillars */}
            <section id="features" className="py-24 bg-white dark:bg-slate-900/50 border-t border-b border-slate-200/80 dark:border-white/5 relative transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 block">
                            Purpose-Built Architecture
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Why Casham Stands Apart
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                            Unlike generic expense apps that sell subscriptions or lock basic features behind paywalls, CASHAM is built from the ground up for total financial and daily mastery.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-600/5 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                <FiCreditCard size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Credit Card Hub & Advances
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                Track card dues, manage swipes made for friends (CC advances) with cash repayment status, and reconcile statements by date without double deductions.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-600/5 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 text-teal-600 dark:text-teal-400">
                                <FiPieChart size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                Total Wealth & Cash Flow
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                Multi-account budget allocation, emergency savings goals, rent ledgers, recurring subscription alerts, and mutual fund / gold investment tracking.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-600/5 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                <FiActivity size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                Fitness & Daily Routines
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                Full gym workout tracker with Bro Split & PPL routines, live stopwatch with rest timer, Personal Record (PR) trophy wall, and daily task management.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform Modules Showcase */}
            <section id="modules" className="py-24 bg-slate-50 dark:bg-slate-950 relative transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 block">
                            Integrated Platform
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Everything You Need Under One Roof
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                            Stop juggling 5 different apps for expenses, credit cards, investments, habits, and workouts.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Module 1: Credit Card Hub */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 font-bold">
                                    <FiCreditCard size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Credit Cards Hub & Smart Settlement
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                    Monitor credit limits and active dues per card. Settle statements by statement date in one click and easily move friend advances to personal transactions.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <FiCheck size={14} /> Settle-by-Date & Advances Ledger
                            </div>
                        </div>

                        {/* Module 2: Expense & Income */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5 font-bold">
                                    <FiDollarSign size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Intelligent Expense & Income Tracking
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                    Categorize transactions, assign deductions to specific budget accounts, split bills with friends, and save recurring expense templates for 1-tap entry.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
                                <FiCheck size={14} /> Split Payments & Quick Templates
                            </div>
                        </div>

                        {/* Module 3: Gym & Workout Tracker */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 font-bold">
                                    <FiActivity size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Gym Tracker & PR Trophy Wall
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                    Target routines across 7 muscle groups (Chest, Back, Shoulders, Biceps, Triceps, Legs, Core). Run live workouts with rest countdown timers and log past sessions.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <FiCheck size={14} /> Bro Split, Live Timers & PR Records
                            </div>
                        </div>

                        {/* Module 4: Investments & Net Worth */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5 font-bold">
                                    <FiTrendingUp size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Portfolio & Net Worth Tracking
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                    Consolidate mutual funds, stocks, fixed deposits, gold holdings, and liquidity accounts to see your genuine financial net worth growth in one unified view.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
                                <FiCheck size={14} /> Total Asset & Growth Breakdown
                            </div>
                        </div>

                        {/* Module 5: Rent & Savings Goals */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 font-bold">
                                    <FiCalendar size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Rent Ledger & Savings Targets
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                    Dedicated rent tracking with status history, recurring monthly subscriptions with automated reminders, and visual emergency fund progress gauges.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <FiCheck size={14} /> Rent Status & Fund Goals
                            </div>
                        </div>

                        {/* Module 6: Task Manager */}
                        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500/40 transition-all flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-5 font-bold">
                                    <FiCheckSquare size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Task & Habit Productivity
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                                    Organize daily priorities, manage work milestones, and track ongoing lifestyle tasks with high-visibility completion meters and simple status filters.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
                                <FiCheck size={14} /> Daily Checklists & Productivity
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why 100% Free Guarantee Section (Replaces Pricing) */}
            <section id="why-free" className="py-24 bg-white dark:bg-slate-900/40 border-t border-b border-slate-200 dark:border-white/5 relative transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <FiCheckCircle size={14} /> Zero Subscription Fees
                            </span>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                100% Free. No Subscriptions. No Gimmicks.
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
                                We believe personal financial clarity and self-discipline should never be locked behind a paywall. Every single feature in CASHAM is completely available to you from day one.
                            </p>

                            <div className="grid sm:grid-cols-3 gap-6 pt-6 text-left">
                                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
                                        ✓
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                                        All Modules Unlocked
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Full access to Credit Cards hub, gym routines, and unlimited tracking.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
                                        ✓
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                                        Zero Advertisements
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        No spam, no third-party banner ads, and no selling your personal data.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">
                                        ✓
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                                        Install as an App
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Add to home screen on iOS and Android with fast PWA offline support.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                                {isAuthenticated ? (
                                    <Link
                                        to="/dashboard"
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/25 transition-all text-center"
                                    >
                                        Open Your Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        to="/signup"
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/25 transition-all text-center"
                                    >
                                        Create Free Account Now
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="footer" className="pt-16 pb-12 border-t border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-slate-900/90 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        {/* Brand Column */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Logo size="md" />
                                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">CASHAM</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
                                The modern standard for personal finance, credit card intelligence, and daily performance tracking.
                            </p>
                        </div>

                        {/* Product Column */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-5 uppercase text-xs tracking-wider">Product</h4>
                            <ul className="space-y-3">
                                <li>
                                    <button
                                        onClick={() => scrollToSection('features')}
                                        className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors cursor-pointer"
                                    >
                                        Features
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection('modules')}
                                        className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors cursor-pointer"
                                    >
                                        Platform Modules
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection('why-free')}
                                        className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors cursor-pointer"
                                    >
                                        100% Free
                                    </button>
                                </li>
                                <li>
                                    <Link to="/login" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">
                                        Login
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Platform Resources */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-5 uppercase text-xs tracking-wider">Features</h4>
                            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                <li>Credit Cards & Advances</li>
                                <li>Gym & Muscle Tracker</li>
                                <li>Portfolio & Net Worth</li>
                                <li>Rent & Recurring Subscriptions</li>
                            </ul>
                        </div>

                        {/* Legal Column */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-5 uppercase text-xs tracking-wider">Legal & Privacy</h4>
                            <ul className="space-y-3">
                                <li>
                                    <Link to="/privacy" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/terms" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-200 dark:border-white/10 text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            &copy; 2026 Casham. All rights reserved. <span className="hidden md:inline mx-2">|</span> Developed by <span className="text-teal-600 dark:text-teal-400 font-semibold">Kogul Murugaiah</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
