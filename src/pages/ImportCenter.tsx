import { useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../lib/api";

type ImportType = "income" | "expense" | "investment";

const CONFIG = {
  income: { label: "Income", endpoint: "/api/incomes", emoji: "💰", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  expense: { label: "Expense", endpoint: "/api/expenses", emoji: "💸", color: "text-red-400", bg: "bg-red-500/10" },
  investment: { label: "Investment", endpoint: "/api/investments", emoji: "📈", color: "text-amber-400", bg: "bg-amber-500/10" },
};

const ImportCenter = () => {
  const [type, setType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setPreview(data.slice(0, 5)); // Show first 5 rows
    };
    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (!type || !file) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        // Basic mapping logic — in a real app, users would map columns.
        // For now, we assume the CSV headers match our API fields (amount, date, source/item/name).
        await api.post(CONFIG[type].endpoint, data);
        setSuccess(`Successfully imported ${data.length} records to ${CONFIG[type].label}.`);
        setPreview([]);
        setFile(null);
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setError(err.message || "Import failed. Check file format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-8 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold font-heading text-white">Import Center</h1>
          <p className="text-slate-400 mt-2">Bulk upload your financial data from CSV or Excel</p>
        </header>

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center animate-fade-in">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* Step 1: Select Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {(Object.entries(CONFIG) as [ImportType, any][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`p-6 rounded-3xl border transition-all text-left group ${
                type === key
                  ? "bg-white/10 border-white/20 shadow-xl"
                  : "bg-slate-800/40 border-white/5 hover:border-white/10"
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {cfg.emoji}
              </div>
              <h3 className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</h3>
              <p className="text-xs text-slate-500 mt-1">Import bulk {key} data</p>
            </button>
          ))}
        </div>

        {/* Step 2: Upload & Preview */}
        {type && (
          <div className="glass-card p-8 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6">Import {CONFIG[type].label} Data</h2>
            
            <div className="mb-8">
              <label className="block w-full cursor-pointer">
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-amber-500/50 transition-all">
                  <span className="text-3xl mb-4 block">📄</span>
                  <p className="text-white font-medium">{file ? file.name : "Select CSV or Excel file"}</p>
                  <p className="text-slate-500 text-xs mt-2">Maximum file size: 5MB</p>
                  <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                </div>
              </label>
            </div>

            {preview.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Preview (First 5 Rows)</h3>
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-700/50 text-slate-400">
                      <tr>
                        {Object.keys(preview[0]).map((k) => (
                          <th key={k} className="px-4 py-2 border-b border-white/5">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {preview.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2 border-b border-white/5 truncate max-w-[150px]">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!file || loading}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
                !file || loading
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Confirm Import to ${CONFIG[type].label}`
              )}
            </button>

            <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Mapping Requirements</p>
              <p className="text-[10px] text-slate-500">
                Ensure your column headers match: <code className="text-slate-300">amount</code>, <code className="text-slate-300">date</code> (YYYY-MM-DD), and 
                {type === "income" && <code className="text-slate-300"> source</code>}
                {type === "expense" && <code className="text-slate-300"> item</code>}
                {type === "investment" && <code className="text-slate-300"> name</code>}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportCenter;
