import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

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
                            <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer">Features</button>
                            <button onClick={() => scrollToSection('pricing')} className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer">Pricing</button>
                            <button onClick={() => scrollToSection('footer')} className="text-sm font-semibold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer">Support</button>
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
                                className="px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm transition-all shadow-sm"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95"
                            >
                                Login
                            </Link>
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
                                Intelligent Expense Tracking
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900 dark:text-white">
                                Master Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-green-400">
                                    Financial Life
                                </span>
                            </h1>
                            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed max-w-xl pr-4">
                                Effortlessly track expenses, visualize your spending habits, and securely manage your budget with Casham. A completely modern standard for personal finance.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 items-center sm:justify-start">
                                {isAuthenticated ? (
                                    <Link
                                        to="/dashboard"
                                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-600 text-white font-bold text-base sm:text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 text-center"
                                    >
                                        Go to Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        to="/signup"
                                        className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-600 text-white font-bold text-base sm:text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 text-center"
                                    >
                                        Start for Free
                                    </Link>
                                )}
                                <button
                                    onClick={() => scrollToSection('features')}
                                    className="w-full sm:w-auto px-8 py-4 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base sm:text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-white/10 shadow-sm cursor-pointer"
                                >
                                    See How it Works
                                </button>
                            </div>

                            {/* Trust badges */}
                            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-slate-700 dark:text-slate-300 font-semibold">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    100% Free & Secure
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    Bank-grade Encryption
                                </div>
                                <div className="flex items-center gap-2 hidden sm:flex">
                                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Instant Insights
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Dashboard Mockup */}
                        <div className="relative mx-auto w-full max-w-lg lg:max-w-[110%] xl:max-w-[120%] lg:ml-4 mt-8 lg:mt-0 xl:-mr-12">
                            {/* Decorative background glow behind the mockup */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-[80px] -z-10 rounded-full"></div>

                            {/* The Glass Mockup Frame */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-800/90 backdrop-blur-xl shadow-2xl shadow-emerald-950/10 dark:shadow-emerald-950/40 overflow-hidden transform lg:rotate-[-1.5deg] hover:rotate-0 transition-transform duration-500 hover:scale-[1.01]">
                                {/* Mockup Header */}
                                <div className="h-12 border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/60 flex items-center px-4 gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="h-6 max-w-[240px] bg-slate-200/70 dark:bg-slate-800 rounded mx-auto flex items-center px-2">
                                            <svg className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            <span className="text-[10px] text-slate-600 dark:text-slate-300 ml-1.5 font-semibold tracking-wider">app.casham.com</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mockup Body */}
                                <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-transparent">
                                    {/* Top stats row */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm">
                                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold tracking-wider">NET WORTH</div>
                                            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-2">₹1,24,500</div>
                                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400 px-2 py-0.5 rounded">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                                12.5%
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm">
                                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold tracking-wider">MONTHLY SPEND</div>
                                            <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-2">₹45,200</div>
                                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 px-2 py-0.5 rounded">
                                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                4.2%
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 shadow-sm col-span-2 sm:col-span-1">
                                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold tracking-wider flex justify-between">
                                                <span>SAVINGS GOAL</span>
                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">68%</span>
                                            </div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white mb-3">Emergency Fund</div>
                                            <div className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                                                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full w-[68%] relative">
                                                    <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_ease-in-out_infinite]"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart area */}
                                    <div className="h-48 sm:h-56 rounded-xl border border-slate-200/70 dark:border-white/5 bg-white dark:bg-slate-700/60 p-5 flex items-end gap-2 sm:gap-3 relative overflow-hidden shadow-sm">
                                        <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-10">
                                            <div className="text-xs font-bold tracking-wider text-slate-600 dark:text-slate-400">CASH FLOW TRACKING</div>
                                            <div className="flex gap-2">
                                                <div className="w-5 h-1.5 rounded bg-slate-200 dark:bg-slate-600"></div>
                                                <div className="w-5 h-1.5 rounded bg-slate-200 dark:bg-slate-600"></div>
                                                <div className="w-5 h-1.5 rounded bg-slate-200 dark:bg-slate-600"></div>
                                            </div>
                                        </div>

                                        {/* Chart Grid Lines */}
                                        <div className="absolute top-12 bottom-6 left-0 right-0 flex flex-col justify-between pointer-events-none px-5">
                                            <div className="w-full h-px bg-slate-100 dark:bg-white/5"></div>
                                            <div className="w-full h-px bg-slate-100 dark:bg-white/5"></div>
                                            <div className="w-full h-px bg-slate-100 dark:bg-white/5"></div>
                                            <div className="w-full h-px bg-slate-100 dark:bg-white/5"></div>
                                        </div>

                                        {/* Bars */}
                                        <div className="w-full h-[30%] bg-emerald-500/90 rounded-t border-t border-emerald-400 relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded transition-opacity hidden sm:block">Jun</div></div>
                                        <div className="w-full h-[60%] bg-teal-500/90 rounded-t border-t border-teal-400 relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded transition-opacity hidden sm:block">Jul</div></div>
                                        <div className="w-full h-[45%] bg-emerald-500/90 rounded-t border-t border-emerald-400 relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded transition-opacity hidden sm:block">Aug</div></div>
                                        <div className="w-full h-[85%] bg-teal-600/90 rounded-t border-t border-teal-400 relative group"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded transition-opacity hidden sm:block">Sep</div></div>
                                        <div className="w-full h-[35%] bg-emerald-500/90 rounded-t border-t border-emerald-400 relative group hidden sm:block"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded transition-opacity hidden sm:block">Oct</div></div>
                                        <div className="w-full h-[70%] bg-teal-500/90 rounded-t border-t border-teal-400 relative group hidden sm:block"><div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] px-2 py-1 rounded transition-opacity hidden sm:block">Nov</div></div>

                                        {/* Floating pill over chart */}
                                        <div className="absolute top-[40%] right-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200 dark:border-white/10 cursor-default">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute"></div>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 relative z-10"></div>
                                            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Live Sync</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white dark:bg-slate-900/50 border-t border-b border-slate-200/80 dark:border-white/5 relative transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Why Choose Casham?</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">Everything you need to take control of your personal finances.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-600/5 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Smart Tracking</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                Log items instantly with our intuitive interface. Categorize and tag expenses to understand exactly where your money goes.
                            </p>
                        </div>
                        {/* Feature 2 */}
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-600/5 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 text-teal-600 dark:text-teal-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Visual Insights</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                Beautiful charts and graphs transform your raw data into actionable insights for better financial decisions.
                            </p>
                        </div>
                        {/* Feature 3 */}
                        <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-600/5 transition-all group">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Bank-Grade Security</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                Your data is encrypted and secure. We value your privacy and ensuring your financial information remains yours.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-950 relative transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Simple, Transparent Pricing</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto">Choose the plan that fits your financial goals.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Free Plan */}
                        <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Free</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">For individuals just starting out.</p>
                            </div>
                            <div className="mb-6 flex items-baseline">
                                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹0</span>
                                <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-medium text-sm">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Basic expense tracking
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Monthly summaries
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    1 User Account
                                </li>
                            </ul>
                            <Link to="/signup?plan=free" className="text-center w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold transition-colors border border-slate-200 dark:border-white/10">
                                Start for Free
                            </Link>
                        </div>

                        {/* Basic Plan */}
                        <div className="bg-white dark:bg-slate-800/90 border-2 border-emerald-500 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-xl shadow-emerald-600/10">
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-bl-xl rounded-tr-2xl tracking-wider">POPULAR</div>
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Basic</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">For serious budgeters.</p>
                            </div>
                            <div className="mb-6 flex items-baseline">
                                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹499</span>
                                <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-medium text-sm">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Everything in Free
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Advanced Visual Analytics
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Export to CSV/Excel
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Spending Goals
                                </li>
                            </ul>
                            <Link to="/signup?plan=basic" className="text-center w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-600/25 transition-all">
                                Get Started
                            </Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 rounded-3xl p-8 flex flex-col hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400">Pro</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">For power users & families.</p>
                            </div>
                            <div className="mb-6 flex items-baseline">
                                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹1199</span>
                                <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-medium text-sm">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Everything in Basic
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Priority Support
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    Multiple Users (Family)
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    API Access
                                </li>
                            </ul>
                            <Link to="/signup?plan=pro" className="text-center w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold transition-colors border border-slate-200 dark:border-white/10">
                                Contact Sales
                            </Link>
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
                                The modern standard for expense management and financial tracking. Take control of your wealth today.
                            </p>
                        </div>

                        {/* Product Column */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-5 uppercase text-xs tracking-wider">Product</h4>
                            <ul className="space-y-3">
                                <li><button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors cursor-pointer">Features</button></li>
                                <li><button onClick={() => scrollToSection('pricing')} className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors cursor-pointer">Pricing</button></li>
                                <li><Link to="/login" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">Login</Link></li>
                            </ul>
                        </div>

                        {/* Resources Column */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-5 uppercase text-xs tracking-wider">Resources</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">Documentation</a></li>
                                <li><a href="#" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">API Reference</a></li>
                                <li><a href="#" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">Contact Support</a></li>
                            </ul>
                        </div>

                        {/* Legal Column */}
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-5 uppercase text-xs tracking-wider">Legal</h4>
                            <ul className="space-y-3">
                                <li><Link to="/privacy" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">Privacy Policy</Link></li>
                                <li><Link to="/terms" className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-sm transition-colors">Terms of Service</Link></li>
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
