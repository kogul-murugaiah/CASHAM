import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
    FiArrowLeft,
    FiCode,
    FiCopy,
    FiCheck,
    FiSun,
    FiMoon,
    FiSearch,
    FiShield
} from 'react-icons/fi';
import Logo from '../components/Logo';

interface EndpointDoc {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    tag: 'Expenses' | 'Credit Cards' | 'CC Advances' | 'Gym Tracker' | 'Income' | 'Auth';
    title: string;
    description: string;
    params?: { name: string; type: string; required: boolean; desc: string }[];
    requestBody?: object;
    responseBody: object;
}

const endpoints: EndpointDoc[] = [
    {
        method: 'GET',
        path: '/api/auth/user',
        tag: 'Auth',
        title: 'Get Current Authenticated User',
        description: 'Retrieves session metadata, user profile email, display name, and avatar.',
        responseBody: {
            user: {
                id: "usr_94bca120",
                email: "user@example.com",
                user_metadata: {
                    full_name: "Kogul Murugaiah",
                    avatar_url: "https://lh3.googleusercontent.com/..."
                }
            }
        }
    },
    {
        method: 'GET',
        path: '/api/expenses',
        tag: 'Expenses',
        title: 'Query Expense Ledger',
        description: 'Fetch filtered personal expenses within a date window or credit card status.',
        params: [
            { name: 'startDate', type: 'string (YYYY-MM-DD)', required: false, desc: 'Earliest transaction date' },
            { name: 'endDate', type: 'string (YYYY-MM-DD)', required: false, desc: 'Latest transaction date' },
            { name: 'creditCardOnly', type: 'boolean', required: false, desc: 'Filter strictly CC transactions' },
            { name: 'settled', type: 'boolean', required: false, desc: 'Filter by CC bill settlement status' }
        ],
        responseBody: [
            {
                id: "exp_1094",
                amount: 1450,
                date: "2026-11-03",
                item: "Team Dinner",
                category_id: 4,
                account_type: "Credit Card",
                paid_via_credit_card: true,
                credit_card_name: "HDFC Regalia",
                cc_bill_settled: false,
                categories: { id: 4, name: "Food & Dining" }
            }
        ]
    },
    {
        method: 'POST',
        path: '/api/expenses',
        tag: 'Expenses',
        title: 'Create Personal Expense (With Friend Splits)',
        description: 'Records a new transaction. If friend splits are supplied on a CC payment, CASHAM automatically spawns CC advances for each friend.',
        requestBody: {
            amount: 3000,
            date: "2026-11-03",
            item: "Concert Tickets",
            category_id: 3,
            account_type: "Credit Card",
            paid_via_credit_card: true,
            credit_card_id: "cc_7819",
            credit_card_name: "ICICI Sapphiro",
            splits: [
                { person_name: "Rahul", amount: 1000 },
                { person_name: "Priya", amount: 1000 }
            ]
        },
        responseBody: {
            id: "exp_1095",
            amount: 1000, // Your personal share after deducting splits
            item: "Concert Tickets",
            paid_via_credit_card: true,
            credit_card_name: "ICICI Sapphiro"
        }
    },
    {
        method: 'GET',
        path: '/api/cc-advances',
        tag: 'CC Advances',
        title: 'List Outstanding CC Advances',
        description: 'Retrieves all swipes made on behalf of friends, including cash repayment status.',
        params: [
            { name: 'credit_card_id', type: 'string', required: false, desc: 'Filter by specific card' }
        ],
        responseBody: [
            {
                id: "adv_8201",
                person_name: "Rahul",
                amount: 1500,
                credit_card_name: "HDFC Regalia",
                date: "2026-11-02",
                description: "Swiped for electronics",
                cash_received: false,
                cash_received_date: null
            }
        ]
    },
    {
        method: 'POST',
        path: '/api/cc-advances',
        tag: 'CC Advances',
        title: 'Log New Credit Card Advance',
        description: 'Directly logs an amount swiped for someone else without inflating personal expenses.',
        requestBody: {
            person_name: "Arun",
            amount: 2200,
            credit_card_id: "cc_4401",
            credit_card_name: "SBI Prime",
            date: "2026-11-03",
            description: "Flight booking"
        },
        responseBody: {
            id: "adv_8202",
            person_name: "Arun",
            amount: 2200,
            cash_received: false
        }
    },
    {
        method: 'POST',
        path: '/api/credit-cards/settle-by-date',
        tag: 'Credit Cards',
        title: 'Smart Statement Settlement',
        description: 'Reconciles and marks all unsettled expenses and advances up to the statement cut-off date as settled in a single atomic transaction.',
        requestBody: {
            credit_card_id: "cc_7819",
            cutoff_date: "2026-10-20",
            settlement_date: "2026-11-03",
            actual_statement_amount: 14250,
            notes: "October statement paid via netbanking"
        },
        responseBody: {
            success: true,
            settlement_id: "settle_5502",
            expenses_settled_count: 14,
            advances_settled_count: 3,
            total_reconciled: 14250
        }
    },
    {
        method: 'GET',
        path: '/api/gym/routines',
        tag: 'Gym Tracker',
        title: 'List Training Routines by Muscle',
        description: 'Fetches customized or preset routines across all 7 muscle groups.',
        responseBody: [
            {
                id: "rt_chest_01",
                name: "Chest Day",
                target_muscle: "chest",
                exercises: [
                    { exercise_name: "Incline Barbell Bench Press", target_sets: 4, target_reps: "8-10", rest_seconds: 90 },
                    { exercise_name: "Flat Dumbbell Press", target_sets: 3, target_reps: "10-12", rest_seconds: 90 }
                ]
            }
        ]
    },
    {
        method: 'POST',
        path: '/api/gym/sets',
        tag: 'Gym Tracker',
        title: 'Batch Log Completed Sets & Calculate PRs',
        description: 'Submits completed workout sets in a single batch, automatically checking against all-time personal records (PRs).',
        requestBody: {
            workout_id: "wo_8820",
            batch: [
                { exercise_id: "ex_bench", set_number: 1, weight_kg: 85, reps: 8, is_warmup: false },
                { exercise_id: "ex_bench", set_number: 2, weight_kg: 90, reps: 6, is_warmup: false }
            ]
        },
        responseBody: {
            success: true,
            sets_logged: 2,
            prs: [
                { exercise_name: "Flat Barbell Bench Press", weight_kg: 90, reps: 6, previous_pr: 87.5 }
            ]
        }
    }
];

