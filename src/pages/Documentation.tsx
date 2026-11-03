import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
    FiArrowLeft,
    FiBookOpen,
    FiCreditCard,
    FiActivity,
    FiDollarSign,
    FiTrendingUp,
    FiCalendar,
    FiCheckSquare,
    FiShield,
    FiSearch,
    FiSun,
    FiMoon,
    FiExternalLink
} from 'react-icons/fi';
import Logo from '../components/Logo';

interface DocSection {
    id: string;
    title: string;
    icon: any;
    category: 'Finance' | 'Credit Cards' | 'Fitness' | 'Productivity' | 'Security';
    summary: string;
    content: React.ReactNode;
}

const Documentation = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const sections: DocSection[] = [
        {
            id: 'getting-started',
            title: 'Getting Started & Architecture',
            icon: FiBookOpen,
            category: 'Finance',
            summary: 'How CASHAM organizes your daily life and personal finances with zero subscription fees.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        CASHAM is an all-in-one personal finance, credit card intelligence, habit manager, and fitness tracker. Designed with a privacy-first mindset, your data is stored securely without third-party tracking or advertising networks.
                    </p>
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                        <strong>100% Free Forever:</strong> Every feature in CASHAM—including statement settlement, multi-account splits, and gym PR tracking—is completely unlocked for all users.
                    </div>
                    <h4 className="font-bold text-base mt-4 text-slate-900 dark:text-white">Core Navigation</h4>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><strong>Dashboard:</strong> High-level view of your current month spend, net worth, active credit card dues, and recent activity.</li>
                        <li><strong>Expense Tracker:</strong> View, filter, and search all your outgoing transactions by date, category, and payment account.</li>
                        <li><strong>Income Tracker:</strong> Log salary, freelance pay, dividends, and other incoming revenue streams.</li>
                        <li><strong>Credit Cards:</strong> Manage individual cards, track swipes made for friends, and reconcile statements by date.</li>
                        <li><strong>Gym Tracker:</strong> Log completed workouts across 7 muscle groups, run live rest timers, and break Personal Records.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'expenses-income',
            title: 'Expense & Income Tracking',
            icon: FiDollarSign,
            category: 'Finance',
            summary: 'Log transactions, split bills with friends, and save recurring templates.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        Every expense in CASHAM connects to a spending category and an account type (e.g., Salary Account, Cash, Credit Card).
                    </p>
                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">Friend Split Purchases</h4>
                    <p>
                        When paying for a group meal or booking tickets on your credit card:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>In <strong>Add Expense</strong>, toggle <strong>"Split with Friends"</strong>.</li>
                        <li>Add friend names and their respective share amounts.</li>
                        <li>CASHAM deducts only <em>your personal share</em> from your expense budget and automatically creates a <strong>CC Advance</strong> for each friend so you know exactly who owes you money.</li>
                    </ol>

                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">Quick Expense Templates</h4>
                    <p>
                        If you frequently make similar payments (e.g. Daily Coffee, Metro Pass), check <strong>"Save as Template"</strong>. You can load these templates in 1 click from the quick action bar on your dashboard.
                    </p>
                </div>
            )
        },
        {
            id: 'credit-cards-hub',
            title: 'Credit Cards Hub & Statement Settlement',
            icon: FiCreditCard,
            category: 'Credit Cards',
            summary: 'Track dues per card, manage CC advances, and settle bills by date without double deductions.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        Credit cards often cause confusion when swiping on behalf of friends or paying bills after the statement period closes. CASHAM solves this with a two-tier tracking system:
                    </p>
                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">1. CC Advances (Swipes for Others)</h4>
                    <p>
                        When you pay for someone else with your card, log it under <strong>CC Advances</strong>. It is tracked under your card's outstanding balance, but <em>does not count as your personal expense</em>.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Mark Cash Received:</strong> When your friend pays you back, toggle "Cash Received" to confirm repayment.</li>
                        <li><strong>Move to Transactions:</strong> If you decide to absorb the expense yourself, click the <strong>↗ Move to Transactions</strong> button. You can pick the category, and the entry will seamlessly convert into a personal expense and delete from advances.</li>
                    </ul>

                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">2. Smart "Settle by Date" Statement Reconciler</h4>
                    <p>
                        When your credit card statement arrives, click <strong>"Settle Statement"</strong> in the header:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                        <li>Select your card and enter your statement cut-off date (e.g. Oct 20).</li>
                        <li>CASHAM automatically gathers all unsettled card expenses and advances up to that exact date.</li>
                        <li>Confirming the settlement marks the entire statement period as paid and archives it to <strong>Settlement History</strong> without double-deducting your cash accounts.</li>
                    </ol>
                </div>
            )
        },
        {
            id: 'investments-portfolio',
            title: 'Investments & Net Worth Portfolio',
            icon: FiTrendingUp,
            category: 'Finance',
            summary: 'Consolidate mutual funds, equities, gold, and liquid emergency reserves.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        Get a clear, unvarnished picture of your total wealth. In the <strong>Portfolio</strong> and <strong>Fund Tracker</strong> pages, you can track:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><strong>Mutual Funds & Stocks:</strong> Invested amounts, current market value, and unrealized gains.</li>
                        <li><strong>Gold & Sovereign Holdings:</strong> Physical gold or digital gold grams with current valuation.</li>
                        <li><strong>Emergency Funds:</strong> High-liquidity reserves kept aside for unforeseen events.</li>
                    </ul>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Net worth updates dynamically on your primary Dashboard as you log new contributions or adjust asset valuations.
                    </p>
                </div>
            )
        },
        {
            id: 'rent-budget',
            title: 'Rent, Subscriptions & Budget Caps',
            icon: FiCalendar,
            category: 'Finance',
            summary: 'Month-by-month rent ledger and recurring subscription cost monitors.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">Rent Tracker</h4>
                    <p>
                        Keep an auditable, timestamped ledger of rent payments, utility splits, and landlord receipts so you never lose proof of monthly housing expenses.
                    </p>
                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">Repeating Expenses & Subscriptions</h4>
                    <p>
                        Track recurring monthly subscriptions (Netflix, Spotify, Cloud Storage, Gym Memberships). Set custom billing cycles and view your projected yearly subscription overhead.
                    </p>
                </div>
            )
        },
        {
            id: 'gym-fitness',
            title: 'Gym Tracker & PR Trophy Wall',
            icon: FiActivity,
            category: 'Fitness',
            summary: '7 muscle routines, live workout stopwatch with rest timers, and PR records.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        Fitness and health directly impact your daily energy and discipline. CASHAM includes a dedicated fitness module built around muscle group mastery:
                    </p>
                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">Individual Muscle Routines</h4>
                    <p>
                        Routines are organized across 7 core muscle groups:
                    </p>
                    <div className="flex flex-wrap gap-2 my-2">
                        {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'].map((m) => (
                            <span key={m} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                {m}
                            </span>
                        ))}
                    </div>
                    <p>
                        Whether you follow a traditional Bro Split, Push-Pull-Legs, or Upper-Lower, you can customize exercises, target sets, and rep ranges for each muscle group.
                    </p>
                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">Live Workout & Rest Timers</h4>
                    <p>
                        Start a live workout to track sets in real-time. Each completed set triggers an automatic rest stopwatch (e.g. 60s or 90s) with audio cues so you stay focused between heavy lifts.
                    </p>
                    <h4 className="font-bold text-base mt-3 text-slate-900 dark:text-white">Personal Record (PR) Trophy Wall</h4>
                    <p>
                        Whenever you record an all-time max weight on working sets, CASHAM unlocks a trophy record and celebrates your personal record on your trophy wall.
                    </p>
                </div>
            )
        },
        {
            id: 'task-tracker',
            title: 'Task Manager & Habit Checklists',
            icon: FiCheckSquare,
            category: 'Productivity',
            summary: 'Stay organized with daily checklists, priority flags, and completion meters.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        Maintain daily personal effectiveness alongside your finances:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><strong>Priority Management:</strong> Mark tasks as High, Medium, or Low priority.</li>
                        <li><strong>Daily Habit Progress:</strong> Visual progress circles indicate your daily checklist completion percentage.</li>
                        <li><strong>Category Tags:</strong> Group tasks under Personal, Work, Fitness, or Finance.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 'privacy-security',
            title: 'Privacy & Data Ownership',
            icon: FiShield,
            category: 'Security',
            summary: 'Bank-grade database security, Google OAuth, and full Excel/CSV export options.',
            content: (
                <div className="space-y-4 text-sm leading-relaxed">
                    <p>
                        Your financial records and workout logs are strictly yours. CASHAM operates on these non-negotiable principles:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li><strong>Zero Advertising:</strong> We never monetize your attention or sell transaction logs to marketing brokers.</li>
                        <li><strong>Export Anytime:</strong> Go to <strong>Settings</strong> at any point to download your complete data archive as a structured CSV or Excel workbook.</li>
                        <li><strong>Row-Level Security:</strong> All records are locked via cryptographic user ID boundaries in the database.</li>
                    </ul>
                </div>
            )
        }
    ];

    const categories = ['All', 'Finance', 'Credit Cards', 'Fitness', 'Productivity', 'Security'];

    const filteredSections = sections.filter((s) => {
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        const matchesSearch =
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.summary.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors ${
            isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
        }`}>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/"
                            className={`p-2 rounded-xl border transition-colors flex items-center justify-center ${
                                isDark
                                    ? 'border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
                                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                            title="Back to Landing Page"
                        >
                            <FiArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <Logo size="md" />
                            <div>
                                <h1 className="text-2xl font-black font-heading tracking-tight flex items-center gap-2">
                                    CASHAM Docs
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono font-bold">
                                        v1.2.0
                                    </span>
                                </h1>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Comprehensive guide to mastering your money, habits, and fitness
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/api-docs"
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                                isDark
                                    ? 'border-white/10 text-slate-300 hover:text-emerald-400 hover:bg-slate-850'
                                    : 'border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-slate-100'
                            }`}
                        >
                            API Reference <FiExternalLink size={13} />
                        </Link>
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-xl border transition-colors ${
                                isDark
                                    ? 'border-white/10 text-amber-400 hover:bg-slate-800'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
                        </button>
                    </div>
                </div>

                {/* Search & Category Filter */}
                <div className="space-y-4">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search guides, modules, or features (e.g. credit cards, gym, split, settlement)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-medium outline-none transition-all ${
                                isDark
                                    ? 'bg-slate-900 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm'
                            }`}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedCategory === cat
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                        : isDark
                                        ? 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Documentation Sections */}
                <div className="space-y-6">
                    {filteredSections.length === 0 ? (
                        <div className={`py-16 text-center rounded-3xl border ${
                            isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-white'
                        }`}>
                            <p className="text-sm text-slate-400">No documentation guides match "{search}".</p>
                        </div>
                    ) : (
                        filteredSections.map((sec) => {
                            const IconComponent = sec.icon;
                            return (
                                <section
                                    key={sec.id}
                                    id={sec.id}
                                    className={`p-6 sm:p-8 rounded-3xl border transition-all ${
                                        isDark
                                            ? 'bg-slate-900/70 border-white/10 hover:border-white/20'
                                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                            <IconComponent size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                    {sec.category}
                                                </span>
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold font-heading mt-1 text-slate-900 dark:text-white">
                                                {sec.title}
                                            </h2>
                                            <p className={`text-xs sm:text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {sec.summary}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`pt-4 border-t ${isDark ? 'border-white/5 text-slate-300' : 'border-slate-100 text-slate-600'}`}>
                                        {sec.content}
                                    </div>
                                </section>
                            );
                        })
                    )}
                </div>

                {/* Footer Help CTA */}
                <div className={`p-8 rounded-3xl border text-center space-y-4 ${
                    isDark ? 'bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200/80'
                }`}>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Have Questions or Need Help?
                    </h3>
                    <p className={`text-xs sm:text-sm max-w-lg mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        CASHAM is maintained with care. If you have an inquiry, feature request, or encountered a bug, feel free to reach out directly.
                    </p>
                    <a
                        href={`mailto:koguldev7@gmail.com?subject=${encodeURIComponent('[CASHAM Support] Inquiry / Feedback')}&body=${encodeURIComponent(
                            'Hi Kogul,\n\nI have a question/suggestion regarding CASHAM:\n\n[Please enter your message here]\n\n---\nApp Version: 1.2.0\n'
                        )}`}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all"
                    >
                        Email Support Team
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Documentation;
