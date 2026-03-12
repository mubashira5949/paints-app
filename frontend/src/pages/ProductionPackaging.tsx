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

interface RunMeta {
  id: number;
  batchId: string;
  status: string;
  planned_quantity_liters: number;
  actual_quantity_liters: number | null;
  color_name: string;
  recipe_name: string;
}

interface PackRow {
  pack_size_liters: string;
  quantity_units: string;
}

export default function ProductionPackaging() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const numericId = batchId?.replace(/^PR-/i, "");

  const [run, setRun] = useState<RunMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pack rows — start with two common sizes
  const [rows, setRows] = useState<PackRow[]>([
    { pack_size_liters: "5", quantity_units: "" },
    { pack_size_liters: "10", quantity_units: "" },
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

  const batchVolume = run?.actual_quantity_liters ?? run?.planned_quantity_liters ?? 0;

  // Compute allocated volume from valid rows
  const allocated = rows.reduce((sum, r) => {
    const size = parseFloat(r.pack_size_liters);
    const qty = parseInt(r.quantity_units);
    if (!isNaN(size) && !isNaN(qty) && size > 0 && qty > 0) {
      return sum + size * qty;
    }
    return sum;
  }, 0);

  const remaining = batchVolume - allocated;
  const isOverAllocated = allocated > batchVolume;

  const addRow = () => {
    setRows((prev) => [...prev, { pack_size_liters: "", quantity_units: "" }]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericId) return;
    setSubmitErr(null);

    const validRows = rows.filter((r) => {
      const size = parseFloat(r.pack_size_liters);
      const qty = parseInt(r.quantity_units);
      return !isNaN(size) && !isNaN(qty) && size > 0 && qty > 0;
    });

    if (validRows.length === 0) {
      setSubmitErr("Please enter at least one valid pack size with quantity.");
      return;
    }

    if (isOverAllocated) {
      setSubmitErr(`Allocated volume (${allocated.toFixed(1)} L) exceeds batch size (${batchVolume} L).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/production-runs/${numericId}/packaging`, {
        method: "POST",
        body: {
          packaging_details: validRows.map((r) => ({
            pack_size_liters: parseFloat(r.pack_size_liters),
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
          {run.color_name} · {run.recipe_name} · {Number(batchVolume).toLocaleString()} L available
        </p>
      </div>

      {/* Volume progress bar */}
      <div className="rounded-xl border bg-card shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Volume Allocated</span>
          <span className={`font-bold font-mono ${isOverAllocated ? "text-red-600" : "text-slate-700"}`}>
            {allocated.toFixed(1)} / {Number(batchVolume).toLocaleString()} L
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${isOverAllocated ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${Math.min((allocated / batchVolume) * 100, 100)}%` }}
          />
        </div>
        <p className={`text-xs ${isOverAllocated ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
          {isOverAllocated
            ? `⚠ Over-allocated by ${(allocated - batchVolume).toFixed(1)} L`
            : `${remaining.toFixed(1)} L remaining`}
        </p>
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
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add size
              </button>
            </div>

            <div className="divide-y">
              {rows.map((row, idx) => {
                const size = parseFloat(row.pack_size_liters);
                const qty = parseInt(row.quantity_units);
                const rowVolume = !isNaN(size) && !isNaN(qty) && size > 0 && qty > 0 ? size * qty : null;

                return (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Pack Size (L)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        placeholder="e.g. 5"
                        value={row.pack_size_liters}
                        onChange={(e) => updateRow(idx, "pack_size_liters", e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
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
                        <span className="text-xs font-mono text-slate-500">{rowVolume.toFixed(1)} L</span>
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
            {allocated > 0 && (
              <div className="border-t px-4 py-3 bg-slate-50 flex justify-between text-sm">
                <span className="font-semibold text-slate-700">Total</span>
                <span className="font-bold font-mono">{allocated.toFixed(1)} L</span>
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
              disabled={isSubmitting || isOverAllocated || allocated === 0}
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
