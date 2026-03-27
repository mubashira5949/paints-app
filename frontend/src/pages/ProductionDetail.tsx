import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import {
  ArrowLeft,
  Activity,
  Droplets,
  FlaskConical,
  PackageCheck,
  User,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Box,
} from "lucide-react";
import { useUnitPreference, formatUnit } from "../utils/units";

interface ResourceActual {
  resource_id: number;
  name: string;
  unit: string;
  actual_qty: number | null;
  expected_qty: number;
  variance: number | null;
  variance_flag: boolean;
}

interface ResourceExpected {
  resource_id: number;
  name: string;
  unit: string;
  expected_qty: number;
}

interface PackagingEntry {
  pack_size_kg: number;
  quantity_units: number;
  volume_kg: number;
}

interface RunDetail {
  id: number;
  batchId: string;
  status: string;
  planned_quantity_kg: number;
  actual_quantity_kg: number | null;
  variance: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  recipe_id: number;
  recipe_name: string;
  recipe_version: string;
  batch_size_kg: number;
  color_name: string;
  color_code: string;
  operator: string | null;
  expected_resources: ResourceExpected[];
  actual_resources: ResourceActual[];
  packaging: PackagingEntry[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  planned:   { label: "Planned",   className: "bg-slate-100 text-slate-700" },
  running:   { label: "Running",   className: "bg-blue-100 text-blue-800" },
  paused:    { label: "Paused",    className: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
  packaging: { label: "Packaging", className: "bg-purple-100 text-purple-800" },
};

export default function ProductionDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const unitPref = useUnitPreference();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse numeric id from "PR-5" → 5
  const numericId = batchId?.replace(/^PR-/i, "");

  useEffect(() => {
    if (!numericId) return;
    setIsLoading(true);
    apiRequest<RunDetail>(`/production-runs/${numericId}`)
      .then(setRun)
      .catch((err) => setError(err.message ?? "Failed to load run details"))
      .finally(() => setIsLoading(false));
  }, [numericId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading run details…
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="text-center py-20 text-red-500">
        <AlertTriangle className="mx-auto w-8 h-8 mb-2" />
        {error ?? "Run not found"}
        <div className="mt-4">
          <Link to="/production" className="text-blue-600 hover:underline text-sm">
            ← Back to Production
          </Link>
        </div>
      </div>
    );
  }

  const sc = statusConfig[run.status] ?? statusConfig.planned;
  const packaged = run.packaging.reduce((s, p) => s + Number(p.volume_kg), 0);
  const hasActuals = run.actual_resources.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate("/production")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Production
        </button>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${sc.className}`}>
          {sc.label}
        </span>
      </div>

      {/* Title block */}
      <div className="rounded-xl border bg-card shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Batch</p>
          <h1 className="text-3xl font-bold font-mono tracking-tight">{run.batchId}</h1>
          <p className="text-muted-foreground text-sm mt-1">{run.color_name} · {run.recipe_name} {run.recipe_version}</p>
        </div>
        {run.status === "completed" && run.packaging.length === 0 && (
          <Link
            to={`/production/${run.batchId}/packaging`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <PackageCheck className="w-4 h-4" /> Start Packaging
          </Link>
        )}
        {run.status === "completed" && run.packaging.length > 0 && (
          <Link
            to={`/production/${run.batchId}/packaging`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-300 hover:bg-blue-50 text-blue-700 font-semibold text-sm transition-colors"
          >
            <PackageCheck className="w-4 h-4" /> Add More Packaging
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-muted-foreground font-medium">Target</span>
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{formatUnit(run.planned_quantity_kg, unitPref)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-muted-foreground font-medium">Actual</span>
            <Activity className="w-3.5 h-3.5 text-green-500" />
          </div>
          <p className="text-2xl font-bold">
            {run.actual_quantity_kg != null
              ? formatUnit(run.actual_quantity_kg, unitPref)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-muted-foreground font-medium">Variance</span>
            <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <p className={`text-2xl font-bold ${run.variance > 0 ? "text-green-600" : run.variance < 0 ? "text-orange-500" : "text-muted-foreground"}`}>
            {run.variance > 0 ? "+" : ""}{formatUnit(run.variance, unitPref)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-muted-foreground font-medium">Packaged</span>
            <Box className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold">{packaged > 0 ? formatUnit(packaged, unitPref) : "—"}</p>
        </div>
      </div>

      {/* Meta info */}
      <div className="rounded-xl border bg-card shadow-sm p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Operator</p>
          <div className="flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            {run.operator ?? "—"}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Recipe</p>
          <div className="flex items-center gap-1.5 font-medium">
            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
            {run.recipe_name} {run.recipe_version && <span className="text-muted-foreground text-xs">v{run.recipe_version}</span>}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Batch Size</p>
          <p className="font-medium">{formatUnit(run.batch_size_kg, unitPref)}</p>
        </div>
        {run.started_at && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Started</p>
            <p className="font-medium">{new Date(run.started_at).toLocaleString()}</p>
          </div>
        )}
        {run.completed_at && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Completed</p>
            <p className="font-medium">{new Date(run.completed_at).toLocaleString()}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Created</p>
          <p className="font-medium">{new Date(run.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Resources Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-blue-500" />
          <h2 className="font-semibold text-sm">Resource Consumption</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50">
                <th className="px-4 h-10 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Material</th>
                <th className="px-4 h-10 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Expected</th>
                <th className="px-4 h-10 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Actual</th>
                <th className="px-4 h-10 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Variance</th>
                <th className="px-4 h-10 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!hasActuals ? (
                // Show expected resources only (run not yet completed)
                run.expected_resources.map((r) => (
                  <tr key={r.resource_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{Number(r.expected_qty).toFixed(4)} {r.unit}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                  </tr>
                ))
              ) : (
                run.actual_resources.map((r) => {
                  const v = Number(r.variance ?? 0);
                  const varColor = r.variance_flag
                    ? "text-red-700 bg-red-100 font-bold"
                    : v > 0
                    ? "text-green-600 bg-green-50"
                    : v < 0
                    ? "text-orange-600 bg-orange-50"
                    : "text-slate-500 bg-slate-50";
                  return (
                    <tr key={r.resource_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-500">{Number(r.expected_qty).toFixed(4)} {r.unit}</td>
                      <td className="px-4 py-3 text-center font-mono font-semibold">{r.actual_qty != null ? Number(r.actual_qty).toFixed(4) : "—"} {r.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${varColor}`}>
                          {v > 0 ? "+" : ""}{v.toFixed(4)} {r.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.variance_flag ? (
                          <AlertTriangle className="inline w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <CheckCircle2 className="inline w-3.5 h-3.5 text-green-500" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              {run.expected_resources.length === 0 && !hasActuals && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No resource data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packaging Summary */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-purple-500" />
            <h2 className="font-semibold text-sm">Packaging</h2>
          </div>
          {run.status === "completed" && (
            <Link
              to={`/production/${run.batchId}/packaging`}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              {run.packaging.length > 0 ? "Manage" : "Start Packaging →"}
            </Link>
          )}
        </div>
        {run.packaging.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {run.status === "completed" ? (
              <>
                <PackageCheck className="mx-auto w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm font-medium">Ready to pack</p>
                <p className="text-xs mt-1">
                  <Link to={`/production/${run.batchId}/packaging`} className="text-blue-600 hover:underline font-semibold">
                    Start Packaging →
                  </Link>
                </p>
              </>
            ) : (
              <p className="text-sm">No packaging yet — complete the run first.</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {run.packaging.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-purple-50 rounded-md">
                    <Box className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-semibold">{formatUnit(p.pack_size_kg, unitPref)} (Size)</span>
                  <span className="text-muted-foreground">× {p.quantity_units} units</span>
                </div>
                <span className="font-mono text-muted-foreground text-xs">{formatUnit(p.volume_kg, unitPref)} total</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 text-sm border-t">
              <div className="flex-1 mr-8">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">Packaging Progress</span>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {((packaged / (run.actual_quantity_kg ?? run.planned_quantity_kg)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((packaged / (run.actual_quantity_kg ?? run.planned_quantity_kg)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 flex justify-between">
                  <span>{formatUnit(packaged, unitPref)} done</span>
                  <span>{formatUnit(Math.max(0, (run.actual_quantity_kg ?? run.planned_quantity_kg) - packaged), unitPref)} left to pack</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Packaged</span>
                <span className="font-bold font-mono text-base">{formatUnit(packaged, unitPref)}
                  <span className="text-muted-foreground font-normal text-xs ml-1.5">/ {formatUnit(run.actual_quantity_kg ?? run.planned_quantity_kg, unitPref)}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
