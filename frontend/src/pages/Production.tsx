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
  Pencil,
  Cog,
  Timer,
  Box,
  BookOpen,
  User,
} from "lucide-react";
import { useUnitPreference, formatUnit, toDisplayValue, fromDisplayValue } from "../utils/units";

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
  actual_quantity_kg?: number | null;
  status: "planned" | "running" | "paused" | "completed" | "packaging";
  started_at: string | null;
  operator: string | null;
  packaging?: { pack_size_kg: number; quantity_units: number }[];
}

const ProgressIndicator = ({ 
  target, 
  actual, 
  color = "blue",
  label = "Progress" 
}: { 
  target: number; 
  actual: number; 
  color?: "blue" | "green" | "purple" | "orange";
  label?: string;
}) => {
  const percentage = target > 0 ? (actual / target) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);
  
  const colorMap = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    purple: "bg-purple-600",
    orange: "bg-orange-500"
  };

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span className={percentage > 100 ? "text-orange-600" : ""}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
        <div 
          className={`h-full ${colorMap[color]} transition-all duration-700 ease-in-out`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      {percentage > 100 && (
        <p className="text-[9px] text-orange-600 font-bold flex items-center gap-1">
          <Activity className="w-2.5 h-2.5" /> High Yield Detected
        </p>
      )}
    </div>
  );
};


