import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Package,
  Layers,
  AlertTriangle,
  History,
  Clock,
  Bell,
  Users,
  ShoppingCart,
  PaintBucket,
  ClipboardList,
  Truck,
  ShieldCheck,
  CircleDollarSign,
} from 'lucide-react'

/**
 * Matches the response of GET /api/dashboard (see openapi.yaml → DashboardResponse).
 * All counts come back as strings because the backend uses `COUNT(*)` which
 * Postgres returns as `bigint` and the pg driver hands back as a string.
 */
interface DashboardData {
  counts: {
    paints: string | number
    variants: string | number
    formulas: string | number
    resources: string | number
    customers: string | number
    suppliers: string | number
    packs_in_stock: string | number
    packs_ready_to_ship: string | number
  }
  low_stock_resources: Array<{
    id: number
    name: string
    current_stock_kg: string | number
    effective_threshold_kg: string | number
  }>
  pending_production_requests: Array<{
    id: number
    variant_id: number
    pack_size_kg: string | number
    quantity_packs: number
    origin: 'customer_order' | 'demand_suggestion'
    created_at: string
    paint_name: string
    classification: string
    ink_series: string
  }>
  open_purchase_orders: Array<{
    id: number
    supplier_id: number
    supplier_name: string
    status: string
    created_at: string
  }>
  pending_device_approvals: Array<{
    id: number
    user_name: string
    device: string | null
    requested_at: string
  }>
  flagged_runs_last_30_days: Array<{
    id: number
    batch_number: string
    paint_name: string
    classification: string
    ink_series: string
    wastage_pct: string | number | null
    dilution_total_kg: string | number
    completed_at: string | null
  }>
  overdue_sales: Array<{
    id: number
    order_id: number
    customer_name: string
    due_date: string
    currency: string
    billed: string | number
    collected: string | number
  }>
}

