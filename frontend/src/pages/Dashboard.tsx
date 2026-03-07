import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
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
    recentRunsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const [resources, inventory, runs] = await Promise.all([
        apiRequest<any[]>("/resources"),
        apiRequest<{ data: any[] }>("/inventory/finished-stock"),
        apiRequest<any[]>("/production-runs"),
      ]);

      setStats({
        totalResources: resources.length,
        lowStockResources: resources.filter((r) => Number(r.current_stock) < 20)
          .length,
        totalFinishedStock: inventory.data.reduce(
          (acc, item) => acc + item.total_quantity_units,
          0,
        ),
        activeProductionRuns: runs.filter(
          (r) => r.status === "in_progress" || r.status === "planned",
        ).length,
        recentRunsCount: runs.length,
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
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
            <PaintBucket className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Paint Production Management System
          </h1>
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
              {stats.totalResources}{" "}
              <span className="text-sm font-normal text-gray-500">
                Resources
              </span>
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
              {stats.lowStockResources}{" "}
              <span className="text-sm font-normal text-gray-500">Items</span>
            </span>
          }
          subtitle={
            stats.lowStockResources > 0
              ? "< 20 units remaining"
              : "Inventory healthy"
          }
          icon={
            <AlertTriangle
              className={`h-4 w-4 ${stats.lowStockResources > 0 ? "text-destructive" : "text-muted-foreground"}`}
            />
          }
          loading={isLoading}
          trend={stats.lowStockResources > 0 ? "Critical" : "Good"}
          trendColor={
            stats.lowStockResources > 0 ? "text-destructive" : "text-green-600"
          }
        />
        <StatCard
          title="Finished Paint Stock"
          value={
            <span className="text-3xl font-semibold">
              {stats.totalFinishedStock}{" "}
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
              {stats.activeProductionRuns}{" "}
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
            <span className="text-xs text-muted-foreground">Last 30 Days</span>
          </div>
          <div className="flex items-end justify-around h-48 gap-2">
            {/* Visual placeholder for activity chart */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 transition-colors rounded-t-sm w-full shadow-sm"
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
            <History className="mr-2 h-4 w-4 text-blue-600" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full flex items-center p-3 rounded-lg border border-gray-100 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-medium shadow-sm group">
              <Package className="mr-3 h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Create Production Run</span>
            </button>
            <button className="w-full flex items-center p-3 rounded-lg border border-gray-100 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-medium shadow-sm group">
              <FileText className="mr-3 h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Generate Stock Report</span>
            </button>
            <button className="w-full flex items-center p-3 rounded-lg border border-gray-100 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-medium shadow-sm group">
              <Users className="mr-3 h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>Manage User Access</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold flex items-center">
              <Clock className="mr-2 h-4 w-4 text-blue-600" />
              Recent Production Runs
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                    Batch ID
                  </th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                    Color
                  </th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                    Output
                  </th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                    Operator
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  {
                    id: "B-102",
                    color: "Blue 401",
                    output: "120kg",
                    operator: "John",
                  },
                  {
                    id: "B-103",
                    color: "Red 120",
                    output: "90kg",
                    operator: "Maria",
                  },
                  {
                    id: "B-104",
                    color: "White Base",
                    output: "250kg",
                    operator: "David",
                  },
                  {
                    id: "B-105",
                    color: "Green 302",
                    output: "110kg",
                    operator: "Sarah",
                  },
                ].map((run, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-medium text-blue-600">{run.id}</td>
                    <td className="p-4">{run.color}</td>
                    <td className="p-4 font-mono">{run.output}</td>
                    <td className="p-4 text-muted-foreground">
                      {run.operator}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-1 rounded-xl border bg-card p-6 shadow-sm border-t-4 border-t-orange-500">
          <h3 className="font-semibold flex items-center mb-4 text-orange-600">
            <Bell className="mr-2 h-5 w-5" />
            Inventory Alerts
          </h3>
          <div className="space-y-4">
            {[
              {
                material: "Titanium Dioxide",
                remaining: "5kg remaining",
                status: "critical",
              },
              {
                material: "Binder A",
                remaining: "3kg remaining",
                status: "critical",
              },
              {
                material: "Solvent X",
                remaining: "12kg remaining",
                status: "warning",
              },
            ].map((alert, i) => (
              <div
                key={i}
                className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-sm">{alert.material}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.remaining}
                  </p>
                </div>
                <div
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${alert.status === "critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}
                >
                  {alert.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  trend,
  trendColor,
}: any) {
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
              <span className={`text-[10px] font-bold uppercase ${trendColor}`}>
                {trend}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
