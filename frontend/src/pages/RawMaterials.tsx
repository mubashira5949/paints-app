import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Zap,
  Tag,
  Building2,
  Layers,
  ShoppingCart,
  Send,
} from 'lucide-react'

interface Supplier {
  id: number
  name: string
}

interface Resource {
  id: number
  name: string
  description: string | null
  unit: string
  current_stock: number
  color: string | null
  feel: string | null
  supplier_id: number | null
  supplier_name: string | null
  created_at: string
}

export default function RawMaterials() {
  const { user } = useAuth()
  const canManageMaterials = user?.role === 'admin' || user?.role === 'manager'

  const [resources, setResources] = useState<Resource[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [orderingResource, setOrderingResource] = useState<Resource | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'kg',
    supplier_id: '',
    color: '',
    feel: '',
    current_stock: '0',
  })

  const [orderFormData, setOrderFormData] = useState({
    supplier_id: '',
    quantity: '',
    unit_price: '',
    notes: '',
  })

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [resData, supData] = await Promise.all([
        apiRequest<Resource[]>('/resources'),
        apiRequest<Supplier[]>('/suppliers'),
      ])
      setResources(resData)
      setSuppliers(supData)
    } catch {
      setError('Failed to load inventory data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenModal = (resource: Resource | null = null) => {
    if (resource) {
      setEditingResource(resource)
      setFormData({
        name: resource.name,
        description: resource.description || '',
        unit: resource.unit,
        supplier_id: resource.supplier_id?.toString() || '',
        color: resource.color || '',
        feel: resource.feel || '',
        current_stock: resource.current_stock?.toString() || '0',
      })
    } else {
      setEditingResource(null)
      setFormData({
        name: '',
        description: '',
        unit: 'kg',
        supplier_id: '',
        color: '',
        feel: '',
        current_stock: '0',
      })
    }
    setIsModalOpen(true)
  }

  const handleOpenOrderModal = (resource: Resource) => {
    setOrderingResource(resource)
    setOrderFormData({
      supplier_id: resource.supplier_id?.toString() || '',
      quantity: '',
      unit_price: '',
      notes: `Order for ${resource.name}`,
    })
    setIsOrderModalOpen(true)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderingResource) return
    setIsLoading(true)
    try {
      const payload = {
        supplier_id: parseInt(orderFormData.supplier_id),
        notes: orderFormData.notes,
        items: [
          {
            resource_id: orderingResource.id,
            quantity: parseFloat(orderFormData.quantity),
            unit: orderingResource.unit,
            unit_price: orderFormData.unit_price ? parseFloat(orderFormData.unit_price) : 0,
          },
        ],
      }

      const po = await apiRequest<any>('/purchase-orders', {
        method: 'POST',
        body: payload,
      })

      // Email pre-population logic
      const supplier = suppliers.find((s) => s.id === parseInt(orderFormData.supplier_id))
      const body = `Hello ${supplier?.name},\n\nWe would like to place an order for:\nMaterial: ${orderingResource.name}\nQuantity: ${orderFormData.quantity} ${orderingResource.unit}\n\nNotes: ${orderFormData.notes}\n\nThank you.`
      const mailtoUrl = `mailto:${po.supplier_email}?subject=Purchase Order - ${orderingResource.name}&body=${encodeURIComponent(body)}`

      setIsOrderModalOpen(false)
      window.open(mailtoUrl, '_blank')
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const body = {
        ...formData,
        current_stock: parseFloat(formData.current_stock) || 0,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
      }

      if (editingResource) {
        await apiRequest(`/resources/${editingResource.id}`, {
          method: 'PUT',
          body,
        })
      } else {
        await apiRequest('/resources', {
          method: 'POST',
          body,
        })
      }
      setIsModalOpen(false)
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Operation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this raw material?')) return
    try {
      await apiRequest(`/resources/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const filteredResources = resources.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Raw Material Database
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Manage components, chemical additives, and inventory levels.
            </p>
          </div>
        </div>
        {canManageMaterials && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add NEW Component
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Search & Filter Pane */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search className="h-4 w-4" /> Quick Find
            </h3>
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filter Status
                </h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <span>All Components</span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {resources.length}
                    </span>
                  </button>
                  <button className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-between bg-amber-50/30">
                    <span>Low Inventory</span>
                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black">
                      !
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-indigo-900 p-6 text-white shadow-xl shadow-indigo-100">
            <Zap className="h-8 w-8 mb-4 text-indigo-400" />
            <h3 className="text-lg font-black mb-1">Audit Mode</h3>
            <p className="text-[11px] text-indigo-200 font-medium leading-relaxed opacity-80">
              Ensure all raw materials are associated with a verified supplier for GST compliance.
            </p>
          </div>
        </div>

        {/* Data List Pane */}
        <div className="md:col-span-3">
          {isLoading && !resources.length ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Loading Warehouse Ledger...
              </p>
            </div>
          ) : (
            <div className="grid gap-4 overflow-hidden">
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="group relative rounded-3xl border border-slate-200 bg-white p-1 pr-6 hover:shadow-2xl hover:border-indigo-100 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Visual Marker */}
                    <div
                      className="w-full md:w-32 h-20 md:h-28 rounded-[22px] flex items-center justify-center shadow-inner overflow-hidden border border-slate-100"
                      style={{ backgroundColor: resource.color || '#f8fafc' }}
                    >
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter opacity-20 transform -rotate-12 select-none whitespace-nowrap">
                        {resource.feel || 'Standard Component'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 py-4 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                          {resource.name}
                        </h2>
                        {resource.current_stock < 50 && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-tighter border border-amber-100 animate-pulse">
                            <AlertTriangle className="h-3 w-3" /> CRITICAL LEVEL
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                          <Building2 className="h-3 w-3" />
                          {resource.supplier_name || 'Direct Import / Unknown'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                          <Zap className="h-3 w-3" />
                          {resource.feel || 'Raw Attribute'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                          <Tag className="h-3 w-3" />
                          {resource.id.toString().padStart(4, '0')}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Visualization */}
                    <div className="py-4 px-6 md:border-l border-slate-100 min-w-[140px] text-center md:text-right">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Availability
                      </span>
                      <div className="text-2xl font-black text-slate-900 tracking-tighter">
                        {resource.current_stock}
                        <span className="text-xs text-slate-400 ml-1 font-bold uppercase">
                          {resource.unit}
                        </span>
                      </div>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden ml-auto">
                        <div
                          className={`h-full rounded-full ${resource.current_stock < 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          style={{
                            width: `${Math.min(100, (resource.current_stock / 500) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Actions Slider */}
                    {canManageMaterials && (
                      <div className="py-4 flex gap-2">
                        <button
                          onClick={() => handleOpenOrderModal(resource)}
                          title="Create Purchase Order"
                          className="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 group-hover:scale-105"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          <span className="text-[10px] font-black uppercase">ORDER</span>
                        </button>
                        <button
                          onClick={() => handleOpenModal(resource)}
                          className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all shadow-sm"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-xl rounded-[40px] bg-white p-10 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-slate-950 flex items-center justify-center text-white">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {editingResource ? 'Modify Component' : 'New Component'}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                    Chemical Inventory Form
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Chemical Name *
                  </label>
                  <input
                    required
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300"
                    placeholder="e.g. CaCO3 Carbonate"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Base Unit
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none bg-no-repeat bg-[right_1.25rem_center]"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="kg">kilograms (kg)</option>
                    <option value="L">liters (L)</option>
                    <option value="g">grams (g)</option>
                    <option value="pcs">pieces (pcs)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Source Supplier
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Current Stock ({formData.unit}) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300 bg-amber-50"
                    placeholder="e.g. 500"
                    value={formData.current_stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        current_stock: e.target.value,
                      })
                    }
                  />
                  <p className="text-[9px] text-amber-600 font-bold ml-1 uppercase tracking-widest">
                    ⚠️ OVERRIDES WAREHOUSE RECORDS
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Raw Feel / Texture
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300"
                    placeholder="e.g. Gritty, Paste, Powder"
                    value={formData.feel}
                    onChange={(e) => setFormData({ ...formData, feel: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Natural Color hex
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      className="h-11 w-11 rounded-xl border-none p-0 bg-transparent cursor-pointer"
                      value={formData.color || '#f8fafc'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                    <input
                      className="flex-1 rounded-2xl border border-slate-200 px-5 text-xs focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold"
                      placeholder="#FFFFFF"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Technical Notes
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold min-h-[100px] placeholder:text-slate-300"
                  placeholder="Shelf life, hazard class, storage requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-4 rounded-3xl border border-slate-300 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
                >
                  DISCARD
                </button>
                <button
                  disabled={isLoading}
                  className="flex-[2] px-8 py-4 rounded-3xl bg-indigo-600 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : editingResource ? (
                    'UPDATE COMPONENT'
                  ) : (
                    'COMMIT REGISTRATION'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Order Modal */}
      {isOrderModalOpen && orderingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-[40px] bg-white p-10 shadow-2xl border border-white/20 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Draft Purchase Order</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Ordering: {orderingResource.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-3 rounded-2xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Fulfillment Supplier *
                </label>
                <select
                  required
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none bg-slate-50/50"
                  value={orderFormData.supplier_id}
                  onChange={(e) =>
                    setOrderFormData({
                      ...orderFormData,
                      supplier_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select supplier for PO...</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Required Quantity ({orderingResource.unit}) *
                  </label>
                  <input
                    required
                    type="number"
                    step="any"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    placeholder={`e.g. 10.00`}
                    value={orderFormData.quantity}
                    onChange={(e) =>
                      setOrderFormData({
                        ...orderFormData,
                        quantity: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Estimated Unit Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    placeholder="₹ per unit"
                    value={orderFormData.unit_price}
                    onChange={(e) =>
                      setOrderFormData({
                        ...orderFormData,
                        unit_price: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Procurement Instructions
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold min-h-[100px]"
                  placeholder="Specific grade, packaging requirements, or urgency notes..."
                  value={orderFormData.notes}
                  onChange={(e) =>
                    setOrderFormData({
                      ...orderFormData,
                      notes: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="flex-1 px-8 py-4 rounded-3xl border border-slate-300 text-sm font-black text-slate-500 hover:bg-slate-50 transition-all"
                >
                  CANCEL
                </button>
                <button
                  disabled={isLoading}
                  className="flex-[2] px-8 py-4 rounded-3xl bg-indigo-600 text-sm font-black text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      GENERATE PO & EMAIL <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
