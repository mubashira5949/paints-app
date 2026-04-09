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
  const { role } = useAuth()
  const isReadOnly = role === 'operator' || role === 'worker' || role === 'sales'
  
  const [resources, setResources] = useState<Resource[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    setError(null)
    try {
      const [resData, supData] = await Promise.all([
        apiRequest<Resource[]>('/resources'),
        apiRequest<Supplier[]>('/suppliers'),
      ])
      setResources(resData || [])
      setSuppliers(supData || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory data. Check permissions or network.')
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
        {!isReadOnly && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add NEW Component
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="h-5 w-5" />
          {error}
          <button onClick={() => fetchData()} className="ml-auto underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search className="h-4 w-4" /> Quick Find
            </h3>
            <input
              type="text"
              placeholder="Search by name..."
              className="w-full pl-4 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="rounded-3xl bg-indigo-900 p-6 text-white shadow-xl">
            <Zap className="h-8 w-8 mb-4 text-indigo-400" />
            <h3 className="text-lg font-black mb-1">Audit Mode</h3>
            <p className="text-[11px] text-indigo-200 font-medium">
              Ensure all raw materials are associated with a verified supplier.
            </p>
          </div>
        </div>

        <div className="md:col-span-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Loading Warehouse Ledger...
              </p>
            </div>
          ) : filteredResources.length > 0 ? (
            <div className="grid gap-4">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="group relative rounded-3xl border border-slate-200 bg-white p-1 pr-6 hover:shadow-2xl transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-28 rounded-[22px] flex items-center justify-center border border-slate-100" style={{ backgroundColor: resource.color || '#f8fafc' }}>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter opacity-20 transform -rotate-12">
                        {resource.feel || 'Component'}
                      </span>
                    </div>
                    <div className="flex-1 py-4">
                      <h2 className="text-xl font-black text-slate-900">{resource.name}</h2>
                      <div className="mt-4 flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                          <Building2 className="h-3 w-3" />
                          {resource.supplier_name || 'Direct Import'}
                        </div>
                      </div>
                    </div>
                    <div className="py-4 px-6 border-l border-slate-100 text-right">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock</span>
                      <div className="text-2xl font-black text-slate-900">
                        {resource.current_stock} <span className="text-xs text-slate-400 font-bold uppercase">{resource.unit}</span>
                      </div>
                    </div>
                    <div className="py-4 flex gap-2">
                      <button onClick={() => handleOpenOrderModal(resource)} className="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                      {!isReadOnly && (
                        <>
                          <button onClick={() => handleOpenModal(resource)} className="p-3 rounded-2xl bg-slate-100 text-slate-500">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(resource.id)} className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
               <Layers className="h-12 w-12 text-slate-200 mb-4" />
               <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No materials found</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[40px] bg-white p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-950">{editingResource ? 'Modify Component' : 'New Component'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input required className="w-full rounded-2xl border p-3 font-bold" placeholder="Chemical Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-6">
                 <select className="w-full rounded-2xl border p-3 font-bold" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                   <option value="kg">kg</option>
                   <option value="L">L</option>
                 </select>
                 <input type="number" className="w-full rounded-2xl border p-3 font-bold" value={formData.current_stock} onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 rounded-3xl border font-black">DISCARD</button>
                <button className="flex-[2] p-4 rounded-3xl bg-indigo-600 text-white font-black">{editingResource ? 'UPDATE' : 'COMMIT'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOrderModalOpen && orderingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[40px] bg-white p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-950">Purchase Order</h2>
              <button onClick={() => setIsOrderModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <select required className="w-full rounded-2xl border p-4 font-bold" value={orderFormData.supplier_id} onChange={(e) => setOrderFormData({ ...orderFormData, supplier_id: e.target.value })}>
                <option value="">Select supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input required type="number" className="w-full rounded-2xl border p-4 font-bold" placeholder="Quantity" value={orderFormData.quantity} onChange={(e) => setOrderFormData({ ...orderFormData, quantity: e.target.value })} />
              <button className="w-full p-4 rounded-3xl bg-indigo-600 text-white font-black">GENERATE PO & EMAIL</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
