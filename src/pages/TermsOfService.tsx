import { useTheme } from "../contexts/ThemeContext";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiFileText } from "react-icons/fi";

const TermsOfService = () => {
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
              <FiFileText size={28} />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold font-heading">Terms of Service</h1>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Last Updated: October 20, 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-bold mb-2">1. Agreement to Terms</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                By accessing or using <strong>CASHAM</strong> (hosted at <strong>casham.site</strong>), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">2. Use of Service</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                CASHAM provides personal expense tracking, budgeting, and routine habit management tools for personal informational purposes only. It is not an official financial advisory, banking, or brokerage service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">3. User Accounts</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-2">4. Contact Information</h2>
              <p className={isDark ? "text-slate-300" : "text-slate-600"}>
                Questions regarding these Terms can be sent to:
                <br />
                <strong>Email:</strong> <a href="mailto:koguldev7@gmail.com" className="text-emerald-500 hover:underline">koguldev7@gmail.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
