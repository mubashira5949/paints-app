import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api";
import { ArrowLeft, Check, AlertCircle, Save } from "lucide-react";

interface Color {
  id: number;
  name: string;
  business_code: string;
}

interface Recipe {
  id: number;
  name: string;
  batch_size_liters: number;
}

interface Resource {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
}

export default function ProductionRunForm() {
  const navigate = useNavigate();

  const [colors, setColors] = useState<Color[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [selectedColor, setSelectedColor] = useState<number | "">("");
  const [selectedRecipe, setSelectedRecipe] = useState<number | "">("");
  const [expectedOutput, setExpectedOutput] = useState<number>(0);

  const [actualResources, setActualResources] = useState<{ resourceId: number; quantity: number }[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial data for dropdowns
    const fetchFormData = async () => {
      try {
        const [colorsData, resourcesData] = await Promise.all([
          apiRequest<Color[]>("/colors"),
          apiRequest<Resource[]>("/resources"),
        ]);
        setColors(colorsData);
        setResources(resourcesData);
      } catch (err) {
        console.error("Failed to load form data", err);
        setError("Failed to load required data. Please try again.");
      }
    };
    fetchFormData();
  }, []);

  useEffect(() => {
    // When color changes, fetch recipes for that color
    if (selectedColor) {
      const fetchRecipes = async () => {
        try {
          // The backend expects `/recipes/:colorId` and returns an array of Recipes
          const recipesData = await apiRequest<Recipe[]>(`/recipes/${selectedColor}`);
          setRecipes(recipesData);
        } catch (err) {
          console.error("Failed to load recipes", err);
        }
      };
      fetchRecipes();
    } else {
      setRecipes([]);
      setSelectedRecipe("");
      setExpectedOutput(0);
    }
  }, [selectedColor]);

  useEffect(() => {
    if (selectedRecipe) {
      const recipe = recipes.find(r => r.id === Number(selectedRecipe));
      if (recipe) {
        setExpectedOutput(Number(recipe.batch_size_liters));
      }
    }
  }, [selectedRecipe, recipes]);

  const handleResourceChange = (index: number, field: "resourceId" | "quantity", value: number) => {
    const newResources = [...actualResources];
    newResources[index] = { ...newResources[index], [field]: value };
    setActualResources(newResources);
  };

  const addResourceRow = () => {
    setActualResources([...actualResources, { resourceId: 0, quantity: 0 }]);
  };

  const removeResourceRow = (index: number) => {
    const newResources = [...actualResources];
    newResources.splice(index, 1);
    setActualResources(newResources);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) {
      setError("Please select a recipe.");
      return;
    }
    
    // Filter out incomplete resource rows
    const validResources = actualResources.filter(r => r.resourceId > 0 && r.quantity > 0);
    
    setIsLoading(true);
    setError(null);
    try {
      await apiRequest("/production-runs", {
        method: "POST",
        body: {
          recipeId: Number(selectedRecipe),
          expectedOutput: expectedOutput,
          actualResources: validResources
        }
      });
      // Navigate back to dashboard or production list on success
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create production run.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 border rounded-md hover:bg-slate-50 text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Create Production Run</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        
        {/* Step 1: Configuration */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">1. Select Output Configuration</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Target Color</label>
              <select 
                value={selectedColor} 
                onChange={(e) => setSelectedColor(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select Color --</option>
                {colors.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.business_code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Recipe</label>
              <select 
                value={selectedRecipe} 
                onChange={(e) => setSelectedRecipe(e.target.value ? Number(e.target.value) : "")}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedColor}
                required
              >
                <option value="">-- Select Recipe --</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Expected Quantity (Liters)</label>
            <input 
              type="number" 
              value={expectedOutput}
              disabled
              className="w-full p-2.5 border rounded-lg bg-slate-50 text-slate-600"
            />
            <p className="text-xs text-slate-500">Auto-filled based on recipe batch size.</p>
          </div>
        </div>

        {/* Step 2: Resource Actuals */}
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b pb-2">
            <h2 className="text-lg font-semibold">2. Actual Resource Inputs</h2>
            <button 
              type="button" 
              onClick={addResourceRow}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              + Add Material
            </button>
          </div>
          
          {actualResources.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500 border-2 border-dashed rounded-lg">
              No materials added. Click "+ Add Material" to track usage and variance.
            </div>
          ) : (
            <div className="space-y-3">
              {actualResources.map((row, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-slate-500">Material</label>
                    <select
                      value={row.resourceId || ""}
                      onChange={(e) => handleResourceChange(index, "resourceId", Number(e.target.value))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="">Select material...</option>
                      {resources.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (Stock: {r.current_stock}{r.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-xs text-slate-500">Quantity Used</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      value={row.quantity || ""}
                      onChange={(e) => handleResourceChange(index, "quantity", Number(e.target.value))}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Amount"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeResourceRow(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-px"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 border-t">
          <button 
            type="submit"
            disabled={isLoading || !selectedRecipe}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Processing..." : (
              <>
                <Save className="w-5 h-5" />
                Start Production & Deduct Inventory
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
