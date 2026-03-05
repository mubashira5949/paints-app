import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import {
  Play,
  Plus,
  X,
  FlaskConical,
  History,
  PackageCheck
} from "lucide-react";

interface Resource {
  resource_id: number;
  name: string;
  unit: string;
  quantity_required: number;
}

interface Recipe {
  id: number;
  name: string;
  version: string;
  batch_size_liters: number;
  resources: Resource[];
}

interface Color {
  id: number;
  name: string;
  color_code: string;
}

interface ProductionRun {
  id: number;
  status: string;
  planned_quantity_liters: number;
  actual_quantity_liters: number;
  started_at: string;
  completed_at: string;
  recipe_name: string;
  color_name: string;
}

export default function Production() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Run Form State
  const [selectedColor, setSelectedColor] = useState<number | "">("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [plannedQuantity, setPlannedQuantity] = useState<number>(0);
  const [actualResources, setActualResources] = useState<{ resource_id: number; actual_quantity_used: number }[]>([]);

  const fetchRuns = async () => {
    try {
      const data = await apiRequest<ProductionRun[]>("/production-runs");
      setRuns(data);
    } catch (err) {
      console.error("Failed to fetch runs", err);
    }
  };

  const fetchColors = async () => {
    try {
      const data = await apiRequest<Color[]>("/colors");
      setColors(data);
    } catch (err) {
      console.error("Failed to fetch colors", err);
    }
  };

  useEffect(() => {
    Promise.all([fetchRuns(), fetchColors()]).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (selectedColor) {
      apiRequest<Recipe[]>(`/recipes/${selectedColor}`).then(setRecipes).catch(console.error);
    } else {
      setRecipes([]);
    }
  }, [selectedColor]);

  const handleRecipeSelect = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === Number(recipeId)) || null;
    setSelectedRecipe(recipe);
    if (recipe) {
      setPlannedQuantity(Number(recipe.batch_size_liters));
      setActualResources(recipe.resources.map(res => ({
        resource_id: res.resource_id,
        actual_quantity_used: res.quantity_required
      })));
    }
  };

  const handleQuantityChange = (qty: number) => {
    setPlannedQuantity(qty);
    if (selectedRecipe) {
      const scaleFactor = qty / Number(selectedRecipe.batch_size_liters);
      setActualResources(selectedRecipe.resources.map(res => ({
        resource_id: res.resource_id,
        actual_quantity_used: Number((res.quantity_required * scaleFactor).toFixed(4))
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    try {
      await apiRequest("/production-runs", {
        method: "POST",
        body: {
          recipe_id: selectedRecipe.id,
          planned_quantity_liters: plannedQuantity,
          actual_resources: actualResources
        }
      });
      setIsModalOpen(false);
      fetchRuns();
      // Reset form
      setSelectedColor("");
      setSelectedRecipe(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePackage = async (runId: number, volume: number) => {
    const packSize = prompt("Enter pack size in liters (e.g. 5):", "5");
    if (!packSize) return;

    const units = Math.floor(volume / Number(packSize));
    if (units === 0) {
      alert("Volume too small for this pack size");
      return;
    }

    try {
      await apiRequest(`/production-runs/${runId}/packaging`, {
        method: "POST",
        body: {
          packaging_details: [
            { pack_size_liters: Number(packSize), quantity_units: units }
          ]
        }
      });
      fetchRuns();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Runs</h1>
          <p className="text-muted-foreground mt-1">
            Manage manufacturing workflows and track resource consumption.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Production Run
        </button>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="p-6 border-b bg-muted/30">
            <h2 className="text-lg font-semibold flex items-center">
              <History className="mr-2 h-5 w-5 text-primary" />
              Recent Production History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left font-medium text-muted-foreground">ID</th>
                  <th className="h-12 px-4 text-left font-medium text-muted-foreground">Color / Recipe</th>
                  <th className="h-12 px-4 text-center font-medium text-muted-foreground">Quantity</th>
                  <th className="h-12 px-4 text-center font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center animate-pulse">Loading runs...</td></tr>
                ) : runs.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No recent runs found.</td></tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 text-muted-foreground">#{run.id}</td>
                      <td className="p-4">
                        <div className="font-medium">{run.color_name}</div>
                        <div className="text-xs text-muted-foreground">{run.recipe_name}</div>
                      </td>
                      <td className="p-4 text-center font-mono">
                        {run.actual_quantity_liters || run.planned_quantity_liters}L
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {run.status === 'completed' && (
                          <button
                            onClick={() => handlePackage(run.id, run.actual_quantity_liters)}
                            className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                          >
                            <PackageCheck className="mr-1 h-3 w-3" />
                            Package
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for New Production Run */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">New Production Run</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Color</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  >
                    <option value="">Choose a color...</option>
                    {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Recipe</label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    disabled={!selectedColor}
                    value={selectedRecipe?.id || ""}
                    onChange={(e) => handleRecipeSelect(e.target.value)}
                    required
                  >
                    <option value="">{selectedColor ? "Choose a recipe..." : "Select color first"}</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>)}
                  </select>
                </div>
              </div>

              {selectedRecipe && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-medium">Planned Quantity (Liters)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-24 rounded-md border bg-background px-3 py-1 text-sm text-right font-mono"
                        value={plannedQuantity}
                        onChange={(e) => handleQuantityChange(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
                        <FlaskConical className="mr-1 h-3 w-3" />
                        Resource Consumption Details
                      </p>
                      <div className="grid gap-2">
                        {selectedRecipe.resources.map((res, idx) => (
                          <div key={res.resource_id} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                            <span>{res.name}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.0001"
                                className="w-24 rounded-md border bg-background px-2 py-0.5 text-xs text-right font-mono"
                                value={actualResources.find(ar => ar.resource_id === res.resource_id)?.actual_quantity_used || 0}
                                onChange={(e) => {
                                  const newActuals = [...actualResources];
                                  newActuals[idx].actual_quantity_used = Number(e.target.value);
                                  setActualResources(newActuals);
                                }}
                              />
                              <span className="text-muted-foreground w-6">{res.unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRecipe}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
