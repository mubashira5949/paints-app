import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Trash2, 
  Info, 
  Package, 
  Droplets,
  ClipboardList,
  CheckCircle2,
  X
} from "lucide-react";
import { useUnitPreference, formatUnit, unitLabel } from "../utils/units";

interface LossRecord {
  id: number;
  item_type: 'finished_good' | 'raw_material';
  color_name: string | null;
  resource_name: string | null;
  pack_size_kg: number | null;
  quantity_units: number | null;
  quantity_kg: number;
  reason_name: string;
  notes: string | null;
  documented_by: string;
  documented_at: string;
  reference_type: string | null;
  reference_id: number | null;
}

interface LossReason {
  id: number;
  name: string;
  description: string;
}

interface ColorOption {
  id: number;
  color: string;
  packDistribution: { size: string, units: number }[];
}

interface ResourceOption {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
}

export default function Losses() {
  const unitPref = useUnitPreference();
  const [losses, setLosses] = useState<LossRecord[]>([]);
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    item_type: 'finished_good' as 'finished_good' | 'raw_material',
    color_id: '',
    resource_id: '',
    pack_size_kg: '',
    quantity_units: '',
    quantity_kg: '',
    reason_id: '',
    notes: '',
    reference_type: '',
    reference_id: ''
  });

  // Options for form
  const [colors, setColors] = useState<ColorOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [availablePackSizes, setAvailablePackSizes] = useState<number[]>([]);

  // Filter State
  const [filters, setFilters] = useState({
    item_type: 'all',
    reason_id: 'all',
  });

  const fetchLosses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.item_type !== 'all') params.append('item_type', filters.item_type);
      if (filters.reason_id !== 'all') params.append('reason_id', filters.reason_id);
      
      const data = await apiRequest<LossRecord[]>(`/api/losses?${params.toString()}`);
      setLosses(data);
    } catch (err) {
      console.error("Failed to fetch losses", err);
      setError("Failed to load loss records");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [reasonsData, colorsData, resourcesData] = await Promise.all([
        apiRequest<LossReason[]>("/api/losses/reasons"),
        apiRequest<ColorOption[]>("/api/inventory"), // Reusing inventory for color list
        apiRequest<ResourceOption[]>("/resources")
      ]);
      setReasons(reasonsData);
      setColors(colorsData);
      setResources(resourcesData);
    } catch (err) {
      console.error("Failed to fetch form data", err);
    }
  };

  useEffect(() => {
    fetchLosses();
    fetchInitialData();
  }, [filters]);

  const handleColorChange = (colorId: string) => {
    const color = colors.find(c => c.id === parseInt(colorId));
    setFormData(prev => ({ ...prev, color_id: colorId, pack_size_kg: '', quantity_units: '', quantity_kg: '' }));
    if (color && color.packDistribution) {
      setAvailablePackSizes(color.packDistribution.map(p => parseFloat(p.size)));
    } else {
      setAvailablePackSizes([]);
    }
  };

  const handlePackSizeChange = (size: string) => {
    setFormData(prev => ({ ...prev, pack_size_kg: size }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitLoading(true);
    setError(null);

    try {
      const payload: any = {
        item_type: formData.item_type,
        reason_id: parseInt(formData.reason_id),
        quantity_kg: parseFloat(formData.quantity_kg),
        notes: formData.notes,
        reference_type: formData.reference_type || undefined,
        reference_id: formData.reference_id ? parseInt(formData.reference_id) : undefined
      };

      if (formData.item_type === 'finished_good') {
        payload.color_id = parseInt(formData.color_id);
        payload.pack_size_kg = parseFloat(formData.pack_size_kg);
        payload.quantity_units = parseInt(formData.quantity_units);
      } else {
        payload.resource_id = parseInt(formData.resource_id);
      }

      await apiRequest("/api/losses", {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setShowForm(false);
      setFormData({
        item_type: 'finished_good',
        color_id: '',
        resource_id: '',
        pack_size_kg: '',
        quantity_units: '',
        quantity_kg: '',
        reason_id: '',
        notes: '',
        reference_type: '',
        reference_id: ''
      });
      fetchLosses();
    } catch (err: any) {
      setError(err.message || "Failed to document loss");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Loss Tracking
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Document and monitor product discrepancies, damage, and waste.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 h-11 px-6 py-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          RECORD LOSS
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-all group">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Recent Losses (30d)</p>
            <AlertTriangle className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black text-slate-900">{losses.length}</div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">Documented discrepancies</p>
          </div>
        </div>
        
        <div className="rounded-2xl border bg-white p-6 shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-all group">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Mass Lost</p>
            <Droplets className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black text-slate-900">
              {formatUnit(losses.reduce((acc, curr) => acc + curr.quantity_kg, 0), unitPref)}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">Cumulative material loss</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition-all group">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Finished Goods Lost</p>
            <Package className="h-5 w-5 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black text-slate-900">
              {losses.filter(l => l.item_type === 'finished_good').reduce((acc, curr) => acc + (curr.quantity_units || 0), 0)}
              <span className="text-sm font-bold text-slate-400 ml-2">Units</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">Packaged products lost</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border bg-white shadow-xl overflow-hidden border-slate-200">
        <div className="p-5 border-b bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Loss Documentation History</h2>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Filter className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <select 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold uppercase tracking-wide focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                value={filters.item_type}
                onChange={(e) => setFilters(prev => ({ ...prev, item_type: e.target.value }))}
              >
                <option value="all">ITEM TYPE: ALL</option>
                <option value="finished_good">FINISHED GOODS</option>
                <option value="raw_material">RAW MATERIALS</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto text-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Date / Documentation</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Item</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-center font-bold text-slate-500 text-[10px] uppercase tracking-widest">Lost Quantity</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-widest">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6" colSpan={5}><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                  </tr>
                ))
              ) : losses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    No loss records found.
                  </td>
                </tr>
              ) : (
                losses.map(loss => (
                  <tr key={loss.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">ID: L-{loss.id}</span>
                        <span className="font-bold text-slate-700 text-sm">{new Date(loss.documented_at).toLocaleDateString()}</span>
                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(loss.documented_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${loss.item_type === 'finished_good' ? 'bg-indigo-50' : 'bg-blue-50'}`}>
                          {loss.item_type === 'finished_good' 
                            ? <Package className="h-4 w-4 text-indigo-600" />
                            : <Droplets className="h-4 w-4 text-blue-600" />
                          }
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 leading-tight">
                            {loss.color_name || loss.resource_name}
                          </span>
                          {loss.item_type === 'finished_good' && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                              {loss.pack_size_kg}{unitLabel(unitPref)} Pack
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        loss.item_type === 'finished_good' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                          : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {loss.item_type === 'finished_good' ? 'FINISHED' : 'RAW MATERIAL'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-slate-900">
                          {loss.item_type === 'finished_good' 
                            ? `${loss.quantity_units} Units` 
                            : formatUnit(loss.quantity_kg, unitPref)
                          }
                        </span>
                        {loss.item_type === 'finished_good' && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                            ({formatUnit(loss.quantity_kg, unitPref)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-tight self-start mb-1">
                          {loss.reason_name}
                        </span>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1 italic max-w-xs" title={loss.notes || ''}>
                          {loss.notes || "No additional notes provided."}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Documented By:</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase">{loss.documented_by}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Overlay Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Record Loss</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documentation Form</p>
                </div>
              </div>
              <button 
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Type Selection Tabs */}
              <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, item_type: 'finished_good' }))}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                    formData.item_type === 'finished_good' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:bg-white/50'
                  }`}
                >
                  Finished Good
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, item_type: 'raw_material' }))}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                    formData.item_type === 'raw_material' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:bg-white/50'
                  }`}
                >
                  Raw Material
                </button>
              </div>

              <div className="grid gap-6">
                {formData.item_type === 'finished_good' ? (
                  <>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Color / Product</label>
                      <select
                        required
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                        value={formData.color_id}
                        onChange={(e) => handleColorChange(e.target.value)}
                      >
                        <option value="">Select Color...</option>
                        {colors.map(c => (
                          <option key={c.id} value={c.id}>{c.color}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pack Size</label>
                        <select
                          required
                          disabled={!formData.color_id}
                          className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                          value={formData.pack_size_kg}
                          onChange={(e) => handlePackSizeChange(e.target.value)}
                        >
                          <option value="">Select Size...</option>
                          {availablePackSizes.map(size => (
                            <option key={size} value={size}>{size}{unitLabel(unitPref)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quantity (Units)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="0"
                          className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                          value={formData.quantity_units}
                          onChange={(e) => {
                            const units = e.target.value;
                            const size = parseFloat(formData.pack_size_kg);
                            setFormData(prev => ({ 
                              ...prev, 
                              quantity_units: units, 
                              quantity_kg: (parseFloat(units) * size).toString() 
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Raw Material</label>
                    <select
                      required
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                      value={formData.resource_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, resource_id: e.target.value }))}
                    >
                      <option value="">Select Material...</option>
                      {resources.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (Available: {r.current_stock}{r.unit})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                    {formData.item_type === 'finished_good' ? "Total Mass (KG)" : `Quantity (${unitLabel(unitPref)})`}
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    readOnly={formData.item_type === 'finished_good'}
                    className={`w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all ${
                      formData.item_type === 'finished_good' ? 'bg-slate-50' : ''
                    }`}
                    value={formData.quantity_kg}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_kg: e.target.value }))}
                  />
                  {formData.item_type === 'finished_good' && (
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic italic tracking-tighter">Calculated automatically: Units × Pack Size</p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Loss Reason</label>
                  <select
                    required
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    value={formData.reason_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason_id: e.target.value }))}
                  >
                    <option value="">Select Reason...</option>
                    {reasons.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Additional Notes (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about the discrepancy..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <p className="text-xs font-bold text-red-800 uppercase tracking-tight">{error}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 px-6 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="flex-1 py-3 px-6 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isSubmitLoading ? "SAVING..." : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      SUBMIT LOG
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

