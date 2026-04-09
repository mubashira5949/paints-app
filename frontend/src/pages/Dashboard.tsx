import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Package,
  Layers,
  Activity,
  AlertTriangle,
  TrendingUp,
  History,
  FileText,
  PaintBucket,
  Clock,
  Bell,
  Users,
  ShoppingCart,
} from 'lucide-react'
import { useUnitPreference, formatUnit } from '../utils/units'

interface DashboardData {
  metrics: {
    rawMaterials: number
    lowStock: number
    finishedStock: number
    activeRuns: number
  }
  productionChart: {
    month: string
    runs: number
  }[]
  recentRuns: {
    batchId: string
    color: string
    output: number | null
    operator: string
  }[]
  inventoryAlerts: {
    material: string
    remaining: string
    status: string
  }[]
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const unitPref = useUnitPreference()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Toggle states for tables
  const [showAllRuns, setShowAllRuns] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  const fetchDashboardData = async (isBackgroundPolling = false, signal?: AbortSignal) => {
    // Prevent overlapping API calls
    if (isFetching) return

    // Only show global loading spinners on initial manual load
    if (!isBackgroundPolling && !data) {
      // Already true by default, no need to set synchronously in effect
    }
    setIsFetching(true)

    try {
      const dashboardData = await apiRequest<DashboardData>('/api/dashboard', {
        signal,
      })
      setData(dashboardData)
      setLastUpdated(new Date().toLocaleTimeString())
      setError(null) // Clear errors on success
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      console.error('Failed to fetch dashboard data', err)
      setError('Failed to load dashboard data. Retrying in background...')
    } finally {
      setIsLoading(false)
      setIsFetching(false)
    }
  }

