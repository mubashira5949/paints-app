import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import {
  Package,
  Layers,
  Activity,
  AlertTriangle,
  TrendingUp,
  History
} from "lucide-react";

interface Stats {
  totalResources: number;
  lowStockResources: number;
  totalFinishedStock: number;
  activeProductionRuns: number;
  recentRunsCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalResources: 0,
    lowStockResources: 0,
    totalFinishedStock: 0,
    activeProductionRuns: 0,
    recentRunsCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [resources, inventory, runs] = await Promise.all([
        apiRequest<any[]>("/resources"),
        apiRequest<{ data: any[] }>("/inventory/finished-stock"),
        apiRequest<any[]>("/production-runs")
      ]);

      setStats({
        totalResources: resources.length,
        lowStockResources: resources.filter(r => Number(r.current_stock) < 20).length,
        totalFinishedStock: inventory.data.reduce((acc, item) => acc + item.total_quantity_units, 0),
        activeProductionRuns: runs.filter(r => r.status === 'in_progress' || r.status === 'planned').length,
        recentRunsCount: runs.length
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="mt-2 text-muted-foreground">
          System health and production metrics at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Resources"
          value={stats.totalResources}
          subtitle="Raw materials tracked"
          icon={<Layers className="h-4 w-4 text-primary" />}
          loading={isLoading}
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockResources}
          subtitle="Items < 20 units"
          icon={<AlertTriangle className={`h-4 w-4 ${stats.lowStockResources > 0 ? "text-destructive" : "text-muted-foreground"}`} />}
          loading={isLoading}
          trend={stats.lowStockResources > 0 ? "Critical" : "Good"}
          trendColor={stats.lowStockResources > 0 ? "text-destructive" : "text-green-600"}
        />
        <StatCard
          title="Finished Stock"
          value={stats.totalFinishedStock}
          subtitle="Units ready for sale"
          icon={<Package className="h-4 w-4 text-primary" />}
          loading={isLoading}
        />
        <StatCard
          title="Production Runs"
          value={stats.activeProductionRuns}
          subtitle="In-progress batches"
          icon={<Activity className="h-4 w-4 text-primary" />}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center">
              <TrendingUp className="mr-2 h-4 w-4 text-primary" />
              Production Activity
            </h3>
            <span className="text-xs text-muted-foreground">Last 50 runs</span>
          </div>
          <div className="flex items-end justify-around h-48 gap-2">
            {/* Visual placeholder for activity chart */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-primary/20 hover:bg-primary transition-colors rounded-t-sm w-full"
                style={{ height: `${Math.floor(Math.random() * 80) + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold flex items-center mb-4">
            <History className="mr-2 h-4 w-4 text-primary" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
              Create New Production Run
            </button>
            <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
              Generate Stock Report
            </button>
            <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium">
              Manage User Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, loading, trend, trendColor }: any) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 overflow-hidden relative">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {trend && <span className={`text-[10px] font-bold uppercase ${trendColor}`}>{trend}</span>}
          </div>
        </>
      )}
    </div>
  );
}
