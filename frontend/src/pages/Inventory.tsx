import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { BarChart3, Package, Droplets, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, AlertCircle, Search } from "lucide-react";

interface Pack {
  pack_size_liters: number;
  quantity_units: number;
}

interface ResourceAlert {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
}

interface InventoryItem {
  color_id: number;
  color_name: string;
  color_code: string;
  business_code: string;
  series: string;
  min_threshold_liters: number;
  total_quantity_units: number;
  total_volume_liters: string | number;
  stock_status: 'healthy' | 'low' | 'critical';
  packs: Pack[];
  last_production_id: number | null;
  last_produced_at: string | null;
  last_sale_units: number | null;
  last_sale_at: string | null;
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<ResourceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [showAllInventory, setShowAllInventory] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [packSizeFilter, setPackSizeFilter] = useState("all");

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

  const fetchInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ data: InventoryItem[] }>(
        "/inventory/finished-stock",
      );
      setInventory(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchAlerts();
  }, []);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.color_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.business_code && item.business_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || item.stock_status === statusFilter;
    const matchesSeries = seriesFilter === "all" || item.series === seriesFilter;
    const matchesPackSize = packSizeFilter === "all" || item.packs?.some(p => p.pack_size_liters.toString() === packSizeFilter);

    return matchesSearch && matchesStatus && matchesSeries && matchesPackSize;
  });

  const activeSeries = Array.from(new Set(inventory.map(i => i.series).filter(Boolean)));
  const allPackSizes = Array.from(new Set(inventory.flatMap(i => i.packs || []).map(p => p.pack_size_liters))).sort((a, b) => a - b);

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
          onClick={() => { fetchInventory(); fetchAlerts(); }}
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
              {inventory
                .reduce(
                  (acc, item) => acc + Number(item.total_volume_liters),
                  0,
                )
                .toFixed(0)}
              L
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
              {inventory.reduce(
                (acc, item) => acc + item.total_quantity_units,
                0,
              )}
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
              {inventory.filter(item => item.stock_status !== 'healthy').length}
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
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-widest">{filteredInventory.length} Entries</span>
          </div>
          {filteredInventory.length > 2 && (
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
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No matching inventory found.
                  </td>
                </tr>
              ) : (
                filteredInventory.slice(0, showAllInventory ? undefined : 2).map((item) => (
                  <>
                    <tr
                      key={item.color_id}
                      onClick={() => toggleRow(item.color_id)}
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
                            {item.stock_status === 'critical' && "!"}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[15px] text-slate-900">
                              {item.color_name}
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
                          {item.packs?.slice(0, 2).map((pack, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm"
                            >
                              {pack.pack_size_liters}L ×{pack.quantity_units}
                            </span>
                          ))}
                          {item.packs?.length > 2 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{item.packs.length - 2} more
                            </span>
                          )}
                          {!item.packs && <span className="text-slate-400 text-sm italic font-medium">Out of stock</span>}
                        </div>
                      </td>
                      <td className="p-6 text-center font-black text-slate-700">
                        {item.total_quantity_units}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-900 tracking-tight">{Number(item.total_volume_liters).toFixed(1)}L</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">
                            Total Stock
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        {item.stock_status === 'healthy' && (
                          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wide">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Healthy</span>
                          </div>
                        )}
                        {item.stock_status === 'low' && (
                          <div className="flex items-center justify-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wide">
                            <AlertTriangle className="h-5 w-5" />
                            <span>Low Stock</span>
                          </div>
                        )}
                        {item.stock_status === 'critical' && (
                          <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wide">
                            <AlertCircle className="h-5 w-5" />
                            <span>Critical</span>
                          </div>
                        )}
                      </td>
                      <td className="p-6 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRow(item.color_id); }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-[10px] font-bold uppercase transition-all hover:bg-slate-50 border border-slate-200 shadow-sm"
                        >
                          {expandedRowId === item.color_id ? "CLOSE" : "VIEW"}
                          {expandedRowId === item.color_id ? (
                            <ChevronUp className="h-3 w-3 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRowId === item.color_id && (
                      <tr className="bg-muted/30">
                        <td colSpan={6} className="p-6 border-b">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Pack Distribution
                              </h4>
                              <div className="space-y-2">
                                {item.packs?.map((pack, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                    <span className="font-medium">{pack.pack_size_liters}L Size</span>
                                    <span className="font-mono text-blue-600 bg-blue-50 px-2 rounded">{pack.quantity_units} units</span>
                                  </div>
                                ))}
                                {!item.packs && <p className="text-sm text-muted-foreground italic">No units in stock.</p>}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Last Production
                              </h4>
                              {item.last_production_id ? (
                                <div className="space-y-2">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">Batch PR-{item.last_production_id}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.last_produced_at!).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  <div className="text-xs bg-slate-100 p-2 rounded border">
                                    Added to finished stock from production run.
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No production history.</p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Recent Activity
                              </h4>
                              {item.last_sale_at ? (
                                <div className="space-y-2">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{item.last_sale_units} Units Sold</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.last_sale_at).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'short', day: 'numeric'
                                      })}
                                    </span>
                                  </div>
                                  <div className="text-xs bg-green-50 text-green-700 p-2 rounded border border-green-100">
                                    Last recorded sale transaction.
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">No sales history.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              value={packSizeFilter}
              onChange={(e) => setPackSizeFilter(e.target.value)}
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
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}
