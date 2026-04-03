import { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { getUnitPreference, setUnitPreference } from "../utils/units";
import type { UnitPreference } from "../utils/units";
import { getDateFormatPreference, setDateFormatPreference } from "../utils/dateFormatter";
import type { DateFormatPreference } from "../utils/dateFormatter";
import {
  Settings as SettingsIcon,
  PaintBucket,
  Package,
  Shield,
  Bell,
  Wrench,
  Download,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Scale,
  Globe,
  Calendar,
  Layers,
  Box,
  AlertOctagon,
  Activity,
  UserCheck,
  FileText,
  Clock,
  Mail,
  UserCircle
} from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "restart">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Product Type management (Shared Backend)
  const [customProductTypes, setCustomProductTypes] = useState<{id: number, name: string}[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState("");

  // Packaging sizes management
  const PACKAGING_SIZES_KEY = "default_packaging_sizes";
  const [packagingSizes, setPackagingSizes] = useState<string>(
    localStorage.getItem(PACKAGING_SIZES_KEY) || "0.5kg, 1kg, 5kg, 10kg, 20kg"
  );

  const fetchProductTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const data = await apiRequest<{id: number, name: string}[]>("/settings/product-types");
      setCustomProductTypes(data);
    } catch (err) {
      console.error("Failed to fetch product types", err);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  useEffect(() => {
    fetchProductTypes();
  }, []);

  const addProductType = async () => {
    const val = newTypeInput.trim();
    if (!val) return;
    try {
      await apiRequest("/settings/product-types", {
        method: "POST",
        body: { name: val }
      });
      setNewTypeInput("");
      fetchProductTypes();
      setSaveStatus("success");
    } catch (err: any) {
      alert(err.message || "Failed to add product type");
    }
  };

  const removeProductType = async (id: number) => {
    if (!confirm("Are you sure you want to remove this product type? It might be linked to existing colors.")) return;
    try {
      await apiRequest(`/settings/product-types/${id}`, { method: "DELETE" });
      fetchProductTypes();
      setSaveStatus("success");
    } catch (err: any) {
      alert(err.message || "Failed to remove product type");
    }
  };

  // Mark changes as unsaved when any input changes
  const handleChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSave = (requiresRestart = false) => {
    localStorage.setItem(PACKAGING_SIZES_KEY, packagingSizes);
    setSaveStatus(requiresRestart ? "restart" : "success");
    setHasUnsavedChanges(false);

    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setSaveStatus("idle");
    }, 3000);
  };

  const handleReset = () => {
    setHasUnsavedChanges(false);
  };

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "production", label: "Production", icon: PaintBucket },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
  ];

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Adjust system preferences and configuration
          </p>
        </div>

        {/* Notification Toast */}
        <div className={`transition-all duration-300 transform ${saveStatus !== "idle" ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"}`}>
          {saveStatus === "success" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Settings saved successfully</span>
            </div>
          )}
          {saveStatus === "restart" && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-lg shadow-sm">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Restart required for changes to apply</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                  ${isActive
                    ? "border-blue-600 text-blue-600 shadow-[inset_0_-2px_0_0_rgba(37,99,235,0.1)]"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50/50"
                  }
                `}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50/50 border border-amber-200/50 p-3 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-4 w-4" />
          You have unsaved changes
        </div>
      )}

      <div className="mt-6">
        {/* General Settings */}
        {activeTab === "general" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8">
              <div className="space-y-0 max-w-3xl">
                {/* 2-Column Desktop, 1-Column Mobile Layout */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">System Name</p>
                  </div>
                  <input onChange={handleChange} type="text" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" defaultValue="Paint Production Management" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Scale className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Default Unit</p>
                  </div>
                  <select
                    value={getUnitPreference()}
                    onChange={e => {
                      setUnitPreference(e.target.value as UnitPreference);
                      handleChange();
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all shadow-sm"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="L">Litres (L) — converts kg ÷ 1.2 density</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Time Zone</p>
                  </div>
                  <select onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all shadow-sm">
                    <option>UTC (Coordinated Universal Time)</option>
                    <option selected>Asia/Kolkata</option>
                    <option>America/New_York (EST)</option>
                    <option>America/Los_Angeles (PST)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Date Format</p>
                  </div>
                  <select value={getDateFormatPreference()} onChange={(e) => {
                    setDateFormatPreference(e.target.value as DateFormatPreference);
                    handleChange();
                  }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all shadow-sm">
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                    <option value="MM-DD-YYYY">MM-DD-YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={!hasUnsavedChanges}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Production Settings */}
        {activeTab === "production" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8">
              <div className="space-y-0 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Variance Threshold (%)</p>
                  </div>
                  <input onChange={handleChange} type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" defaultValue="5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Layers className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Min Production Batch Size</p>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <input onChange={handleChange} type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" defaultValue="10" />
                    <span className="text-sm text-gray-500 font-medium">kg</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-start md:items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Box className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">Default Packaging Sizes</p>
                      <p className="text-xs text-gray-500 mt-0.5 md:hidden">Comma separated values</p>
                    </div>
                  </div>
                  <div>
                    <input
                      value={packagingSizes}
                      onChange={(e) => {
                        setPackagingSizes(e.target.value);
                        handleChange();
                      }}
                      type="text"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                      placeholder="0.5kg, 1kg, 5kg, 10kg, 20kg"
                    />
                    <p className="text-xs text-gray-500 mt-1.5 hidden md:block">Separate values with commas</p>
                  </div>
                </div>

                {/* Ink Series Management */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-start py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Layers className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-sm">Product Type Options</p>
                      <p className="text-xs text-gray-500 mt-0.5">Appear in the Color form as checkboxes</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {/* Built-in (read-only) */}
                    <div className="flex flex-wrap gap-1.5 mb-1 text-slate-500 italic text-xs">
                      {isLoadingTypes ? "Loading product types..." : customProductTypes.length === 0 ? "No product types defined." : ""}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {customProductTypes.map(s => (
                        <span key={s.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                          {s.name}
                          <button onClick={() => removeProductType(s.id)} className="ml-0.5 text-blue-400 hover:text-red-600 transition-colors" title="Remove">&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTypeInput}
                        onChange={e => setNewTypeInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProductType())}
                        placeholder="e.g. UV Cured Ink"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={addProductType}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >Add</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!hasUnsavedChanges}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Settings */}
        {activeTab === "inventory" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8">
              <div className="space-y-0 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <AlertOctagon className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Low Stock Alert Threshold</p>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <input onChange={handleChange} type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" defaultValue="20" />
                    <span className="text-sm text-gray-500 font-medium">units</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Bell className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Automatic Low Stock Alerts</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-inv1" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                    <label htmlFor="toggle-inv1" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Track Resource Consumption</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-inv2" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                    <label htmlFor="toggle-inv2" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Allow Negative Stock</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-inv3" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                    <label htmlFor="toggle-inv3" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer"></label>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!hasUnsavedChanges}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === "security" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8">
              <div className="space-y-0 max-w-3xl">

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Require Device Approval</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-sec1" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                    <label htmlFor="toggle-sec1" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Enable Audit Logs</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-sec2" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                    <label htmlFor="toggle-sec2" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Session Timeout</p>
                  </div>
                  <select onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all shadow-sm">
                    <option>15 minutes</option>
                    <option selected>30 minutes</option>
                    <option>60 minutes</option>
                    <option>120 minutes</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={!hasUnsavedChanges}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeTab === "notifications" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8">
              <div className="space-y-0 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Enable Email Notifications</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in w-full sm:w-64 flex justify-end sm:justify-start">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-not1" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                    <label htmlFor="toggle-not1" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <UserCircle className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Manager Email</p>
                  </div>
                  <input onChange={handleChange} type="email" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm" defaultValue="manager@paintapp.com" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4 items-center py-5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2 text-gray-700">
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-sm">Notify on Production Variance</p>
                  </div>
                  <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in w-full sm:w-64 flex justify-end sm:justify-start">
                    <input onChange={handleChange} type="checkbox" name="toggle" id="toggle-not2" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                    <label htmlFor="toggle-not2" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!hasUnsavedChanges}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Maintenance */}
        {activeTab === "maintenance" && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 md:p-8">
              <div className="space-y-4 max-w-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors bg-white shadow-sm">
                  <div>
                    <p className="font-medium text-gray-900">Database Backup</p>
                    <p className="text-sm text-gray-500 mt-1">Create a manual snapshot of all system data</p>
                  </div>
                  <button className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
                    <Database className="h-4 w-4" />
                    Create Backup
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors bg-white shadow-sm">
                  <div>
                    <p className="font-medium text-gray-900">Export Inventory Data</p>
                    <p className="text-sm text-gray-500 mt-1">Download a complete CSV of current stock levels</p>
                  </div>
                  <button className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
                    <Download className="h-4 w-4" />
                    Download CSV
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-red-100 rounded-xl hover:border-red-200 transition-colors bg-red-50/50 shadow-sm mt-8">
                  <div>
                    <p className="font-medium text-red-900">Clear Old Logs</p>
                    <p className="text-sm text-red-600/80 mt-1">Permanently remove system logs older than 90 days</p>
                  </div>
                  <button className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
                    <Trash2 className="h-4 w-4" />
                    Run Cleanup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* System Info Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <PaintBucket className="h-4 w-4 text-gray-400" />
          <span className="font-medium">Paint Production System</span>
        </div>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <span>Version 1.0</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span>Last deployment: Jan 2026</span>
        </div>
      </div>
    </div>
  );
}