const ApiReference = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('All');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const tags = ['All', 'Auth', 'Expenses', 'Credit Cards', 'CC Advances', 'Gym Tracker'];

    const filteredEndpoints = endpoints.filter((ep) => {
        const matchesTag = selectedTag === 'All' || ep.tag === selectedTag;
        const matchesSearch =
            ep.path.toLowerCase().includes(search.toLowerCase()) ||
            ep.title.toLowerCase().includes(search.toLowerCase()) ||
            ep.description.toLowerCase().includes(search.toLowerCase());
        return matchesTag && matchesSearch;
    });

    const copyCode = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const getMethodBadge = (method: string) => {
        switch (method) {
            case 'GET':
                return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
            case 'POST':
                return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
            case 'PUT':
                return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
            case 'DELETE':
                return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
            default:
                return 'bg-slate-500/15 text-slate-400';
        }
    };

    return (
        <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors ${
            isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
        }`}>
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
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
                                    API Reference
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono font-bold">
                                        REST v1
                                    </span>
                                </h1>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Data contracts & backend endpoint specifications
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/docs"
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                                isDark
                                    ? 'border-white/10 text-slate-300 hover:text-emerald-400 hover:bg-slate-850'
                                    : 'border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-slate-100'
                            }`}
                        >
                            Documentation
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

                {/* Explanation Banner: What is an API Reference? */}
                <div className={`p-6 rounded-3xl border flex items-start gap-4 ${
                    isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                        <FiCode size={20} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            What is the CASHAM API Reference?
                        </h2>
                        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            The API Reference documents the internal REST endpoints that power the CASHAM client application. It specifies URL paths, required HTTP methods, query filters, and JSON data schemas. Developers and power users can use these endpoints to understand system architecture or build custom personal automations.
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="space-y-4">
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by endpoint path, method, or keyword (e.g. expenses, settle, advances)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-medium outline-none transition-all ${
                                isDark
                                    ? 'bg-slate-900 border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm'
                            }`}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {tags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedTag === tag
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                        : isDark
                                        ? 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Endpoints List */}
                <div className="space-y-6">
                    {filteredEndpoints.length === 0 ? (
                        <div className={`py-16 text-center rounded-3xl border ${
                            isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-200 bg-white'
                        }`}>
                            <p className="text-sm text-slate-400">No endpoints found matching "{search}".</p>
                        </div>
                    ) : (
                        filteredEndpoints.map((ep, idx) => (
                            <div
                                key={`${ep.method}-${ep.path}`}
                                className={`p-6 sm:p-8 rounded-3xl border transition-all ${
                                    isDark
                                        ? 'bg-slate-900/70 border-white/10 hover:border-white/20'
                                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className={`px-3 py-1 rounded-xl text-xs font-mono font-extrabold ${getMethodBadge(ep.method)}`}>
                                            {ep.method}
                                        </span>
                                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                            {ep.path}
                                        </span>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                                        {ep.tag}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                                    {ep.title}
                                </h3>
                                <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {ep.description}
                                </p>

                                {/* Query Parameters Table */}
                                {ep.params && ep.params.length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                            Query Parameters
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead>
                                                    <tr className={`border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                                                        <th className="py-2 pr-3 font-semibold">Param</th>
                                                        <th className="py-2 px-3 font-semibold">Type</th>
                                                        <th className="py-2 px-3 font-semibold">Requirement</th>
                                                        <th className="py-2 pl-3 font-semibold">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                                                    {ep.params.map((p) => (
                                                        <tr key={p.name}>
                                                            <td className="py-2 pr-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                {p.name}
                                                            </td>
                                                            <td className="py-2 px-3 font-mono text-slate-500">{p.type}</td>
                                                            <td className="py-2 px-3">
                                                                {p.required ? (
                                                                    <span className="text-rose-500 font-bold">Required</span>
                                                                ) : (
                                                                    <span className="text-slate-400">Optional</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 pl-3 text-slate-600 dark:text-slate-300">{p.desc}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Code Samples Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {ep.requestBody && (
                                        <div>
                                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                                <span>Request Payload (JSON)</span>
                                                <button
                                                    onClick={() => copyCode(JSON.stringify(ep.requestBody, null, 2), idx)}
                                                    className="flex items-center gap-1 text-[11px] hover:text-white text-slate-400 transition-colors"
                                                >
                                                    {copiedIndex === idx ? <FiCheck className="text-emerald-400" /> : <FiCopy />} Copy
                                                </button>
                                            </div>
                                            <pre className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                                                {JSON.stringify(ep.requestBody, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    <div className={ep.requestBody ? '' : 'md:col-span-2'}>
                                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                            <span>200 OK Response (JSON)</span>
                                            <button
                                                onClick={() => copyCode(JSON.stringify(ep.responseBody, null, 2), idx + 100)}
                                                className="flex items-center gap-1 text-[11px] hover:text-white text-slate-400 transition-colors"
                                            >
                                                {copiedIndex === idx + 100 ? <FiCheck className="text-emerald-400" /> : <FiCopy />} Copy
                                            </button>
                                        </div>
                                        <pre className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                                            {JSON.stringify(ep.responseBody, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Authentication Note */}
                <div className={`p-6 rounded-3xl border flex items-center gap-4 ${
                    isDark ? 'bg-slate-900/60 border-white/5' : 'bg-slate-100/70 border-slate-200'
                }`}>
                    <FiShield size={22} className="text-emerald-500 shrink-0" />
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        All API requests require an active authenticated Google session token or session cookie. Unauthorized requests return <code className="px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 font-mono">401 Unauthorized</code>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ApiReference;
