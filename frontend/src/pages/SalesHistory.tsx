import { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { History, Loader2, Package, Search, Download } from "lucide-react";
import { formatUnit, useUnitPreference } from "../utils/units";
import { useDateFormatPreference, formatDate } from "../utils/dateFormatter";
import { useAuth } from "../contexts/AuthContext";

interface SalesTransaction {
  id: number;
  color_id: number;
  color_name: string;
  business_code: string;
  pack_size_kg: number;
  quantity_units: number;
  quantity_kg: number;
  notes: string;
  created_at: string;
  logged_by: string | null;
}

export default function SalesHistory() {
  const { user } = useAuth();
  const dateFormat = useDateFormatPreference();
  const unitPref = useUnitPreference();
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<SalesTransaction[]>("/sales/transactions");
      setTransactions(res);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportHSN = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sales/reports/hsn-wise`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HSN_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = transactions.filter(t => 
    t.color_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.logged_by && t.logged_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.business_code && t.business_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
              <History className="h-6 w-6 text-white" />
            </div>
            Sales History
          </h1>
          <p className="text-slate-500 mt-2 font-medium">View completed sales dispatches.</p>
        </div>
        
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <button
            onClick={handleExportHSN}
            disabled={isExporting}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Download className="w-4 h-4 text-emerald-400" />
            )}
            {isExporting ? 'Generating...' : 'HSN Report (CSV)'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-stretch">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by product, agent or notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filtered.length} entries</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100 w-48">Date</th>
                <th className="px-6 py-4 border-b border-slate-100">Product</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Pack Size</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Units</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Total Mass</th>
                <th className="px-6 py-4 border-b border-slate-100">Notes</th>
                <th className="px-6 py-4 border-b border-slate-100">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                     <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
                     <p className="text-xs font-bold uppercase tracking-widest">Loading transactions...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                     <Package className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                     <p className="text-sm font-bold">No sales transactions found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-700">{formatDate(t.created_at, dateFormat)}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{new Date(t.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4">
                       <p className="font-bold text-slate-900">{t.color_name}</p>
                       <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t.business_code}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">
                      {t.pack_size_kg}kg
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="inline-flex bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-black text-sm border border-emerald-100 shadow-sm">
                         {t.quantity_units}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">
                      {formatUnit(Math.abs(t.quantity_kg), unitPref)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={t.notes}>
                      {t.notes || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.logged_by ? (
                         <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold. border border-slate-200 uppercase tracking-wider">
                           {t.logged_by}
                         </span>
                      ) : (
                         <span className="text-slate-400 text-xs italic">System / Unknown</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
