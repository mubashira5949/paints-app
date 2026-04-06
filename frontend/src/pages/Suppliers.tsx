import { useState, useEffect } from "react";
import { apiRequest } from "../services/api";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Trash2, 
  Loader2,
  X,
  FileText,
  ShieldCheck,
  Zap,
  UserCircle2,
  ChevronRight,
  PackageCheck,
  Tag
} from "lucide-react";

interface POC {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface MaterialInfo {
  id: number;
  name: string;
  color: string | null;
  unit: string;
}

interface Supplier {
  id: number;
  name: string;
  pocs: POC[];
  gst_number: string | null;
  regulatory_info: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  catalog: MaterialInfo[] | null;
  created_at: string;
  match_count?: number; 
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [componentSearch, setComponentSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'stakeholders'>('info');
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    pocs: [] as POC[],
    gst_number: "",
    regulatory_info: "",
    address: "",
    website: "",
    notes: ""
  });

  const fetchSuppliers = async (compSearch: string = "") => {
    setIsLoading(true);
    try {
      const url = compSearch 
        ? `/suppliers?componentSearch=${encodeURIComponent(compSearch)}` 
        : "/suppliers";
      const data = await apiRequest<Supplier[]>(url);
      setSuppliers(data);
    } catch (err) {
      setError("Failed to load suppliers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchSuppliers(componentSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [componentSearch]);

  const handleOpenModal = (supplier: Supplier | null = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        pocs: supplier.pocs || [],
        gst_number: supplier.gst_number || "",
        regulatory_info: supplier.regulatory_info || "",
        address: supplier.address || "",
        website: supplier.website || "",
        notes: supplier.notes || ""
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        pocs: [{ name: "", email: "", phone: "", role: "Primary" }],
        gst_number: "",
        regulatory_info: "",
        address: "",
        website: "",
        notes: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleAddPOC = () => {
    setFormData({
      ...formData,
      pocs: [...formData.pocs, { name: "", email: "", phone: "", role: "" }]
    });
  };

  const handleRemovePOC = (index: number) => {
    setFormData({
      ...formData,
      pocs: formData.pocs.filter((_, i) => i !== index)
    });
  };

  const handlePOCChange = (index: number, field: keyof POC, value: string) => {
    const newPocs = [...formData.pocs];
    newPocs[index] = { ...newPocs[index], [field]: value };
    setFormData({ ...formData, pocs: newPocs });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingSupplier) {
        await apiRequest(`/suppliers/${editingSupplier.id}`, {
          method: "PUT",
          body: formData
        });
      } else {
        await apiRequest("/suppliers", {
          method: "POST",
          body: formData
        });
      }
      setIsModalOpen(false);
      fetchSuppliers(componentSearch);
    } catch (err: any) {
      alert(err.message || "Operation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await apiRequest(`/suppliers/${id}`, { method: "DELETE" });
      fetchSuppliers(componentSearch);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.pocs?.some(p => p.name.toLowerCase().includes(supplierSearch.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Partner Intelligence</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Multi-stakeholder management and active material catalogs.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus className="mr-2 h-5 w-5" />
          Onboard Partner
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="relative group flex-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1">Search Directory</label>
          <Search className="absolute left-4 top-9 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search company or stakeholder..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
          />
        </div>
        
        <div className="relative group flex-1">
          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block ml-1">Identify by Component</label>
          <Zap className="absolute left-4 top-9 h-5 w-5 text-blue-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="e.g. TiO2, Carbonate..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-blue-900"
            value={componentSearch}
            onChange={(e) => setComponentSearch(e.target.value)}
          />
          {componentSearch && (
            <button 
                onClick={() => setComponentSearch("")}
                className="absolute right-4 top-9 text-slate-400 hover:text-slate-600"
            >
                <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {isLoading && !suppliers.length ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Procurement Matrix...</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id} 
              className={`group relative overflow-hidden rounded-[32px] border bg-white p-1 hover:shadow-2xl transition-all duration-500 ${
                componentSearch && supplier.match_count && supplier.match_count > 0 
                  ? 'border-blue-300 ring-2 ring-blue-500/10' 
                  : 'border-slate-100'
              }`}
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-5">
                        <div className={`h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-xl ${
                            componentSearch && supplier.match_count && supplier.match_count > 0 
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700' 
                            : 'bg-gradient-to-br from-slate-800 to-slate-900'
                        }`}>
                            <Users className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 leading-tight">{supplier.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5">
                                {supplier.gst_number && (
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> {supplier.gst_number}
                                    </span>
                                )}
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{supplier.catalog?.length || 0} Materials</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleOpenModal(supplier)}
                            className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                            <FileText className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => handleDelete(supplier.id)}
                            className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* POC Section */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <UserCircle2 className="h-4 w-4" /> Primary Stakeholders
                        </h4>
                        <div className="space-y-3">
                            {supplier.pocs?.map((poc, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group/poc hover:border-blue-200 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="font-black text-slate-900 text-sm tracking-tight">{poc.name}</p>
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50">{poc.role || 'Partner'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {poc.email && (
                                            <a href={`mailto:${poc.email}`} className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5">
                                                <Mail className="h-3 w-3" /> {poc.email}
                                            </a>
                                        )}
                                        {poc.phone && (
                                            <a href={`tel:${poc.phone}`} className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" /> {poc.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Catalog Section */}
                    <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <PackageCheck className="h-4 w-4" /> Supply Catalog
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {supplier.catalog && supplier.catalog.length > 0 ? (
                                supplier.catalog.slice(0, 4).map(mat => (
                                    <div key={mat.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/30 border border-blue-100/50">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="h-3 w-3 rounded-full shadow-sm border border-white" 
                                                style={{ backgroundColor: mat.color || '#cbd5e1' }}
                                            />
                                            <span className="text-xs font-bold text-slate-700">{mat.name}</span>
                                        </div>
                                        <ChevronRight className="h-3 w-3 text-blue-300" />
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                    <Tag className="h-8 w-8 text-slate-100 mb-2" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Active Catalog</p>
                                </div>
                            )}
                            {supplier.catalog && supplier.catalog.length > 4 && (
                                <p className="text-[9px] font-black text-center text-slate-400 mt-1 uppercase tracking-widest">+ {supplier.catalog.length - 4} more materials</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-50 text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-4">
                        {supplier.website && (
                             <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-600">
                                <Globe className="h-3.5 w-3.5" /> Site
                             </a>
                        )}
                        {supplier.address && (
                            <div className="flex items-center gap-1.5 max-w-[200px] truncate">
                                <MapPin className="h-3.5 w-3.5" /> {supplier.address}
                            </div>
                        )}
                    </div>
                    {supplier.regulatory_info && (
                        <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest">
                            Regulatory Cleared
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-4xl rounded-[40px] bg-white p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 h-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl">
                    <Plus className="h-7 w-7" />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-slate-900 leading-tight">
                    {editingSupplier ? 'Collaborator Profile' : 'New Strategic Partner'}
                   </h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Multi-stakeholder Registration</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-4 rounded-2xl hover:bg-slate-100 transition-colors text-slate-400"
              >
                <X className="h-8 w-8" />
              </button>
            </div>

            <div className="flex gap-8 mb-8 border-b border-slate-100">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Core Intelligence
                </button>
                <button 
                    onClick={() => setActiveTab('stakeholders')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stakeholders' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Stakeholders ({formData.pocs.length})
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              {activeTab === 'info' ? (
                <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name *</label>
                            <input
                                required
                                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black placeholder:text-slate-300"
                                placeholder="Legal business name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Website</label>
                            <input
                                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-blue-600"
                                placeholder="https://..."
                                value={formData.website}
                                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            />
                        </div>
                        
                        <div className="pt-4 space-y-4 border-t border-slate-50 mt-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Stakeholder</h3>
                            <div className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">POC Name *</label>
                                    <input
                                        required
                                        className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                        placeholder="Full name"
                                        value={formData.pocs[0]?.name || ""}
                                        onChange={(e) => handlePOCChange(0, 'name', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                        <input
                                            className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="Personal work email"
                                            value={formData.pocs[0]?.email || ""}
                                            onChange={(e) => handlePOCChange(0, 'email', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                        <input
                                            className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="Direct number"
                                            value={formData.pocs[0]?.phone || ""}
                                            onChange={(e) => handlePOCChange(0, 'phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Address *</label>
                            <textarea
                                required
                                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold min-h-[148px]"
                                placeholder="Headquarters or shipping location"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Number of Supplier</label>
                            <input
                                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono font-bold"
                                placeholder="GSTIN Number"
                                value={formData.gst_number}
                                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regulatory Metadata</label>
                             <input
                                className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                placeholder="Certifications, permits, ISOs..."
                                value={formData.regulatory_info}
                                onChange={(e) => setFormData({ ...formData, regulatory_info: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
              ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Additional Stakeholders</h3>
                        <button 
                            type="button"
                            onClick={handleAddPOC}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 px-4 py-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add Team Member
                        </button>
                    </div>
                    
                    <div className="grid gap-6">
                        {formData.pocs.slice(1).map((poc, i) => {
                            const idx = i + 1;
                            return (
                             <div key={idx} className="relative p-8 rounded-[32px] border border-slate-100 bg-slate-50/50 group/form-poc">
                                <button 
                                    type="button"
                                    onClick={() => handleRemovePOC(idx)}
                                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="lg:col-span-1 space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                                        <input
                                            required
                                            className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            value={poc.name}
                                            onChange={(e) => handlePOCChange(idx, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="lg:col-span-1 space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Position / Role</label>
                                        <input
                                            className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            placeholder="e.g. Sales, Technical"
                                            value={poc.role}
                                            onChange={(e) => handlePOCChange(idx, 'role', e.target.value)}
                                        />
                                    </div>
                                    <div className="lg:col-span-1 space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                        <input
                                            className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            value={poc.email}
                                            onChange={(e) => handlePOCChange(idx, 'email', e.target.value)}
                                        />
                                    </div>
                                    <div className="lg:col-span-1 space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                                        <input
                                            className="w-full rounded-xl border border-white px-4 py-3 text-sm font-bold bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                            value={poc.phone}
                                            onChange={(e) => handlePOCChange(idx, 'phone', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                           );
                         })}
                    </div>
                </div>
              )}

              <div className="pt-10 border-t border-slate-100">
                <div className="space-y-2 mb-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Strategic Intelligence</label>
                    <textarea
                        className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold min-h-[80px]"
                        placeholder="Shared relationship notes, past issues, or reliability scoring..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-8 py-5 rounded-3xl border-2 border-slate-100 text-xs font-black text-slate-400 hover:bg-slate-50 transition-all"
                    >
                        DISCARD
                    </button>
                    <button
                        disabled={isLoading}
                        className="flex-[2] px-8 py-5 rounded-3xl bg-blue-600 text-xs font-black text-white shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : editingSupplier ? 'SAVE UPDATED PROFILE' : 'COMMIT COLLABORATOR'}
                    </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
