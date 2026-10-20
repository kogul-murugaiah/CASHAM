import { useTheme } from "../contexts/ThemeContext";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiShield } from "react-icons/fi";

const PrivacyPolicy = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 mb-8 text-sm font-semibold transition-colors ${
            isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"
          }`}
        >
          <FiArrowLeft size={16} /> Back to CASHAM
        </Link>

        <div className={`p-8 md:p-12 rounded-3xl border shadow-xl ${
          isDark ? "bg-slate-800/60 border-white/10" : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <FiShield size={28} />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold font-heading">Privacy Policy</h1>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Last Updated: October 20, 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-bold mb-2">1. Overview</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                Welcome to <strong>CASHAM</strong> ("we", "our", or "us"), accessible from <strong>casham.site</strong>. CASHAM is a personal financial tracking and habit management web application designed to help you manage your personal budget, expenses, investments, and routines. We take your privacy seriously and are committed to protecting your personal data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">2. Information We Collect</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                When you use CASHAM, we may collect the following information:
              </p>
              <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <li><strong>Account Information:</strong> When signing in with Google, we receive basic profile details including your name, email address, and avatar image via Google OAuth 2.0.</li>
                <li><strong>User-Entered Financial Data:</strong> Income, expense amounts, categories, account types, budget goals, habit completions, and investment records that you voluntarily input into the application.</li>
                <li><strong>Cookies and Session Tokens:</strong> Secure, encrypted authentication cookies used solely to maintain your login session.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">3. How We Use Your Information</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                We strictly use your information for the following purposes:
              </p>
              <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <li>To authenticate your identity and provide secure access to your account.</li>
                <li>To calculate budgets, financial analytics, heatmaps, and streak tracking.</li>
                <li>To store your personal records securely in our database backend (Supabase).</li>
                <li><strong>We do NOT sell, rent, or trade your personal or financial data to any third parties or advertisers.</strong></li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">4. Google User Data & OAuth Compliance</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                CASHAM's use of information received from Google APIs adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements. We only access standard Google user profile information (email and name) to identify your account. We do not access your Google Drive, Gmail, or any other private Google services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">5. Data Security & Storage</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                All financial data and account credentials are encrypted in transit via SSL/TLS and stored securely in our enterprise-grade database (Supabase) with strict Row-Level Security (RLS) policies. Only you have access to your personal financial records.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">6. Your Rights & Data Deletion</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                You retain complete control over your data. You may export your records to CSV/Excel at any time from the Settings page. You can request complete deletion of your account and associated financial data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">7. Contact Us</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                If you have any questions or concerns regarding this Privacy Policy or your personal data, you can reach the developer at:
                <br />
                <strong>Email:</strong> <a href="mailto:koguldev7@gmail.com" className="text-emerald-500 hover:underline">koguldev7@gmail.com</a>
                <br />
                <strong>Website:</strong> <a href="https://casham.site" className="text-emerald-500 hover:underline">https://casham.site</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
