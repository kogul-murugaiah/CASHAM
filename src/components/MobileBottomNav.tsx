import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Logo from "./Logo";

const mobileLinks = [
  { to: "/", label: "Dashboard", icon: HomeIcon },
  { to: "/add", label: "Expense", icon: MinusIcon },
  { to: "/add-income", label: "Income", icon: PlusIcon, fab: true },
];

// Helper function to get initials from email
const getInitials = (email: string): string => {
  const parts = email.split("@")[0].split(".");
  if (parts.length >= 2) {
    return parts.slice(0, 2).map(part => part.substring(0, 1).toUpperCase()).join('');
  }
  return parts[0].substring(0, 1).toUpperCase();
};

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  // Fetch user on mount and listen for auth changes
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close mobile sheet when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileSheetRef.current &&
        !mobileSheetRef.current.contains(event.target as Node)
      ) {
        setMobileSheetOpen(false);
      }
    };

    if (mobileSheetOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileSheetOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMobileSheetOpen(false);
    navigate("/login");
  };

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 pb-[max(env(safe-area-inset-bottom),14px)]">
        <div className="mx-auto mb-3 flex max-w-md items-center justify-between gap-1 rounded-3xl bg-[#0F172A]/80 px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl ring-1 ring-slate-800/80">
          {mobileLinks.map(({ to, label, icon: Icon, fab }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all duration-200",
                  isActive
                    ? "text-blue-300 scale-105"
                    : "text-slate-400 hover:text-slate-200",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "grid place-items-center rounded-2xl border text-sm transition-all",
                      isActive
                        ? "border-blue-500/60 bg-blue-500/10 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                        : "border-slate-800 bg-[#0F172A] text-slate-300",
                      fab ? "h-12 w-12" : "h-11 w-11",
                    ].join(" ")}
                  >
                    <Icon active={isActive} />
                  </span>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* Profile button */}
          {!loading && user && (
            <button
              onClick={() => setMobileSheetOpen(true)}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all duration-200 text-slate-400 hover:text-slate-200"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-800 bg-[#0F172A] text-slate-300 transition-all">
                <ProfileIcon />
              </span>
              <span className="leading-none">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Profile Bottom Sheet */}
      {mobileSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            ref={mobileSheetRef}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl bg-slate-900/90 backdrop-blur-xl shadow-2xl ring-1 ring-slate-700/80 md:hidden pb-[max(env(safe-area-inset-bottom),0px)]"
            style={{
              animation: "slideUp 0.3s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Drag handle */}
              <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-600"></div>

              {/* User Info */}
              {user && (
                <>
                  <div className="mb-6 flex flex-col items-center">
                    <Logo size="md" className="mb-4" />
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-lg">
                      {getInitials(user.email || "")}
                    </div>
                    <p className="text-xs font-medium text-slate-300 mb-1">Signed in as</p>
                    <p className="text-base font-semibold text-slate-100 text-center break-all">
                      {user.email}
                    </p>
                  </div>

                  <div className="my-4 border-t border-slate-700"></div>

                  {/* Monthly Tracking Button */}
                  <button
                    onClick={() => {
                      navigate("/monthly");
                      setMobileSheetOpen(false);
                    }}
                    className="w-full rounded-xl bg-slate-800/50 px-6 py-4 text-base font-semibold text-slate-200 transition duration-200 active:bg-slate-700/50 mb-3"
                  >
                    Monthly Tracking
                  </button>

                  {/* Yearly Tracking Button */}
                  <button
                    onClick={() => {
                      navigate("/yearly");
                      setMobileSheetOpen(false);
                    }}
                    className="w-full rounded-xl bg-slate-800/50 px-6 py-4 text-base font-semibold text-slate-200 transition duration-200 active:bg-slate-700/50 mb-3"
                  >
                    Yearly Tracking
                  </button>

                  {/* Edit Expenses Button */}
                  <button
                    onClick={() => {
                      navigate("/expenses");
                      setMobileSheetOpen(false);
                    }}
                    className="w-full rounded-xl bg-slate-800/50 px-6 py-4 text-base font-semibold text-slate-200 transition duration-200 active:bg-slate-700/50 mb-3"
                  >
                    Edit Expenses
                  </button>

                  {/* Edit Income Button */}
                  <button
                    onClick={() => {
                      navigate("/income-editor");
                      setMobileSheetOpen(false);
                    }}
                    className="w-full rounded-xl bg-slate-800/50 px-6 py-4 text-base font-semibold text-slate-200 transition duration-200 active:bg-slate-700/50 mb-3"
                  >
                    Edit Income
                  </button>

                  {/* Back to Dashboard Button */}
                  <button
                    onClick={() => {
                      navigate("/");
                      setMobileSheetOpen(false);
                    }}
                    className="w-full rounded-xl bg-slate-800/50 px-6 py-4 text-base font-semibold text-slate-200 transition duration-200 active:bg-slate-700/50 mb-3"
                  >
                    Back to Dashboard
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-xl bg-red-600/30 px-6 py-4 text-base font-semibold text-red-300 transition duration-200 active:bg-red-600/40"
                  >
                    Logout
                  </button>

                  {/* Copyright */}
                  <div className="my-4 border-t border-slate-700 pt-4">
                    <p className="text-center text-xs text-slate-500">
                      Copyright © 2026 CASHAM. All Rights Reserved.
                    </p>
                    <p className="text-center text-xs text-slate-600">
                      Developed and maintained by Kogul Murugaiah
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-blue-600" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function PlusIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-blue-600" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function MinusIcon({ active }: { active?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? "text-blue-600" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default MobileBottomNav;
