import React, { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import {
  BarChart3,
  Package,
  Droplets,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  ShoppingCart,
  X,
  Loader2,
} from 'lucide-react'
import { useUnitPreference, formatUnit, unitLabel } from '../utils/units'

interface ResourceAlert {
  id: number
  name: string
  unit: string
  current_stock: number
  reorder_level: number
  reorder_quantity: number
  status: 'critical' | 'low' | 'healthy'
  threshold: number
}

interface InventoryItem {
  id: number
  color: string
  color_code: string
  business_code: string
  product_series: string[]
  product_types: string[]
  ink_grades: string[]
  type_ids: number[]
  series_ids: number[]
  grade_ids: number[]
  hsn_code: string | null
  description: string | null
  tags: string[] | null
  min_threshold_kg: number
  packDistribution: { size: string; units: number }[]
  units: number
  mass: number
  status: 'healthy' | 'low'
}

interface InventorySummary {
  totalMass: number
  packagedUnits: number
  lowStockColors: number
}

interface Supplier {
  id: number
  name: string
  email: string
}

interface PODraftItem {
  resource_id: number
  resource_name: string
  quantity: number
  unit: string
}

export default function Inventory() {
  const unitPref = useUnitPreference()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [alerts, setAlerts] = useState<ResourceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  const [showAllInventory, setShowAllInventory] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [rawMaterialSearch, setRawMaterialSearch] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    packSize: 'all',
    series: 'all',
    productType: 'all',
  })

  const [productTypeOptions, setProductTypeOptions] = useState<{ id: number; name: string }[]>([])
  const [seriesOptions, setSeriesOptions] = useState<{ id: number; name: string }[]>([])

  // Purchase Order Modal state
  const [showPOModal, setShowPOModal] = useState(false)
  const [poDraftItem, setPODraftItem] = useState<PODraftItem | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [poQuantity, setPOQuantity] = useState<number>(0)
  const [poNotes, setPONotes] = useState('')
  const [poSubmitting, setPOSubmitting] = useState(false)

  const toggleRow = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id)
  }

  const fetchAlerts = async () => {
    try {
      // No threshold param needed — backend reads from DB automatically
      const response = await apiRequest<ResourceAlert[]>('/inventory/alerts')
      setAlerts(response)
    } catch (err) {
      console.error('Failed to fetch alerts', err)
    }
  }

  const fetchSummary = async () => {
    try {
      const threshold = Number(localStorage.getItem('global_low_stock_threshold')) || 20
      // Assuming summary endpoint is actually /api/inventory/summary which might not support threshold yet,
      // but let's pass it anyway.
      const response = await apiRequest<InventorySummary>(`/api/inventory/summary?threshold=${threshold}`)
      setSummary(response)
    } catch (err) {
      console.error('Failed to fetch summary', err)
    }
  }

  const fetchInventory = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const threshold = Number(localStorage.getItem('global_low_stock_threshold')) || 20
      const params = new URLSearchParams()
      params.append('threshold', threshold.toString())
      if (searchTerm) params.append('search', searchTerm)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.series !== 'all') params.append('series', filters.series)
      if (filters.packSize !== 'all') params.append('packSize', filters.packSize)
      if (filters.productType !== 'all') params.append('productType', filters.productType)

      const response = await apiRequest<InventoryItem[]>(`/api/inventory?${params.toString()}`)
      setInventory(response)

      // Fetch dynamic types for filter if not already fetched
      if (productTypeOptions.length === 0) {
        apiRequest<{ id: number; name: string }[]>('/settings/product-types')
          .then(setProductTypeOptions)
          .catch(console.error)
        // Load Ink Series options (LCS, STD, OPQ/JS - from ink_grades table)
        apiRequest<{ id: number; name: string }[]>('/settings/ink-grades')
          .then(setSeriesOptions)
          .catch(console.error)
        // apiRequest<{id: number, name: string}[]>("/settings/product-series").then(setSeriesOptions).catch(console.error);
      }
    } catch {
      setError('Unable to load inventory. Please check server connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchInventory()
    fetchSummary()
    fetchAlerts()
  }

  const openPOModal = async (alert: ResourceAlert) => {
    setPODraftItem({
      resource_id: alert.id,
      resource_name: alert.name,
      quantity: alert.reorder_quantity,
      unit: alert.unit,
    })
    setPOQuantity(alert.reorder_quantity)
    setSelectedSupplierId(null)
    setPONotes(`Reorder for ${alert.name} — stock at ${alert.current_stock}${alert.unit}, threshold ${alert.threshold}${alert.unit}`)
    setShowPOModal(true)
    // Fetch suppliers lazily
    if (suppliers.length === 0) {
      try {
        const data = await apiRequest<Supplier[]>('/suppliers')
        setSuppliers(data)
      } catch (err) {
        console.error('Failed to load suppliers', err)
      }
    }
  }

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poDraftItem || !selectedSupplierId) return
    setPOSubmitting(true)
    try {
      await apiRequest('/purchase-orders', {
        method: 'POST',
        body: {
          supplier_id: selectedSupplierId,
          notes: poNotes,
          items: [{
            resource_id: poDraftItem.resource_id,
            quantity: poQuantity,
            unit: poDraftItem.unit,
            unit_price: 0,
          }],
        },
      })
      setShowPOModal(false)
      setPODraftItem(null)
      alert(`✅ Purchase Order created for ${poDraftItem.resource_name}!\nNavigate to Procurement to review.`)
    } catch (err: any) {
      alert(err.message || 'Failed to create purchase order')
    } finally {
      setPOSubmitting(false)
    }
  }


  useEffect(() => {
    fetchInventory()
    fetchSummary()
    fetchAlerts()
  }, [searchTerm, filters])

  const allPackSizes = Array.from(
    new Set(inventory.flatMap((i) => i.packDistribution || []).map((p) => parseFloat(p.size))),
  ).sort((a, b) => a - b)

  const filteredAlerts = rawMaterialSearch
    ? alerts.filter((a) => a.name.toLowerCase().includes(rawMaterialSearch.toLowerCase()))
    : alerts

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">
            Real-time finished paint stock levels and distribution.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm border-t-4 border-blue-500 hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Total Finished Stock</p>
            <Droplets className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {summary ? formatUnit(summary.totalMass, unitPref) : '0' + unitPref}
            </div>
            <p className="text-xs text-muted-foreground">Finished paint ready for sale</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm border-t-4 border-indigo-500 hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Packaged Units</p>
            <Package className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {summary ? summary.packagedUnits : '0'}
              <span className="text-sm font-normal text-muted-foreground ml-1">Units</span>
            </div>
            <p className="text-xs text-muted-foreground">Across all pack sizes</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm border-t-4 border-amber-500 hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Low Stock Colors</p>
            <BarChart3 className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {summary ? summary.lowStockColors : '0'}
              <span className="text-sm font-normal text-muted-foreground ml-1">Colors</span>
            </div>
            <p className="text-xs text-muted-foreground">Below minimum threshold</p>
          </div>
        </div>
      </div>

      {/* ── Search & Filter bar (above table) ── */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Search Color
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-36">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Status
            </label>
            <div className="relative">
              <select
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Status</option>
                <option value="healthy">Healthy</option>
                <option value="low">Low</option>
                <option value="critical">Critical</option>
              </select>
              <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Ink Series
            </label>
            <div className="relative">
              <select
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                value={filters.series}
                onChange={(e) => setFilters((prev) => ({ ...prev, series: e.target.value }))}
              >
                <option value="all">All Series</option>
                {seriesOptions.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-full md:w-40">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Product Type
            </label>
            <div className="relative">
              <select
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                value={filters.productType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    productType: e.target.value,
                  }))
                }
              >
                <option value="all">All Types</option>
                {productTypeOptions.map((pt) => (
                  <option key={pt.id} value={pt.name}>
                    {pt.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="w-full md:w-40">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Pack Size
            </label>
            <div className="relative">
              <select
                className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
                value={filters.packSize}
                onChange={(e) => setFilters((prev) => ({ ...prev, packSize: e.target.value }))}
              >
                <option value="all">All Sizes</option>
                {allPackSizes.map((size) => (
                  <option key={size} value={size.toString()}>
                    {size}
                    {unitLabel(unitPref)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                Inventory Table
              </h2>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {showAllInventory
                  ? `Showing all ${inventory.length}`
                  : `Showing ${Math.min(5, inventory.length)} of ${inventory.length}`}
              </span>
            </div>
            {inventory.length > 5 && (
              <button
                onClick={() => setShowAllInventory(!showAllInventory)}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
              >
                {showAllInventory ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50">
                <th className="h-14 px-6 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                  Color
                </th>
                <th className="h-14 px-6 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                  Pack Distribution
                </th>
                <th className="h-14 px-6 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                  Units
                </th>
                <th className="h-14 px-6 text-right align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                  Mass
                </th>
                <th className="h-14 px-6 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                  Status
                </th>
                <th className="h-14 px-6 text-center align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4" colSpan={6}>
                      <div className="h-12 bg-muted rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No matching inventory found.
                  </td>
                </tr>
              ) : (
                (showAllInventory ? inventory : inventory.slice(0, 5)).map((item) => (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => toggleRow(item.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <td className="p-6 font-medium">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-md border shadow-sm flex items-center justify-center text-[10px] font-bold text-white uppercase"
                            style={{
                              backgroundColor: item.color_code || '#cbd5e1',
                              textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                            }}
                          >
                            {item.status === 'low' && '!'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[15px] text-slate-900">
                              {item.color}
                            </span>
                            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                              {item.business_code && <span>Code: {item.business_code}</span>}
                              {item.business_code && item.ink_grades.length > 0 && <span>•</span>}
                              {item.ink_grades.length > 0 && (
                                <span>Series: {item.ink_grades.join(', ')}</span>
                              )}
                              {item.product_types.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Types: {item.product_types.join(', ')}</span>
                                </>
                              )}
                              {item.hsn_code && (
                                <>
                                  <span>•</span>
                                  <span>HSN: {item.hsn_code}</span>
                                </>
                              )}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.map((tag, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-blue-50 text-blue-700 border border-blue-100"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-2">
                          {item.packDistribution?.slice(0, 2).map((pack, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm"
                            >
                              {parseFloat(pack.size)}
                              {unitLabel(unitPref)} ×{pack.units}
                            </span>
                          ))}
                          {item.packDistribution?.length > 2 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{item.packDistribution.length - 2} more
                            </span>
                          )}
                          {!item.packDistribution?.length && (
                            <span className="text-slate-400 text-sm italic font-medium">
                              Out of stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-6 text-center font-black text-slate-700">{item.units}</td>
                      <td className="p-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-900 tracking-tight">
                            {formatUnit(item.mass, unitPref)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                            Total Stock
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        {item.status === 'healthy' && (
                          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Healthy</span>
                          </div>
                        )}
                        {item.status === 'low' && (
                          <div className="flex items-center justify-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wide">
                            <AlertTriangle className="h-5 w-5" />
                            <span>Low Stock</span>
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRow(item.id)
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-[10px] font-bold uppercase transition-all hover:bg-slate-50 border border-slate-200 shadow-sm"
                        >
                          {expandedRowId === item.id ? 'CLOSE' : 'VIEW'}
                          {expandedRowId === item.id ? (
                            <ChevronUp className="h-3 w-3 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRowId === item.id && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="p-6 border-b">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Product Specifications
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-1 border-b border-border/50">
                                  <span className="text-muted-foreground font-medium">
                                    Product Code
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {item.business_code || '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-border/50">
                                  <span className="text-muted-foreground font-medium">
                                    HSN Code
                                  </span>
                                  <span className="font-mono font-semibold">
                                    {item.hsn_code || '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-border/50">
                                  <span className="text-muted-foreground font-medium">
                                    Product Type
                                  </span>
                                  <span className="font-semibold">
                                    {item.product_types.length > 0
                                      ? item.product_types.join(', ')
                                      : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-border/50">
                                  <span className="text-muted-foreground font-medium">
                                    Ink Series
                                  </span>
                                  <span className="font-semibold">
                                    {item.ink_grades.length > 0 ? item.ink_grades.join(', ') : '—'}
                                  </span>
                                </div>
                                {/* Ink Grade Hidden */}
                                {/* <div className="flex justify-between py-1 border-b border-border/50">
                                   <span className="text-muted-foreground font-medium">Ink Grade</span>
                                   <span className="font-semibold">{item.ink_grades.length > 0 ? item.ink_grades.join(", ") : '—'}</span>
                                 </div> */}
                                <div className="py-1">
                                  <span className="text-muted-foreground font-medium text-xs block mb-1">
                                    Product Description
                                  </span>
                                  <p className="text-xs text-slate-600 italic">
                                    {item.description || 'No description available.'}
                                  </p>
                                </div>
                                {item.tags && item.tags.length > 0 && (
                                  <div className="pt-2">
                                    <span className="text-muted-foreground font-medium text-xs block mb-1.5">
                                      Product Tags
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.tags.map((tag, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Pack Distribution
                              </h4>
                              <div className="space-y-2">
                                {item.packDistribution?.map((pack, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                                  >
                                    <span className="font-medium">
                                      {parseFloat(pack.size)}
                                      {unitLabel(unitPref)} Size
                                    </span>
                                    <span className="font-mono text-blue-600 bg-blue-50 px-2 rounded">
                                      {pack.units} units
                                    </span>
                                  </div>
                                ))}
                                {!item.packDistribution?.length && (
                                  <p className="text-sm text-muted-foreground italic">
                                    No units in stock.
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Last Production
                              </h4>
                              <p className="text-sm text-muted-foreground italic">
                                No production history.
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Recent Activity
                              </h4>
                              <p className="text-sm text-muted-foreground italic">
                                No sales history.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Old search/filter bar removed (moved above) ── */}

      {/* Raw Material alerts moved to bottom to follow "Ideal Layout" focus */}
      {alerts.length > 0 && (
        <div className="rounded-xl border bg-white p-0 overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Secondary Alerts: Raw Materials
                </h2>
              </div>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {showAllAlerts
                  ? `Showing all ${filteredAlerts.length}`
                  : `Showing ${Math.min(5, filteredAlerts.length)} of ${filteredAlerts.length}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Raw Material Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search raw material..."
                  value={rawMaterialSearch}
                  onChange={(e) => setRawMaterialSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition-all bg-white w-48"
                />
              </div>
              {filteredAlerts.length > 5 && (
                <button
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-100 whitespace-nowrap"
                >
                  {showAllAlerts ? 'View Less' : 'View All'}
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="h-10 px-6 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Material
                  </th>
                  <th className="h-10 px-6 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Status
                  </th>
                  <th className="h-10 px-6 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Current Stock
                  </th>
                  <th className="h-10 px-6 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Threshold
                  </th>
                  <th className="h-10 px-6 text-right align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Reorder Needed
                  </th>
                  <th className="h-10 px-6 text-center align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 5)).map((alert) => {
                  const isCritical = alert.status === 'critical'
                  const isLow = alert.status === 'low'
                  return (
                    <tr
                      key={alert.id}
                      className={`transition-colors ${
                        isCritical ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-amber-50/50'
                      }`}
                    >
                      <td className="p-4 px-6 font-extrabold text-slate-900">{alert.name}</td>
                      <td className="p-4 px-6">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider border border-red-200">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Critical Low
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Healthy
                          </span>
                        )}
                      </td>
                      <td className={`p-4 px-6 font-black text-lg ${
                        isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {formatUnit(alert.current_stock, unitPref)}
                      </td>
                      <td className="p-4 px-6 text-center text-slate-500 font-bold text-xs">
                        {formatUnit(alert.threshold, unitPref)}
                      </td>
                      <td className="p-4 px-6 text-right">
                        {alert.reorder_quantity > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                            isCritical
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            +{formatUnit(alert.reorder_quantity, unitPref)} needed
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4 px-6 text-center">
                        {(isCritical || isLow) && (
                          <button
                            onClick={() => openPOModal(alert)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                              isCritical
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Create PO
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 uppercase tracking-widest mb-1">
                Attention Required
              </h3>
              <p className="text-red-700 font-medium">⚠ {error}</p>
              <p className="text-red-600/70 text-xs mt-2 font-bold uppercase tracking-tighter">
                Please check server connection.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Purchase Order Modal ── */}
      {showPOModal && poDraftItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              alerts.find(a => a.id === poDraftItem.resource_id)?.status === 'critical'
                ? 'bg-red-600'
                : 'bg-orange-500'
            }`}>
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-white" />
                <div>
                  <h2 className="text-white font-black text-base">Create Purchase Order</h2>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                    Procurement &rarr; {poDraftItem.resource_name}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPOModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-5">
              {/* Material Info */}
              <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</p>
                  <p className="font-black text-slate-900 text-base mt-0.5">{poDraftItem.resource_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Qty</p>
                  <p className="font-black text-orange-600 text-base mt-0.5">{poDraftItem.quantity} {poDraftItem.unit}</p>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Order Quantity ({poDraftItem.unit})
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  step="0.1"
                  value={poQuantity}
                  onChange={(e) => setPOQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Select Supplier
                </label>
                <select
                  required
                  value={selectedSupplierId ?? ''}
                  onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="">— Select a supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPONotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSubmitting || !selectedSupplierId}
                  className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                >
                  {poSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                  {poSubmitting ? 'Creating...' : 'Create PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
