import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { Plus, Beaker, Palette, X, AlertCircle, Edit, Trash2, Search, ChevronDown } from "lucide-react";
import { useUnitPreference, formatUnit, toDisplayValue, fromDisplayValue } from "../utils/units";

const DEFAULT_INK_SERIES = ["Water Based Ink", "Oil Based Ink"];
const INK_SERIES_STORAGE_KEY = "ink_series_options";

function getInkSeriesOptions(): string[] {
  try {
    const stored = localStorage.getItem(INK_SERIES_STORAGE_KEY);
    const custom: string[] = stored ? JSON.parse(stored) : [];
    const all = [...DEFAULT_INK_SERIES, ...custom];
    return Array.from(new Set(all));
  } catch {
    return DEFAULT_INK_SERIES;
  }
}

interface Color {
  id: number;
  name: string;
  color_code: string;
  description: string;
  business_code: string;
  hsn_code: string;
  series: string;
  tags: string[];
}

interface Resource {
  id: number;
  name: string;
  unit: string;
}

interface RecipeResource {
  resource_id: number;
  name?: string;
  unit?: string;
  quantity_required: number;
}

interface Recipe {
  id: number;
  color_id: number;
  name: string;
  version: string;
  batch_size_kg: number;
  resources: RecipeResource[];
  is_active: boolean;
}

