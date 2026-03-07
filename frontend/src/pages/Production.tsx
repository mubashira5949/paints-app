import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import {
  Play,
  Plus,
  X,
  FlaskConical,
  PackageCheck,
  Activity,
  Droplets,
  Search,
  Calendar,
  Settings,
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
  batch_size_liters: number;
  resources: Resource[];
}

interface Color {
  id: number;
  name: string;
  color_code: string;
}

interface ProductionRun {
  id: number;
  status: string;
  planned_quantity_liters: number;
  actual_quantity_liters: number;
  started_at: string;
  completed_at: string;
  recipe_name: string;
  color_name: string;
  created_at: string;
  packaging?: { pack_size_liters: number; quantity_units: number }[];
}

interface ProductionSummary {
  active_runs: number;
  todays_production_liters: number;
  resource_consumption_kg: number;
  production_variance_percent: number;
}

export default function Production() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [colors, setColors] = useState<Color[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const activeRuns = runs.filter((r) => r.status !== "completed");
  const historyRuns = runs.filter((r) => r.status === "completed");

  const fetchRuns = async () => {
    try {
      const params = new URLSearchParams();
      if (filterSearch) params.append("search", filterSearch);
      if (filterColor) params.append("color_id", filterColor.toString());
      if (filterStatus) params.append("status", filterStatus);
      if (filterFromDate) params.append("from_date", filterFromDate);
      if (filterToDate) params.append("to_date", filterToDate);

      const url = `/production-runs?${params.toString()}`;
      const data = await apiRequest<ProductionRun[]>(url);
      setRuns(data);
    } catch (err) {
      console.error("Failed to fetch runs", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiRequest<ProductionSummary>(
        "/production-runs/summary",
      );
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch summary", err);
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

  useEffect(() => {
    fetchRuns();
  }, [filterSearch, filterColor, filterStatus, filterFromDate, filterToDate]);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchColors()]).finally(() =>
      setIsLoading(false),
    );
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
      setPlannedQuantity(Number(recipe.batch_size_liters));
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
      const scaleFactor = qty / Number(selectedRecipe.batch_size_liters);
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
    if (!selectedRecipe) return;

    try {
      await apiRequest("/production-runs", {
        method: "POST",
        body: {
          recipe_id: selectedRecipe.id,
          planned_quantity_liters: plannedQuantity,
          actual_resources: actualResources,
        },
      });
      setIsModalOpen(false);
      fetchRuns();
      fetchSummary();
      // Reset form
      setSelectedColor("");
      setSelectedRecipe(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePackage = async (runId: number, volume: number) => {
    const packSize = prompt("Enter pack size in liters (e.g. 5):", "5");
    if (!packSize) return;

    const units = Math.floor(volume / Number(packSize));
    if (units === 0) {
      alert("Volume too small for this pack size");
      return;
    }

    try {
      await apiRequest(`/production-runs/${runId}/packaging`, {
        method: "POST",
        body: {
          packaging_details: [
            { pack_size_liters: Number(packSize), quantity_units: units },
          ],
        },
      });
      fetchRuns();
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

      {/* Summary Cards */}
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
              {summary?.active_runs || 0}
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
              {summary?.todays_production_liters?.toLocaleString() || 0}{" "}
              <span className="text-base text-muted-foreground font-normal">
                L
              </span>
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
              {summary?.resource_consumption_kg?.toLocaleString() || 0}{" "}
              <span className="text-base text-muted-foreground font-normal">
                KG
              </span>
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
              className={`text-3xl font-bold ${summary && (summary.production_variance_percent || 0) > 0 ? "text-red-500" : "text-green-500"}`}
            >
              {(summary?.production_variance_percent || 0) > 0 ? "+" : ""}
              {(summary?.production_variance_percent || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual vs Expected (Today)
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
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between bg-muted/20">
              <h2 className="text-lg font-bold flex items-center">
                <Droplets className="mr-3 h-5 w-5 text-blue-500" />
                Active Production Runs
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50">
                    <th className="h-12 px-6 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                      Batch ID
                    </th>
                    <th className="h-12 px-6 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                      Color
                    </th>
                    <th className="h-12 px-6 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                      Recipe
                    </th>
                    <th className="h-12 px-6 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                      Target Qty
                    </th>
                    <th className="h-12 px-6 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-6 text-center animate-pulse text-muted-foreground"
                      >
                        Loading active runs...
                      </td>
                    </tr>
                  ) : activeRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-6 text-center text-muted-foreground"
                      >
                        No active runs.
                      </td>
                    </tr>
                  ) : (
                    activeRuns.map((run) => (
                      <tr
                        key={run.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-6 font-bold text-blue-600 tracking-tight">
                          PR-{run.id}
                        </td>
                        <td className="p-6 font-extrabold text-slate-900">
                          {run.color_name}
                        </td>
                        <td className="p-6 text-slate-500 font-medium text-xs">
                          {run.recipe_name}
                        </td>
                        <td className="p-6 text-center font-black text-slate-700">
                          {run.planned_quantity_liters}L
                        </td>
                        <td className="p-6 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${run.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : run.status === "variance" ||
                                  run.status === "flagged"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                          >
                            {run.status === "pending" ||
                              run.status === "in_progress" ||
                              run.status === "running"
                              ? "Running"
                              : run.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* History Runs Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center">
                  <Activity className="mr-2 h-5 w-5 text-green-500" />
                  Recent Production History
                </h2>
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
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-6 text-center animate-pulse text-muted-foreground"
                      >
                        Loading history...
                      </td>
                    </tr>
                  ) : historyRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-6 text-center text-muted-foreground"
                      >
                        No completed runs found.
                      </td>
                    </tr>
                  ) : (
                    historyRuns.map((run) => {
                      const expected = run.planned_quantity_liters;
                      const actual = run.actual_quantity_liters || expected;
                      const variance = actual - expected;
                      const variancePercentage =
                        expected > 0 ? (variance / expected) * 100 : 0;

                      let varianceColorClass = "text-green-600 bg-green-50/50";
                      if (Math.abs(variancePercentage) > 5) {
                        varianceColorClass =
                          "text-red-700 bg-red-100 font-bold";
                      } else if (Math.abs(variancePercentage) > 2) {
                        varianceColorClass = "text-yellow-700 bg-yellow-100";
                      }

                      const timelineStep =
                        run.status === "completed"
                          ? run.packaging && run.packaging.length > 0
                            ? 4
                            : 3
                          : run.status === "running" ||
                            run.status === "in_progress"
                            ? 2
                            : 1;

                      return (
                        <tr
                          key={run.id}
                          className="hover:bg-muted/50 transition-colors border-b last:border-0"
                        >
                          <td className="p-4 border-r">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((step) => (
                                <div
                                  key={step}
                                  className={`h-1.5 w-3 rounded-full ${step <= timelineStep
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
                            PR-{run.id}
                          </td>
                          <td className="p-4 font-medium text-foreground border-r">
                            {run.color_name}
                          </td>
                          <td className="p-4 text-muted-foreground text-xs border-r">
                            {run.recipe_name}
                          </td>
                          <td className="p-4 text-center font-mono text-muted-foreground border-r">
                            {expected}kg
                          </td>
                          <td className="p-4 text-center font-mono text-foreground font-semibold border-r">
                            {actual}kg
                          </td>
                          <td className="p-4 text-center border-r">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${varianceColorClass}`}
                            >
                              {variance > 0 ? "+" : ""}
                              {variance.toFixed(1)}kg
                            </span>
                          </td>
                          <td className="p-4 text-center border-r">
                            {run.packaging && run.packaging.length > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                {run.packaging.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] text-muted-foreground whitespace-nowrap"
                                  >
                                    {p.pack_size_liters}L x {p.quantity_units}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                Ready to pack
                              </span>
                            )}
                          </td>
                          <td className="p-4 border-r">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${run.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : run.status === "variance" ||
                                    run.status === "flagged"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                            >
                              {run.status === "pending" ||
                                run.status === "in_progress" ||
                                run.status === "running"
                                ? "Running"
                                : run.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handlePackage(run.id, actual)}
                              disabled={run.status !== "completed"}
                              className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-30 disabled:no-underline"
                            >
                              <PackageCheck className="mr-1 h-3.5 w-3.5" />
                              Package
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for New Production Run */}
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
                        Planned Quantity (Liters)
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
                            Number(selectedRecipe.batch_size_liters);
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