  const generateStockReport = async () => {
    try {
      const res = await apiRequest<any[]>('/inventory/stock-report')

      if (!res || !Array.isArray(res) || res.length === 0) {
        alert('No stock data available to export.')
        return
      }

      // Convert array of objects to CSV
      const headers = Object.keys(res[0])
      const csvRows = [headers.join(',')] // Header row

      for (const row of res) {
        const values = headers.map((header) => {
          const val = row[header]
          // Escape quotes and wrap strings in quotes if they contain commas
          const escaped = String(val).replace(/"/g, '""')
          return `"${escaped}"`
        })
        csvRows.push(values.join(','))
      }

      const csvString = csvRows.join('\n')

      // Trigger download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `stock-report-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to generate report', err)
      alert('Failed to generate report. Please try again.')
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchDashboardData(false, controller.signal)

    // Auto Refresh: Poll backend every 30 seconds for live updates
    const interval = setInterval(() => fetchDashboardData(true, controller.signal), 30000)

    // Cleanup interval on component unmount
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-4 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Raw Materials"
          value={
            <span className="text-3xl font-semibold">
              {data?.metrics.rawMaterials || 0}{' '}
              <span className="text-sm font-normal text-gray-500">Resources</span>
            </span>
          }
          subtitle="Tracked in inventory"
          icon={<Layers className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={
            <span className="text-3xl font-semibold">
              {data?.metrics.lowStock || 0}{' '}
              <span className="text-sm font-normal text-gray-500">Items</span>
            </span>
          }
          subtitle={
            (data?.metrics.lowStock || 0) > 0 ? 'Action required soon' : 'Inventory healthy'
          }
          icon={
            <AlertTriangle
              className={`h-4 w-4 ${(data?.metrics.lowStock || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            />
          }
          loading={isLoading}
          trend={(data?.metrics.lowStock || 0) > 0 ? 'Critical' : 'Good'}
          trendColor={(data?.metrics.lowStock || 0) > 0 ? 'text-destructive' : 'text-green-600'}
        />
        <StatCard
          title="Finished Paint Stock"
          value={
            <span className="text-3xl font-semibold">
              {data?.metrics.finishedStock || 0}{' '}
              <span className="text-sm font-normal text-gray-500">Units</span>
            </span>
          }
          subtitle="Ready for sale"
          icon={<Package className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
        <StatCard
          title="Production Runs"
          value={
            <span className="text-3xl font-semibold">
              {data?.metrics.activeRuns || 0}{' '}
              <span className="text-sm font-normal text-gray-500">Active</span>
            </span>
          }
          subtitle="Batches in progress"
          icon={<Activity className="h-4 w-4 text-blue-600" />}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-blue-600" />
              Production Runs
            </h3>
            <span className="text-xs text-muted-foreground">Last 6 Months</span>
          </div>
          <div className="h-48 w-full mt-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.productionChart || []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="runs" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold flex items-center mb-4">
            <History className="mr-2 h-4 w-4 text-blue-600" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/production')}
              className="w-full flex items-center p-3 rounded-lg border border-transparent bg-blue-600 hover:bg-blue-700 text-white transition-all text-sm font-medium shadow-sm group"
            >
              <Package className="mr-3 h-5 w-5 text-blue-100 group-hover:scale-110 transition-transform" />
              <span>Start New Production Batch</span>
            </button>

            {(user?.role === 'admin' ||
              user?.role === 'manager' ||
              user?.role === 'operator' ||
              user?.role === 'sales') && (
              <button
                onClick={() => navigate('/sales/new')}
                className="w-full flex items-center p-3 rounded-lg border border-transparent bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-sm font-medium shadow-sm group"
              >
                <ShoppingCart className="mr-3 h-5 w-5 text-emerald-100 group-hover:scale-110 transition-transform" />
                <span>Record New Sale</span>
              </button>
            )}

            {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'sales') && (
              <button
                onClick={generateStockReport}
                className="w-full flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all text-sm font-medium shadow-sm group"
              >
                <FileText className="mr-3 h-5 w-5 text-slate-400 group-hover:scale-110 transition-transform" />
                <span>Generate Stock Report</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/users')}
                className="w-full flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all text-sm font-medium shadow-sm group"
              >
                <Users className="mr-3 h-5 w-5 text-slate-400 group-hover:scale-110 transition-transform" />
                <span>Manage User Access</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="mr-2 h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Recent Production Runs</h3>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {data?.recentRuns &&
                  (showAllRuns
                    ? `Showing all ${data.recentRuns.length}`
                    : `Showing ${Math.min(3, data.recentRuns.length)} of ${data.recentRuns.length}`)}
              </span>
            </div>
            {data?.recentRuns && data.recentRuns.length > 3 && (
              <button
                onClick={() => setShowAllRuns(!showAllRuns)}
                className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
              >
                {showAllRuns ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-100">
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
                    Output
                  </th>
                  <th className="h-12 px-6 text-left align-middle font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                    Operator
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      Loading runs...
                    </td>
                  </tr>
                ) : data?.recentRuns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      No recent runs
                    </td>
                  </tr>
                ) : (
                  data?.recentRuns
                    .slice(0, showAllRuns ? data.recentRuns.length : 3)
                    .map((run, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="p-6 font-bold text-blue-600 tracking-tight">
                          {run.batchId}
                        </td>
                        <td className="p-6 font-extrabold text-slate-900">{run.color}</td>
                        <td className="p-6 font-black text-slate-700 tracking-tight">
                          {formatUnit(run.output, unitPref)}
                        </td>
                        <td className="p-6 text-slate-500 font-medium text-xs uppercase tracking-wide">
                          {run.operator}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-1 rounded-xl border bg-card p-6 shadow-sm border-t-4 border-t-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="mr-2 h-5 w-5" />
              <h3 className="font-semibold">Inventory Alerts</h3>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {data?.inventoryAlerts &&
                  (showAllAlerts
                    ? `Showing all ${data.inventoryAlerts.length}`
                    : `Showing ${Math.min(3, data.inventoryAlerts.length)} of ${data.inventoryAlerts.length}`)}
              </span>
            </div>
            {data?.inventoryAlerts && data.inventoryAlerts.length > 3 && (
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded border border-orange-100"
              >
                {showAllAlerts ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-widest">
                    Material
                  </th>
                  <th className="px-3 py-2 font-bold text-slate-500 uppercase tracking-widest text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : data?.inventoryAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 text-center text-slate-400">
                      No alerts
                    </td>
                  </tr>
                ) : (
                  data?.inventoryAlerts
                    .slice(0, showAllAlerts ? data.inventoryAlerts.length : 3)
                    .map((alert, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3">
                          <p className="font-extrabold text-slate-900">{alert.material}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {alert.remaining} left
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                alert.status === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {alert.status}
                            </span>
                            {(user?.role === 'operator' ||
                              user?.role === 'admin' ||
                              user?.role === 'manager') &&
                              alert.status === 'critical' && (
                                <button
                                  onClick={() => {
                                    window.alert(
                                      `Manager notified to initiate Purchase Order for ${alert.material}`,
                                    )
                                  }}
                                  className="text-[9px] bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-widest font-black transition-colors shadow-sm"
                                >
                                  Notify Manager
                                </button>
                              )}
                          </div>
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

function StatCard({ title, value, subtitle, icon, loading, trend, trendColor }: any) {
  return (
    <div className="rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-200 border-t-4 border-t-blue-500 p-6 overflow-hidden relative">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      ) : (
        <>
          <div className="mt-2">{value}</div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {trend && (
              <span className={`text-[10px] font-bold uppercase ${trendColor}`}>{trend}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
