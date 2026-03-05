import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { BarChart3, Package, Droplets, RefreshCw } from "lucide-react";

interface Pack {
  pack_size_liters: number;
  quantity_units: number;
}

interface InventoryItem {
  color_id: number;
  color_name: string;
  color_code: string;
  total_quantity_units: number;
  total_volume_liters: string | number;
  packs: Pack[];
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ data: InventoryItem[] }>("/inventory/finished-stock");
      setInventory(response.data);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

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
          onClick={fetchInventory}
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Total Volume</p>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {inventory.reduce((acc, item) => acc + Number(item.total_volume_liters), 0).toFixed(2)}L
            </div>
            <p className="text-xs text-muted-foreground">Across all colors</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Total Units</p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {inventory.reduce((acc, item) => acc + item.total_quantity_units, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Packaged products</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium">Active Colors</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">Unique paint products</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Color</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Pack Details</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Total Units</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Total Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 w-32 bg-muted rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-48 bg-muted rounded"></div></td>
                    <td className="p-4 text-right"><div className="h-4 w-12 bg-muted rounded ml-auto"></div></td>
                    <td className="p-4 text-right"><div className="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    No finished stock found.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.color_id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full border shadow-sm"
                          style={{ backgroundColor: item.color_code }}
                        />
                        <span>{item.color_name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {item.packs.map((pack, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                          >
                            {pack.pack_size_liters}L: {pack.quantity_units}u
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold">{item.total_quantity_units}</td>
                    <td className="p-4 text-right font-semibold">
                      {Number(item.total_volume_liters).toFixed(2)}L
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