const num = (v: unknown): number => (typeof v === 'string' ? Number(v) : Number(v ?? 0))

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [showAllFlagged, setShowAllFlagged] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  const fetchDashboardData = async (isBackgroundPolling = false, signal?: AbortSignal) => {
    if (isFetching) return
    setIsFetching(true)
    try {
      const dashboardData = await apiRequest<DashboardData>('/api/dashboard', { signal })
      setData(dashboardData)
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('Failed to fetch dashboard data', err)
      setError('Failed to load dashboard data. Retrying in background...')
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchDashboardData(false, controller.signal)
    const interval = setInterval(() => fetchDashboardData(true, controller.signal), 30000)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [])

  const lowStockCount = data?.low_stock_resources.length ?? 0
  const pendingRequestsCount = data?.pending_production_requests.length ?? 0
  const openPOsCount = data?.open_purchase_orders.length ?? 0
  const pendingDevicesCount = data?.pending_device_approvals.length ?? 0
  const overdueSalesCount = data?.overdue_sales.length ?? 0

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 flex items-center shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 shrink-0" />
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <PaintBucket className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Paint Production Management System</h1>
          {lastUpdated && (
            <div className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground bg-slate-100 px-2 py-1 rounded-full shadow-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Last sync: {lastUpdated}
            </div>
          )}
        </div>
        <p className="mt-2 text-muted-foreground">
          System health, factory operations, and production metrics at a glance.
        </p>
      </div>

      {/* Top-row counters */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Resources"
          value={num(data?.counts.resources)}
          unit="materials"
          subtitle="In active catalog"
          icon={<Layers className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          unit="items"
          subtitle={lowStockCount > 0 ? 'Action required soon' : 'Inventory healthy'}
          icon={<AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />}
          loading={isLoading}
          trend={lowStockCount > 0 ? 'Critical' : 'Good'}
          trendColor={lowStockCount > 0 ? 'text-destructive' : 'text-green-600'}
        />
        <StatCard
          title="Finished Stock"
          value={num(data?.counts.packs_in_stock)}
          unit="packs"
          subtitle={`${num(data?.counts.packs_ready_to_ship)} ready to ship`}
          icon={<Package className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
        <StatCard
          title="Pending Production"
          value={pendingRequestsCount}
          unit="requests"
          subtitle="In Operator queue"
          icon={<ClipboardList className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
      </div>

      {/* Second-row counters: ops + supply + safety */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Purchase Orders"
          value={openPOsCount}
          unit="POs"
          subtitle="Draft / ordered / shipped"
          icon={<Truck className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
        <StatCard
          title="Overdue Sales"
          value={overdueSalesCount}
          unit="sales"
          subtitle={overdueSalesCount > 0 ? 'Past due, partial or unpaid' : 'All current'}
          icon={<CircleDollarSign className={`h-4 w-4 ${overdueSalesCount > 0 ? 'text-destructive' : 'text-blue-600'}`} />}
          loading={isLoading}
        />
        <StatCard
          title="Pending Device Approvals"
          value={pendingDevicesCount}
          unit="devices"
          subtitle="Awaiting Manager review"
          icon={<ShieldCheck className={`h-4 w-4 ${pendingDevicesCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />}
          loading={isLoading}
        />
        <StatCard
          title="Catalog"
          value={num(data?.counts.paints)}
          unit="paints"
          subtitle={`${num(data?.counts.variants)} variants · ${num(data?.counts.formulas)} formulas`}
          icon={<PaintBucket className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold flex items-center mb-4">
          <History className="mr-2 h-4 w-4 text-blue-600" />
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate('/production')}
            className="flex items-center p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all text-sm font-medium shadow-sm"
          >
            <Package className="mr-3 h-5 w-5" />
            <span>Start New Production Batch</span>
          </button>
          {(user?.role === 'manager' || user?.role === 'sales') && (
            <button
              onClick={() => navigate('/sales/new')}
              className="flex items-center p-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-sm font-medium shadow-sm"
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              <span>Record New Sale</span>
            </button>
          )}
          {user?.role === 'manager' && (
            <>
              <button
                onClick={() => navigate('/users')}
                className="flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all text-sm font-medium shadow-sm"
              >
                <Users className="mr-3 h-5 w-5 text-slate-400" />
                <span>Manage User Access</span>
              </button>
              {pendingDevicesCount > 0 && (
                <button
                  onClick={() => navigate('/users?tab=device-requests')}
                  className="flex items-center p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 transition-all text-sm font-medium shadow-sm"
                >
                  <ShieldCheck className="mr-3 h-5 w-5 text-orange-500" />
                  <span>{pendingDevicesCount} Device Approval{pendingDevicesCount === 1 ? '' : 's'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Two side-by-side tables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="mr-2 h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Flagged Production Runs (Last 30d)</h3>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {data?.flagged_runs_last_30_days &&
                  (showAllFlagged
                    ? `Showing all ${data.flagged_runs_last_30_days.length}`
                    : `Showing ${Math.min(5, data.flagged_runs_last_30_days.length)} of ${data.flagged_runs_last_30_days.length}`)}
              </span>
            </div>
            {data?.flagged_runs_last_30_days && data.flagged_runs_last_30_days.length > 5 && (
              <button
                onClick={() => setShowAllFlagged(!showAllFlagged)}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
              >
                {showAllFlagged ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <Th>Batch</Th>
                  <Th>Variant</Th>
                  <Th>Wastage</Th>
                  <Th>Dilution</Th>
                  <Th>Completed</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <Loading colSpan={5} />
                ) : (data?.flagged_runs_last_30_days?.length ?? 0) === 0 ? (
                  <Empty colSpan={5} message="No flagged runs in the last 30 days" />
                ) : (
                  data!.flagged_runs_last_30_days
                    .slice(0, showAllFlagged ? undefined : 5)
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-blue-600 tracking-tight">{r.batch_number}</td>
                        <td className="p-4 font-semibold text-slate-900">
                          {r.paint_name}{' '}
                          <span className="text-slate-500 font-normal">
                            ({r.classification}, {r.ink_series})
                          </span>
                        </td>
                        <td className="p-4 text-slate-700 tracking-tight">
                          {r.wastage_pct != null ? `${num(r.wastage_pct).toFixed(2)}%` : '—'}
                        </td>
                        <td className="p-4 text-slate-700 tracking-tight">
                          {num(r.dilution_total_kg).toFixed(2)} kg
                        </td>
                        <td className="p-4 text-slate-500 font-medium text-xs">
                          {r.completed_at ? new Date(r.completed_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-1 rounded-xl border bg-card p-6 shadow-sm border-t-4 border-t-orange-500">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="mr-2 h-4 w-4 text-orange-500" />
            <h3 className="font-semibold">Low-Stock Resources</h3>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              {data?.low_stock_resources &&
                (showAllAlerts
                  ? `Showing all ${data.low_stock_resources.length}`
                  : `Showing ${Math.min(5, data.low_stock_resources.length)} of ${data.low_stock_resources.length}`)}
            </span>
            {data?.low_stock_resources && data.low_stock_resources.length > 5 && (
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded border border-orange-100"
              >
                {showAllAlerts ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <Th>Material</Th>
                  <Th align="right">Stock / Threshold</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <Loading colSpan={2} />
                ) : (data?.low_stock_resources?.length ?? 0) === 0 ? (
                  <Empty colSpan={2} message="No low-stock resources" />
                ) : (
                  data!.low_stock_resources
                    .slice(0, showAllAlerts ? undefined : 5)
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-900">{r.name}</td>
                        <td className="p-4 text-right text-slate-700 tracking-tight">
                          <span className="text-red-600 font-bold">{num(r.current_stock_kg).toFixed(2)} kg</span>
                          <span className="text-slate-400"> / {num(r.effective_threshold_kg).toFixed(2)} kg</span>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- small UI helpers ----------

function StatCard({
  title, value, unit, subtitle, icon, loading, trend, trendColor,
}: {
  title: string
  value: number
  unit: string
  subtitle: string
  icon: React.ReactNode
  loading: boolean
  trend?: string
  trendColor?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-9 w-24 bg-slate-100 animate-pulse rounded" />
        ) : (
          <span className="text-3xl font-semibold">
            {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
      {trend && trendColor && !loading && (
        <div className={`mt-2 text-xs font-bold uppercase ${trendColor}`}>{trend}</div>
      )}
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`h-12 px-4 align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Loading({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-6 text-center text-slate-400">
        Loading…
      </td>
    </tr>
  )
}

function Empty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-6 text-center text-slate-400">
        {message}
      </td>
    </tr>
  )
}
