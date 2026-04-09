import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import {
  TrendingUp,
  Package,
  AlertTriangle,
  UserRound,
  Layers,
  Activity,
  ArrowUpRight,
} from 'lucide-react'

export default function Trends() {
  const [trends, setTrends] = useState<any>(null)
  const [materials, setMaterials] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [trendsRes, materialsRes] = await Promise.all([
        apiRequest<any>('/api/dashboard/trends').catch(() => apiRequest<any>('/sales/trends')), // Fallback just in case
        apiRequest<any[]>('/resources/analytics'),
      ])
      setTrends(trendsRes || {})
      setMaterials(Array.isArray(materialsRes) ? materialsRes : [])
    } catch (err) {
      console.error('Failed to fetch analytics', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
        <Activity className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading Analytics Engine...
        </p>
      </div>
    )
  }

  const safeMaterials = Array.isArray(materials) ? materials : []
  const frequentlyUsed = safeMaterials.filter((m) => m.used_quantity > 0).slice(0, 5)
  const stagnant = safeMaterials.filter((m) => !m.used_quantity).slice(0, 5)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Analytics & Trends
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Monitor sales trends, unused stock, and raw material utilization.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
            <ArrowUpRight className="text-emerald-500" /> Trending Products by Client
          </h3>
          <ul className="space-y-3">
            {trends?.trendingProducts?.map((tp: any, i: number) => (
              <li
                key={i}
                className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-800">{tp.color_name}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    Client: {tp.client_name || 'N/A'}
                  </p>
                </div>
                <div className="text-emerald-600 font-black bg-emerald-50 px-3 py-1 rounded-xl">
                  {tp.total_kg} kg
                </div>
              </li>
            ))}
            {!trends?.trendingProducts?.length && (
              <p className="text-slate-400 text-sm font-medium">No sales data available.</p>
            )}
          </ul>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
            <UserRound className="text-blue-500" /> Trending Sales by Client
          </h3>
          <ul className="space-y-3">
            {trends?.trendingClients?.map((tc: any, i: number) => (
              <li
                key={i}
                className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-800">{tc.client_name}</p>
                  <p className="text-xs text-slate-500 font-medium">{tc.order_count} Orders</p>
                </div>
                <div className="text-blue-600 font-black bg-blue-50 px-3 py-1 rounded-xl">
                  {tc.total_kg} kg
                </div>
              </li>
            ))}
            {!trends?.trendingClients?.length && (
              <p className="text-slate-400 text-sm font-medium">No sales data available.</p>
            )}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-black mb-2 flex items-center gap-2">
            <Package className="text-slate-500" /> Inventory Insights
          </h3>
          <div className="space-y-6 mt-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-black">
                Unsold Product Stock
              </p>
              <p className="text-4xl font-black text-slate-800 tracking-tighter mt-1">
                {trends?.inventoryStats?.unsold_kg || 0}{' '}
                <span className="text-sm text-slate-400 font-bold uppercase">kg</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-black">
                Total Returns
              </p>
              <p className="text-4xl font-black text-amber-600 tracking-tighter mt-1">
                {trends?.inventoryStats?.returned_kg || 0}{' '}
                <span className="text-sm text-amber-400 font-bold uppercase">kg</span>
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" /> Wastage Analysis (Good vs Bad Causes)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trends?.wastage?.map((w: any, i: number) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
              >
                <p className="text-xs font-black text-red-400 uppercase tracking-widest leading-tight">
                  {w.reason}
                </p>
                <p className="text-3xl font-black text-red-600 tracking-tighter mt-2">
                  {w.total_kg} <span className="text-sm text-red-400 font-bold uppercase">kg</span>
                </p>
              </div>
            ))}
            {!trends?.wastage?.length && (
              <p className="text-slate-400 text-sm font-medium">No wastage documented yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-black mb-6 flex items-center gap-2">
          <Layers className="text-indigo-500" /> Raw Material Analytics & Procurement Workflow
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
              Frequently Used Materials
            </h4>
            <ul className="space-y-3">
              {frequentlyUsed.map((m: any, i: number) => (
                <li
                  key={i}
                  className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div>
                    <p className="font-bold text-slate-800">{m.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                      Last used: {m.last_used ? new Date(m.last_used).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-600 font-black">
                      {m.used_quantity} {m.unit}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      Consumed
                    </p>
                  </div>
                </li>
              ))}
              {frequentlyUsed.length === 0 && (
                <p className="text-sm text-slate-400">No frequently used materials.</p>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4">
              Stagnant Materials (Zero Usage)
            </h4>
            <ul className="space-y-3">
              {stagnant.map((m: any, i: number) => (
                <li
                  key={i}
                  className="flex justify-between items-center p-4 bg-amber-50 rounded-2xl border border-amber-100"
                >
                  <div>
                    <p className="font-bold text-slate-800">{m.name}</p>
                    <p className="text-[10px] text-amber-700 font-bold uppercase mt-0.5">
                      Current Stock: {m.current_stock} {m.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-600 font-black text-sm uppercase tracking-wider">
                      No usage
                    </p>
                  </div>
                </li>
              ))}
              {stagnant.length === 0 && (
                <p className="text-sm text-slate-400">No stagnant materials found.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
