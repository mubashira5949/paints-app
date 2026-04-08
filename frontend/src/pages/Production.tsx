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
  ShoppingBag,
  ArrowRight
} from "lucide-react";
import { useUnitPreference, formatUnit, toDisplayValue, fromDisplayValue } from "../utils/units";
import { useDateFormatPreference, formatDate } from "../utils/dateFormatter";

interface Resource {
  resource_id: number;
  name: string;
  unit: string;
  quantity_required: number;
}

interface Formula {
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


interface HistoryRun {
  id: number;
  batchId: string;
  status: string;
  planned_quantity_kg: number;
  actual_quantity_kg: number;
  wasteQty?: number;
  lossReason?: string;
  variance: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  formula_name: string;
  color_name: string;
  packaging?: { pack_size_kg: number; quantity_units: number }[];
  resource_used?: number;
}

interface ActiveRun {
  id: number;
  batchId: string;
  color: string;
  formula: string;
  targetQty: number;
  actual_quantity_kg?: number | null;
  status: "planned" | "running" | "paused" | "completed" | "packaging";
  started_at: string | null;
  operator: string | null;
  packaging?: { pack_size_kg: number; quantity_units: number }[];
}

interface ProductDemand {
  color_id: number;
  color_name: string;
  business_code: string;
  total_qty_kg: number;
  order_count: number;
  client_names?: string[];
  required_packs?: { pack_size_kg: number, quantity: number }[];
  detailed_orders?: {
    order_id: number;
    client_name: string;
    order_date: string;
    quantity_kg: number;
  }[];
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
        ></div>
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
  const dateFormat = useDateFormatPreference();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<{ activeRuns: number } | null>(null);
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [colors, setColors] = useState<Color[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [isActiveLoading, setIsActiveLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedDemand, setExpandedDemand] = useState<number | null>(null);
  const [showAllActive, setShowAllActive] = useState(false);
  const [demand, setDemand] = useState<ProductDemand[]>([]);
  const [isDemandLoading, setIsDemandLoading] = useState(true);
  const [showAllDemand, setShowAllDemand] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "active" | "planning" | "history">("overview");

  // Sorting State for History
  const [sortKey, setSortKey] = useState<"target" | "actual" | "waste" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filters State
  const [activeSearch, setActiveSearch] = useState("");
  const [activeColor, setActiveColor] = useState<number | "">("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeFromDate, setActiveFromDate] = useState("");
  const [activeToDate, setActiveToDate] = useState("");

  const [filterSearch, setFilterSearch] = useState("");
  const [filterColor, setFilterColor] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  // New Run Form State
  const [selectedColor, setSelectedColor] = useState<number | "">("");
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [planned_quantity_kg, setPlannedQuantityKg] = useState<number>(0);
  const [actualResources, setActualResources] = useState<
    { resource_id: number; actual_quantity_used: number }[]
  >([]);

  const [isEditing, setIsEditing] = useState(false);

  // Edit State
  const [editingRun, setEditingRun] = useState<ActiveRun | null>(null);
  const [editTargetQty, setEditTargetQty] = useState<number>(0);
  const [editActualResources, setEditActualResources] = useState<
    { resource_id: number; name: string; unit: string; actual_quantity_used: number }[]
  >([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  
  // Completion Modal State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completingRun, setCompletingRun] = useState<ActiveRun | null>(null);
  const [actualYield, setActualYield] = useState<number | string>(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lossReason, setLossReason] = useState<string>("Filter Loss"); // Default reason
  const [customLossReason, setCustomLossReason] = useState<string>("");


  // KPI metrics derived from historyRuns — no extra API call needed
  const historyMetrics = {
    totalProduction: historyRuns
      .filter(r => r.status === "completed")
      .reduce((sum, r) => sum + (Number(r.actual_quantity_kg) || 0), 0),
    resourceConsumption: historyRuns
      .reduce((sum, r) => sum + (Number(r.resource_used) || 0), 0),
    variance: historyRuns
      .filter(r => r.status === "completed")
      .reduce((sum, r) => sum + (Number(r.variance) || 0), 0),
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

  const fetchDemand = async () => {
    setIsDemandLoading(true);
    try {
      const data = await apiRequest<ProductDemand[]>("/sales/orders/demand");
      setDemand(data);
    } catch (err) {
      console.error("Failed to fetch demand", err);
    } finally {
      setIsDemandLoading(false);
    }
  };

  const fetchRuns = () => {
    fetchActiveRuns();
    fetchHistory();
    fetchDemand();
  };

  // ── Update a run's status via PATCH ──
  const updateStatus = async (id: number, status: ActiveRun["status"], payload: any = {}) => {
    setUpdatingId(id);
    try {
      await apiRequest(`/production-runs/${id}/status`, {
        method: "PATCH",
        body: { status, ...payload },
      });
      fetchRuns();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmCompletion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!completingRun) return;

    // Combine reasons logic:
    // If "Other" is selected, use customReason.
    // If another reason is selected, and customReason has notes, append them.
    const finalReason = lossReason === "Other" 
      ? (customLossReason || "Custom Reason (Not specified)")
      : (customLossReason ? `${lossReason}: ${customLossReason}` : lossReason);

    setIsCompleting(true);
    try {
      const parsedYield = Number(actualYield) || 0;
      const targetQtyDisplay = toDisplayValue(completingRun.targetQty, unitPref);
      const computedWaste = Math.max(0, targetQtyDisplay - parsedYield);
      await updateStatus(completingRun.id, "completed", {
        actual_quantity_kg: fromDisplayValue(parsedYield, unitPref),
        waste_kg: fromDisplayValue(computedWaste, unitPref),
        loss_reason: finalReason
      });
      setIsCompletionModalOpen(false);
      setCompletingRun(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to complete run");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun) return;

    setIsEditing(true);
    try {
      const totalMaterial = (editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0);
      const targetKg = fromDisplayValue(editTargetQty || 0, unitPref);

      if (Math.abs(totalMaterial - targetKg) >= 0.01) {
        alert(`Strict Validation: Total material consumption (${totalMaterial.toFixed(2)} ${unitPref}) must exactly match target quantity (${toDisplayValue(targetKg, unitPref)} ${unitPref}) before saving.`);
        setIsEditing(false);
        return;
      }

      await apiRequest(`/production-runs/${editingRun.id}`, {
        method: "PATCH",
        body: {
          targetQty: targetKg,
          actualResources: (editActualResources || []).map(r => ({
            resourceId: r.resource_id,
            quantity: r.actual_quantity_used
          }))
        },
      });
      setIsEditModalOpen(false);
      setEditingRun(null);
      fetchRuns();
    } catch (err: any) {
      alert(err.message || "Failed to update run");
    } finally {
      setIsEditing(false);
    }
  };

  const openEditModal = async (run: ActiveRun) => {
    setEditingRun(run);
    setEditTargetQty(toDisplayValue(run.targetQty, unitPref));
    setIsEditModalOpen(true);
    setIsLoadingEditData(true);
    try {
      const data = await apiRequest<any>(`/production-runs/${run.id}`);
      // Join expected and actuals to show what's currently planned
      // If we are in 'planned' or 'running', we might not have 'actual_resources' from DB yet
      // so we use expected_resources as fallback
      const resources = (data?.expected_resources || []).map((er: any) => {
        const ar = (data?.actual_resources || []).find((a: any) => a.resource_id === er.resource_id);
        return {
          resource_id: er.resource_id,
          name: er.name || "Unknown Resource",
          unit: er.unit || "N/A",
          actual_quantity_used: Number(ar ? ar.actual_qty : er.expected_qty) || 0
        };
      });
      setEditActualResources(resources);
    } catch (err) {
      console.error("Failed to fetch run details for editing", err);
    } finally {
      setIsLoadingEditData(false);
    }
  };

  const handleEditTargetQtyChange = (newQty: number) => {
    const oldQty = editTargetQty;
    setEditTargetQty(newQty);
    if (oldQty > 0) {
      const ratio = newQty / oldQty;
      setEditActualResources(prev => prev.map(res => ({
        ...res,
        actual_quantity_used: Number((res.actual_quantity_used * ratio).toFixed(4))
      })));
    }
  };

  const handleQuickPackRemaining = (id: number) => {
    navigate(`/production/PR-${id}/packaging`);
  };

  useEffect(() => {
    fetchHistory();
  }, [filterSearch, filterColor, filterStatus, filterFromDate, filterToDate]);

  useEffect(() => {
    // Fetch active runs count for the Active Runs card only
    apiRequest<{ activeRuns: number }>("/production-runs/metrics")
      .then(setMetrics)
      .catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([fetchColors(), fetchActiveRuns(), fetchDemand()]);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchActiveRuns, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedColor) {
      apiRequest<Formula[]>(`/formulas/${selectedColor}`)
        .then(setFormulas)
        .catch(console.error);
    } else {
      setFormulas([]);
    }
  }, [selectedColor]);

  const handleFormulaSelect = (formulaId: string) => {
    const formula = formulas.find((r) => r.id === Number(formulaId)) || null;
    setSelectedFormula(formula);
    if (formula && Array.isArray(formula.resources)) {
      setPlannedQuantityKg(toDisplayValue(Number(formula.batch_size_kg || 0), unitPref));
      setActualResources(
        formula.resources.map((res) => ({
          resource_id: res.resource_id,
          actual_quantity_used: res.quantity_required || 0,
        })),
      );
    } else if (formula) {
      // Fallback if resources is missing
      setPlannedQuantityKg(toDisplayValue(Number(formula.batch_size_kg || 0), unitPref));
      setActualResources([]);
    }
  };

  const handleQuantityChange = (qty: number) => {
    setPlannedQuantityKg(qty);
    if (selectedFormula) {
      const scaleFactor = fromDisplayValue(qty, unitPref) / Number(selectedFormula.batch_size_kg);
      setActualResources(
        selectedFormula.resources.map((res) => ({
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
    if (!selectedFormula || !selectedColor) return;

    try {
      await apiRequest("/production-runs/plan", {
        method: "POST",
        body: {
          formulaId: selectedFormula.id,
          colorId: Number(selectedColor),
          targetQty: fromDisplayValue(planned_quantity_kg, unitPref),
          operatorId: user?.id ?? 1,
          actualResources: actualResources.map(r => ({
            resourceId: r.resource_id,
            quantity: r.actual_quantity_used
          }))
        },
      });
      setIsModalOpen(false);
      fetchRuns();
      setSelectedColor("");
      setSelectedFormula(null);
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
          <p className="text-muted-foreground mt-1 text-base">
            Manage manufacturing workflows and track resource consumption.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Start New Batch
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 bg-slate-50/50 p-1 rounded-t-xl overflow-x-auto">
        {[
          { id: "overview", label: "Overview" },
          { id: "active", label: "Active Runs" },
          { id: "planning", label: "Planning" },
          { id: "history", label: "History" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 text-sm font-black tracking-widest uppercase transition-all rounded-lg shrink-0 ${
              activeTab === tab.id
                ? "bg-slate-800 text-white shadow-md border hover:bg-slate-700"
                : "bg-white text-slate-500 border border-slate-200 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (() => {
        const isFiltered = filterSearch || filterColor || filterStatus !== "All" || filterFromDate || filterToDate;
        const periodLabel = isFiltered ? "Filtered" : "All Time";
        return (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <Activity className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Runs</span>
            <span className="text-sm font-black text-slate-800">{metrics?.activeRuns ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <Droplets className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Produced</span>
            <span className="text-sm font-black text-slate-800">{formatUnit(historyMetrics.totalProduction, unitPref)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
            <FlaskConical className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Materials</span>
            <span className="text-sm font-black text-slate-800">{formatUnit(historyMetrics.resourceConsumption, unitPref)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg">
            <Activity className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Variance</span>
            <span className={`text-sm font-black ${
              historyMetrics.variance > 0 ? "text-green-600" : historyMetrics.variance < 0 ? "text-orange-500" : "text-slate-800"
            }`}>{historyMetrics.variance > 0 ? "+" : ""}{formatUnit(historyMetrics.variance, unitPref)}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-auto">{periodLabel}</span>
        </div>
        );
      })()}

      {activeTab === "active" && (
      <div className="rounded-xl border bg-white shadow-sm p-4 mb-6 animate-in fade-in duration-300 sticky top-0 z-20 backdrop-blur-sm bg-white/95">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Batch ID..."
              className="pl-10 w-full rounded-lg border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              value={activeSearch}
              onChange={(e) => setActiveSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full rounded-lg border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              value={activeColor}
              onChange={(e) => setActiveColor(e.target.value === "" ? "" : Number(e.target.value))}
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
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
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
              value={activeFromDate}
              onChange={(e) => setActiveFromDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs font-medium">to</span>
            <input
              type="date"
              className="w-full md:w-32 rounded-md bg-transparent px-2 py-1 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              value={activeToDate}
              onChange={(e) => setActiveToDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      )}

      <div className="space-y-10">
        <div>
          {/* Demand Overview */}
          {(activeTab === "overview" || activeTab === "planning") && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm mb-8 animate-in fade-in duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Product Demand Overview</h2>
                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                  {demand.length} Products Requested
                </span>
              </div>
              {demand.length > 3 && (
                <button 
                  onClick={() => setShowAllDemand(!showAllDemand)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold tracking-wider uppercase bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition-all hover:shadow-sm"
                >
                  {showAllDemand ? 'Show Less' : 'Show All Demand'}
                </button>
              )}
            </div>
            <div className="p-5 overflow-visible">
              {isDemandLoading ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Calculating demand...</p>
                </div>
              ) : demand.length === 0 ? (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                   <PackageCheck className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                   <p className="text-sm font-bold text-slate-600 uppercase tracking-wide">No Pending Client Orders</p>
                   <p className="text-xs text-slate-400 mt-1">All orders are currently fulfilled or none are recorded.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(showAllDemand ? demand : demand.slice(0, 4)).map((item) => {
                    const activeRunForColor = activeRuns.find(r => r.color === item.color_name);
                    const prodStatus = activeRunForColor ? activeRunForColor.status : null;
                    return (
                    <div key={item.color_id} 
                         className={`relative group bg-white p-3 rounded-xl border border-slate-100 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 ${expandedDemand == item.color_id ? 'z-[100] ring-4 ring-emerald-400/20 shadow-2xl scale-[1.02]' : 'z-auto'}`}
                         onMouseLeave={() => expandedDemand == item.color_id && setExpandedDemand(null)}
                    >
                      {/* Color swatch + name */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="h-7 w-7 rounded-md shrink-0 border border-white shadow-sm"
                          style={{ backgroundColor: colors.find(c => c.id === item.color_id)?.color_code || '#cbd5e1' }}
                        />
                        <h4 className="font-black text-slate-900 text-xs leading-tight truncate flex-1">{item.color_name}</h4>
                        {/* Info details toggle */}
                        <div 
                           className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                           title="Order Details"
                           onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedDemand(expandedDemand === item.color_id ? null : item.color_id);
                           }}
                        >
                           <Eye className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      {/* Qty + orders */}
                      <div className="text-lg font-black text-slate-900 leading-none mb-1">{formatUnit(item.total_qty_kg, unitPref)}</div>
                      <div className="text-[10px] font-bold text-emerald-600 mb-3">{item.order_count} order{item.order_count !== 1 ? 's' : ''}</div>
                      {/* Action */}
                      <button
                        onClick={() => { setSelectedColor(item.color_id); setIsModalOpen(true); }}
                        className="w-full flex items-center justify-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 border border-blue-100 hover:border-blue-300 rounded-lg py-1 transition-colors"
                      >
                        Plan <ArrowRight className="h-2.5 w-2.5" />
                      </button>

                      {/* Dropdown for detailed orders */}
                      {expandedDemand == item.color_id && (
                        <div className="absolute top-[calc(100%+12px)] left-0 sm:-left-3 z-[110] w-64 sm:w-80 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                          <div className="bg-emerald-900 px-4 py-3 flex justify-between items-center text-white">
                            <span className="text-[11px] font-black uppercase tracking-widest opacity-90">Order Breakdown</span>
                            {prodStatus && prodStatus !== 'planned' && prodStatus !== 'completed' && (
                               <span className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg font-bold uppercase">
                                 {prodStatus === 'running' ? 'Running' : prodStatus === 'paused' ? 'Paused' : prodStatus === 'packaging' ? 'Package Completed' : prodStatus}
                               </span>
                            )}
                          </div>
                          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-3 bg-white">
                            {item.detailed_orders && item.detailed_orders.length > 0 ? (
                              item.detailed_orders.map((o, idx) => (
                                <div key={o.order_id || idx} className="py-3 px-2 hover:bg-slate-50 transition-colors">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <p className="text-sm font-black text-slate-800 leading-tight flex-1 mr-2">
                                      {o.client_name}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                      {formatDate(o.order_date, dateFormat)}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] px-2 py-0.5 rounded-lg font-black">
                                       Required: {formatUnit(o.quantity_kg, unitPref)}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-slate-400 text-xs italic">
                                Loading order information...
                              </div>
                            )}
                          </div>
                        </div>
                      )}        )}
                    </div>
                  )})}
                </div>
              )}
              {demand.length > 4 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllDemand(!showAllDemand)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-widest transition-colors"
                  >
                    {showAllDemand ? `Show Less ↑` : `View All ${demand.length} Products ↓`}
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
          {activeTab === "active" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-slate-800">Active Production Runs</h2>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                  {activeRuns.length} total
                </span>
              </div>
              {activeRuns.length > 3 && (
                <button
                  onClick={() => setShowAllActive(!showAllActive)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold tracking-wider uppercase transition-colors"
                >
                  {showAllActive ? 'Show Less ↑' : `View All ${activeRuns.length} ↓`}
                </button>
              )}
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
                      if (activeSearch && !run.batchId.toLowerCase().includes(activeSearch.toLowerCase()) && !run.color.toLowerCase().includes(activeSearch.toLowerCase())) return false;
                      if (activeColor && colors.find(c => c.id === activeColor)?.name !== run.color) return false;
                      if (activeStatus && activeStatus !== "All" && run.status !== activeStatus) return false;
                      if (activeFromDate && run.started_at && new Date(run.started_at) < new Date(activeFromDate)) return false;
                      if (activeToDate && run.started_at && new Date(run.started_at) > new Date(activeToDate)) return false;
                      return true;
                    })
                    .slice(0, showAllActive ? activeRuns.length : 3).map((run) => {
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

                    return (
                      <div
                        key={run.id}
                        className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group"
                      >
                        {/* Batch ID */}
                        <span className="font-mono font-bold text-xs text-slate-500 bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-700 px-2.5 py-1 rounded-lg shrink-0 transition-colors">
                          {run.batchId}
                        </span>

                        {/* Color swatch + name */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="h-3 w-3 rounded-full shrink-0 border border-white shadow-sm"
                            style={{ backgroundColor: colors.find(c => c.name === run.color)?.color_code || '#94a3b8' }}
                          />
                          <span className="font-bold text-slate-800 text-sm truncate">{run.color}</span>
                        </div>

                        {/* Target */}
                        <span className="text-xs text-slate-500 font-mono shrink-0">
                          <span className="text-slate-400 mr-1">Target</span>
                          <span className="font-black text-slate-700">{formatUnit(run.targetQty, unitPref)}</span>
                        </span>

                        {/* Actual (if available) */}
                        {run.actual_quantity_kg != null && (
                          <span className="text-xs text-slate-500 font-mono shrink-0">
                            <span className="text-slate-400 mr-1">Actual</span>
                            <span className="font-black text-emerald-700">{formatUnit(run.actual_quantity_kg, unitPref)}</span>
                          </span>
                        )}

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0 ${sc.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              <button
                                onClick={() => navigate(`/production/${run.batchId}`)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {(run.status === "planned" || run.status === "running") && (
                                <button
                                  onClick={() => openEditModal(run)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Batch"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {(run.status === "planned" || run.status === "paused") && (
                                <button
                                  onClick={() => updateStatus(run.id, "running")}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                >
                                  <Play className="w-3 h-3 fill-current" /> Start
                                </button>
                              )}

                              {run.status === "running" && (
                                <button
                                  onClick={() => updateStatus(run.id, "paused")}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                >
                                  <Pause className="w-3 h-3 fill-current" /> Pause
                                </button>
                              )}

                              {(run.status === "running" || run.status === "paused") && (
                                <button
                                  onClick={() => {
                                    setCompletingRun(run);
                                    setActualYield(toDisplayValue(run.targetQty, unitPref));
                                    setLossReason("Filter Loss");
                                    setCustomLossReason("");
                                    setIsCompletionModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Done
                                </button>
                              )}

                              {(run.status === "completed" || run.status === "packaging") && (
                                <button
                                  onClick={() => navigate(`/production/${run.batchId}/packaging`)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all active:scale-95"
                                >
                                  <Box className="w-3 h-3" /> Pack
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {/* History Runs Table */}
          {activeTab === "history" && (
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-5 border-b flex flex-col gap-4 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="mr-2 h-5 w-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-slate-800">Production History</h2>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {showAllHistory ? `Showing all ${historyRuns.length}` : `Showing ${Math.min(10, historyRuns.length)} of ${historyRuns.length}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {historyRuns.length > 10 && (
                    <button 
                      onClick={() => setShowAllHistory(!showAllHistory)}
                      className="text-xs text-slate-600 hover:text-slate-800 font-bold tracking-wider uppercase bg-slate-50 px-2 py-1 rounded border border-slate-200 transition-colors"
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
                      Formula
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
                    <th 
                      className="h-12 px-4 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-200/50 hover:text-slate-800 transition-colors group select-none"
                      onClick={() => {
                        if (sortKey === "waste") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortKey("waste");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Loss
                        <span className="text-[8px] text-slate-400 group-hover:text-blue-500">
                          {sortKey === "waste" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </div>
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                      Reason
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
                        colSpan={11}
                        className="p-8 text-center animate-pulse text-muted-foreground bg-slate-50/50"
                      >
                        <Loader2 className="inline w-5 h-5 animate-spin mr-2 text-blue-500" />
                        Loading history...
                      </td>
                    </tr>
                  ) : historyRuns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
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
                        } else if (sortKey === "waste") {
                          valA = a.wasteQty ?? 0;
                          valB = b.wasteQty ?? 0;
                        }
                        
                        if (sortOrder === "asc") return valA - valB;
                        return valB - valA;
                      })
                      .slice(0, showAllHistory ? historyRuns.length : 10)
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
                                ></div>
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
                            {run.formula_name}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-400 border-r">
                            {formatUnit(expected, unitPref)}
                          </td>
                          <td className="p-4 text-center font-mono text-slate-900 font-black border-r">
                            {actual != null ? formatUnit(actual, unitPref) : "—"}
                          </td>
                          <td className="p-4 text-center font-mono text-orange-600 font-bold border-r bg-orange-50/20">
                            {run.wasteQty != null ? formatUnit(run.wasteQty, unitPref) : "—"}
                          </td>
                          <td className="p-4 text-[10px] text-slate-500 border-r max-w-[150px]">
                            {run.lossReason ? (
                              <div className="line-clamp-2" title={run.lossReason}>
                                {run.lossReason}
                              </div>
                            ) : "—"}
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
                                      handleQuickPackRemaining(run.id);
                                    }}
                                    disabled={updatingId === run.id || !showQuickPack}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg transition-all disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest border border-purple-100 min-w-[110px] ${
                                      !showQuickPack ? "invisible" : ""
                                    }`}
                                  >
                                    {updatingId === run.id && showQuickPack ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <PackageCheck className="w-3.5 h-3.5" />}
                                    <span>Package Remaining</span>
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
            {historyRuns.length > 10 && (
              <div className="p-3 border-t bg-slate-50 flex justify-center items-center gap-4">
                <span className="text-xs font-medium text-slate-400">
                   {showAllHistory ? `All ${historyRuns.length} entries shown` : `Showing 10 of ${historyRuns.length}`}
                </span>
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-lg border border-blue-100 shadow-sm transition-all"
                >
                  {showAllHistory ? "View Less" : "View All History"}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* New Production Run Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          ></div>
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden relative z-10 scale-in-center">
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
                  <label className="text-sm font-medium">Select Formula</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                    disabled={!selectedColor}
                    value={selectedFormula?.id || ""}
                    onChange={(e) => handleFormulaSelect(e.target.value)}
                    required
                  >
                    <option value="">
                      {selectedColor
                        ? "Choose a formula..."
                        : "Select color first"}
                    </option>
                    {formulas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (v{r.version})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedFormula && (
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
                        {(selectedFormula.resources || []).map((res, idx) => {
                          const batchSize = Number(selectedFormula.batch_size_kg) || 1;
                          const scaleFactor =
                            fromDisplayValue(planned_quantity_kg, unitPref) / batchSize;
                          const expectedQty = Number(
                            ((res.quantity_required || 0) * scaleFactor).toFixed(4),
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
                                  step="any"
                                  className="w-20 rounded-md border bg-background px-2 py-1 text-xs text-right font-mono focus:ring-1 focus:ring-blue-600 outline-none"
                                  value={
                                    actualResources[idx]?.actual_quantity_used || ""
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

                      {/* Summation Display */}
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className={`h-4 w-4 ${
                            Math.abs(actualResources.reduce((s, r) => s + r.actual_quantity_used, 0) - planned_quantity_kg) < 0.01
                              ? "text-emerald-500"
                              : "text-orange-500"
                          }`} />
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Material</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-black ${
                            Math.abs((Array.isArray(actualResources) ? actualResources.reduce((s, r) => s + (Number(r.actual_quantity_used) || 0), 0) : 0) - planned_quantity_kg) < 0.01
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }`}>
                            {(Array.isArray(actualResources) ? actualResources.reduce((s, r) => s + (Number(r.actual_quantity_used) || 0), 0) : 0).toFixed(2)} / {planned_quantity_kg} {unitPref}
                          </span>
                          {Math.abs((Array.isArray(actualResources) ? actualResources.reduce((s, r) => s + (Number(r.actual_quantity_used) || 0), 0) : 0) - planned_quantity_kg) >= 0.01 && (
                            <p className="text-[10px] font-bold text-orange-500 mt-0.5">Sum must match planned quantity</p>
                          )}
                        </div>
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
                  disabled={
                    !selectedFormula || 
                    Math.abs((Array.isArray(actualResources) ? actualResources.reduce((s, r) => s + (Number(r.actual_quantity_used) || 0), 0) : 0) - planned_quantity_kg) >= 0.01
                  }
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  title={Math.abs((Array.isArray(actualResources) ? actualResources.reduce((s, r) => s + (Number(r.actual_quantity_used) || 0), 0) : 0) - planned_quantity_kg) >= 0.01 ? "Total material must match planned quantity" : ""}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
            onClick={() => setIsEditModalOpen(false)}
            aria-hidden="true"
          ></div>
          <div className="bg-card w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden relative z-10 scale-in-center">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">Edit Run: {editingRun.batchId}</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Target Quantity ({unitPref})</label>
                  <input
                    min="1"
                    step="0.01"
                    required
                    value={editTargetQty || ""}
                    onChange={(e) => handleEditTargetQtyChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    className="w-full rounded-md border text-sm p-3 outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                {isLoadingEditData ? (
                  <div className="flex items-center justify-center p-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading resource details...
                  </div>
                ) : (
                  <div className="rounded-lg border bg-slate-50/50 p-4 space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                      <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                      Raw Material Consumption
                    </p>
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                        <div className="col-span-8">Resource</div>
                        <div className="col-span-4 text-right">Quantity</div>
                      </div>
                      
                      {(editActualResources || []).map((res, idx) => (
                        <div key={res.resource_id} className="grid grid-cols-12 gap-2 items-center py-2 border-b border-dashed last:border-0">
                          <div className="col-span-7 flex flex-col">
                            <span className="text-sm font-bold text-slate-700 truncate">{res.name || "Untitled"}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-black">{res.unit || "N/A"}</span>
                          </div>
                          <div className="col-span-5 flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step="0.0001"
                              className="w-full rounded-md border bg-white px-3 py-1.5 text-sm text-right font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                              value={res.actual_quantity_used || ""}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                const newActuals = [...(editActualResources || [])];
                                newActuals[idx].actual_quantity_used = val;
                                setEditActualResources(newActuals);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* edit Summation Display */}
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className={`h-4 w-4 ${
                          Math.abs((editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0) - fromDisplayValue(editTargetQty || 0, unitPref)) < 0.01
                            ? "text-emerald-500"
                            : "text-orange-500"
                        }`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Material</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black ${
                          Math.abs((editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0) - fromDisplayValue(editTargetQty || 0, unitPref)) < 0.01
                            ? "text-emerald-600"
                            : "text-orange-600"
                        }`}>
                          {((editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0) || 0).toFixed(2)} / {toDisplayValue(fromDisplayValue(editTargetQty || 0, unitPref), unitPref) || 0} {unitPref}
                        </span>
                        {Math.abs((editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0) - fromDisplayValue(editTargetQty || 0, unitPref)) >= 0.01 && (
                          <p className="text-[10px] font-bold text-orange-500 mt-0.5">Sum should match target quantity</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold border rounded-xl hover:bg-slate-50 text-slate-700 transition-colors uppercase tracking-widest"
                  disabled={isEditing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isEditing || 
                    editTargetQty <= 0 || 
                    Math.abs((editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0) - fromDisplayValue(editTargetQty || 0, unitPref)) >= 0.01
                  }
                  title={
                    Math.abs((editActualResources || []).reduce((s, r) => s + (r.actual_quantity_used || 0), 0) - fromDisplayValue(editTargetQty || 0, unitPref)) >= 0.01 
                    ? "Total material must match target quantity before saving" 
                    : ""
                  }
                  className="px-8 py-2.5 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 flex items-center gap-2 transition-all shadow-lg shadow-blue-200 uppercase tracking-widest cursor-pointer disabled:cursor-not-allowed"
                >
                  {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Completion Modal */}
      {isCompletionModalOpen && completingRun && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200 text-left">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
            onClick={() => setIsCompletionModalOpen(false)}
            aria-hidden="true"
          ></div>
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative z-10 scale-in-center">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Complete Run: {completingRun.batchId}</h3>
                  <p className="text-emerald-50/80 text-[10px] font-bold uppercase tracking-widest">Production Finalization</p>
                </div>
              </div>
              <button
                onClick={() => setIsCompletionModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                disabled={isCompleting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => e.preventDefault()} className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Actual Yield</label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-2xl font-black text-slate-800 focus:ring-4 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500 outline-none transition-all pr-12"
                      value={actualYield}
                      onChange={(e) => setActualYield(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{unitPref}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Target was {formatUnit(completingRun.targetQty, unitPref)}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-orange-500" />
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Yield Loss</label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-2xl font-black text-slate-500 cursor-not-allowed outline-none transition-all pr-12"
                      value={Math.max(0, toDisplayValue(completingRun.targetQty, unitPref) - (Number(actualYield) || 0)).toFixed(2)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{unitPref}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight italic">Spillage or losses</p>
                </div>
              </div>

              {/* Loss Documentation */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Loss Reason Documentation</label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Primary Reason</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={lossReason}
                      onChange={(e) => setLossReason(e.target.value)}
                    >
                      <option value="Filter Loss">Filter Loss</option>
                      <option value="Machine Retention">Machine Retention (Pipelines)</option>
                      <option value="Spillage">Spillage</option>
                      <option value="Quality Sampling">Quality Sampling</option>
                      <option value="Operational Waste">Operational Waste</option>
                      <option value="Other">Other (Custom Reason)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                      {lossReason === "Other" ? "Specify Reason" : "Additional Details (Optional)"}
                    </label>
                    <input
                      type="text"
                      placeholder={lossReason === "Other" ? "Enter specific reason..." : "Notes about this discrepancy..."}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={customLossReason}
                      onChange={(e) => setCustomLossReason(e.target.value)}
                      required={lossReason === "Other"}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompletionModalOpen(false)}
                  className="px-6 py-3 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-widest"
                  disabled={isCompleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCompletion()}
                  disabled={isCompleting || actualYield === '' || Number(actualYield) < 0}
                  className="px-8 py-3 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95 uppercase tracking-widest"
                >
                  {isCompleting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
