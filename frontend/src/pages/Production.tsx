import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Play,
  Pause,
  Plus,
  X,
  FlaskConical,
  PackageCheck,
  Activity,
  Droplets,
  Search,
  Calendar,
  Settings,
  Eye,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Resource {
  resource_id: number;
  name: string;
  unit: string;
  quantity_required: number;
}

interface Recipe {
  id: number;
  name: string;
  version: string;
  batch_size_kg: number;
  resources: Resource[];
}

interface Color {
  id: number;
  name: string;
  color_code: string;
}

interface Metrics {
  activeRuns: number;
  todayProduction: number;
  resourceConsumption: number;
  variance: number;
}

interface HistoryRun {
  id: number;
  batchId: string;
  status: string;
  planned_quantity_kg: number;
  actual_quantity_kg: number;
  variance: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  recipe_name: string;
  color_name: string;
  packaging?: { pack_size_kg: number; quantity_units: number }[];
}

interface ActiveRun {
  id: number;
  batchId: string;
  color: string;
  recipe: string;
  targetQty: number;
  status: "planned" | "running" | "paused" | "completed" | "packaging";
  started_at: string | null;
  operator: string | null;
}


export default function Production() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [colors, setColors] = useState<Color[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [isActiveLoading, setIsActiveLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);

  // Filters State
  const [filterSearch, setFilterSearch] = useState("");
  const [filterColor, setFilterColor] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  // New Run Form State
  const [selectedColor, setSelectedColor] = useState<number | "">("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [plannedQuantity, setPlannedQuantity] = useState<number>(0);
  const [actualResources, setActualResources] = useState<
    { resource_id: number; actual_quantity_used: number }[]
  >([]);


  const fetchMetrics = async () => {
    try {
      const data = await apiRequest<Metrics>("/production-runs/metrics");
      setMetrics(data);
    } catch (err) {
      console.error("Failed to fetch metrics", err);
    }
  };

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSearch) params.append("search", filterSearch);
      if (filterColor) {
        const colorObj = colors.find((c) => c.id === filterColor);
        if (colorObj) params.append("color", colorObj.name);
      }
      if (filterStatus && filterStatus !== "All") params.append("status", filterStatus);
      if (filterFromDate) params.append("start", filterFromDate);
      if (filterToDate) params.append("end", filterToDate);
      const data = await apiRequest<HistoryRun[]>(`/production-runs/history?${params.toString()}`);
      setHistoryRuns(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const fetchColors = async () => {
    try {
      const data = await apiRequest<Color[]>("/colors");
      setColors(data);
    } catch (err) {
      console.error("Failed to fetch colors", err);
    }
  };

  // ── Fetch active (non-completed) runs from dedicated endpoint ──
  const fetchActiveRuns = async () => {
    setIsActiveLoading(true);
    try {
      const data = await apiRequest<ActiveRun[]>("/production-runs/active");
      setActiveRuns(data);
    } catch (err) {
      console.error("Failed to fetch active runs", err);
    } finally {
      setIsActiveLoading(false);
    }
  };

  // ── Update a run's status via PATCH ──
  const updateStatus = async (id: number, status: ActiveRun["status"]) => {
    setUpdatingId(id);
    try {
      await apiRequest(`/production-runs/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await Promise.all([fetchActiveRuns(), fetchMetrics(), fetchHistory()]);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterSearch, filterColor, filterStatus, filterFromDate, filterToDate]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    Promise.all([fetchColors(), fetchActiveRuns()]);
  }, []);

  // Auto-refresh active runs every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchActiveRuns, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedColor) {
      apiRequest<Recipe[]>(`/recipes/${selectedColor}`)
        .then(setRecipes)
        .catch(console.error);
    } else {
      setRecipes([]);
    }
  }, [selectedColor]);

  const handleRecipeSelect = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === Number(recipeId)) || null;
    setSelectedRecipe(recipe);
    if (recipe) {
      setPlannedQuantity(Number(recipe.batch_size_kg));
      setActualResources(
        recipe.resources.map((res) => ({
          resource_id: res.resource_id,
          actual_quantity_used: res.quantity_required,
        })),
      );
    }
  };

  const handleQuantityChange = (qty: number) => {
    setPlannedQuantity(qty);
    if (selectedRecipe) {
      const scaleFactor = qty / Number(selectedRecipe.batch_size_kg);
      setActualResources(
        selectedRecipe.resources.map((res) => ({
          resource_id: res.resource_id,
          actual_quantity_used: Number(
            (res.quantity_required * scaleFactor).toFixed(4),
          ),
        })),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !selectedColor) return;

    try {
      await apiRequest("/production-runs/plan", {
        method: "POST",
        body: {
          recipeId: selectedRecipe.id,
          colorId: Number(selectedColor),
          targetQty: plannedQuantity,
          operatorId: user?.id ?? 1,
        },
      });
      setIsModalOpen(false);
      await Promise.all([fetchActiveRuns(), fetchMetrics(), fetchHistory()]);
      // Reset form
      setSelectedColor("");
      setSelectedRecipe(null);
    } catch (err: any) {
      alert(err.message);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Settings className="mr-3 h-8 w-8 text-blue-600" />
            Production Runs
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Manage manufacturing workflows and track resource consumption.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Active Runs
            </h3>
            <Activity className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">
              {metrics?.activeRuns ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running batches
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Today's Production
            </h3>
            <Droplets className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">
              {(metrics?.todayProduction ?? 0).toLocaleString()}{" "}
              <span className="text-base text-muted-foreground font-normal">L</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Paint produced today
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Resource Consumption
            </h3>
            <FlaskConical className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">
              {(metrics?.resourceConsumption ?? 0).toLocaleString()}{" "}
              <span className="text-base text-muted-foreground font-normal">KG</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Raw material used today
            </p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Production Variance
            </h3>
            <Activity className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <div
              className={`text-3xl font-bold ${
                (metrics?.variance ?? 0) > 0
                  ? "text-green-600"
                  : (metrics?.variance ?? 0) < 0
                  ? "text-orange-500"
                  : "text-muted-foreground"
              }`}
            >
              {(metrics?.variance ?? 0) > 0 ? "+" : ""}
              {(metrics?.variance ?? 0).toFixed(1)}L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual vs Planned (Today)
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 md:items-start pt-4">
        {/* Create Run Card / Quick Actions */}
        <div className="md:col-span-1 space-y-6 md:sticky md:top-6">
          <div
            className="rounded-xl border border-transparent bg-blue-600 shadow-lg p-6 flex flex-col items-center justify-center text-center space-y-4 h-64 hover:bg-blue-700 hover:shadow-xl transition-all cursor-pointer group"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="p-4 bg-white/20 text-white rounded-full shadow-sm group-hover:bg-white/30 transition-colors">
              <Plus className="h-10 w-10" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">
                Start New Production Batch
              </h3>
              <p className="text-sm text-blue-100 mt-2 px-2">
                Create a batch using a selected recipe and record actual
                resource usage.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-10">
          {/* Active Runs Table */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold flex items-center">
                <Droplets className="mr-3 h-5 w-5 text-blue-500" />
                Active Production Runs
              </h2>
              <div className="flex items-center gap-3">
                {activeRuns.length > 0 && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                    {activeRuns.length} batch{activeRuns.length !== 1 ? "es" : ""}
                  </span>
                )}
                {activeRuns.length > 2 && (
                  <button 
                    onClick={() => setShowAllActive(!showAllActive)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showAllActive ? 'View Less' : 'View All'}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">Batch ID</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">Color</th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">Recipe</th>
                    <th className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">Target Qty</th>
                    <th className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">Status</th>
                    <th className="h-12 px-4 text-right align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isActiveLoading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                        Loading active runs...
                      </td>
                    </tr>
                  ) : activeRuns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <FlaskConical className="w-8 h-8 opacity-30" />
                          <p className="text-sm font-medium">No active runs</p>
                          <p className="text-xs">Plan a new batch to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeRuns.slice(0, showAllActive ? undefined : 2).map((run) => {
                      const isUpdating = updatingId === run.id;
                      const statusConfig: Record<string, { label: string; className: string }> = {
                        planned:   { label: "Planned",   className: "bg-slate-100 text-slate-700" },
                        running:   { label: "Running",   className: "bg-blue-100 text-blue-800" },
                        paused:    { label: "Paused",    className: "bg-amber-100 text-amber-800" },
                        packaging: { label: "Packaging", className: "bg-purple-100 text-purple-800" },
                        completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
                      };
                      const sc = statusConfig[run.status] ?? statusConfig.planned;

                      return (
                        <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-blue-600 tracking-tight font-mono">
                            {run.batchId}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{run.color}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{run.recipe}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">
                            {Number(run.targetQty).toLocaleString()}L
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${sc.className}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              ) : (
                                <>
                                  {/* Start: only when planned or paused */}
                                  {(run.status === "planned" || run.status === "paused") && (
                                    <button
                                      onClick={() => updateStatus(run.id, "running")}
                                      title="Start"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                                    >
                                      <Play className="w-3 h-3" /> Start
                                    </button>
                                  )}
                                  {/* Pause: only when running */}
                                  {run.status === "running" && (
                                    <button
                                      onClick={() => updateStatus(run.id, "paused")}
                                      title="Pause"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm"
                                    >
                                      <Pause className="w-3 h-3" /> Pause
                                    </button>
                                  )}
                                  {/* Complete: when running or paused */}
                                  {(run.status === "running" || run.status === "paused") && (
                                    <button
                                      onClick={() => updateStatus(run.id, "completed")}
                                      title="Complete"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> Complete
                                    </button>
                                  )}
                                  {/* View Details: always */}
                                  <button
                                    onClick={() => navigate(`/production/${run.batchId}`)}
                                    title="View Details"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" /> Details
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* History Runs Table */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b flex flex-col gap-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-green-500" />
                  Production History
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {historyRuns.length} run{historyRuns.length !== 1 ? "s" : ""}
                  </span>
                  {historyRuns.length > 2 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      {showAllHistory ? 'View Less' : 'View All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search Batch ID..."
                    className="pl-9 w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
                <div>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                    value={filterColor}
                    onChange={(e) =>
                      setFilterColor(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">All Colors</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="running">Running</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 outline-none"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    type="date"
                    className="flex-1 rounded-md border bg-background px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 outline-none"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Timeline
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Batch ID
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Color
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Recipe
                    </th>
                    <th className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Target
                    </th>
                    <th className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Actual
                    </th>
                    <th className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Var.
                    </th>
                    <th className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Status
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isHistoryLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-6 text-center animate-pulse text-muted-foreground"
                      >
                        <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                        Loading history...
                      </td>
                    </tr>
                  ) : historyRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-6 text-center text-muted-foreground"
                      >
                        No production runs found.
                      </td>
                    </tr>
                  ) : (
                    (showAllHistory ? historyRuns : historyRuns.slice(0, 2)).map((run) => {
                      const expected = run.planned_quantity_kg;
                      const actual = run.actual_quantity_kg ?? expected;
                      // variance comes pre-computed from the server
                      const variance = typeof run.variance === "number" ? run.variance : (actual - expected);
                      const variancePct = expected > 0 ? (variance / expected) * 100 : 0;

                      // Color thresholds: green ≤ 2%, yellow ≤ 5%, red > 5%
                      let varianceColorClass = "text-green-600 bg-green-50/50";
                      if (variance < 0) {
                        varianceColorClass = Math.abs(variancePct) > 5
                          ? "text-red-700 bg-red-100 font-bold"
                          : "text-orange-600 bg-orange-50";
                      } else if (variance > 0) {
                        varianceColorClass = "text-green-600 bg-green-50";
                      } else {
                        varianceColorClass = "text-slate-500 bg-slate-50";
                      }

                      const timelineStep =
                        run.status === "completed"
                          ? run.packaging && run.packaging.length > 0
                            ? 4
                            : 3
                          : run.status === "running"
                            ? 2
                            : 1;

                      return (
                        <tr
                          key={run.id}
                          className="hover:bg-gray-50 transition-colors border-b last:border-0 cursor-pointer"
                          onClick={() => navigate(`/production/${run.batchId}`)}
                        >
                          <td className="p-4 border-r">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((step) => (
                                <div
                                  key={step}
                                  className={`h-1.5 w-3 rounded-full ${
                                    step <= timelineStep
                                      ? step === 4
                                        ? "bg-green-500"
                                        : "bg-blue-500"
                                      : "bg-muted"
                                  }`}
                                  title={
                                    step === 1
                                      ? "Planned"
                                      : step === 2
                                        ? "Started"
                                        : step === 3
                                          ? "Produced"
                                          : "Packaged"
                                  }
                                />
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground font-mono font-medium border-r">
                            {run.batchId}
                          </td>
                          <td className="p-4 font-medium text-foreground border-r">
                            {run.color_name}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs border-r">
                            {run.recipe_name}
                          </td>
                          <td className="p-4 text-center font-mono text-muted-foreground border-r">
                            {Number(expected).toLocaleString()}L
                          </td>
                          <td className="p-4 text-center font-mono text-foreground font-semibold border-r">
                            {actual != null ? Number(actual).toLocaleString() + "L" : "—"}
                          </td>
                          <td className="p-4 text-center border-r">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${varianceColorClass}`}
                            >
                              {variance > 0 ? "+" : ""}
                              {Number(variance).toFixed(1)}L
                            </span>
                          </td>
                          <td className="p-4 text-center border-r">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                run.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : run.status === "planned"
                                  ? "bg-slate-100 text-slate-700"
                                  : run.status === "paused"
                                  ? "bg-amber-100 text-amber-800"
                                  : run.status === "packaging"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {run.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => navigate(`/production/${run.batchId}`)}
                              className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-700 hover:underline"
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Details
                            </button>
                            {run.status === "completed" && (
                              <button
                                onClick={() => navigate(`/production/${run.batchId}/packaging`)}
                                className="ml-3 inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <PackageCheck className="mr-1 h-3.5 w-3.5" />
                                Package
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {historyRuns.length > 2 && (
              <div className="p-3 border-t bg-slate-50 flex justify-center">
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showAllHistory ? "View Less" : `View All (${historyRuns.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Production Run Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">New Production Run</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Color</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    value={selectedColor}
                    onChange={(e) =>
                      setSelectedColor(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    required
                  >
                    <option value="">Choose a color...</option>
                    {colors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Recipe</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    disabled={!selectedColor}
                    value={selectedRecipe?.id || ""}
                    onChange={(e) => handleRecipeSelect(e.target.value)}
                    required
                  >
                    <option value="">
                      {selectedColor
                        ? "Choose a recipe..."
                        : "Select color first"}
                    </option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (v{r.version})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRecipe && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium">
                        Planned Quantity (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-24 rounded-md border bg-background px-3 py-1 text-sm text-right font-mono"
                        value={plannedQuantity}
                        onChange={(e) =>
                          handleQuantityChange(Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center mb-3">
                        <FlaskConical className="mr-1 h-4 w-4" />
                        Resource Consumption Details
                      </p>

                      <div className="grid gap-0">
                        <div className="grid grid-cols-12 gap-2 pb-2 mb-2 border-b text-xs font-medium text-muted-foreground">
                          <div className="col-span-5">Resource</div>
                          <div className="col-span-3 text-right">Expected</div>
                          <div className="col-span-4 text-right pr-6">
                            Actual
                          </div>
                        </div>
                        {selectedRecipe.resources.map((res, idx) => {
                          const scaleFactor =
                            plannedQuantity /
                            Number(selectedRecipe.batch_size_kg);
                          const expectedQty = Number(
                            (res.quantity_required * scaleFactor).toFixed(4),
                          );
                          return (
                            <div
                              key={res.resource_id}
                              className="grid grid-cols-12 gap-2 items-center text-sm py-1.5 border-b border-dashed last:border-0"
                            >
                              <div
                                className="col-span-5 truncate pr-2"
                                title={res.name}
                              >
                                {res.name}
                              </div>
                              <div className="col-span-3 text-right font-mono text-muted-foreground">
                                {expectedQty} {res.unit}
                              </div>
                              <div className="col-span-4 flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  step="0.0001"
                                  className="w-20 rounded-md border bg-background px-2 py-1 text-xs text-right font-mono focus:ring-1 focus:ring-blue-600 outline-none"
                                  value={
                                    actualResources.find(
                                      (ar) =>
                                        ar.resource_id === res.resource_id,
                                    )?.actual_quantity_used || 0
                                  }
                                  onChange={(e) => {
                                    const newActuals = [...actualResources];
                                    newActuals[idx].actual_quantity_used =
                                      Number(e.target.value);
                                    setActualResources(newActuals);
                                  }}
                                />
                                <span className="text-muted-foreground w-6 text-xs">
                                  {res.unit}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRecipe}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
