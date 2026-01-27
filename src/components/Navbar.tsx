import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import Logo from "./Logo";

const desktopLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/add", label: "Add Expense" },
  { to: "/add-income", label: "Add Income" },
  { to: "/monthly", label: "Monthly" },
  { to: "/yearly", label: "Yearly" },
  { to: "/expenses", label: "Expenses" },
  { to: "/income-editor", label: "Income" },
];

// Helper function to get user initials from email
const getInitials = (email: string): string => {
  const parts = email.split("@")[0];
  if (parts.length >= 2) {
    return parts.substring(0, 2).toUpperCase();
  }
  return parts.substring(0, 1).toUpperCase();
};

// Helper function to truncate email
const truncateEmail = (email: string, maxLength: number = 20): string => {
  if (email.length <= maxLength) return email;
  return email.substring(0, maxLength - 3) + "...";
};

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(event.target as Node)
      ) {
        setDesktopDropdownOpen(false);
      }
    };

    if (desktopDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [desktopDropdownOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDesktopDropdownOpen(false);
    navigate("/");
  };

  return (
    <nav className="glass-nav border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <Logo size="md" />
            <span className="text-xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden md:block">
              CASHAM
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop Links - NO WRAP to prevent layout breakage */}
            <ul className="flex items-center gap-1 lg:gap-2">
              {desktopLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      [
                        "rounded-full px-3 py-2 text-sm font-semibold transition duration-200 whitespace-nowrap",
                        isActive
                          ? "bg-slate-700/50 text-white shadow-sm border border-white/10"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                      ].join(" ")
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* User Profile Dropdown */}
            {!loading && user && (
              <div className="relative" ref={desktopDropdownRef}>
                <button
                  onClick={() => setDesktopDropdownOpen(!desktopDropdownOpen)}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-400 transition duration-200 hover:bg-slate-800/50 hover:text-white"
                  aria-label="User menu"
                  aria-expanded={desktopDropdownOpen}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-sm ring-2 ring-slate-900">
                    {getInitials(user.email || "")}
                  </div>
                  <span className="hidden sm:inline-block">
                    {truncateEmail(user.email || "")}
                  </span>
                  <svg
                    className={`h-4 w-4 transition-transform ${desktopDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {desktopDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/90 shadow-xl ring-1 ring-white/10 backdrop-blur-xl animate-fade-in">
                    <div className="p-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-sm ring-2 ring-white/5">
                          {getInitials(user.email || "")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400">Signed in as</p>
                          <p className="truncate text-sm font-semibold text-slate-200">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="my-3 border-t border-white/5"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition duration-200 hover:bg-red-500/20"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
