import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { Plus, Beaker, Palette, X, AlertCircle, Edit, Trash2, Search, ChevronDown, Eye } from "lucide-react";
import { useUnitPreference, formatUnit, toDisplayValue, fromDisplayValue } from "../utils/units";
import { useAuth } from "../contexts/AuthContext";

const PRODUCT_TYPE_STORAGE_KEY = "product_type_options";

function getProductTypeOptions(): string[] {
  try {
    const stored = localStorage.getItem(PRODUCT_TYPE_STORAGE_KEY);
    const custom: string[] = stored ? JSON.parse(stored) : [];
    const all = ["Water Based Ink", "Oil Based Ink", ...custom];
    return Array.from(new Set(all));
  } catch {
    return ["Water Based Ink", "Oil Based Ink"];
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
  ink_series: string;
  tags: string[];
}

interface Resource {
  id: number;
  name: string;
  unit: string;
}

interface FormulaResource {
  resource_id: number;
  name?: string;
  unit?: string;
  quantity_required: number;
}

interface Formula {
  id: number;
  color_id: number;
  name: string;
  version: string;
  batch_size_kg: number;
  resources: FormulaResource[];
  is_active: boolean;
}

export default function Formulas() {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const [colors, setColors] = useState<Color[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const unitPref = useUnitPreference();
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [colorSearch, setColorSearch] = useState("");

  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productTypeOptions, setProductTypeOptions] = useState<string[]>(getProductTypeOptions());

  // Forms
  const [colorForm, setColorForm] = useState({ name: "", color_code: "#000000", description: "", business_code: "", hsn_code: "", series: "", ink_series: "", tags: "" });
  const [formulaForm, setFormulaForm] = useState({
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

  const fetchFormulas = async (colorId: number) => {
    try {
      const data = await apiRequest<Formula[]>(`/formulas/${colorId}`);
      setFormulas(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load formulas");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedColor) {
      fetchFormulas(selectedColor.id);
    } else {
      setIsFormulaModalOpen(false); // Close modal if no color is selected
    }
  }, [selectedColor]);

  // Reload product type options whenever modal opens
  useEffect(() => {
    if (isColorModalOpen) {
      setProductTypeOptions(getProductTypeOptions());
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
      setColorForm({ name: "", color_code: "#000000", description: "", business_code: "", hsn_code: "", series: "", ink_series: "", tags: "" });
    } catch (err: any) {
      alert(err.message || "Failed to save color");
    }
  };

  const handleDeleteColor = async (e: React.MouseEvent, colorId: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this color? It might have active formulas.")) return;
    try {
      await apiRequest(`/colors/${colorId}`, { method: "DELETE" });
      setColors(prev => prev.filter(c => c.id !== colorId));
      if (selectedColor?.id === colorId) {
        setSelectedColor(null);
        setFormulas([]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete color");
    }
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColor) return;

    const validResources = formulaForm.resources.filter(r => r.resource_id > 0 && r.quantity_required > 0);
    if (validResources.length === 0) {
      alert("Please add at least one valid resource");
      return;
    }

    try {
      if (editingFormula) {
        await apiRequest(`/formulas/${editingFormula.id}`, {
          method: "PUT",
          body: {
            name: formulaForm.name,
            version: formulaForm.version,
            batch_size_kg: fromDisplayValue(Number(formulaForm.batch_size_kg), unitPref),
            resources: validResources
          }
        });
      } else {
        await apiRequest("/formulas", {
          method: "POST",
          body: {
            color_id: selectedColor.id,
            name: formulaForm.name,
            version: formulaForm.version,
            batch_size_kg: fromDisplayValue(Number(formulaForm.batch_size_kg), unitPref),
            resources: validResources
          }
        });
      }
      fetchFormulas(selectedColor.id);
      setIsFormulaModalOpen(false);
      setEditingFormula(null);
      setFormulaForm({
        name: "",
        version: "1.0.0",
        batch_size_kg: toDisplayValue(100, unitPref),
        resources: [{ resource_id: 0, quantity_required: 0 }]
      });
    } catch (err: any) {
      alert(err.message || "Failed to save formula");
    }
  };

  const handleDeleteFormula = async (formulaId: number) => {
    if (!confirm("Are you sure you want to delete this formula? (This will also delete the associated color!)")) return;
    try {
      await apiRequest(`/formulas/${formulaId}`, { method: "DELETE" });
      if (selectedColor) {
        setColors(prev => prev.filter(c => c.id !== selectedColor.id));
        setSelectedColor(null);
        setFormulas([]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete formula");
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
      ink_series: color.ink_series || "",
      tags: color.tags ? color.tags.join(", ") : ""
    });
    setIsColorModalOpen(true);
  };

  const openEditFormula = (formula: Formula) => {
    setEditingFormula(formula);
    setFormulaForm({
      name: formula.name,
      version: formula.version,
      batch_size_kg: toDisplayValue(formula.batch_size_kg, unitPref),
      resources: formula.resources.length > 0 ? formula.resources.map(r => ({ resource_id: r.resource_id, quantity_required: r.quantity_required })) : [{ resource_id: 0, quantity_required: 0 }]
    });
    setIsFormulaModalOpen(true);
  };

  const addResourceRow = () => {
    setFormulaForm(prev => ({
      ...prev,
      resources: [...prev.resources, { resource_id: 0, quantity_required: 0 }]
    }));
  };

  const removeResourceRow = (index: number) => {
    setFormulaForm(prev => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index)
    }));
  };

  const updateResourceRow = (index: number, field: string, value: number) => {
    setFormulaForm(prev => {
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
            Colors &amp; Formulas
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
                setColorForm({ name: "", color_code: "#000000", description: "", business_code: "", hsn_code: "", series: "", ink_series: "", tags: "" });
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
                        {isManager && (
                          <button onClick={(e) => handleDeleteColor(e, color.id)} className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
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

        {/* Formulas Main Area */}
        <div className="lg:col-span-3 rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          {!selectedColor ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <Beaker className="h-16 w-16 mb-4 text-slate-200" />
              <p className="text-lg font-medium text-slate-500">Select a color to view formulas</p>
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
                    <h2 className="text-lg font-bold text-slate-900">{selectedColor.name} Formulas</h2>
                    <p className="text-xs text-slate-500">{selectedColor.description || "No description provided."}</p>
                  </div>
                </div>
                {isManager && (
                  <button
                    onClick={() => {
                      setEditingFormula(null);
                      setFormulaForm({ name: "", version: "1.0.0", batch_size_kg: toDisplayValue(100, unitPref), resources: [{ resource_id: 0, quantity_required: 0 }] });
                      setIsFormulaModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Formula
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 p-5 bg-slate-50/50">
                {formulas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Beaker className="h-12 w-12 mb-3 text-slate-300" />
                    <p className="font-medium text-slate-500">No active formulas found for this color.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {formulas.map((formula) => (
                      <div key={formula.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50/80 flex items-center justify-between group">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{formula.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">v{formula.version}</span>
                              <span>Batch Size: {formatUnit(formula.batch_size_kg, unitPref)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isManager ? (
                              <>
                                <button onClick={() => openEditFormula(formula)} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded text-slate-500 hover:text-blue-600 shadow-sm transition-all text-xs font-bold flex items-center gap-1">
                                  <Edit className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button onClick={() => handleDeleteFormula(formula.id)} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded text-slate-500 hover:text-red-600 shadow-sm transition-all">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider bg-white rounded-md px-2 py-1 border shadow-sm">
                                <Eye className="h-3 w-3" />
                                View Only
                              </div>
                            )}
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
                              {formula.resources.map((res, i) => (
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
            onClick={() => setIsColorModalOpen(false)}
            aria-hidden="true"
          />
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col relative z-10 scale-in-center">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="h-4 w-4 text-blue-600" />
                {editingColor ? "Edit Color" : "Add New Color"}
              </h3>
              <button 
                type="button"
                onClick={() => setIsColorModalOpen(false)} 
                className="text-slate-400 hover:bg-slate-200 p-1 rounded-full transition-colors"
                aria-label="Close modal"
              >
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
                  <input 
                    type="text" 
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="e.g. TC-01" 
                    value={colorForm.business_code} 
                    onChange={(e) => setColorForm({ ...colorForm, business_code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">HSN Code</label>
                  <input 
                    type="text" 
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="e.g. 3208" 
                    value={colorForm.hsn_code} 
                    onChange={(e) => setColorForm({ ...colorForm, hsn_code: e.target.value })} 
                  />
                </div>
              </div>
              {/* Product Type (existing series) — Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Product Type</label>
                <div className="relative">
                  <select
                    className={`w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-8 ${editingColor?.series ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                    value={colorForm.series}
                    onChange={(e) => setColorForm({ ...colorForm, series: e.target.value })}
                    disabled={!!editingColor?.series}
                  >
                    <option value="">— Select type —</option>
                    {productTypeOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400">Custom types can be added in Settings → Production.</p>
              </div>
              {/* New Ink Series — Dropdown */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ink Series</label>
                <div className="relative">
                  <select
                    required
                    className={`w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none pr-8 ${editingColor?.ink_series ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                    value={colorForm.ink_series}
                    onChange={(e) => setColorForm({ ...colorForm, ink_series: e.target.value })}
                    disabled={!!editingColor?.ink_series}
                  >
                    <option value="" disabled>— Select series —</option>
                    <option value="LCS">LCS</option>
                    <option value="STD">STD</option>
                    <option value="OPQ/JS">OPQ/JS</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
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

      {/* Add Formula Modal */}
      {isFormulaModalOpen && selectedColor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
            onClick={() => setIsFormulaModalOpen(false)}
            aria-hidden="true"
          />
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border flex flex-col max-h-[90vh] relative z-10 scale-in-center">
            <div className="flex items-center justify-between p-5 border-b bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Beaker className="h-5 w-5 text-blue-600" />
                {editingFormula ? "Edit Formula" : `Create Formula for ${selectedColor.name}`}
              </h3>
              <button 
                type="button"
                onClick={() => setIsFormulaModalOpen(false)} 
                className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormula} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Formula Name</label>
                  <input required type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Standard Mix" value={formulaForm.name} onChange={(e) => setFormulaForm({ ...formulaForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Version</label>
                  <input required type="text" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1.0.0" value={formulaForm.version} onChange={(e) => setFormulaForm({ ...formulaForm, version: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Base Batch Size ({unitPref})</label>
                  <input required type="number" min={0.01} step="0.01" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={`e.g. ${toDisplayValue(100, unitPref)}`} value={formulaForm.batch_size_kg} onChange={(e) => setFormulaForm({ ...formulaForm, batch_size_kg: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <label className="text-sm font-bold text-slate-900">Bill of Materials</label>
                  <button type="button" onClick={addResourceRow} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">+ Add Material</button>
                </div>
                <div className="space-y-3">
                  {formulaForm.resources.map((res, index) => (
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
                  {formulaForm.resources.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No materials added. Click '+ Add Material'.</p>
                  )}
                </div>
              </div>
            </form>

            <div className="flex gap-3 p-5 border-t bg-slate-50 shrink-0">
              <button type="button" onClick={() => setIsFormulaModalOpen(false)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" onClick={handleSaveFormula} className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm">{editingFormula ? "Save Changes" : "Save Formula"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
