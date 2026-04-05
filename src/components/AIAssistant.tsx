import React, { useState, useEffect, useRef } from "react";
import { askGemini, type ChatMessage, isAIEnabled } from "../lib/ai";
import { buildFinancialContext } from "../lib/aiContext";
import { api } from "../lib/api";
import { useAccountTypes } from "../hooks/useAccountTypes";

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { accountTypes } = useAccountTypes();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchContextData = async () => {
    try {
      // 1. Get Dashboard Summary
      const d = new Date();
      const dash = await api.get(`/api/dashboard?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
      const invs = await api.get("/api/investments?summary=true");
      const user = await api.get("/api/auth/user");

      // 2. Fetch all expenses for top categories
      const exps = await api.get("/api/expenses");
      const categoryMap: Record<string, number> = {};
      (exps || []).forEach((e: any) => { categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount; });
      const topCategories = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // 3. Process Bank Balances
      const incs = await api.get("/api/incomes");
      const allInvs = await api.get("/api/investments");
      const balances = accountTypes.map(type => {
        const totalInc = (incs || []).filter((i: any) => i.account_type === type).reduce((s: number, i: any) => s + i.amount, 0);
        const totalExp = (exps || []).filter((e: any) => e.account_type === type).reduce((s: number, e: any) => s + e.amount, 0);
        const totalInv = (allInvs || []).filter((inv: any) => inv.account_type === type && inv.action === 'buy').reduce((s: number, i: any) => s + i.amount, 0);
        const totalRed = (allInvs || []).filter((inv: any) => inv.account_type === type && inv.action === 'sell').reduce((s: number, i: any) => s + i.amount, 0);
        return totalInc - totalExp - totalInv + totalRed;
      });
      const cashBalance = balances.reduce((a, b) => a + b, 0);

      // 4. Build the final context
      const context = buildFinancialContext({
        userEmail: user?.user?.email,
        monthlyIncome: (dash.income || []).reduce((s: number, i: any) => s + i.amount, 0),
        monthlyExpenses: (dash.expenses || []).reduce((s: number, e: any) => s + e.amount, 0),
        monthlyBalance: ((dash.income || []).reduce((s: number, i: any) => s + i.amount, 0)) - ((dash.expenses || []).reduce((s: number, e: any) => s + e.amount, 0)),
        netWorth: (invs?.total_current_value || 0) + cashBalance,
        portfolioValue: invs?.total_current_value || 0,
        cashBalance,
        topCategories,
        investmentBreakdown: invs?.by_type || [],
      });

      return context;
    } catch (e) {
      console.error("AI Context Retrieval Failed:", e);
      return "You are the CASHAM Advisor. Help the user optimize their financial protocols.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    setHasError(false);

    try {
      let currentHistory = [...messages];
      
      // If first message, prepend the context as a hidden system message
      if (messages.length === 0) {
        const context = await fetchContextData();
        currentHistory = [{ role: "system", content: context }];
      }

      const aiResponse = await askGemini(userMsg, currentHistory);
      setMessages(prev => [...prev, { role: "model", content: aiResponse }]);
    } catch (e) {
      setHasError(true);
      setMessages(prev => [...prev, { role: "model", content: "I encountered a protocol error. Please check your connection or API configuration." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAIEnabled && !isOpen) {
     return (
        <div className="fixed bottom-6 right-6 z-50">
           <button 
             onClick={() => setIsOpen(true)}
             className="w-14 h-14 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all shadow-xl group overflow-hidden"
           >
              <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="relative z-10"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
           </button>
        </div>
     );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[90vw] sm:w-[400px] h-[600px] max-h-[80vh] mb-4 glass-card shadow-2xl flex flex-col overflow-hidden animate-scale-up border-emerald-500/20 bg-slate-900/40 backdrop-blur-3xl">
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-slate-800/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                   <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              </div>
              <div>
                <dt className="text-sm font-black text-white uppercase tracking-wider">CASHAM Advisor</dt>
                <dd className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">Elite Support Protocol</dd>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-all p-1">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {!isAIEnabled ? (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 border border-amber-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
               </div>
               <h3 className="text-lg font-bold text-white mb-2">Setup Protocol Required</h3>
               <p className="text-sm text-slate-400 mb-6">AI features are disabled. Please provide a Gemini API Key to activate your advisor.</p>
               <a href="https://aistudio.google.com/" target="_blank" className="text-xs font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest border border-amber-500/20 rounded-xl px-4 py-2 bg-amber-500/5 transition-all">Get API Key from Google</a>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/20 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="text-center py-10 opacity-60">
                    <div className="inline-block p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 mb-4 animate-pulse">
                       <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-emerald-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Hello, I am your CASHAM Advisor.<br/>Ask me anything about your finances.</p>
                  </div>
                )}
                
                {messages.filter(m => m.role !== 'system').map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      m.role === "user" 
                        ? "bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/10 rounded-tr-none" 
                        : "bg-slate-800/80 text-slate-200 border border-white/5 rounded-tl-none"
                    }`}>
                      {m.content.split('\n').map((line, li) => (
                        <p key={li} className={li > 0 ? "mt-2" : ""}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5">
                      <div className="flex gap-1.5 py-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
                {hasError && (
                   <p className="text-[10px] text-center text-red-400 font-bold uppercase tracking-tighter">Connection Protocol Interrupted</p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-white/5 bg-slate-800/30">
                <div className="relative flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === "Enter" && handleSend()}
                    placeholder="Ask your advisor..."
                    className="flex-1 rounded-2xl bg-slate-900/60 border border-white/10 px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all pr-12 backdrop-blur-md"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 p-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:bg-slate-700 disabled:shadow-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </div>
                <p className="text-[9px] text-center text-slate-600 mt-2 font-bold uppercase tracking-widest">Powered by Gemini AI Protocol</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-2xl relative group transform hover:scale-110 active:scale-95 ${
          isOpen 
            ? "bg-slate-800 text-white border border-white/10 rotate-90" 
            : "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
        }`}
      >
         <div className={`absolute inset-0 rounded-3xl bg-white opacity-0 group-hover:opacity-10 transition-opacity`} />
         {isOpen ? (
           <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
         ) : (
           <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
           </svg>
         )}
         
         {/* Small Pulse Ring */}
         {!isOpen && (
            <div className="absolute inset-0 rounded-3xl border-2 border-emerald-400/50 animate-ping" />
         )}
      </button>
    </div>
  );
};

export default AIAssistant;
