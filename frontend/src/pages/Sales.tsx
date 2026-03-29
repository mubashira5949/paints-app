import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  PaintBucket,
  Package,
  History,
  X,
  ChevronRight,
} from "lucide-react";
import { useUnitPreference, formatUnit } from "../utils/units";

interface FinishedStock {
  color_id: number;
  color_name: string;
  color_code: string;
  business_code: string;
  series: string;
  total_quantity_units: number;
  total_mass_kg: number;
  stock_status: "healthy" | "low" | "critical";
  packs: {
    pack_size_kg: number;
    quantity_units: number;
  }[];
}

export default function Sales() {
  const { user } = useAuth();
  const unitPref = useUnitPreference();
  const navigate = useNavigate();
  
  const [inventory, setInventory] = useState<FinishedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selection State
  const [selectedProduct, setSelectedProduct] = useState<FinishedStock | null>(null);
  const [selectedPackSize, setSelectedPackSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ data: FinishedStock[] }>("/inventory/finished-stock");
      setInventory(res.data);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || selectedPackSize === null || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      await apiRequest("/inventory/sales", {
        method: "POST",
        body: {
          colorId: selectedProduct.color_id,
          packSizeKg: selectedPackSize,
          quantityUnits: quantity,
          notes: notes || `Sale of ${selectedProduct.color_name} (${selectedPackSize}kg x ${quantity})`,
        },
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        fetchInventory();
        setSelectedProduct(null);
        setSelectedPackSize(null);
        setQuantity(1);
        setNotes("");
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Failed to record sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.color_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.business_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availablePacks = selectedProduct?.packs.filter(p => p.quantity_units > 0) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            Sales Portal
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Record and update daily paint sales and stock dispatches.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
           >
            <History className="w-4 h-4" /> View History
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Product Selection List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[600px] flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Stock</span>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{filteredInventory.length} items</span>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-widest">Loading catalog...</p>
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 p-8 text-center">
                   <PaintBucket className="w-12 h-12 text-slate-200" />
                   <p className="text-sm font-bold">No products found</p>
                </div>
              ) : (
                filteredInventory.map((item) => (
                  <button
                    key={item.color_id}
                    onClick={() => {
                      setSelectedProduct(item);
                      setSelectedPackSize(null);
                      setQuantity(1);
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group ${
                      selectedProduct?.color_id === item.color_id 
                        ? "bg-emerald-50 border-emerald-100 shadow-sm" 
                        : "hover:bg-slate-50 border-transparent"
                    } border`}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-xl shadow-inner border border-white"
                        style={{ backgroundColor: item.color_code }}
                      />
                      <div>
                        <h4 className={`font-bold transition-colors ${selectedProduct?.color_id === item.color_id ? "text-emerald-900" : "text-slate-800"}`}>
                          {item.color_name}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.business_code} • {item.series}</p>
                      </div>
                    </div>
                    {selectedProduct?.color_id === item.color_id ? (
                      <div className="bg-emerald-600 text-white p-1 rounded-full">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Dispatch Form Area */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedProduct ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-20 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[500px]">
              <div className="p-6 bg-white rounded-full shadow-lg text-slate-300 border border-slate-100">
                <PaintBucket className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Choose a Product</h3>
                <p className="text-slate-500 max-w-[300px] mt-2 font-medium italic">
                  Select a paint color from the inventory catalog to start recording a dispatch or sale.
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
              {/* Product Header Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 -mr-10 -mt-10 opacity-5 pointer-events-none">
                   <PaintBucket className="w-48 h-48 rotate-12" />
                </div>
                
                <div className="flex items-center gap-6 relative z-10">
                  <div 
                    className="w-20 h-20 rounded-2xl shadow-xl border-4 border-white"
                    style={{ backgroundColor: selectedProduct.color_code }}
                  />
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedProduct.color_name}</h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-widest">Code: {selectedProduct.business_code}</span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-widest">{selectedProduct.series} Series</span>
                      <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${
                        selectedProduct.stock_status === 'healthy' ? "bg-emerald-100 text-emerald-700" :
                        selectedProduct.stock_status === 'low' ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      }`}>Stock: {selectedProduct.stock_status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-w-[140px] text-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total On Hand</p>
                   <p className="text-2xl font-black text-slate-800">{formatUnit(selectedProduct.total_mass_kg, unitPref)}</p>
                </div>
              </div>

              {/* Selection Form */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-md relative overflow-hidden">
                {success && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-emerald-100 p-4 rounded-full mb-4">
                       <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">Sale Recorded Successfully!</h3>
                    <p className="text-slate-500 font-medium mt-2">Inventory updated and transaction logged.</p>
                  </div>
                )}

                <form onSubmit={handleSaleSubmit} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <Package className="w-4 h-4 text-emerald-600" />
                       <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">1. Select Pack Size</label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {availablePacks.length === 0 ? (
                        <div className="col-span-full p-6 text-center bg-red-50 text-red-600 rounded-xl border border-red-100 font-bold uppercase tracking-widest text-xs">
                           Out of Stock in all sizes
                        </div>
                      ) : (
                        availablePacks.map((pack) => (
                          <button
                            key={pack.pack_size_kg}
                            type="button"
                            onClick={() => setSelectedPackSize(pack.pack_size_kg)}
                            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                              selectedPackSize === pack.pack_size_kg
                                ? "bg-emerald-600 border-emerald-700 text-white shadow-lg shadow-emerald-200 scale-105"
                                : "bg-slate-50 border-slate-100 text-slate-600 hover:border-emerald-300 hover:bg-white"
                            }`}
                          >
                            <span className="text-lg font-black">{pack.pack_size_kg}kg</span>
                            <span className={`text-[10px] font-black uppercase tracking-tight ${selectedPackSize === pack.pack_size_kg ? "text-emerald-100" : "text-slate-400"}`}>
                              {pack.quantity_units} Units left
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">2. Quantity to Dispatch</label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={selectedPackSize ? selectedProduct.packs.find(p => p.pack_size_kg === selectedPackSize)?.quantity_units : undefined}
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-3xl font-black text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                          value={quantity}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase tracking-widest text-sm">Units</span>
                      </div>
                      {selectedPackSize && (
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                           Total Weight: {quantity * selectedPackSize} {unitPref}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest">3. Sale Details / Notes</label>
                      </div>
                      <textarea
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-sm font-medium text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 outline-none transition-all min-h-[110px]"
                        placeholder="e.g. Counter Sale, Order Ref #123..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="px-6 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                    >
                      Reset Selection
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || selectedPackSize === null || quantity <= 0}
                      className="inline-flex items-center px-12 py-5 text-sm font-bold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xl shadow-emerald-200 active:scale-95 uppercase tracking-widest group"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-3" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                      )}
                      Record Sale Dispatch
                    </button>
                  </div>
                </form>
              </div>

              {/* Stock Warning Banner */}
              {selectedPackSize && quantity > (selectedProduct.packs.find(p => p.pack_size_kg === selectedPackSize)?.quantity_units || 0) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 animate-in shake duration-500">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <p className="text-xs font-bold text-red-800 uppercase tracking-tight">Warning: Selected quantity exceeds available stock units!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
