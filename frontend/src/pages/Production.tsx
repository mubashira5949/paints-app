import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
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
  Settings,
  Eye,
  CheckCircle2,
  Loader2,
  Pencil,
  Cog,
  Timer,
  Box,
  ShoppingBag,
  ArrowRight,
  Building2,
} from 'lucide-react'
import { useUnitPreference, formatUnit, toDisplayValue, fromDisplayValue } from '../utils/units'
import { useDateFormatPreference, formatDate } from '../utils/dateFormatter'

interface Resource {
  resource_id: number
  name: string
  unit: string
  quantity_required: number
}

interface Formula {
  id: number
  name: string
  version: string
  batch_size_kg: number
  resources: Resource[]
}

interface Color {
  id: number
  name: string
  color_code: string
}

interface HistoryRun {
  id: number
  batchId: string
  status: string
  planned_quantity_kg: number
  actual_quantity_kg: number
  wasteQty?: number
  lossReason?: string
  variance: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  formula_name: string
  color_name: string
  client_name?: string
  order_date?: string
  packaging?: { pack_size_kg: number; quantity_units: number }[]
  resource_used?: number
}

interface ActiveRun {
  id: number
  batchId: string
  color: string
  color_name?: string
  formula: string
  targetQty: number
  actual_quantity_kg?: number | null
  status: 'planned' | 'running' | 'paused' | 'completed' | 'packaging' | 'packed'
  started_at: string | null
  operator: string | null
  client_name?: string
  order_date?: string
  packaging?: { pack_size_kg: number; quantity_units: number }[]
}

interface ProductDemand {
  color_id: number
  color_name: string
  business_code: string
  total_qty_kg: number
  order_count: number
  client_names?: string[]
  inventory_stock_kg?: number
  required_packs?: { pack_size_kg: number; quantity: number }[]
  detailed_orders?: {
    order_id: number
    client_name: string
    order_date: string
    quantity_kg: number
    pack_size_kg: number
    quantity: number
  }[]
}

const ProgressIndicator = ({
  target,
  actual,
  color = 'blue',
  label = 'Progress',
}: {
  target: number
  actual: number
  color?: 'blue' | 'green' | 'purple' | 'orange'
  label?: string
}) => {
  const percentage = target > 0 ? (actual / target) * 100 : 0
  const displayPercentage = Math.min(percentage, 100)

  const colorMap = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-500',
    purple: 'bg-purple-600',
    orange: 'bg-orange-500',
  }

  return (
    <div className="w-full space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span className={percentage > 100 ? 'text-orange-600' : ''}>{percentage.toFixed(1)}%</span>
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
  )
}