export default function Recipes() {
  const [colors, setColors] = useState<Color[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const unitPref = useUnitPreference();
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [colorSearch, setColorSearch] = useState("");

  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inkSeriesOptions, setInkSeriesOptions] = useState<string[]>(getInkSeriesOptions());

  // Forms
  const [colorForm, setColorForm] = useState({ name: "", color_code: "#000000", description: "", business_code: "", hsn_code: "", series: "", tags: "" });
  const [recipeForm, setRecipeForm] = useState({
    name: "",
    version: "1.0.0",
    batch_size_kg: 100, // this will be initially in display units for the UI to use
    resources: [{ resource_id: 0, quantity_required: 0 }]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [colorsData, resourcesData] = await Promise.all([
        apiRequest<Color[]>("/colors"),
        apiRequest<Resource[]>("/resources")
      ]);
      setColors(colorsData);
      setResources(resourcesData);
      if (colorsData.length > 0 && !selectedColor) {
        setSelectedColor(colorsData[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipes = async (colorId: number) => {
    try {
      const data = await apiRequest<Recipe[]>(`/recipes/${colorId}`);
      setRecipes(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load recipes");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedColor) {
      fetchRecipes(selectedColor.id);
    }
  }, [selectedColor]);

  // Reload ink series options whenever modal opens
  useEffect(() => {
    if (isColorModalOpen) {
      setInkSeriesOptions(getInkSeriesOptions());
    }
  }, [isColorModalOpen]);

  const filteredColors = colors.filter(c => {
    const q = colorSearch.toLowerCase();
    if (!q) return true;
    const nameMatch = c.name.toLowerCase().includes(q);
    const tagMatch = (c.tags || []).some(t => t.toLowerCase().includes(q));
    const seriesMatch = (c.series || "").toLowerCase().includes(q);
    return nameMatch || tagMatch || seriesMatch;
  });

  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingColor) {
        const updated = await apiRequest<{ message: string; color: Color }>(`/colors/${editingColor.id}`, {
          method: "PUT",
          body: {
            ...colorForm,
            tags: colorForm.tags.split(",").map(t => t.trim()).filter(t => t !== "")
          }
        });
        setColors(prev => prev.map(c => c.id === updated.color.id ? updated.color : c));
        if (selectedColor?.id === updated.color.id) setSelectedColor(updated.color);
      } else {
        const newColor = await apiRequest<{ message: string; color: Color }>("/colors", {
          method: "POST",
          body: {
            ...colorForm,
            tags: colorForm.tags.split(",").map(t => t.trim()).filter(t => t !== "")
          }
        });
        setColors(prev => [newColor.color, ...prev]);
        setSelectedColor(newColor.color);
      }
      setIsColorModalOpen(false);
      setEditingColor(null);
      setColorForm({ name: "", color_code: "#000000", description: "", business_code: "", hsn_code: "", series: "", tags: "" });
    } catch (err: any) {
      alert(err.message || "Failed to save color");
    }
  };

  const handleDeleteColor = async (e: React.MouseEvent, colorId: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this color? It might have active recipes.")) return;
    try {
      await apiRequest(`/colors/${colorId}`, { method: "DELETE" });
      setColors(prev => prev.filter(c => c.id !== colorId));
      if (selectedColor?.id === colorId) {
        setSelectedColor(null);
        setRecipes([]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete color");
    }
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColor) return;

    const validResources = recipeForm.resources.filter(r => r.resource_id > 0 && r.quantity_required > 0);
    if (validResources.length === 0) {
      alert("Please add at least one valid resource");
      return;
    }

    try {
      if (editingRecipe) {
        await apiRequest(`/recipes/${editingRecipe.id}`, {
          method: "PUT",
          body: {
            name: recipeForm.name,
            version: recipeForm.version,
            batch_size_kg: fromDisplayValue(Number(recipeForm.batch_size_kg), unitPref),
            resources: validResources
          }
        });
      } else {
        await apiRequest("/recipes", {
          method: "POST",
          body: {
            color_id: selectedColor.id,
            name: recipeForm.name,
            version: recipeForm.version,
            batch_size_kg: fromDisplayValue(Number(recipeForm.batch_size_kg), unitPref),
            resources: validResources
          }
        });
      }
      fetchRecipes(selectedColor.id);
      setIsRecipeModalOpen(false);
      setEditingRecipe(null);
      setRecipeForm({
        name: "",
        version: "1.0.0",
        batch_size_kg: toDisplayValue(100, unitPref),
        resources: [{ resource_id: 0, quantity_required: 0 }]
      });
    } catch (err: any) {
      alert(err.message || "Failed to save recipe");
    }
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    if (!confirm("Are you sure you want to delete this recipe? (This will also delete the associated color!)")) return;
    try {
      await apiRequest(`/recipes/${recipeId}`, { method: "DELETE" });
      if (selectedColor) {
        setColors(prev => prev.filter(c => c.id !== selectedColor.id));
        setSelectedColor(null);
        setRecipes([]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete recipe");
    }
  };

  const openEditColor = (e: React.MouseEvent, color: Color) => {
    e.stopPropagation();
    setEditingColor(color);
    setColorForm({
      name: color.name,
      color_code: color.color_code || "#000000",
      description: color.description || "",
      business_code: color.business_code || "",
      hsn_code: color.hsn_code || "",
      series: color.series || "",
      tags: color.tags ? color.tags.join(", ") : ""
    });
    setIsColorModalOpen(true);
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeForm({
      name: recipe.name,
      version: recipe.version,
      batch_size_kg: toDisplayValue(recipe.batch_size_kg, unitPref),
      resources: recipe.resources.length > 0 ? recipe.resources.map(r => ({ resource_id: r.resource_id, quantity_required: r.quantity_required })) : [{ resource_id: 0, quantity_required: 0 }]
    });
    setIsRecipeModalOpen(true);
  };

  const addResourceRow = () => {
    setRecipeForm(prev => ({
      ...prev,
      resources: [...prev.resources, { resource_id: 0, quantity_required: 0 }]
    }));
  };

  const removeResourceRow = (index: number) => {
    setRecipeForm(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const updateResourceRow = (index: number, field: string, value: number) => {
    setRecipeForm(prev => {
      const newResources = [...prev.resources];
      newResources[index] = { ...newResources[index], [field]: value };
      return { ...prev, resources: newResources };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Beaker className="h-8 w-8 text-blue-600" />
            Colors &amp; Recipes
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage product colors and their bill of materials.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 uppercase tracking-widest mb-1">Attention Required</h3>
              <p className="text-red-700 font-medium">⚠ {error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Colors Sidebar */}
        <div className="lg:col-span-1 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          <div className="p-3 border-b bg-slate-50 flex items-center justify-between shrink-0">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-blue-500" />
              Colors
            </h2>
            <button
              onClick={() => {
                setEditingColor(null);
                setColorForm({ name: "", color_code: "#000000", description: "", business_code: "", hsn_code: "", series: "", tags: "" });
                setIsColorModalOpen(true);
              }}
              className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              title="Add New Color"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-2 py-2 border-b bg-white shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or tag..."
                value={colorSearch}
                onChange={e => setColorSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-slate-500 animate-pulse">Loading colors...</div>
            ) : filteredColors.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">
                {colorSearch ? "No results found." : "No colors found."}
              </div>
            ) : (
              filteredColors.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color)}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors border ${
                    selectedColor?.id === color.id
                      ? "bg-blue-50 border-blue-200"
                      : "bg-white border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="h-5 w-5 rounded-full border shadow-sm shrink-0"
                    style={{ backgroundColor: color.color_code || "#cbd5e1" }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 group">
                    <p className="text-xs font-bold text-slate-900 truncate pr-1">{color.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-slate-500 font-mono uppercase truncate">{color.business_code || 'No Code'}</p>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => openEditColor(e, color)} className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-blue-600 transition-colors">
                          <Edit className="h-3 w-3" />
                        </button>
                        <button onClick={(e) => handleDeleteColor(e, color.id)} className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {color.tags && color.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {color.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded">{tag}</span>
                        ))}
                        {color.tags.length > 2 && <span className="text-[8px] text-slate-400">+{color.tags.length - 2}</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recipes Main Area */}
        <div className="lg:col-span-3 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          {!selectedColor ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <Beaker className="h-16 w-16 mb-4 text-slate-200" />
              <p className="text-lg font-medium text-slate-500">Select a color to view recipes</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 rounded-lg border shadow-sm shrink-0"
                    style={{ backgroundColor: selectedColor.color_code || "#cbd5e1" }}
                  />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedColor.name} Recipes</h2>
                    <p className="text-xs text-slate-500">{selectedColor.description || "No description provided."}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingRecipe(null);
                    setRecipeForm({ name: "", version: "1.0.0", batch_size_kg: toDisplayValue(100, unitPref), resources: [{ resource_id: 0, quantity_required: 0 }] });
                    setIsRecipeModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Recipe
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 bg-slate-50/50">
                {recipes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Beaker className="h-12 w-12 mb-3 text-slate-300" />
                    <p className="font-medium text-slate-500">No active recipes found for this color.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {recipes.map((recipe) => (
                      <div key={recipe.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50/80 flex items-center justify-between group">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{recipe.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">v{recipe.version}</span>
                              <span>Batch Size: {formatUnit(recipe.batch_size_kg, unitPref)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditRecipe(recipe)} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded text-slate-500 hover:text-blue-600 shadow-sm transition-all">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteRecipe(recipe.id)} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded text-slate-500 hover:text-red-600 shadow-sm transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-slate-50/40 text-left">
                                <th className="px-5 py-2.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Raw Material</th>
                                <th className="px-5 py-2.5 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Required Qty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {recipe.resources.map((res, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="px-5 py-3 font-semibold text-slate-800">{res.name || `Resource #${res.resource_id}`}</td>
                                  <td className="px-5 py-3 font-bold text-slate-700 text-right">
                                    {res.quantity_required} {res.unit || ''}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Color Modal — compact layout */}
      {isColorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="h-4 w-4 text-blue-600" />
                {editingColor ? "Edit Color" : "Add New Color"}
              </h3>
              <button onClick={() => setIsColorModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-1 rounded-full transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveColor} className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Color Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Color Name</label>
                <input required type="text" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Royal Blue" value={colorForm.name} onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })} />
              </div>
              {/* Color Code */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Color Code (Hex)</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="h-8 w-10 cursor-pointer bg-white border border-slate-300 rounded" value={colorForm.color_code} onChange={(e) => setColorForm({ ...colorForm, color_code: e.target.value })} />
                  <input required type="text" className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono" value={colorForm.color_code} onChange={(e) => setColorForm({ ...colorForm, color_code: e.target.value })} />
                </div>
              </div>
              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description <span className="font-normal text-slate-400">(Optional)</span></label>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={2} placeholder="Additional details..." value={colorForm.description} onChange={(e) => setColorForm({ ...colorForm, description: e.target.value })} />
              </div>
              {/* Product Code + HSN Code */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Product Code</label>
                  <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. TC-01" value={colorForm.business_code} onChange={(e) => setColorForm({ ...colorForm, business_code: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">HSN Code</label>
                  <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 3208" value={colorForm.hsn_code} onChange={(e) => setColorForm({ ...colorForm, hsn_code: e.target.value })} />
                </div>
              </div>
              {/* Ink Series — Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ink Series</label>
                <div className="relative">
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white pr-8"
                    value={colorForm.series}
                    onChange={(e) => setColorForm({ ...colorForm, series: e.target.value })}
                  >
                    <option value="">— Select series —</option>
                    {inkSeriesOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400">Custom series can be added in Settings → Production.</p>
              </div>
              {/* Product Tags */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Product Tags <span className="font-normal text-slate-400">(comma separated)</span></label>
                <input type="text" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. oil based, series LCS" value={colorForm.tags} onChange={(e) => setColorForm({ ...colorForm, tags: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsColorModalOpen(false)} className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-sm">{editingColor ? "Save Changes" : "Save Color"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {isRecipeModalOpen && selectedColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Beaker className="h-5 w-5 text-blue-600" />
                {editingRecipe ? "Edit Recipe" : `Create Recipe for ${selectedColor.name}`}
              </h3>
              <button onClick={() => setIsRecipeModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Recipe Name</label>
                  <input required type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Standard Mix" value={recipeForm.name} onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Version</label>
                  <input required type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1.0.0" value={recipeForm.version} onChange={(e) => setRecipeForm({ ...recipeForm, version: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Base Batch Size ({unitPref})</label>
                  <input required type="number" min={0.01} step="0.01" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={`e.g. ${toDisplayValue(100, unitPref)}`} value={recipeForm.batch_size_kg} onChange={(e) => setRecipeForm({ ...recipeForm, batch_size_kg: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <label className="text-sm font-bold text-slate-900">Bill of Materials</label>
                  <button type="button" onClick={addResourceRow} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">+ Add Material</button>
                </div>
                <div className="space-y-3">
                  {recipeForm.resources.map((res, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <select required value={res.resource_id} onChange={(e) => updateResourceRow(index, 'resource_id', Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-slate-50">
                          <option value={0} disabled>Select Resource</option>
                          {resources.map(resource => (
                            <option key={resource.id} value={resource.id}>
                              {resource.name} ({resource.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <input required type="number" step="0.01" min="0.01" placeholder="Qty" value={res.quantity_required === 0 ? '' : res.quantity_required} onChange={(e) => updateResourceRow(index, 'quantity_required', Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <button type="button" onClick={() => removeResourceRow(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {recipeForm.resources.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No materials added. Click '+ Add Material'.</p>
                  )}
                </div>
              </div>
            </form>

            <div className="flex gap-3 p-5 border-t bg-slate-50 shrink-0">
              <button type="button" onClick={() => setIsRecipeModalOpen(false)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" onClick={handleSaveRecipe} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm">{editingRecipe ? "Save Changes" : "Save Recipe"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
