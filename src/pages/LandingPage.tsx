import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LandingPage = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsAuthenticated(true);
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
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-3" onClick={() => window.scrollTo(0, 0)}>
                            <Logo size="md" />
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                CASHAM
                            </span>
                        </Link>
                        <div className="hidden md:flex items-center gap-6">
                            <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Features</button>
                            <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Pricing</button>
                            <button onClick={() => scrollToSection('footer')} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Support</button>
                        </div>
                    </div>
                    <div>
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2.5 rounded-full bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 transition-all border border-slate-700 hover:border-slate-600"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-95"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/20 text-blue-300 text-sm font-medium mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Smart Expense Tracking
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
                        Master Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                            Financial Life
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Effortlessly track expenses, visualize your spending habits, and securely manage your budget with Casham.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <Link
                                to="/signup"
                                className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40"
                            >
                                Get Started Free
                            </Link>
                        )}
                        <button
                            onClick={() => scrollToSection('features')}
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-800 text-slate-200 font-bold text-lg hover:bg-slate-700 transition-all border border-slate-700"
                        >
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-slate-900 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Casham?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Everything you need to take control of your personal finances.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">Smart Tracking</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Log items instantly with our intuitive interface. Categorize and tag expenses to understand exactly where your money goes.
                            </p>
                        </div>
                        {/* Feature 2 */}
                        <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">Visual Insights</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Beautiful charts and graphs transform your raw data into actionable insights for better financial decisions.
                            </p>
                        </div>
                        {/* Feature 3 */}
                        <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 text-indigo-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-100">Bank-Grade Security</h3>
                            <p className="text-slate-400 leading-relaxed">
                                Your data is encrypted and secure. We value your privacy and ensuring your financial information remains yours.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-800/30 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Choose the plan that fits your financial goals.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Free Plan */}
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-slate-600 transition-all">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-slate-100">Free</h3>
                                <p className="text-slate-400 text-sm mt-1">For individuals just starting out.</p>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">₹0</span>
                                <span className="text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Basic expense tracking
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Monthly summaries
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    1 User Account
                                </li>
                            </ul>
                            <Link to="/signup?plan=free" className="text-center w-full py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors border border-slate-700">
                                Start for Free
                            </Link>
                        </div>

                        {/* Basic Plan */}
                        <div className="bg-slate-900 border border-blue-500/30 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-blue-900/20">
                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">POPULAR</div>
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-blue-400">Basic</h3>
                                <p className="text-slate-400 text-sm mt-1">For serious budgeters.</p>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">₹499</span>
                                <span className="text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Everything in Free
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Advanced Visual Analytics
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Export to CSV/Excel
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Spending Goals
                                </li>
                            </ul>
                            <Link to="/signup?plan=basic" className="text-center w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                                Get Started
                            </Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-slate-600 transition-all">
                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-indigo-400">Pro</h3>
                                <p className="text-slate-400 text-sm mt-1">For power users & families.</p>
                            </div>
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">₹1199</span>
                                <span className="text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Everything in Basic
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Priority Support
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Multiple Users (Family)
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 text-sm">
                                    <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    API Access
                                </li>
                            </ul>
                            <Link to="/signup?plan=pro" className="text-center w-full py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors border border-slate-700">
                                Contact Sales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="footer" className="pt-16 pb-8 border-t border-slate-800 bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        {/* Brand Column */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Logo size="md" />
                                <span className="text-xl font-bold text-slate-100">CASHAM</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                The modern standard for expense management and financial tracking. Take control of your wealth today.
                            </p>
                        </div>

                        {/* Product Column */}
                        <div>
                            <h4 className="font-bold text-slate-100 mb-6">Product</h4>
                            <ul className="space-y-3">
                                <li><button onClick={() => scrollToSection('features')} className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Features</button></li>
                                <li><button onClick={() => scrollToSection('pricing')} className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Pricing</button></li>
                                <li><Link to="/login" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Login</Link></li>
                            </ul>
                        </div>

                        {/* Resources Column */}
                        <div>
                            <h4 className="font-bold text-slate-100 mb-6">Resources</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Documentation</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">API Reference</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Contact Support</a></li>
                            </ul>
                        </div>

                        {/* Legal Column */}
                        <div>
                            <h4 className="font-bold text-slate-100 mb-6">Legal</h4>
                            <ul className="space-y-3">
                                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800 text-center">
                        <p className="text-slate-500 text-sm">
                            &copy; 2026 Casham. All rights reserved. <span className="hidden md:inline mx-2">|</span> Developed by <span className="text-indigo-400">Kogul Murugaiah</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
