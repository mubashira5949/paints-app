import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import {
  ArrowLeft,
  Plus,
  Trash2,
  PackageCheck,
  AlertTriangle,
  Loader2,
  Box,
  CheckCircle2,
} from "lucide-react";
import { useUnitPreference, toDisplayValue, fromDisplayValue } from "../utils/units";

interface RunMeta {
  id: number;
  batchId: string;
  status: string;
  planned_quantity_kg: number;
  actual_quantity_kg: number | null;
  color_name: string;
  formula_name: string;
  packaging: { pack_size_kg: number; quantity_units: number; volume_kg: number }[];
}

interface PackRow {
  pack_size_kg: string;
  quantity_units: string;
}

export default function ProductionPackaging() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const unitPref = useUnitPreference();

  const numericId = batchId?.replace(/^PR-/i, "");

  const [run, setRun] = useState<RunMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load default sizes from settings
  const defaultSizes = (localStorage.getItem("default_packaging_sizes") || "0.5, 1, 5, 10, 20")
    .split(",")
    .map(s => s.replace(/[^\d.]/g, "").trim())
    .filter(s => s !== "");

  // Tracks which rows are in "Custom" mode
  const [customRows, setCustomRows] = useState<Record<number, boolean>>({});

  // Pack rows — start with two common sizes
  const [rows, setRows] = useState<PackRow[]>([
    { pack_size_kg: "5", quantity_units: "" },
    { pack_size_kg: "10", quantity_units: "" },
  ]);

  const fetchRun = useCallback(async () => {
    if (!numericId) return;
    try {
      const data = await apiRequest<RunMeta>(`/production-runs/${numericId}`);
      setRun(data);
    } catch (err: any) {
      setLoadErr(err.message ?? "Failed to load run");
    } finally {
      setIsLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const batchVolume = run?.actual_quantity_kg ?? run?.planned_quantity_kg ?? 0;
  const displayBatchVolume = toDisplayValue(batchVolume, unitPref);

  // Volume already packaged in previous sessions
  const alreadyPackaged = run?.packaging?.reduce((sum, p) => sum + toDisplayValue(Number(p.volume_kg), unitPref), 0) ?? 0;

  // Compute allocated volume from valid rows in CURRENT session
  const currentAllocated = rows.reduce((sum, r) => {
    const size = parseFloat(r.pack_size_kg);
    const qty = parseInt(r.quantity_units);
    if (!isNaN(size) && !isNaN(qty) && size > 0 && qty > 0) {
      return sum + size * qty;
    }
    return sum;
  }, 0);

  const totalAllocated = alreadyPackaged + currentAllocated;
  const remaining = displayBatchVolume - totalAllocated;
  const isOverAllocated = totalAllocated > displayBatchVolume;

  const addRow = () => {
    setRows((prev) => [...prev, { pack_size_kg: "", quantity_units: "" }]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof PackRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handlePackRemaining = () => {
    if (remaining <= 0) return;
    const newIdx = rows.length;
    setCustomRows(prev => ({ ...prev, [newIdx]: true }));
    setRows(prev => [...prev, { pack_size_kg: remaining.toFixed(2), quantity_units: "1" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericId) return;
    setSubmitErr(null);

    const validRows = rows.filter((r) => {
      const size = parseFloat(r.pack_size_kg);
      const qty = parseInt(r.quantity_units);
      return !isNaN(size) && !isNaN(qty) && size > 0 && qty > 0;
    });

    if (validRows.length === 0) {
      setSubmitErr("Please enter at least one valid pack size with quantity.");
      return;
    }

    if (isOverAllocated) {
      setSubmitErr(`Total allocation (${totalAllocated.toFixed(1)}${unitPref}) exceeds batch size (${displayBatchVolume}${unitPref}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/production-runs/${numericId}/packaging`, {
        method: "POST",
        body: {
          packaging_details: validRows.map((r) => ({
            pack_size_kg: fromDisplayValue(parseFloat(r.pack_size_kg), unitPref),
            quantity_units: parseInt(r.quantity_units),
          })),
        },
      });
      setSuccess(true);
      setTimeout(() => navigate(`/production/${batchId}`), 1500);
    } catch (err: any) {
      setSubmitErr(err.message ?? "Failed to submit packaging");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (loadErr || !run) {
    return (
      <div className="text-center py-20 text-red-500">
        <AlertTriangle className="mx-auto w-8 h-8 mb-2" />
        {loadErr ?? "Run not found"}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => navigate(`/production/${batchId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {run.batchId}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackageCheck className="w-6 h-6 text-blue-600" />
          Package Batch
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {run.color_name} · {run.formula_name} · {displayBatchVolume.toLocaleString()}{unitPref} available
        </p>
      </div>

      {/* Volume progress bar */}
      <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-slate-700">Packaging Overview</span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Progress to total batch</p>
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold font-mono ${isOverAllocated ? "text-red-600" : "text-slate-700"}`}>
              {totalAllocated.toFixed(1)} / {displayBatchVolume.toLocaleString()}{unitPref}
            </span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              {((totalAllocated / displayBatchVolume) * 100).toFixed(1)}% Done
            </p>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex shadow-inner">
            {/* Already Packaged (Striped/Darker) */}
            <div
              className="h-full bg-purple-600/50 transition-all duration-300 relative overflow-hidden"
              style={{ width: `${(alreadyPackaged / displayBatchVolume) * 100}%` }}
              title={`Already Packaged: ${alreadyPackaged.toFixed(1)}${unitPref}`}
            >
               <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.2)_50%,rgba(255,255,255,.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
            </div>
            {/* Current Allocation (Blue) */}
            <div
              className={`h-full transition-all duration-300 ${isOverAllocated ? "bg-red-500" : "bg-blue-500 shadow-lg shadow-blue-500/30"}`}
              style={{ width: `${(currentAllocated / displayBatchVolume) * 100}%` }}
              title={`New Allocation: ${currentAllocated.toFixed(1)}${unitPref}`}
            />
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-purple-600">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> {alreadyPackaged.toFixed(1)} Done
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> +{currentAllocated.toFixed(1)} New
              </span>
            </div>
            <span className={isOverAllocated ? "text-red-600" : "text-slate-500"}>
              {isOverAllocated 
                ? `⚠ Over by ${(totalAllocated - displayBatchVolume).toFixed(1)}` 
                : `${remaining.toFixed(1)} Left`
              } {unitPref}
            </span>
          </div>
        </div>
      </div>

      {/* Success state */}
      {success ? (
        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-8 flex flex-col items-center gap-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <p className="font-bold text-emerald-800 text-lg">Packaging Submitted!</p>
          <p className="text-emerald-700 text-sm">Redirecting to batch details…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pack rows */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold text-sm">Pack Sizes</h2>
              </div>
              <div className="flex items-center gap-4">
                {remaining > 0 ? (
                  <button
                    type="button"
                    onClick={handlePackRemaining}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors bg-purple-50 px-2 py-1 rounded"
                  >
                    Pack Remaining ({remaining.toFixed(1)}{unitPref})
                  </button>
                ) : (
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded border border-slate-200 shadow-inner italic">
                    Fully Allocated
                  </span>
                )}
                <button
                  type="button"
                  onClick={addRow}
                  disabled={remaining <= 0}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" /> Add size
                </button>
              </div>
            </div>

            <div className="divide-y">
              {rows.map((row, idx) => {
                const size = parseFloat(row.pack_size_kg);
                const qty = parseInt(row.quantity_units);
                const rowVolume = !isNaN(size) && !isNaN(qty) && size > 0 && qty > 0 ? size * qty : null;

                return (
                  <div key={idx} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Pack Size ({unitPref})
                      </label>
                      <select
                        value={customRows[idx] ? "custom" : row.pack_size_kg}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "custom") {
                            setCustomRows(prev => ({ ...prev, [idx]: true }));
                          } else {
                            setCustomRows(prev => ({ ...prev, [idx]: false }));
                            updateRow(idx, "pack_size_kg", val);
                          }
                        }}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
                      >
                        <option value="" disabled>Select Size</option>
                        {defaultSizes.map(size => (
                          <option key={size} value={size}>{size} {unitPref}</option>
                        ))}
                        <option value="custom">Other (Custom Size)...</option>
                      </select>

                      {customRows[idx] && (
                        <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            placeholder={`Enter size in ${unitPref}`}
                            value={row.pack_size_kg}
                            onChange={(e) => updateRow(idx, "pack_size_kg", e.target.value)}
                            autoFocus
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Quantity (units)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 10"
                        value={row.quantity_units}
                        onChange={(e) => updateRow(idx, "quantity_units", e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="w-20 text-right pt-5">
                      {rowVolume != null ? (
                        <span className="text-xs font-mono text-slate-500">{rowVolume.toFixed(1)}{unitPref}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={rows.length === 1}
                      className="mt-4 p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Summary row */}
            {currentAllocated > 0 && (
              <div className="border-t px-4 py-3 bg-slate-50 flex justify-between text-sm">
                <span className="font-semibold text-slate-700">Total Selection</span>
                <span className="font-bold font-mono">{currentAllocated.toFixed(1)}{unitPref}</span>
              </div>
            )}
          </div>

          {submitErr && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {submitErr}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/production/${batchId}`)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverAllocated || currentAllocated === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><PackageCheck className="w-4 h-4" /> Confirm Packaging</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