export default function Production() {
  const { user } = useAuth();
  const unitPref = useUnitPreference();
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

  // Sorting State for History
  const [sortKey, setSortKey] = useState<"target" | "actual" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filters State
  const [filterSearch, setFilterSearch] = useState("");
  const [filterColor, setFilterColor] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  // New Run Form State
  const [selectedColor, setSelectedColor] = useState<number | "">("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [planned_quantity_kg, setPlannedQuantityKg] = useState<number>(0);
  const [actualResources, setActualResources] = useState<
    { resource_id: number; actual_quantity_used: number }[]
  >([]);

  // Edit Run State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<ActiveRun | null>(null);
  const [editTargetQty, setEditTargetQty] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);


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
      setPlannedQuantityKg(toDisplayValue(Number(recipe.batch_size_kg), unitPref));
      setActualResources(
        recipe.resources.map((res) => ({
          resource_id: res.resource_id,
          actual_quantity_used: res.quantity_required,
        })),
      );
    }
  };

  const handleQuantityChange = (qty: number) => {
    setPlannedQuantityKg(qty);
    if (selectedRecipe) {
      const scaleFactor = fromDisplayValue(qty, unitPref) / Number(selectedRecipe.batch_size_kg);
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
          targetQty: fromDisplayValue(planned_quantity_kg, unitPref),
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun) return;

    setIsEditing(true);
    try {
      await apiRequest(`/production-runs/${editingRun.id}`, {
        method: "PATCH",
        body: {
          targetQty: fromDisplayValue(editTargetQty, unitPref),
        },
      });
      setIsEditModalOpen(false);
      setEditingRun(null);
      await Promise.all([fetchActiveRuns(), fetchMetrics(), fetchHistory()]);
    } catch (err: any) {
      alert(err.message || "Failed to update target quantity");
    } finally {
      setIsEditing(false);
    }
  };

  const handleQuickPackRemaining = async (id: number, planned: number, actual: number | null, packaging: any[] | undefined) => {
    const batchVol = actual ?? planned;
    const currentPackaged = packaging?.reduce((s, p) => s + Number(p.pack_size_kg * p.quantity_units), 0) ?? 0;
    const left = batchVol - currentPackaged;

    if (left <= 0.01) return;

    setUpdatingId(id);
    try {
      await apiRequest(`/production-runs/${id}/packaging`, {
        method: "POST",
        body: {
          packaging_details: [{
            pack_size_kg: left,
            quantity_units: 1
          }]
        }
      });
      await Promise.all([fetchActiveRuns(), fetchMetrics(), fetchHistory()]);
    } catch (err: any) {
      alert(err.message || "Failed to pack remaining volume");
    } finally {
      setUpdatingId(null);
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
              {formatUnit(metrics?.todayProduction ?? 0, unitPref)}
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
              {formatUnit(metrics?.resourceConsumption ?? 0, unitPref)}
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
              {metrics?.variance && metrics.variance > 0 ? "+" : ""}
              {formatUnit(metrics?.variance ?? 0, unitPref)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual vs Planned (Today)
            </p>
          </div>
        </div>
      </div>

      {/* Global Filters */}
      <div className="rounded-xl border bg-white shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Batch ID..."
              className="pl-10 w-full rounded-lg border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">All Colors</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="packaging">Packaging</option>
              <option value="planned">Planned</option>
            </select>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 rounded-lg p-1 border border-slate-200">
            <input
              type="date"
              className="w-full md:w-32 rounded-md bg-transparent px-2 py-1 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              value={filterFromDate}
              onChange={(e) => setFilterFromDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs font-medium">to</span>
            <input
              type="date"
              className="w-full md:w-32 rounded-md bg-transparent px-2 py-1 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              value={filterToDate}
              onChange={(e) => setFilterToDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 md:items-start pt-2">
        {/* Create Run Card / Quick Actions */}
        <div className="md:col-span-1 space-y-6 md:sticky md:top-6">
          <div
            className="rounded-xl border border-transparent bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg p-6 flex flex-col items-center justify-center text-center space-y-4 h-64 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="p-4 bg-white/20 text-white rounded-full shadow-inner group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
              <Plus className="h-10 w-10" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white tracking-tight">
                Start New Batch
              </h3>
              <p className="text-sm text-blue-100 mt-2 px-2 font-medium">
                Create a batch using a selected recipe tracking realtime usage.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-10">
          {/* Active Runs */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold flex items-center text-slate-800">
                <Droplets className="mr-3 h-5 w-5 text-blue-500" />
                Active Production Runs
              </h2>
              <div className="flex items-center gap-3">
                {activeRuns.length > 0 && (
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200 shadow-sm">
                    {activeRuns.length} active
                  </span>
                )}
                {activeRuns.length > 2 && (
                  <button 
                    onClick={() => setShowAllActive(!showAllActive)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-bold transition-colors"
                  >
                    {showAllActive ? 'Hide' : 'See All'}
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {isActiveLoading ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-white rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="font-medium">Loading active runs...</p>
                </div>
              ) : activeRuns.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-bold">No active batches</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                    There are no production batches currently in progress.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {activeRuns
                    .filter((run) => {
                      if (filterSearch && !run.batchId.toLowerCase().includes(filterSearch.toLowerCase())) return false;
                      if (filterColor && colors.find(c => c.id === filterColor)?.name !== run.color) return false;
                      if (filterStatus && filterStatus !== "All" && run.status !== filterStatus) return false;
                      // Date filtering is usually complex for active runs (they are active now), so skipping date filter or keeping it for history mostly, but let's do a simple check on started_at if requested
                      if (filterFromDate && run.started_at && new Date(run.started_at) < new Date(filterFromDate)) return false;
                      if (filterToDate && run.started_at && new Date(run.started_at) > new Date(filterToDate)) return false;
                      return true;
                    })
                    .slice(0, showAllActive ? undefined : 2).map((run) => {
                    const isUpdating = updatingId === run.id;
                    const statusConfig: Record<string, { label: string; className: string; icon: any; color: "blue" | "green" | "purple" | "orange" }> = {
                      planned:   { label: "Planned",   className: "bg-slate-100 text-slate-700", icon: Activity, color: "blue" },
                      running:   { label: "Running",   className: "bg-blue-100 text-blue-800", icon: Cog, color: "blue" },
                      paused:    { label: "Paused", className: "bg-amber-100 text-amber-800", icon: Timer, color: "orange" },
                      packaging: { label: "Packaging", className: "bg-purple-100 text-purple-800", icon: Box, color: "purple" },
                      completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2, color: "green" },
                    };
                    const sc = statusConfig[run.status] ?? statusConfig.planned;
                    const StatusIcon = sc.icon;

                    // Progress logic:
                    const produced = run.actual_quantity_kg ?? 0;
                    const packaged = run.packaging?.reduce((s, p) => s + (p.pack_size_kg * p.quantity_units), 0) ?? 0;
                    
                    let progressLabel = "Production Progress";
                    let currentVal = (run.status === 'running' || run.status === 'paused') ? 0 : produced;
                    let targetVal = run.targetQty;
                    let barColor = sc.color;

                    if (run.status === 'packaging') {
                      progressLabel = "Packaging Progress";
                      currentVal = packaged;
                      targetVal = produced || run.targetQty;
                      barColor = "purple";
                    } else if (run.status === 'completed' || run.status === 'packaging') {
                      currentVal = produced || run.targetQty;
                    }

                    return (
                      <div key={run.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden">
                        <div className="p-5">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                              <div className="px-3 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-bold text-xs ring-1 ring-slate-200 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                                {run.batchId}
                              </div>
                              <h3 className="font-extrabold text-slate-900 tracking-tight">{run.color}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${sc.className}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {sc.label}
                              </span>
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipe</p>
                                <p className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                  {run.recipe}
                                </p>
                              </div>
                              <div className="flex gap-10">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Target</p>
                                  <p className="text-base font-black text-slate-800">{formatUnit(run.targetQty, unitPref)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Actual</p>
                                  <p className="text-base font-black text-slate-800">
                                    {run.actual_quantity_kg != null ? formatUnit(run.actual_quantity_kg, unitPref) : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 self-center">
                              <ProgressIndicator 
                                label={progressLabel}
                                target={targetVal}
                                actual={currentVal}
                                color={barColor}
                              />
                            </div>
                          </div>

                          {/* Footer / Actions */}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <User className="w-3.5 h-3.5 text-slate-300" />
                              {run.operator ?? 'System'}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isUpdating ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-widest">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> UPDATING...
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => navigate(`/production/${run.batchId}`)}
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span className="hidden sm:inline">Details</span>
                                  </button>

                                  {(run.status === "planned" || run.status === "running") && (
                                    <button
                                      onClick={() => {
                                        setEditingRun(run);
                                        setEditTargetQty(toDisplayValue(run.targetQty, unitPref));
                                        setIsEditModalOpen(true);
                                      }}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit Batch"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                  )}
                                  
                                  {(run.status === "planned" || run.status === "paused") && (
                                    <button
                                      onClick={() => updateStatus(run.id, "running")}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" /> START
                                    </button>
                                  )}

                                  {run.status === "running" && (
                                    <button
                                      onClick={() => updateStatus(run.id, "paused")}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95"
                                    >
                                      <Pause className="w-3.5 h-3.5 fill-current" /> PAUSE
                                    </button>
                                  )}

                                  {(run.status === "running" || run.status === "paused") && (
                                    <button
                                      onClick={() => updateStatus(run.id, "completed")}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETE
                                    </button>
                                  )}

                                  {(run.status === "completed" || run.status === "packaging") && (
                                    <button
                                      onClick={() => navigate(`/production/${run.batchId}/packaging`)}
                                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm active:scale-95"
                                    >
                                      <Box className="w-3.5 h-3.5" /> PACKAGE
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  <tr className="border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
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
                    <th 
                      className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-200/50 hover:text-slate-800 transition-colors group select-none"
                      onClick={() => {
                        if (sortKey === "target") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortKey("target");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Target
                        <span className="text-[8px] text-slate-400 group-hover:text-blue-500">
                          {sortKey === "target" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                    <th 
                      className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-200/50 hover:text-slate-800 transition-colors group select-none"
                      onClick={() => {
                        if (sortKey === "actual") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortKey("actual");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Actual
                        <span className="text-[8px] text-slate-400 group-hover:text-blue-500">
                          {sortKey === "actual" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
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
                <tbody className="divide-y divide-slate-100">
                  {isHistoryLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-8 text-center animate-pulse text-muted-foreground bg-slate-50/50"
                      >
                        <Loader2 className="inline w-5 h-5 animate-spin mr-2 text-blue-500" />
                        Loading history...
                      </td>
                    </tr>
                  ) : historyRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-12 text-center text-slate-500 bg-slate-50/50"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Activity className="w-8 h-8 text-slate-300" />
                          <p>No production runs found matching the criteria.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    [...historyRuns]
                      .sort((a, b) => {
                        if (!sortKey) return 0;
                        let valA = 0;
                        let valB = 0;
                        if (sortKey === "target") {
                          valA = a.planned_quantity_kg;
                          valB = b.planned_quantity_kg;
                        } else if (sortKey === "actual") {
                          valA = a.actual_quantity_kg ?? a.planned_quantity_kg;
                          valB = b.actual_quantity_kg ?? b.planned_quantity_kg;
                        }
                        
                        if (sortOrder === "asc") return valA - valB;
                        return valB - valA;
                      })
                      .slice(0, showAllHistory ? undefined : 2)
                      .map((run) => {
                      const expected = run.planned_quantity_kg;
                      const actual = run.actual_quantity_kg ?? expected;
                      const variance = typeof run.variance === "number" ? run.variance : (actual - expected);
                      const variancePct = expected > 0 ? (variance / expected) * 100 : 0;

                      const timelineStep =
                        run.status === "completed"
                          ? run.packaging && run.packaging.length > 0
                            ? 4
                            : 3
                          : run.status === "running"
                            ? 2
                            : 1;

                      const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
                        completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800" },
                        planned:   { label: "Planned",   icon: Activity,     className: "bg-slate-100 text-slate-700" },
                        paused:    { label: "Paused",    icon: Timer,        className: "bg-amber-100 text-amber-800" },
                        packaging: { label: "Packaging", icon: Box,          className: "bg-purple-100 text-purple-800" },
                        running:   { label: "Running",   icon: Cog,          className: "bg-blue-100 text-blue-800" },
                      };
                      const sc = statusConfig[run.status] || statusConfig.planned;
                      const StatusIcon = sc.icon;

                      return (
                        <tr
                          key={run.id}
                          className="hover:bg-slate-50/50 transition-colors border-b last:border-0 cursor-pointer group"
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
                                      : "bg-slate-100"
                                  }`}
                                  title={
                                    step === 1 ? "Planned" : 
                                    step === 2 ? "Started" : 
                                    step === 3 ? "Produced" : "Packaged"
                                  }
                                />
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-slate-500 font-mono font-bold text-xs border-r group-hover:text-blue-600 transition-colors">
                            {run.batchId}
                          </td>
                          <td className="p-4 font-bold text-slate-900 border-r">
                            {run.color_name}
                          </td>
                          <td className="p-4 text-slate-500 text-xs border-r italic">
                            {run.recipe_name}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-400 border-r">
                            {formatUnit(expected, unitPref)}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-900 font-black border-r">
                            {actual != null ? formatUnit(actual, unitPref) : "—"}
                          </td>
                          <td className="px-5 py-3 text-center border-r min-w-[160px]">
                             <ProgressIndicator 
                              target={expected}
                              actual={actual}
                              color={Math.abs(variancePct) > 5 ? "orange" : "green"}
                              label="Yield Efficiency"
                            />
                          </td>
                          <td className="p-4 text-center border-r">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${sc.className}`}>
                              <StatusIcon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="p-4 text-right w-[180px]">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/production/${run.batchId}`);
                                }}
                                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium text-[14px] transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Details</span>
                              </button>

                              {(() => {
                                const isPackaging = run.status === "packaging";
                                const batchVol = run.actual_quantity_kg ?? run.planned_quantity_kg;
                                const currentPackaged = run.packaging?.reduce((s, p) => s + Number(p.pack_size_kg * p.quantity_units), 0) ?? 0;
                                const hasRemaining = batchVol - currentPackaged > 0.01;
                                const showQuickPack = isPackaging && hasRemaining;

                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickPackRemaining(run.id, run.planned_quantity_kg, run.actual_quantity_kg, run.packaging);
                                    }}
                                    disabled={updatingId === run.id || !showQuickPack}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg transition-all disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest border border-purple-100 min-w-[110px] ${
                                      !showQuickPack ? "invisible" : ""
                                    }`}
                                  >
                                    {updatingId === run.id && showQuickPack ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <PackageCheck className="w-3.5 h-3.5" />}
                                    <span>Quick Pack</span>
                                  </button>
                                );
                              })()}
                            </div>
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
                        Planned Quantity ({unitPref})
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-24 rounded-md border bg-background px-3 py-1 text-sm text-right font-mono"
                        value={planned_quantity_kg}
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
                            fromDisplayValue(planned_quantity_kg, unitPref) /
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

      {/* Edit Production Run Modal */}
      {isEditModalOpen && editingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">Edit Run: {editingRun.batchId}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Target Quantity ({unitPref})</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={editTargetQty}
                  onChange={(e) => setEditTargetQty(Number(e.target.value))}
                  className="w-full rounded-md border text-sm p-2 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
                  disabled={isEditing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing || editTargetQty <= 0}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
