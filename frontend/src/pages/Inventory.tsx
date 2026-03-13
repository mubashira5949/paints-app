import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { BarChart3, Package, Droplets, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, AlertCircle, Search } from "lucide-react";


interface ResourceAlert {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
}

interface InventoryItem {
  id: number;
  color: string;
  color_code: string;
  business_code: string;
  series: string;
  min_threshold_liters: number;
  packDistribution: { size: string, units: number }[];
  units: number;
  volume: number;
  status: 'healthy' | 'low' | 'critical';
}

interface InventorySummary {
  totalVolume: number;
  packagedUnits: number;
  lowStockColors: number;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [alerts, setAlerts] = useState<ResourceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [showAllInventory, setShowAllInventory] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    packSize: "all",
    series: "all"
  });

  const toggleRow = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const fetchAlerts = async () => {
    try {
      const response = await apiRequest<ResourceAlert[]>("/inventory/alerts");
      setAlerts(response);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiRequest<InventorySummary>("/api/inventory/summary");
      setSummary(response);
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.series !== "all") params.append("series", filters.series);
      if (filters.packSize !== "all") params.append("packSize", filters.packSize);

      const response = await apiRequest<InventoryItem[]>(`/api/inventory?${params.toString()}`);
      setInventory(response);
    } catch (err: any) {
      setError("Unable to load inventory. Please check server connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInventory();
    fetchSummary();
    fetchAlerts();
  };

  useEffect(() => {
    fetchInventory();
    fetchSummary();
    fetchAlerts();
  }, [searchTerm, filters]);

  const activeSeries = Array.from(new Set(inventory.map(i => i.series).filter(Boolean)));
  const allPackSizes = Array.from(new Set(inventory.flatMap(i => i.packDistribution || []).map(p => parseFloat(p.size)))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time finished paint stock levels and distribution.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "Refreshing..." : "Refresh"}
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
              {summary ? summary.totalVolume.toFixed(0) : "0"}L
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
              {summary ? summary.packagedUnits : "0"}
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
              {summary ? summary.lowStockColors : "0"}
              <span className="text-sm font-normal text-muted-foreground ml-1">Colors</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Below minimum threshold
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Inventory Table</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-widest">{inventory.length} Entries</span>
          </div>
          {inventory.length > 2 && (
            <button 
              onClick={() => setShowAllInventory(!showAllInventory)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showAllInventory ? 'View Less' : 'View All'}
            </button>
          )}
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
                  Volume
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
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No matching inventory found.
                  </td>
                </tr>
              ) : (
                inventory.slice(0, showAllInventory ? undefined : 2).map((item) => (
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
                              textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
                            }}
                          >
                            {item.status === 'critical' && "!"}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[15px] text-slate-900">
                              {item.color}
                            </span>
                            <div className="flex gap-1.5 text-[11px] text-slate-500 font-medium">
                              <span>Code: {item.business_code || 'N/A'}</span>
                              <span>•</span>
                              <span>Series: {item.series || 'N/A'}</span>
                            </div>
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
                              {pack.size} ×{pack.units}
                            </span>
                          ))}
                          {item.packDistribution?.length > 2 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{item.packDistribution.length - 2} more
                            </span>
                          )}
                          {!item.packDistribution?.length && <span className="text-slate-400 text-sm italic font-medium">Out of stock</span>}
                        </div>
                      </td>
                      <td className="p-6 text-center font-black text-slate-700">
                        {item.units}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-900 tracking-tight">{Number(item.volume).toFixed(1)}L</span>
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
                        {(item.status === 'low' || item.status === 'critical') && (
                          <div className={`flex items-center justify-center gap-2 ${item.status === 'critical' ? 'text-red-600' : 'text-amber-600'} font-bold text-xs uppercase tracking-wide`}>
                            {item.status === 'critical' ? <AlertCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                            <span>{item.status === 'critical' ? 'Critical' : 'Low Stock'}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRow(item.id); }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-[10px] font-bold uppercase transition-all hover:bg-slate-50 border border-slate-200 shadow-sm"
                        >
                          {expandedRowId === item.id ? "CLOSE" : "VIEW"}
                          {(expandedRowId === item.id) ? (
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
                                Pack Distribution
                              </h4>
                              <div className="space-y-2">
                                {item.packDistribution?.map((pack, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                    <span className="font-medium">{pack.size} Size</span>
                                    <span className="font-mono text-blue-600 bg-blue-50 px-2 rounded">{pack.units} units</span>
                                  </div>
                                ))}
                                {!item.packDistribution?.length && <p className="text-sm text-muted-foreground italic">No units in stock.</p>}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Last Production
                              </h4>
                              <p className="text-sm text-muted-foreground italic">No production history.</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Recent Activity
                              </h4>
                              <p className="text-sm text-muted-foreground italic">No sales history.</p>
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

      <div className="flex flex-col md:flex-row gap-6 items-end bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 w-full">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Search Color</label>
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
        <div className="w-full md:w-32">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
          <div className="relative">
            <select
              className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="healthy">Healthy</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
            </select>
            <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="w-full md:w-40">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pack Size</label>
          <div className="relative">
            <select
              className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
              value={filters.packSize}
              onChange={(e) => setFilters(prev => ({ ...prev, packSize: e.target.value }))}
            >
              <option value="all">All Sizes</option>
              {allPackSizes.map(size => (
                <option key={size} value={size.toString()}>{size}L</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="w-full md:w-32">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Series</label>
          <div className="relative">
            <select
              className="w-full pl-4 pr-10 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none transition-all"
              value={filters.series}
              onChange={(e) => setFilters(prev => ({ ...prev, series: e.target.value }))}
            >
              <option value="all">All</option>
              {activeSeries.map(series => (
                <option key={series} value={series}>{series}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Raw Material alerts moved to bottom to follow "Ideal Layout" focus */}
      {alerts.length > 0 && (
        <div className="rounded-xl border bg-white p-0 overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between p-5 border-b bg-slate-50/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Secondary Alerts: Raw Materials</h2>
            </div>
            {alerts.length > 2 && (
              <button 
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                {showAllAlerts ? 'View Less' : 'View All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="h-10 px-6 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">Material</th>
                  <th className="h-10 px-6 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">Status</th>
                  <th className="h-10 px-6 text-left align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">Current Stock</th>
                  <th className="h-10 px-6 text-right align-middle font-bold text-slate-500 text-[10px] uppercase tracking-widest">Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alerts.slice(0, showAllAlerts ? undefined : 2).map(alert => (
                  <tr key={alert.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="p-4 px-6 font-extrabold text-slate-900">{alert.name}</td>
                    <td className="p-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Low
                      </span>
                    </td>
                    <td className="p-4 px-6 font-black text-slate-700">{Number(alert.current_stock).toFixed(0)} {alert.unit}</td>
                    <td className="p-4 px-6 text-right text-slate-500 font-bold text-xs">{alert.reorder_level} {alert.unit}</td>
                  </tr>
                ))}
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
              <h3 className="text-sm font-bold text-red-900 uppercase tracking-widest mb-1">Attention Required</h3>
              <p className="text-red-700 font-medium">
                ⚠ {error}
              </p>
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
    </div>
  );
}
