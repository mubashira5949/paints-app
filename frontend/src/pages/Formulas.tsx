import React, { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { Plus, Beaker, Palette, X, AlertCircle, Edit, Trash2, Search, Eye, Share2, ImagePlus, Mail, MessageCircle } from "lucide-react";
import { useUnitPreference, formatUnit, toDisplayValue, fromDisplayValue } from "../utils/units";
import { useAuth } from "../contexts/AuthContext";

interface Color {
  id: number;
  name: string;
  color_code: string;
  description: string;
  business_code: string;
  hsn_code: string;
  tags: string[];
  product_types: string[];
  product_series: string[];
  ink_grades: string[];
  type_ids: number[];
  series_ids: number[];
  grade_ids: number[];
  photo_url?: string;
}

interface SettingItem {
  id: number;
  name: string;
}

interface SettingItem {
  id: number;
  name: string;
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

  const [productTypes, setProductTypes] = useState<SettingItem[]>([]);
  // const [seriesCategories, setSeriesCategories] = useState<SettingItem[]>([]);
  const [inkGrades, setInkGrades] = useState<SettingItem[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ color: Color; waUrl: string; mailUrl: string; jpegDataUrl: string } | null>(null);
  const [currentShareText, setCurrentShareText] = useState("");

  // Photo helpers — stored per color in localStorage
  const getColorPhoto = (colorId: number): string => {
    try { return localStorage.getItem(`color_photo_${colorId}`) || ''; } catch { return ''; }
  };
  const saveColorPhoto = (colorId: number, dataUrl: string) => {
    try {
      if (dataUrl) localStorage.setItem(`color_photo_${colorId}`, dataUrl);
      else localStorage.removeItem(`color_photo_${colorId}`);
    } catch {}
  };
  const convertToJpeg = (dataUrl: string): Promise<string> => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });

  const generateProductText = (color: Color) => {
    const adminPhone = "+91 91234 56789";
    const salesPhone = "+91 99887 76655";
    
    return `🎨 PRODUCT: ${color.name}
📦 CODE: ${color.business_code || '—'}
🏷 TYPES: ${(color.product_types || []).join(", ") || '—'}
📋 HSN: ${color.hsn_code || '—'}
🖌 INK SERIES: ${(color.ink_grades || []).join(", ") || '—'}

📞 Owner Contacts:
👤 Admin: ${adminPhone}
👤 Sales: ${salesPhone}
`;
  };

  const handleShareColor = async (color: Color) => {
    const photo = getColorPhoto(color.id);
    const template = generateProductText(color);
    
    let jpegDataUrl = '';
    if (photo) jpegDataUrl = await convertToJpeg(photo);

    setCurrentShareText(template);
    setShareTarget({ 
      color, 
      waUrl: `https://wa.me/?text=${encodeURIComponent(template)}`, 
      mailUrl: `mailto:?subject=${encodeURIComponent('Product Info - ' + color.name)}&body=${encodeURIComponent(template)}`, 
      jpegDataUrl 
    });
    setIsShareModalOpen(true);
  };

  const handleEmail = (color: Color, customizedText: string) => {
    const mailtoLink = `mailto:?subject=${encodeURIComponent('Product Info - ' + color.name)}&body=${encodeURIComponent(customizedText)}`;
    window.location.href = mailtoLink;
  };

  const shareViaSystem = async () => {
    if (!shareTarget) return;
    try {
      const shareData: ShareData = {
        title: shareTarget.color.name,
        text: currentShareText,
      };

      if (shareTarget.jpegDataUrl && navigator.canShare) {
        const res = await fetch(shareTarget.jpegDataUrl);
        const blob = await res.blob();
        const file = new File([blob], `${shareTarget.color.name.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      }

      await navigator.share(shareData);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Share failed', err);
    }
  };

  // Forms
  const [colorForm, setColorForm] = useState({ 
    name: "", 
    color_code: "#000000", 
    description: "", 
    business_code: "", 
    hsn_code: "", 
    tags: "",
    type_ids: [] as number[],
    series_ids: [] as number[],
    grade_ids: [] as number[],
    photo_dataUrl: ""
  });
  const [formulaForm, setFormulaForm] = useState({
    name: "",
    version: "1.0.0",
    batch_size_kg: 100, // this will be initially in display units for the UI to use
    resources: [{ resource_id: 0, quantity_required: 0 }]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [colorsData, resourcesData, typesData, gradesData] = await Promise.all([
        apiRequest<Color[]>("/colors"),
        apiRequest<Resource[]>("/resources"),
        apiRequest<SettingItem[]>("/settings/product-types"),
        apiRequest<SettingItem[]>("/settings/ink-grades")
      ]);
      setColors(colorsData);
      setResources(resourcesData);
      setProductTypes(typesData);
      setInkGrades(gradesData);
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

  // Reload data if needed
  useEffect(() => {
    if (isColorModalOpen) {
      apiRequest<SettingItem[]>("/settings/product-types").then(setProductTypes).catch(console.error);
    }
  }, [isColorModalOpen]);

  const filteredColors = colors.filter(c => {
    const q = colorSearch.toLowerCase();
    if (!q) return true;
    const nameMatch = c.name.toLowerCase().includes(q);
    const tagMatch = (c.tags || []).some(t => t.toLowerCase().includes(q));
    const seriesMatch = (c.product_series || []).some(s => s.toLowerCase().includes(q));
    const typeMatch = (c.product_types || []).some(t => t.toLowerCase().includes(q));
    return nameMatch || tagMatch || seriesMatch || typeMatch;
  });

  const handleSaveColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager) return;
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
        // Persist photo
        if (colorForm.photo_dataUrl) saveColorPhoto(updated.color.id, colorForm.photo_dataUrl);
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
        // Persist photo
        if (colorForm.photo_dataUrl) saveColorPhoto(newColor.color.id, colorForm.photo_dataUrl);
      }
      setIsColorModalOpen(false);
      setEditingColor(null);
      setColorForm({ 
        name: "", 
        color_code: "#000000", 
        description: "", 
        business_code: "", 
        hsn_code: "", 
        tags: "",
        type_ids: [] as number[],
        series_ids: [] as number[],
        grade_ids: [] as number[],
        photo_dataUrl: ""
      });
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
    if (!isManager) return;
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
      tags: color.tags ? color.tags.join(", ") : "",
      type_ids: color.type_ids || [],
      series_ids: color.series_ids || [],
      grade_ids: color.grade_ids || [],
      photo_dataUrl: getColorPhoto(color.id)
    });
    setIsColorModalOpen(true);
  };

  const openEditFormula = (formula: Formula) => {
    setEditingFormula(formula);
    const totalQty = formula.resources.reduce((s, r) => s + (r.quantity_required || 0), 0);
    setFormulaForm({
      name: formula.name,
      version: formula.version,
      batch_size_kg: totalQty,
      resources: formula.resources.length > 0 ? formula.resources.map(r => ({ resource_id: r.resource_id, quantity_required: r.quantity_required })) : [{ resource_id: 0, quantity_required: 0 }]
    });
    setIsFormulaModalOpen(true);
  };

  const addResourceRow = () => {
    setFormulaForm(prev => {
      const newResources = [...prev.resources, { resource_id: 0, quantity_required: 0 }];
      return { ...prev, resources: newResources, batch_size_kg: newResources.reduce((s, r) => s + (r.quantity_required || 0), 0) };
    });
  };

  const removeResourceRow = (index: number) => {
    setFormulaForm(prev => {
      const newResources = prev.resources.filter((_, i) => i !== index);
      return { ...prev, resources: newResources, batch_size_kg: newResources.reduce((s, r) => s + (r.quantity_required || 0), 0) };
    });
  };

  const updateResourceRow = (index: number, field: string, value: number) => {
    setFormulaForm(prev => {
      const newResources = [...prev.resources];
      newResources[index] = { ...newResources[index], [field]: value };
      const totalQty = newResources.reduce((s, r) => s + (r.quantity_required || 0), 0);
      return { ...prev, resources: newResources, batch_size_kg: totalQty };
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
            {isManager && (
              <button
                onClick={() => {
                  setEditingColor(null);
                  setColorForm({ 
                    name: "", 
                    color_code: "#000000", 
                    description: "", 
                    business_code: "", 
                    hsn_code: "", 
                    tags: "",
                    type_ids: [],
                    series_ids: [],
                    grade_ids: [],
                    photo_dataUrl: ""
                  });
                  setIsColorModalOpen(true);
                }}
                className="p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                title="Add New Color"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
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
                        {isManager && (
                          <button onClick={(e) => openEditColor(e, color)} className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-blue-600 transition-colors">
                            <Edit className="h-3 w-3" />
                          </button>
                        )}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareColor(selectedColor)}
                    className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                    title="Share product info"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
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
              {/* Product Photo Upload */}
              <div className="space-y-1.5 border-t pt-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-slate-400" />
                  Product Photo <span className="font-normal text-slate-400">(PNG / JPEG)</span>
                </label>
                {colorForm.photo_dataUrl ? (
                  <div className="relative group">
                    <img src={colorForm.photo_dataUrl} alt="Product preview" className="w-full h-28 object-cover rounded-md border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setColorForm({ ...colorForm, photo_dataUrl: '' })}
                      className="absolute top-1 right-1 bg-white/90 hover:bg-red-50 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-red-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Will export as JPEG</span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-md cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                    <ImagePlus className="h-5 w-5 text-slate-300 mb-1" />
                    <span className="text-[10px] text-slate-400 font-medium">Click to upload PNG or JPEG</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setColorForm({ ...colorForm, photo_dataUrl: ev.target?.result as string });
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
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
              {/* Product Type Selection — Checkboxes */}
              <div className="space-y-2 border-t pt-2 mt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Product Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {productTypes.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={colorForm.type_ids.includes(opt.id)}
                        onChange={(e) => {
                          const val = opt.id;
                          const current = colorForm.type_ids;
                          const updated = e.target.checked 
                            ? [...current, val]
                            : current.filter(t => t !== val);
                          setColorForm({ ...colorForm, type_ids: updated });
                        }}
                      />
                      <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{opt.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ink Grades Categories — HIDDEN */}
              {/* <div className="space-y-2 border-t pt-2 mt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Ink Grades</label>
                <div className="grid grid-cols-2 gap-2">
                  {seriesCategories.map(...)}
                </div>
              </div> */}

              {/* Ink Series Availability */}
              <div className="space-y-2 border-t pt-2 mt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Ink Series</label>
                <div className="flex flex-wrap items-center gap-4">
                  {inkGrades.map(opt => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={colorForm.grade_ids.includes(opt.id) || (opt.name === 'OPQ/JS' && colorForm.grade_ids.includes(opt.id))}
                        onChange={(e) => {
                          const val = opt.id;
                          const current = colorForm.grade_ids;
                          const updated = e.target.checked 
                            ? [...current, val]
                            : current.filter(t => t !== val);
                          setColorForm({ ...colorForm, grade_ids: updated });
                        }}
                      />
                      <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{opt.name}</span>
                    </label>
                  ))}
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
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                    <span>Base Batch Size ({unitPref})</span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Auto-calculated from materials</span>
                  </label>
                  <div className="relative">
                    <input
                      readOnly
                      type="number"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 font-mono cursor-not-allowed select-none"
                      value={formulaForm.batch_size_kg || 0}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase tracking-widest pointer-events-none">
                      = Σ materials
                    </span>
                  </div>
                  {formulaForm.batch_size_kg === 0 && (
                    <p className="text-[11px] text-amber-600 font-medium">⚠ Add material quantities above — batch size will compute automatically.</p>
                  )}
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


      {/* Share Modal */}
      {isShareModalOpen && shareTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setIsShareModalOpen(false)} aria-hidden="true" />
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border relative z-10 overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl border-2 border-white/20 shadow-lg shrink-0" style={{ backgroundColor: shareTarget.color.color_code || '#cbd5e1' }} />
              {shareTarget.jpegDataUrl ? (
                <img src={shareTarget.jpegDataUrl} alt={shareTarget.color.name} className="h-12 w-12 rounded-xl object-cover border-2 border-white/20 shadow-lg" />
              ) : null}
              <div>
                <p className="font-bold text-white text-base">{shareTarget.color.name}</p>
                <p className="text-slate-400 text-xs font-mono">{shareTarget.color.business_code || shareTarget.color.color_code}</p>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="ml-auto text-slate-400 hover:bg-white/20 p-1 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product Information</p>
                <div className="flex gap-2">
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 italic">Auto-copies text</span>
                </div>
              </div>
              
              <textarea 
                className="w-full bg-slate-50 rounded-xl p-3 text-xs text-slate-700 font-mono whitespace-pre-line border focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[160px]"
                value={currentShareText}
                onChange={(e) => setCurrentShareText(e.target.value)}
                placeholder="Message template..."
              />

              <div className="pt-2">
                {typeof navigator.share !== "undefined" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentShareText);
                        shareViaSystem();
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 group font-bold text-sm"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleEmail(shareTarget.color, currentShareText)}
                      className="flex items-center justify-center gap-2 px-3 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 group font-bold text-sm"
                    >
                      <Mail className="h-5 w-5" />
                      Email Info
                    </button>
                    <div className="col-span-2 text-center flex flex-col gap-1">
                      <p className="text-[10px] text-slate-400 font-medium italic mt-1">WhatsApp shares Image + Info</p>
                      <p className="text-[10px] text-slate-400 font-medium italic">Email shares formatted Text template</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 font-bold text-center">
                    <p className="text-xs text-slate-500 uppercase">Manual Share (Desktop)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = shareTarget.jpegDataUrl;
                          a.download = `${shareTarget.color.name.replace(/\s+/g, '_')}.jpg`;
                          a.click();
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <ImagePlus className="h-4 w-4 mb-1" />
                        <span className="text-[10px]">1. Save Image</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(currentShareText);
                          alert("Text copied! Now paste in WhatsApp.");
                        }}
                        className="flex flex-col items-center justify-center p-3 bg-white text-slate-900 border-2 border-slate-900 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <span className="text-lg mb-1">📋</span>
                        <span className="text-[10px]">2. Copy Text</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