export default function Production() {
  const { user } = useAuth()
  const unitPref = useUnitPreference()
  const dateFormat = useDateFormatPreference()
  const navigate = useNavigate()
  const canManageProduction =
    user?.role === 'admin' || user?.role === 'manager' || user?.role === 'operator'
  const [metrics, setMetrics] = useState<{ activeRuns: number } | null>(null)
  const [historyRuns, setHistoryRuns] = useState<HistoryRun[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [colors, setColors] = useState<Color[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([])
  const [isActiveLoading, setIsActiveLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [expandedDemand, setExpandedDemand] = useState<number | null>(null)
  const [prefilledOrder, setPrefilledOrder] = useState<{
    orderId: number
    clientName: string
    orderDate: string
    targetQty: number
  } | null>(null)
  const [showAllActive, setShowAllActive] = useState(false)
  const [demand, setDemand] = useState<ProductDemand[]>([])
  const [isDemandLoading, setIsDemandLoading] = useState(true)
  const [showAllDemand, setShowAllDemand] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'active' | 'planning' | 'history'>(
    'overview',
  )

  // Sorting State for History
  const [sortKey, setSortKey] = useState<'target' | 'actual' | 'waste' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Filters State
  const [activeSearch, setActiveSearch] = useState('')
  const [activeColor, setActiveColor] = useState<number | ''>('')
  const [activeStatus, setActiveStatus] = useState('All')

  const [filterSearch, setFilterSearch] = useState('')
  const [filterColor, setFilterColor] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')

  // New Run Form State
  const [selectedColor, setSelectedColor] = useState<number | ''>('')
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null)
  const [planned_quantity_kg, setPlannedQuantityKg] = useState<number | ''>('')
  const [actualResources, setActualResources] = useState<
    { resource_id: number; actual_quantity_used: number }[]
  >([])

  const [isEditing, setIsEditing] = useState(false)

  // Edit State
  const [editingRun, setEditingRun] = useState<ActiveRun | null>(null)
  const [editTargetQty, setEditTargetQty] = useState<number>(0)
  const [editActualResources, setEditActualResources] = useState<
    {
      resource_id: number
      name: string
      unit: string
      actual_quantity_used: number
    }[]
  >([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)

  // Completion Modal State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false)
  const [completingRun, setCompletingRun] = useState<ActiveRun | null>(null)
  const [actualYield, setActualYield] = useState<number | string>(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const [lossReason, setLossReason] = useState<string>('Filter Loss') // Default reason
  const [customLossReason, setCustomLossReason] = useState<string>('')
  const [productionError, setProductionError] = useState<string | null>(null)

  // KPI metrics derived from historyRuns
  const historyMetrics = {
    totalProduction: historyRuns
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + (Number(r.actual_quantity_kg) || 0), 0),
    resourceConsumption: historyRuns.reduce((sum, r) => sum + (Number(r.resource_used) || 0), 0),
    variance: historyRuns
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + (Number(r.variance) || 0), 0),
  }

  const fetchHistory = async () => {
    setIsHistoryLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSearch) params.append('search', filterSearch)
      if (filterColor) {
        const colorObj = colors.find((c) => c.id === filterColor)
        if (colorObj) params.append('color', colorObj.name)
      }
      if (filterStatus && filterStatus !== 'All') params.append('status', filterStatus)
      if (filterFromDate) params.append('start', filterFromDate)
      if (filterToDate) params.append('end', filterToDate)
      const data = await apiRequest<HistoryRun[]>(`/production-runs/history?${params.toString()}`)
      setHistoryRuns(data)
    } catch (err) {
      console.error('Failed to fetch history', err)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const fetchColors = async () => {
    try {
      const data = await apiRequest<Color[]>('/colors')
      setColors(data)
    } catch (err) {
      console.error('Failed to fetch colors', err)
    }
  }

  const fetchActiveRuns = async () => {
    setIsActiveLoading(true)
    try {
      const data = await apiRequest<ActiveRun[]>('/production-runs/active')
      setActiveRuns(data)
    } catch (err) {
      console.error('Failed to fetch active runs', err)
    } finally {
      setIsActiveLoading(false)
    }
  }

  const fetchDemand = async () => {
    setIsDemandLoading(true)
    try {
      const data = await apiRequest<ProductDemand[]>('/sales/orders/demand')
      const sortedData = data.sort((a, b) => {
        const getLatestDate = (demand: ProductDemand) => {
          if (!demand.detailed_orders || demand.detailed_orders.length === 0) return 0
          return Math.max(...demand.detailed_orders.map(o => new Date(o.order_date).getTime()))
        }
        return getLatestDate(b) - getLatestDate(a)
      })

      setDemand(sortedData)
    } catch (err) {
      console.error('Failed to fetch demand', err)
    } finally {
      setIsDemandLoading(false)
    }
  }

  const fetchRuns = () => {
    fetchActiveRuns()
    fetchHistory()
    fetchDemand()
  }

  const updateStatus = async (id: number, status: ActiveRun['status'], payload: any = {}) => {
    setUpdatingId(id)
    try {
      await apiRequest(`/production-runs/${id}/status`, {
        method: 'PATCH',
        body: { status, ...payload },
      })
      fetchRuns()
    } catch (err: any) {
      alert(err.message || 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleConfirmCompletion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!completingRun) return

    const finalReason =
      lossReason === 'Other'
        ? customLossReason || 'Custom Reason (Not specified)'
        : customLossReason
          ? `${lossReason}: ${customLossReason}`
          : lossReason

    setIsCompleting(true)
    try {
      const parsedYield = Number(actualYield) || 0
      if (parsedYield <= 0) {
        alert('Please enter a valid actual yield greater than 0.')
        setIsCompleting(false)
        return
      }
      const targetQtyDisplay = toDisplayValue(completingRun.targetQty, unitPref)
      const computedWaste = Math.max(0, targetQtyDisplay - parsedYield)
      await updateStatus(completingRun.id, 'completed', {
        actual_quantity_kg: fromDisplayValue(parsedYield, unitPref),
        waste_kg: fromDisplayValue(computedWaste, unitPref),
        loss_reason: finalReason,
      })
      setIsCompletionModalOpen(false)
      setCompletingRun(null)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to complete run')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRun) return

    setIsEditing(true)
    try {
      const totalMaterial = (editActualResources || []).reduce(
        (s, r) => s + (r.actual_quantity_used || 0),
        0,
      )
      const targetKg = fromDisplayValue(editTargetQty || 0, unitPref)

      if (Math.abs(totalMaterial - targetKg) >= 0.01) {
        alert(
          `Strict Validation: Total material consumption (${totalMaterial.toFixed(2)} ${unitPref}) must exactly match target quantity (${toDisplayValue(targetKg, unitPref)} ${unitPref}) before saving.`,
        )
        setIsEditing(false)
        return
      }

      await apiRequest(`/production-runs/${editingRun.id}`, {
        method: 'PATCH',
        body: {
          targetQty: targetKg,
          actualResources: (editActualResources || []).map((r) => ({
            resourceId: r.resource_id,
            quantity: r.actual_quantity_used,
          })),
        },
      })
      setIsEditModalOpen(false)
      setEditingRun(null)
      fetchRuns()
    } catch (err: any) {
      alert(err.message || 'Failed to update run')
    } finally {
      setIsEditing(false)
    }
  }

  const openEditModal = async (run: ActiveRun) => {
    setEditingRun(run)
    setEditTargetQty(toDisplayValue(run.targetQty, unitPref))
    setIsEditModalOpen(true)
    setIsLoadingEditData(true)
    try {
      const data = await apiRequest<any>(`/production-runs/${run.id}`)
      const resources = (data?.expected_resources || []).map((er: any) => {
        const ar = (data?.actual_resources || []).find((a: any) => a.resource_id === er.resource_id)
        return {
          resource_id: er.resource_id,
          name: er.name || 'Unknown Resource',
          unit: er.unit || 'N/A',
          actual_quantity_used: Number(ar ? ar.actual_qty : er.expected_qty) || 0,
        }
      })
      setEditActualResources(resources)
    } catch (err) {
      console.error('Failed to fetch run details for editing', err)
    } finally {
      setIsLoadingEditData(false)
    }
  }

  const handleEditTargetQtyChange = (newQty: number) => {
    const oldQty = editTargetQty
    setEditTargetQty(newQty)
    if (oldQty > 0) {
      const ratio = newQty / oldQty
      setEditActualResources((prev) =>
        prev.map((res) => ({
          ...res,
          actual_quantity_used: Number((res.actual_quantity_used * ratio).toFixed(4)),
        })),
      )
    }
  }


  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'overview') {
      fetchHistory()
    }
  }, [filterSearch, filterColor, filterStatus, filterFromDate, filterToDate, activeTab])

  useEffect(() => {
    apiRequest<{ activeRuns: number }>('/production-runs/metrics')
      .then(setMetrics)
      .catch(console.error)
  }, [])

  useEffect(() => {
    Promise.all([fetchColors(), fetchActiveRuns(), fetchDemand()])
  }, [activeTab])

  useEffect(() => {
    const interval = setInterval(fetchActiveRuns, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedColor) {
      apiRequest<Formula[]>(`/formulas/${selectedColor}`).then(setFormulas).catch(console.error)
    } else {
      setFormulas([])
    }
  }, [selectedColor])

  const handleFormulaSelect = (formulaId: string) => {
    const formula = formulas.find((r) => r.id === Number(formulaId)) || null
    setSelectedFormula(formula)
    if (formula && Array.isArray(formula.resources)) {
      const initialQty = prefilledOrder && prefilledOrder.targetQty ? prefilledOrder.targetQty : Number(formula.batch_size_kg || 0)
      setPlannedQuantityKg(toDisplayValue(initialQty, unitPref))
      
      const scaleFactor = initialQty / Number(formula.batch_size_kg || 1)
      setActualResources(
        formula.resources.map((res) => ({
          resource_id: res.resource_id,
          actual_quantity_used: Number((res.quantity_required * scaleFactor).toFixed(4)),
        })),
      )
    }
  }

  const handleQuantityChange = (qty: number | '') => {
    setPlannedQuantityKg(qty)
    setProductionError(null)
    if (selectedFormula && qty !== '') {
      const scaleFactor = fromDisplayValue(Number(qty), unitPref) / Number(selectedFormula.batch_size_kg)
      setActualResources(
        selectedFormula.resources.map((res) => ({
          resource_id: res.resource_id,
          actual_quantity_used: Number((res.quantity_required * scaleFactor).toFixed(4)),
        })),
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProductionError(null)
    if (!selectedFormula || !selectedColor) return

    try {
      await apiRequest('/production-runs/plan', {
        method: 'POST',
        body: {
          formulaId: selectedFormula.id,
          colorId: Number(selectedColor),
          targetQty: fromDisplayValue(Number(planned_quantity_kg) || 0, unitPref),
          operatorId: user?.id ?? 1,
          actualResources: actualResources.map((r) => ({
            resourceId: r.resource_id,
            quantity: r.actual_quantity_used,
          })),
          orderId: prefilledOrder?.orderId,
          clientName: prefilledOrder?.clientName,
          orderDate: prefilledOrder?.orderDate,
        },
      })
      setIsModalOpen(false)
      fetchRuns()
      setSelectedColor('')
      setSelectedFormula(null)
      setPrefilledOrder(null)
    } catch (err: any) {
      setProductionError(err.message || 'Failed to create production run')
    }
  }

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
          { id: 'overview', label: 'Overview' },
          { id: 'active', label: 'Active Runs' },
          { id: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 text-sm font-black tracking-widest uppercase transition-all rounded-lg shrink-0 ${
              activeTab === tab.id
                ? 'bg-slate-800 text-white shadow-md border hover:bg-slate-700'
                : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <Activity className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Runs</span>
            <span className="text-sm font-black text-slate-800">
              {metrics?.activeRuns ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <Droplets className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Produced</span>
            <span className="text-sm font-black text-slate-800">
              {formatUnit(historyMetrics.totalProduction, unitPref)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
            <FlaskConical className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Materials</span>
            <span className="text-sm font-black text-slate-800">
              {formatUnit(historyMetrics.resourceConsumption, unitPref)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-lg">
            <Activity className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span className="text-xs text-slate-500 font-medium">Variance</span>
            <span
              className={`text-sm font-black ${
                historyMetrics.variance > 0
                  ? 'text-green-600'
                  : historyMetrics.variance < 0
                    ? 'text-orange-500'
                    : 'text-slate-800'
              }`}
            >
              {historyMetrics.variance > 0 ? '+' : ''}
              {formatUnit(historyMetrics.variance, unitPref)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-auto">
            {filterSearch || filterColor || filterStatus !== 'All' ? 'Filtered' : 'All Time'}
          </span>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="rounded-xl border bg-white shadow-sm p-4 mb-6 animate-in fade-in duration-300 backdrop-blur-sm bg-white/95">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Batch ID..."
                className="pl-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All Colors</option>
                {colors.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div className="w-full md:w-48">
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
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
          </div>
        </div>
      )}

      <div className="space-y-10">
        <div>
          {/* Demand Overview */}
          {(activeTab === 'overview') && (
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
                  <button onClick={() => setShowAllDemand(!showAllDemand)} className="text-xs text-emerald-700 hover:text-emerald-900 font-bold uppercase bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200">
                    {showAllDemand ? 'Show Less' : 'Show All'}
                  </button>
                )}
              </div>
              <div className="p-5 overflow-visible">
                {isDemandLoading ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                ) : demand.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30"><p className="text-sm font-bold text-slate-600 uppercase">No Pending Orders</p></div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(showAllDemand ? demand : demand.slice(0, 4)).map((item) => {
                      const activeRunForColor = activeRuns.find((r) => r.color === item.color_name);
                      let prodStatus = activeRunForColor ? activeRunForColor.status : null;
                      if (activeRunForColor) {
                        const packaged = (activeRunForColor.packaging || []).reduce((s, p) => s + (p.pack_size_kg * p.quantity_units), 0);
                        const batchVolume = activeRunForColor.actual_quantity_kg ?? activeRunForColor.targetQty;
                        const isFullyPacked = (batchVolume - packaged) <= 0.01;
                        if ((prodStatus === 'completed' || prodStatus === 'packaging') && isFullyPacked && (activeRunForColor.packaging || []).length > 0) {
                          prodStatus = 'packed';
                        }
                      }
                      
                      const detailedOrdersSorted = [...(item.detailed_orders || [])].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
                      
                      const getStatusClass = (status: string | null) => {
                        if (!status) return 'bg-amber-50 text-amber-600 border-amber-100';
                        if (status === 'packed' || status === 'completed') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                        return 'bg-blue-50 text-blue-600 border-blue-100';
                      };

                      return (
                        <div key={item.color_id} className={`relative group bg-white p-3 rounded-xl border border-slate-100 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 ${expandedDemand === item.color_id ? 'z-[100] ring-4 ring-emerald-400/20 shadow-2xl scale-[1.02]' : 'z-auto'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-md shrink-0 border border-white shadow-sm" style={{ backgroundColor: colors.find((c) => c.id === item.color_id)?.color_code || '#cbd5e1' }} />
                            <h4 className="font-black text-slate-900 text-xs leading-tight truncate flex-1">{item.color_name}</h4>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${getStatusClass(prodStatus)}`}>
                                {prodStatus ? (prodStatus.charAt(0).toUpperCase() + prodStatus.slice(1)) : 'Pending'}
                              </span>
                              <div className="bg-emerald-50 text-emerald-600 rounded-lg p-1.5 cursor-pointer hover:bg-emerald-100" onClick={() => setExpandedDemand(expandedDemand === item.color_id ? null : item.color_id)}>
                                <Eye className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                          <div className="text-lg font-black text-slate-900 leading-none mb-1">{formatUnit(item.total_qty_kg, unitPref)}</div>
                          <div className="text-[10px] font-bold text-emerald-600 mb-3">{item.order_count} order{item.order_count !== 1 ? 's' : ''}</div>
                          {canManageProduction && (
                            <button onClick={() => { setSelectedColor(item.color_id); setPrefilledOrder(null); setIsModalOpen(true); }} className="w-full flex items-center justify-center gap-1 text-[10px] font-black text-blue-600 uppercase border border-blue-100 hover:border-blue-300 rounded-lg py-1 transition-colors">
                              Plan <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          )}
                          {expandedDemand === item.color_id && (
                            <div className="absolute top-[calc(100%+8px)] left-0 z-[110] w-64 sm:w-80 bg-white shadow-2xl border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                              <div className="bg-emerald-900 px-4 py-3 flex justify-between items-center text-white"><span className="text-[11px] font-black uppercase">Order Breakdown</span><button onClick={() => setExpandedDemand(null)}><X className="h-3.5 w-3.5" /></button></div>
                              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-3 bg-white">
                                {detailedOrdersSorted.map((o, idx) => (
                                  <div key={idx} className="py-3 px-3 hover:bg-slate-50 transition-all rounded-xl mb-2 border border-slate-100 bg-white shadow-sm">
                                    <div className="flex justify-between items-start mb-2 pb-2 border-b border-slate-50">
                                      <div className="flex flex-col"><span className="text-[10px] font-black text-emerald-600 uppercase">Client</span><p className="text-sm font-black text-slate-800 italic truncate max-w-[120px]">{o.client_name || 'Guest'}</p></div>
                                      <div className="flex flex-col items-end"><span className="text-[9px] font-bold text-slate-400 uppercase">Date</span><span className="text-[10px] font-black text-slate-600">{o.order_date ? formatDate(o.order_date, dateFormat) : '—'}</span></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                      <div className="bg-slate-50/50 p-2 rounded-lg text-center"><span className="text-[9px] font-black text-slate-400 block">Size</span><p className="text-xs font-black text-slate-700">{formatUnit(o.pack_size_kg || 0, unitPref)}</p></div>
                                      <div className="bg-slate-50/50 p-2 rounded-lg text-center"><span className="text-[9px] font-black text-slate-400 block">Units</span><p className="text-xs font-black text-slate-700">{o.quantity || 0}</p></div>
                                    </div>
                                    <div className="bg-emerald-600 p-2 rounded-xl flex justify-between items-center shadow-lg"><span className="text-[10px] font-black text-white/90 uppercase">Total</span><span className="text-sm font-black text-white">{formatUnit(o.quantity_kg || 0, unitPref)}</span></div>
                                    {canManageProduction && (
                                      <div className="flex flex-col gap-1.5 mt-2">
                                        {(item.inventory_stock_kg || 0) >= (o.quantity_kg || 0) && (
                                          <button onClick={async () => {
                                            try {
                                              await apiRequest(`/sales/orders/${o.order_id}/direct-fulfill`, { method: 'POST' });
                                              const updatedDemand = await apiRequest<ProductDemand[]>('/sales/orders/demand');
                                              setDemand(updatedDemand);
                                              setExpandedDemand(null);
                                            } catch (e) {
                                              alert('Failed to pack from inventory');
                                            }
                                          }} className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-lg">Pack Direct from Inventory</button>
                                        )}
                                        <button onClick={() => { setSelectedColor(item.color_id); setPrefilledOrder({ orderId: o.order_id, clientName: o.client_name, orderDate: o.order_date, targetQty: o.quantity_kg }); setIsModalOpen(true); setExpandedDemand(null); }} className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg">Plan Batch</button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800">Active Production Runs</h2>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{activeRuns.length} total</span>
                </div>
                {activeRuns.length > 3 && (
                  <button onClick={() => setShowAllActive(!showAllActive)} className="text-xs text-blue-600 hover:text-blue-800 font-bold uppercase">{showAllActive ? 'Less ↑' : `All ${activeRuns.length} ↓`}</button>
                )}
              </div>
              <div className="p-5 space-y-4">
                {isActiveLoading ? (
                  <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : activeRuns.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 font-bold border-2 border-dashed border-slate-100 rounded-xl">No active batches</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeRuns
                      .filter((run) => {
                        if (run.status === 'packed') return false;
                        if (activeSearch && !run.batchId.toLowerCase().includes(activeSearch.toLowerCase())) return false;
                        if (activeColor && colors.find((c) => c.id === activeColor)?.name !== run.color) return false;
                        if (activeStatus && activeStatus !== 'All' && run.status !== activeStatus) return false;
                        return true;
                      })
                      .slice(0, showAllActive ? activeRuns.length : 3)
                      .map((run) => {
                        const isUpdating = updatingId === run.id;
                        const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
                          planned: { label: 'Pending', className: 'bg-slate-100 text-slate-700', icon: Activity },
                          running: { label: 'Running', className: 'bg-blue-100 text-blue-800', icon: Cog },
                          paused: { label: 'Paused', className: 'bg-amber-100 text-amber-800', icon: Timer },
                          packaging: { label: 'Packaging', className: 'bg-purple-100 text-purple-800', icon: Box },
                          completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
                          packed: { label: 'Packed', className: 'bg-emerald-600 text-white', icon: PackageCheck },
                        }
                        let sc = statusConfig[run.status] || statusConfig.planned;
                        
                        const packaged = (run.packaging || []).reduce((s, p) => s + (p.pack_size_kg * p.quantity_units), 0);
                        const batchVolume = run.actual_quantity_kg ?? run.targetQty;
                        const isFullyPacked = (batchVolume - packaged) <= 0.01;
                        
                        if ((run.status === 'completed' || run.status === 'packaging') && isFullyPacked && (run.packaging || []).length > 0) {
                          sc = statusConfig.packed;
                        }

                        const StatusIcon = sc.icon;
                        return (
                          <div key={run.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-blue-200 transition-all group">
                            <span className="font-mono font-bold text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0">{run.batchId}</span>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <span className="font-black text-slate-800 text-[13px] truncate">{run.color || run.color_name}</span>
                              {run.client_name && <div className="flex items-center gap-1 text-blue-600 text-[9px] font-bold"><Building2 className="w-2.5 h-2.5" /> <span className="truncate">{run.client_name}</span></div>}
                            </div>
                            <span className="text-xs font-black text-slate-700 shrink-0">{formatUnit(run.targetQty, unitPref)}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${sc.className}`}><StatusIcon className="w-3 h-3" /> {sc.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (
                                <>
                                  <button onClick={() => navigate(`/production/${run.batchId}`)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><Eye className="w-3.5 h-3.5" /></button>
                                  {canManageProduction && (
                                    <>
                                      {(run.status === 'planned' || run.status === 'running') && (
                                        <button onClick={() => openEditModal(run)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                                      )}
                                      {(run.status === 'planned' || run.status === 'paused') && (
                                        <button onClick={() => updateStatus(run.id, 'running')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase rounded-lg transition-all active:scale-95"><Play className="w-3 h-3" /> Start</button>
                                      )}
                                      {run.status === 'running' && (
                                        <button onClick={() => updateStatus(run.id, 'paused')} className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase rounded-lg"><Pause className="w-3 h-3" /> Pause</button>
                                      )}
                                      {(run.status === 'running' || run.status === 'paused') && (
                                        <button onClick={() => { setCompletingRun(run); setActualYield(toDisplayValue(run.targetQty, unitPref)); setIsCompletionModalOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded-lg"><CheckCircle2 className="w-3 h-3" /> Done</button>
                                      )}
                                      {(run.status === 'completed' || run.status === 'packaging') && (
                                        <button onClick={() => navigate(`/production/${run.batchId}/packaging`)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase rounded-lg transition-all active:scale-95"><Box className="w-3 h-3" /> Pack</button>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-5 border-b flex flex-col gap-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="mr-2 h-5 w-5 text-green-500" />
                    <h2 className="text-lg font-semibold text-slate-800">Production History</h2>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{showAllHistory ? `Showing all ${historyRuns.length}` : `Showing 10 of ${historyRuns.length}`}</span>
                  </div>
                  {historyRuns.length > 10 && (
                    <button onClick={() => setShowAllHistory(!showAllHistory)} className="text-xs text-slate-600 hover:text-slate-800 font-bold tracking-wider uppercase bg-white border border-slate-200 px-2 py-1 rounded">{showAllHistory ? 'View Less' : 'View All'}</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="Search ID..." className="pl-9 w-full rounded-md border text-sm p-2" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} /></div>
                  <select className="rounded-md border text-sm p-2" value={filterColor} onChange={(e) => setFilterColor(e.target.value === '' ? '' : Number(e.target.value))}><option value="">All Colors</option>{colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  <select className="rounded-md border text-sm p-2" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="All">All Status</option><option value="completed">Completed</option><option value="running">Running</option></select>
                  <div className="flex items-center gap-2"><input type="date" className="flex-1 rounded-md border text-xs p-1.5" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} /><span className="text-xs">to</span><input type="date" className="flex-1 rounded-md border text-xs p-1.5" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} /></div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500 text-[10px] uppercase">
                      <th className="px-4 py-3 text-left">Batch ID</th>
                      <th className="px-4 py-3 text-left">Color</th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:text-blue-600" onClick={() => { setSortKey('target'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Target {sortKey === 'target' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:text-blue-600" onClick={() => { setSortKey('actual'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Actual {sortKey === 'actual' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:text-blue-600" onClick={() => { setSortKey('waste'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Loss {sortKey === 'waste' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</th>
                      <th className="px-4 py-3 text-left">Loss Reason</th>
                      <th className="px-4 py-3 text-center">Efficiency</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isHistoryLoading ? (
                      <tr><td colSpan={8} className="p-8 text-center animate-pulse">Loading history...</td></tr>
                    ) : historyRuns.length === 0 ? (
                      <tr><td colSpan={8} className="p-12 text-center text-slate-400">No runs match criteria.</td></tr>
                    ) : (
                      [...historyRuns]
                        .sort((a, b) => {
                          if (!sortKey) return 0;
                          let va = sortKey === 'target' ? a.planned_quantity_kg : sortKey === 'actual' ? (a.actual_quantity_kg || 0) : (a.wasteQty || 0);
                          let vb = sortKey === 'target' ? b.planned_quantity_kg : sortKey === 'actual' ? (b.actual_quantity_kg || 0) : (b.wasteQty || 0);
                          return sortOrder === 'asc' ? (va - vb) : (vb - va);
                        })
                        .slice(0, showAllHistory ? historyRuns.length : 10)
                        .map((run) => {
                          let sc = {
                            completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
                            packed: { label: 'Packed', className: 'bg-emerald-600 text-white', icon: PackageCheck },
                            running: { label: 'Running', className: 'bg-blue-100 text-blue-800', icon: Cog },
                            packaging: { label: 'Packaging', className: 'bg-purple-100 text-purple-800', icon: Box },
                            planned: { label: 'Planned', className: 'bg-slate-100 text-slate-700', icon: Activity },
                          }[run.status] || { label: run.status, className: 'bg-slate-100 text-slate-700', icon: Activity };
                          
                          const packaged = (run.packaging || []).reduce((s, p) => s + (p.pack_size_kg * p.quantity_units), 0);
                          const batchVolume = run.actual_quantity_kg ?? run.planned_quantity_kg;
                          const isFullyPacked = (batchVolume - packaged) <= 0.01;
                          
                          if ((run.status === 'completed' || run.status === 'packaging') && isFullyPacked && (run.packaging || []).length > 0) {
                            sc = { label: 'Packed', className: 'bg-emerald-600 text-white', icon: PackageCheck };
                          }

                          const StatusIcon = sc.icon;
                          return (
                            <tr key={run.id} className="hover:bg-slate-50 transition-colors border-b last:border-0 cursor-pointer" onClick={() => navigate(`/production/${run.batchId}`)}>
                              <td className="p-4 font-mono font-bold text-xs">{run.batchId}</td>
                              <td className="p-4"><div className="flex flex-col"><span className="font-bold text-slate-900">{run.color_name}</span>{run.client_name && <span className="text-[9px] text-blue-600 font-bold uppercase">{run.client_name}</span>}</div></td>
                              <td className="p-4 text-center font-mono text-slate-400">{formatUnit(run.planned_quantity_kg, unitPref)}</td>
                              <td className="p-4 text-center font-mono font-black">{run.actual_quantity_kg ? formatUnit(run.actual_quantity_kg, unitPref) : '—'}</td>
                              <td className="p-4 text-center font-mono text-orange-600 font-bold">{run.wasteQty ? formatUnit(run.wasteQty, unitPref) : '—'}</td>
                              <td className="p-4 text-xs text-slate-500 truncate max-w-[120px]" title={run.lossReason || ''}>{run.lossReason || '—'}</td>
                              <td className="p-4"><ProgressIndicator target={run.planned_quantity_kg} actual={run.actual_quantity_kg || run.planned_quantity_kg} label="" /></td>
                              <td className="p-4 text-center"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${sc.className}`}><StatusIcon className="w-3 h-3" /> {sc.label}</span></td>
                              <td className="p-4 text-right"><button className="text-slate-400 hover:text-slate-900"><Eye className="w-4 h-4" /></button></td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Production Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border relative z-10 p-6">
            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold">New Production Run</h3><button onClick={() => setIsModalOpen(false)}><X className="h-6 w-6" /></button></div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {prefilledOrder && (<div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase text-blue-700">Client Order</p><p className="text-sm font-black italic">{prefilledOrder.clientName}</p></div><button type="button" onClick={() => setPrefilledOrder(null)} className="text-xs font-bold text-blue-600 underline">Clear</button></div>)}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Color</label>
                  <select 
                    className="w-full border rounded p-2 text-sm" 
                    value={selectedColor} 
                    onChange={(e) => {
                      setSelectedColor(Number(e.target.value));
                      setSelectedFormula(null);
                      setActualResources([]);
                      setPlannedQuantityKg('');
                      setProductionError(null);
                    }} 
                    required
                  >
                    <option value="">Choose color...</option>
                    {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Formula</label>
                  <select className="w-full border rounded p-2 text-sm" disabled={!selectedColor} value={selectedFormula?.id || ''} onChange={(e) => { handleFormulaSelect(e.target.value); setProductionError(null); }} required><option value="">Choose formula...</option>{formulas.map(f => <option key={f.id} value={f.id}>{f.name} v{f.version}</option>)}</select>
                  {selectedColor !== '' && formulas.length === 0 && (
                     <div className="mt-2 text-xs text-red-600 font-medium">
                       No recipe available.
                       {(user?.role === 'manager' || user?.role === 'admin') ? (
                         <span className="block mt-0.5">
                           <button type="button" onClick={() => { setIsModalOpen(false); navigate('/formulas', { state: { selectedColorId: selectedColor, openCreateFormula: true } }); }} className="underline font-bold text-red-700">Create a recipe</button>
                         </span>
                       ) : (
                         <span className="block mt-0.5">Please ask a manager to create a recipe.</span>
                       )}
                     </div>
                  )}
                </div>
              </div>
              {selectedFormula && (() => {
                const parsedPlannedQuantity = fromDisplayValue(Number(planned_quantity_kg) || 0, unitPref);
                const totalRawMaterial = actualResources.reduce((sum, r) => sum + (Number(r.actual_quantity_used) || 0), 0);
                const rawMaterialMismatch = Math.abs(totalRawMaterial - parsedPlannedQuantity) >= 0.01;
                return (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center"><label className="text-sm font-bold">Planned Quantity ({unitPref})</label><input type="number" step="0.1" className="w-24 border rounded p-1 text-right font-mono" value={planned_quantity_kg === 0 ? '' : planned_quantity_kg} onChange={(e) => handleQuantityChange(e.target.value === '' ? '' : Number(e.target.value))} /></div>
                    <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                      {actualResources.map((r, idx) => {
                        const refRes = selectedFormula.resources.find(ref => ref.resource_id === r.resource_id);
                        return (<div key={r.resource_id} className="flex justify-between items-center py-1 border-b border-dashed"><span>{refRes?.name}</span><div className="flex items-center gap-2"><input type="number" step="0.0001" className="w-20 border rounded p-1 text-right font-mono" value={r.actual_quantity_used === 0 ? '' : r.actual_quantity_used} onChange={(e) => { const n = [...actualResources]; n[idx].actual_quantity_used = Number(e.target.value); setActualResources(n); setProductionError(null); }} /> <span className="text-slate-400 w-6">{refRes?.unit}</span></div></div>);
                      })}
                    </div>
                    {rawMaterialMismatch && (
                      <div className="text-red-500 text-sm font-bold mt-2">
                        Warning: Total raw material quantity ({totalRawMaterial.toFixed(2)} kg) does not match planned quantity ({parsedPlannedQuantity.toFixed(2)} kg).
                      </div>
                    )}
                  </div>
                );
              })()}
              {productionError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm font-bold flex items-start gap-2 mt-4">
                  <Activity className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>{productionError}</div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded font-bold">Cancel</button>
                {(() => {
                  const parsedPlannedQuantity = fromDisplayValue(Number(planned_quantity_kg) || 0, unitPref);
                  const totalRawMaterial = actualResources.reduce((sum, r) => sum + (Number(r.actual_quantity_used) || 0), 0);
                  const rawMaterialMismatch = Math.abs(totalRawMaterial - parsedPlannedQuantity) >= 0.01;
                  return (
                    <button type="submit" disabled={!selectedFormula || !!(selectedFormula && rawMaterialMismatch)} className={`px-6 py-2 text-white rounded font-bold flex items-center gap-2 ${!selectedFormula || (selectedFormula && rawMaterialMismatch) ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}><Play className="w-4 h-4" /> Start</button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Production Modal */}
      {isEditModalOpen && editingRun && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border relative z-10 p-6">
            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold">Edit Batch: {editingRun.batchId}</h3><button onClick={() => setIsEditModalOpen(false)}><X className="h-6 w-6" /></button></div>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="space-y-1"><label className="text-sm font-bold">Target Quantity ({unitPref})</label><input type="number" step="0.1" className="w-full border rounded p-3 font-mono" value={editTargetQty === 0 ? '' : editTargetQty} onChange={(e) => handleEditTargetQtyChange(Number(e.target.value))} required /></div>
              {isLoadingEditData ? <div className="p-8 text-center animate-pulse">Loading...</div> : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-xl p-4 bg-slate-50">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Raw Material Correction</p>
                  {editActualResources.map((res, idx) => (
                    <div key={res.resource_id} className="flex justify-between items-center border-b border-dashed py-2 last:border-0"><div className="flex flex-col"><span className="text-sm font-bold truncate max-w-[150px]">{res.name}</span><span className="text-[9px] text-slate-400 uppercase">{res.unit}</span></div><input type="number" step="0.1" className="w-24 border rounded p-1.5 text-right font-mono" value={res.actual_quantity_used === 0 ? '' : res.actual_quantity_used} onChange={(e) => { const n = [...editActualResources]; n[idx].actual_quantity_used = Number(e.target.value); setEditActualResources(n); }} /></div>
                  ))}
                </div>
              )}
              {(() => {
                const parsedEditTarget = fromDisplayValue(editTargetQty, unitPref);
                const totalEditMaterial = (editActualResources || []).reduce((sum, r) => sum + (Number(r.actual_quantity_used) || 0), 0);
                const editMismatch = Math.abs(totalEditMaterial - parsedEditTarget) >= 0.01;
                return (
                  <>
                    {editMismatch && !isLoadingEditData && (
                      <div className="text-red-500 text-sm font-bold mt-2">
                        Warning: Total raw material quantity ({totalEditMaterial.toFixed(2)} kg) does not match planned quantity ({parsedEditTarget.toFixed(2)} kg).
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 border rounded font-bold">Cancel</button>
                      <button type="submit" disabled={isEditing || isLoadingEditData || editMismatch} className={`px-8 py-2 text-white rounded font-bold ${isEditing || isLoadingEditData || editMismatch ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}>Save Changes</button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {isCompletionModalOpen && completingRun && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsCompletionModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border relative z-10 p-8">
            <div className="flex items-center justify-between mb-6"><h3 className="text-xl font-bold">Complete Run</h3><button onClick={() => setIsCompletionModalOpen(false)}><X className="h-6 w-6" /></button></div>
            <form onSubmit={handleConfirmCompletion} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-black uppercase text-slate-400">Actual Yield</label><input type="number" step="0.1" className="w-full p-4 text-2xl font-black border rounded-xl text-emerald-600" value={actualYield === 0 || actualYield === '0' ? '' : actualYield} onChange={(e) => setActualYield(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs font-black uppercase text-slate-400">Yield Loss</label><div className="w-full p-4 text-2xl font-black border rounded-xl bg-slate-50 text-slate-400">{Number(Math.max(0, toDisplayValue(completingRun.targetQty, unitPref) - (Number(actualYield) || 0)).toFixed(1))}</div></div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-400">Loss Reason</label>
                <select className="w-full p-2 border rounded-lg" value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
                  <option value="No Loss">No Loss</option>
                  <option value="Filter Loss">Filter Loss</option>
                  <option value="Spillage">Spillage</option>
                  <option value="Machine Breakdown">Machine Breakdown</option>
                  <option value="Operator Error">Operator Error</option>
                  <option value="Quality Rejection">Quality Rejection</option>
                  <option value="Evaporation">Evaporation</option>
                  <option value="Transfer Loss">Transfer Loss</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-slate-400">
                  {lossReason === 'Other' ? 'Custom Reason (Required)' : 'Additional Details (Optional)'}
                </label>
                <input type="text" className="w-full p-2 border rounded-lg" placeholder={lossReason === 'Other' ? "Specify exact reason here..." : "Add any specific context or notes..."} value={customLossReason} onChange={(e) => setCustomLossReason(e.target.value)} required={lossReason === 'Other'} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setIsCompletionModalOpen(false)} className="px-6 py-2 border rounded font-bold">Cancel</button><button type="button" onClick={() => handleConfirmCompletion()} disabled={isCompleting || actualYield === '' || (lossReason === 'Other' && !customLossReason)} className="px-8 py-2 bg-emerald-600 text-white rounded font-bold">Confirm</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
