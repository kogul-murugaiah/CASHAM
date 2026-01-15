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
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import AddIncome from './pages/AddIncome';
import Expenses from './pages/Expenses';
import IncomeEditor from './pages/IncomeEditor';
import Monthly from './pages/Monthly';
import Yearly from './pages/Yearly';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Navbar />
              <MobileBottomNav />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add" element={<AddExpense />} />
                <Route path="/add-income" element={<AddIncome />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/income-editor" element={<IncomeEditor />} />
                <Route path="/monthly" element={<Monthly />} />
                <Route path="/yearly" element={<Yearly />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
