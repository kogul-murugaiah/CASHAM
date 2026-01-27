/*
 * Expense Tracker Application
 * Copyright (c) 2026 kogulmurugaiah
 * All rights reserved.
 * 
 * Developer: kogulmurugaiah
 * Description: A comprehensive expense tracking application with dark theme UI
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import AddExpense from './pages/AddExpense';
import AddIncome from './pages/AddIncome';
import ExpenseTracking from './pages/ExpenseTracking';
import IncomeTracking from './pages/IncomeTracking';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 font-sans">
        {/* Ambient Background Mesh */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-purple-500/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <div className="flex-1">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/add" element={<AddExpense />} />
                      <Route path="/add-income" element={<AddIncome />} />
                      <Route path="/expense-tracking" element={<ExpenseTracking />} />
                      <Route path="/income-tracking" element={<IncomeTracking />} />
                    </Routes>
                  </div>
                  <Footer />
                  <MobileBottomNav />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
