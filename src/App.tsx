/*
 * Expense Tracker Application
 * Copyright (c) 2026 kogulmurugaiah
 * All rights reserved.
 * 
 * Developer: kogulmurugaiah
 * Description: A comprehensive expense tracking application with dark theme UI
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import { Suspense, lazy } from 'react';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';

// Lazy-loaded components for route-based code splitting
const AddExpense = lazy(() => import('./pages/AddExpense'));
const AddIncome = lazy(() => import('./pages/AddIncome'));
const ExpenseTracking = lazy(() => import('./pages/ExpenseTracking'));
const IncomeTracking = lazy(() => import('./pages/IncomeTracking'));
const AddInvestment = lazy(() => import('./pages/AddInvestment'));
const BudgetPlanner = lazy(() => import('./pages/BudgetPlanner'));
const AddTransfer = lazy(() => import('./pages/AddTransfer'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const ImportCenter = lazy(() => import('./pages/ImportCenter'));

// Simple mobile-friendly fallback loader
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-slate-400 text-sm font-medium animate-pulse">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen relative overflow-hidden bg-slate-900 text-slate-100 font-sans">
          {/* Ambient Background Mesh */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-float"></div>
            <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-green-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }}></div>
          </div>

          {/* Content */}
          <div className="relative z-10 w-full min-h-screen flex flex-col">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    {/* Sidebar (desktop fixed left + mobile drawer) */}
                    <Sidebar />

                    {/* Main content — offset by sidebar width on desktop, top bar on mobile */}
                    <div className="flex-1 md:ml-[240px] pt-[64px] md:pt-0 min-h-screen flex flex-col transition-all duration-300">
                      <div className="flex-1">
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/add" element={<AddExpense />} />
                            <Route path="/add-income" element={<AddIncome />} />
                            <Route path="/expense-tracking" element={<ExpenseTracking />} />
                            <Route path="/income-tracking" element={<IncomeTracking />} />
                            <Route path="/add-investment" element={<AddInvestment />} />
                            <Route path="/portfolio" element={<Portfolio />} />
                            <Route path="/budget-planner" element={<BudgetPlanner />} />
                            <Route path="/transfer" element={<AddTransfer />} />
                            <Route path="/import" element={<ImportCenter />} />
                          </Routes>
                        </Suspense>
                      </div>
                      <Footer />
                      {/* Mobile: only the FAB quick-entry button */}
                      <MobileBottomNav />
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

