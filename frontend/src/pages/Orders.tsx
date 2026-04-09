import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import {
  ClipboardList,
  Plus,
  Loader2,
  Search,
  X,
  ShoppingCart,
  UserRound,
  MapPin,
  Receipt,
<<<<<<< HEAD
  LayoutGrid,
  Table,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
=======
>>>>>>> origin/main
} from 'lucide-react'
import { useDateFormatPreference, formatDate } from '../utils/dateFormatter'
import { useAuth } from '../contexts/AuthContext'

interface OrderItem {
  item_id: number
  color_id: number
  color_name: string
  business_code: string
  pack_size_kg: number
  quantity: number
}

interface ClientOrder {
  id: number
  client_name: string
  client_id: number | null
  client_display_name: string | null
  gst_number: string | null
  contact_phone: string | null
  shipping_label: string | null
  shipping_address: string | null
  status: string
  notes: string
  created_at: string
  logged_by: string
  items: OrderItem[]
  shipping_status: string | null
  payment_method: string | null
  payment_status: string | null
  return_status: string | null
  refund_status: string | null
}

interface ShippingAddress {
  id: number
  label: string
  address: string
  is_default: boolean
}

interface Client {
  id: number
  name: string
  gst_number: string | null
  contact_phone: string | null
  shipping_addresses: ShippingAddress[]
}

interface InventoryItem {
  color_id: number
  color_name: string
  business_code: string
  packs: { pack_size_kg: number; quantity_units: number }[]
}

export default function Orders() {
  const { user } = useAuth()
  const dateFormat = useDateFormatPreference()
  const [orders, setOrders] = useState<ClientOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
<<<<<<< HEAD
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    remaining: false,
    in_progress: false,
    completed: true,
  })
  const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([])
  const [filterStatus, setFilterStatus] = useState('All')

  const toggleOrderExpand = (id: number) => {
    setExpandedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

=======

>>>>>>> origin/main
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [clients, setClients] = useState<Client[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('')
  const [selectedShippingId, setSelectedShippingId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [newOrderItems, setNewOrderItems] = useState<
    { colorId: number; packSizeKg: number; quantity: number }[]
  >([])

  // Item selector temporaries
  const [selectedColorId, setSelectedColorId] = useState<number | ''>('')
  const [selectedPackSize, setSelectedPackSize] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [colors, setColors] = useState<{ id: number; name: string; business_code: string }[]>([])

  useEffect(() => {
    fetchOrders()
    fetchClients()
    fetchInventory()
    fetchColors()
  }, [])

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const res = await apiRequest<ClientOrder[]>('/sales/orders')
      setOrders(res)
    } catch (err) {
      console.error('Failed to fetch orders', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await apiRequest<Client[]>('/clients')
      setClients(res)
    } catch (err) {
      console.error('Failed to fetch clients', err)
    }
  }

  const fetchInventory = async () => {
    try {
      const res = await apiRequest<{ data: InventoryItem[] }>('/inventory/finished-stock')
      setInventory(res.data)
    } catch (err) {
      console.error('Failed to fetch inventory', err)
    }
  }

  const fetchColors = async () => {
    try {
      const res = await apiRequest<{ id: number; name: string; business_code: string }[]>('/colors')
      setColors(res)
    } catch (err) {
      console.error('Failed to fetch colors', err)
    }
  }

  const selectedClient = clients.find((c) => c.id === Number(selectedClientId))

  const defaultPackSizesStr =
    localStorage.getItem('default_packaging_sizes') || '0.5kg, 1kg, 5kg, 10kg, 20kg'
  const defaultPackSizes = defaultPackSizesStr
    .split(',')
    .map((s) => parseFloat(s.replace(/kg/g, '').trim()))
    .filter((n) => !isNaN(n))

  const resetModal = () => {
    setSelectedClientId('')
    setSelectedShippingId('')
    setNotes('')
    setNewOrderItems([])
    setSelectedColorId('')
    setSelectedPackSize('')
    setQuantity(1)
  }

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || newOrderItems.length === 0) return
    setIsSubmitting(true)
    try {
      await apiRequest('/sales/orders', {
        method: 'POST',
        body: {
          clientId: Number(selectedClientId),
          shippingAddressId: selectedShippingId ? Number(selectedShippingId) : undefined,
          notes,
          items: newOrderItems,
        },
      })
      setIsModalOpen(false)
      resetModal()
      fetchOrders()
    } catch (err: any) {
      alert(err.message || 'Failed to create order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateOrderStatus = async (orderId: number, updates: any) => {
    try {
      await apiRequest(`/sales/orders/${orderId}/status`, {
        method: 'PUT',
        body: updates,
      })
      fetchOrders()
    } catch (err: any) {
      alert(err.message || 'Failed to update status')
    }
  }

  const handleAddItem = () => {
    if (!selectedColorId || !selectedPackSize || quantity <= 0) return
    const existingIndex = newOrderItems.findIndex(
      (i) => i.colorId === Number(selectedColorId) && i.packSizeKg === Number(selectedPackSize),
    )
    if (existingIndex >= 0) {
      const updated = [...newOrderItems]
      updated[existingIndex].quantity += quantity
      setNewOrderItems(updated)
    } else {
      setNewOrderItems([
        ...newOrderItems,
        {
          colorId: Number(selectedColorId),
          packSizeKg: Number(selectedPackSize),
          quantity,
        },
      ])
    }
    // UX: Do not reset selectedColorId so the user can easily add another pack size for the same color
    setSelectedPackSize('')
    setQuantity(1)
  }

<<<<<<< HEAD

  const getStockAvailability = (cId: number | '', pSize: number | '') => {
    if (!cId || !pSize) return null
    const invItem = inventory.find((i) => i.color_id === Number(cId))
    if (!invItem) return 0
    const invPack = invItem.packs?.find((p) => p.pack_size_kg === Number(pSize))
    return invPack ? invPack.quantity_units : 0
  }

  const getOrderProgress = (o: ClientOrder) => {
    if (
      ['shipped', 'delivered', 'packed'].includes(o.shipping_status || '') ||
      o.status === 'fulfilled'
    ) {
      return { ready: o.items.length, total: o.items.length }
    }
    let ready = 0
    for (const item of o.items) {
      const invItem = inventory.find((i) => i.color_id === item.color_id)
      const invPack = invItem?.packs?.find((p) => p.pack_size_kg === item.pack_size_kg)
      if (invPack && invPack.quantity_units >= item.quantity) {
        ready++
      }
    }
    return { ready, total: o.items.length }
  }

  const getOrderGroup = (o: ClientOrder) => {
    if (o.status === 'fulfilled') return 'completed'
    if (['pending'].includes(o.status)) return 'remaining'
    return 'in_progress'
  }

  const filtered = orders.filter((o) => {
    const matchSearch =
      (o.client_display_name || o.client_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.notes && o.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.gst_number && o.gst_number.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchStatus =
      filterStatus === 'All' ||
      getOrderGroup(o).toLowerCase() === filterStatus.toLowerCase().replace(' ', '_')

    return matchSearch && matchStatus
  })

  const remainingOrders = filtered.filter(o => getOrderGroup(o) === 'remaining')
  const inProgressOrders = filtered.filter(o => getOrderGroup(o) === 'in_progress')
  const completedOrders = filtered.filter(o => getOrderGroup(o) === 'completed')

  const groups = [
    { id: 'remaining', title: 'Remaining', orders: remainingOrders },
    { id: 'in_progress', title: 'In Progress', orders: inProgressOrders },
    { id: 'completed', title: 'Completed', orders: completedOrders },
  ]

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const renderOrderActions = (o: ClientOrder) => {
    const progress = getOrderProgress(o)
    const isReady = progress.ready === progress.total

    return (
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {/* Shipping Flow */}
        {(!o.shipping_status || o.shipping_status === 'pending') &&
          (isReady ? (
            <>
              <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs uppercase font-black tracking-wider border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Pack
              </span>
              <button
                onClick={() =>
                  updateOrderStatus(o.id, {
                    shipping_status: 'packed',
                    status: 'in_progress',
                  })
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-md shadow-blue-200/50"
              >
                Pack Order
              </button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs uppercase font-black tracking-wider border border-red-200 shadow-sm">
                <AlertCircle className="w-3.5 h-3.5" /> Requires Production
              </span>
              <a
                href="/production"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-md shadow-blue-200/50 inline-flex items-center"
              >
                Queue Production
              </a>
            </>
          ))}
        {o.shipping_status === 'packed' && (
          <>
            <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs uppercase font-black tracking-wider border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Ship
            </span>
            <button
              onClick={() =>
                updateOrderStatus(o.id, {
                  shipping_status: 'shipped',
                })
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-md shadow-blue-200/50"
            >
              Ship Now
            </button>
          </>
        )}
        {o.shipping_status === 'shipped' && (
          <button
            onClick={() =>
              updateOrderStatus(o.id, {
                shipping_status: 'delivered',
              })
            }
            className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-sm"
          >
            Mark Delivered
          </button>
        )}

        {/* Returns Flow */}
        {o.shipping_status === 'delivered' &&
          !o.return_status &&
          o.refund_status !== 'refund_successfully' && (
            <button
              onClick={() =>
                updateOrderStatus(o.id, {
                  return_status: 'pick_up_order',
                  status: 'in_progress',
                })
              }
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-sm"
            >
              Initiate Return
            </button>
          )}
        {o.return_status === 'pick_up_order' && (
          <button
            onClick={() =>
              updateOrderStatus(o.id, {
                return_status: 'on_the_way',
              })
            }
            className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-sm"
          >
            Pick Up (On the way)
          </button>
        )}
        {o.return_status === 'on_the_way' && (
          <button
            onClick={() =>
              updateOrderStatus(o.id, {
                return_status: 'delivered_to_warehouse',
                refund_status: 'initiated',
              })
            }
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-sm"
          >
            Deliver to Warehouse
          </button>
        )}
        {o.refund_status === 'initiated' && (
          <button
            onClick={() =>
              updateOrderStatus(o.id, {
                refund_status: 'refund_successfully',
              })
            }
            className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 rounded-lg text-xs uppercase font-black tracking-wider transition-colors shadow-sm"
          >
            Complete Refund
          </button>
        )}
      </div>
    )
  }

  const renderCardView = (o: ClientOrder) => {
    const progress = getOrderProgress(o)
    const pct = progress.total > 0 ? (progress.ready / progress.total) * 100 : 0
    const isExpanded = expandedOrderIds.includes(o.id)

    return (
      <div
        key={o.id}
        className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden flex flex-col group"
      >
        <div 
          onClick={() => toggleOrderExpand(o.id)}
          className={`p-6 relative bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'border-b border-slate-100' : ''}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 pr-4">
              <h3 className="font-black text-xl text-slate-900 leading-tight">
                {o.client_display_name || o.client_name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm text-slate-600">Order #{o.id}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(o.created_at, dateFormat)}</span>
                {o.gst_number && user?.role !== 'operator' && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                      <Receipt className="w-3 h-3" /> GST: {o.gst_number}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shrink-0 shadow-sm ${
                ['pending'].includes(o.status)
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : ['in_progress'].includes(o.status) ||
                      (!['fulfilled'].includes(o.status) &&
                        (o.shipping_status === 'packed' ||
                          o.shipping_status === 'shipped' ||
                          o.return_status))
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : o.status === 'fulfilled'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {o.status === 'fulfilled' ? 'Completed' : o.status === 'pending' ? 'Remaining' : 'In Progress'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">
              <span>Fulfillment Progress</span>
              <span className={pct === 100 ? 'text-emerald-600' : 'text-slate-600'}>
                {progress.ready} / {progress.total} items ready
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-300'
                }`}
                style={{ width: `${pct}%` }}
              ></div>
            </div>
          </div>

          {/* Collapsed Toggle Button */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100/50 pt-3 opacity-80 group-hover:opacity-100 transition-opacity">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-slate-100 line-clamp-1 pr-4 max-w-[70%]">
              Items: {o.items.map((i) => `${i.color_name} (${i.quantity}x)`).join(', ')}
            </div>
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
              {isExpanded ? 'Hide Details' : 'Expand'}
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {isExpanded && (
          <>
            <div className="p-6 flex-1 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
              {o.shipping_address && (
                <div className="flex items-start gap-3 bg-violet-50/60 rounded-xl p-4 border border-violet-100/60 shadow-sm">
                  <MapPin className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest mb-0.5">
                      {o.shipping_label}
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      {o.shipping_address}
                    </p>
                  </div>
                </div>
              )}
              
              {o.notes && (
                <p className="text-sm text-slate-600 italic bg-blue-50/30 p-4 rounded-xl border border-blue-100/50 shadow-sm">
                  "{o.notes}"
                </p>
              )}
              
              <div className="mt-auto">
                <div className="space-y-1 mt-3 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                  {o.items.map((item) => (
                    <div
                      key={item.item_id}
                      className="flex justify-between items-center text-sm p-3 bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{item.color_name}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {item.business_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-slate-500 border border-slate-200 shadow-sm px-2 py-0.5 rounded text-xs font-bold">
                          {item.pack_size_kg}kg
                        </span>
                        <span className="font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {item.quantity}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80">
              <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                 {o.shipping_status && <span>Ship: {o.shipping_status.replace(/_/g, ' ')}</span>}
                 {o.return_status && <span className="text-red-500 bg-red-100/50 px-1 rounded">Ret: {o.return_status.replace(/_/g, ' ')}</span>}
                 {o.refund_status && <span className="text-amber-600">Ref: {o.refund_status.replace(/_/g, ' ')}</span>}
              </div>
              {renderOrderActions(o)}
            </div>
          </>
        )}
      </div>
    )
  }
=======
  const isOrderInStock = (order: ClientOrder) => {
    for (const item of order.items) {
      const invItem = inventory.find((i) => i.color_id === item.color_id)
      if (!invItem) return false
      const invPack = invItem.packs?.find((p) => p.pack_size_kg === item.pack_size_kg)
      if (!invPack || invPack.quantity_units < item.quantity) {
        return false
      }
    }
    return true
  }

  const getStockAvailability = (cId: number | '', pSize: number | '') => {
    if (!cId || !pSize) return null
    const invItem = inventory.find((i) => i.color_id === Number(cId))
    if (!invItem) return 0
    const invPack = invItem.packs?.find((p) => p.pack_size_kg === Number(pSize))
    return invPack ? invPack.quantity_units : 0
  }

  const filtered = orders.filter(
    (o) =>
      (o.client_display_name || o.client_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.notes && o.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.gst_number && o.gst_number.toLowerCase().includes(searchTerm.toLowerCase())),
  )
>>>>>>> origin/main

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            Client Orders
          </h1>
<<<<<<< HEAD
          <p className="text-slate-500 mt-2 font-medium text-[15px]">
=======
          <p className="text-slate-500 mt-2 font-medium">
>>>>>>> origin/main
            Manage and view all incoming customer orders.
          </p>
        </div>
        {user?.role !== 'operator' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 group border border-blue-500"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" /> New Order
          </button>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[11px] font-black tracking-widest shadow-lg flex items-center justify-between min-w-[140px]">
          <span>TOTAL</span>
          <span className="text-xl">{orders.length}</span>
        </div>
        <div 
          onClick={() => setFilterStatus('Remaining')}
          className={`px-5 py-3 rounded-2xl text-[11px] font-black tracking-widest flex items-center justify-between min-w-[170px] shadow-sm transition-colors cursor-pointer border-2 ${filterStatus === 'Remaining' ? 'bg-red-500 text-white border-red-500' : 'bg-red-50 text-red-700 border-red-100 hover:border-red-300'}`}
        >
          <span>REMAINING</span>
          <span className={`text-xl px-2.5 rounded-xl shadow-sm ${filterStatus === 'Remaining' ? 'bg-white/20' : 'bg-white'}`}>{remainingOrders.length}</span>
        </div>
        <div 
          onClick={() => setFilterStatus('In Progress')}
          className={`px-5 py-3 rounded-2xl text-[11px] font-black tracking-widest flex items-center justify-between min-w-[180px] shadow-sm transition-colors cursor-pointer border-2 ${filterStatus === 'In Progress' ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-100 hover:border-amber-300'}`}
        >
          <span>IN PROGRESS</span>
          <span className={`text-xl px-2.5 rounded-xl shadow-sm ${filterStatus === 'In Progress' ? 'bg-white/20' : 'bg-white'}`}>{inProgressOrders.length}</span>
        </div>
        <div 
          onClick={() => setFilterStatus('Completed')}
          className={`px-5 py-3 rounded-2xl text-[11px] font-black tracking-widest flex items-center justify-between min-w-[160px] shadow-sm transition-colors cursor-pointer border-2 ${filterStatus === 'Completed' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300'}`}
        >
          <span>COMPLETED</span>
          <span className={`text-xl px-2.5 rounded-xl shadow-sm ${filterStatus === 'Completed' ? 'bg-white/20' : 'bg-white'}`}>{completedOrders.length}</span>
        </div>
      </div>

      {/* Orders list */}
<<<<<<< HEAD
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row items-center gap-4 justify-between">
          <div className="flex flex-col md:flex-row w-full xl:w-auto items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clients, GST or notes..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none shadow-sm text-slate-700"
                >
                  <option value="All">All Status</option>
                  <option value="Remaining">Remaining</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
            <div className="flex items-center bg-slate-200/50 rounded-xl p-1 shadow-inner">
              <button onClick={() => setViewMode('card')} className={`px-4 py-2 flex items-center gap-2 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid className="w-4 h-4" /> Card
              </button>
              <button onClick={() => setViewMode('table')} className={`px-4 py-2 flex items-center gap-2 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                <Table className="w-4 h-4" /> Table
              </button>
            </div>
            <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 lg:block">
              {filtered.length} matches
            </p>
          </div>
=======
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clients, GST or notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border-slate-200 bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {filtered.length} orders
          </p>
>>>>>>> origin/main
        </div>

        <div className="flex flex-col">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading orders...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-bold">No orders found</p>
            </div>
          ) : (
<<<<<<< HEAD
            <div className="p-6 flex flex-col gap-8">
              {groups.map(group => {
                if (group.orders.length === 0) return null
                const isCollapsed = collapsedGroups[group.id]

                return (
                  <div key={group.id} className="flex flex-col gap-4">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-3 w-full text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        {group.title} Orders
                        <span className="flex items-center justify-center bg-slate-100 text-slate-500 text-xs rounded-full px-2 py-0.5 min-w-[24px]">
                          {group.orders.length}
                        </span>
                      </h2>
                      <div className="flex-1 h-px bg-slate-100 ml-4"></div>
                    </button>

                    {!isCollapsed && (
                      viewMode === 'card' ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pl-8">
                          {group.orders.map(o => renderCardView(o))}
                        </div>
                      ) : (
                        <div className="pl-8 overflow-x-auto">
                          <table className="w-full text-sm text-left whitespace-nowrap bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-3">Order ID</th>
                                <th className="px-4 py-3">Client</th>
                                <th className="px-4 py-3">Items</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Ship / Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.orders.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold text-slate-500">#{o.id}</td>
                                  <td className="px-4 py-3 font-bold text-slate-800">{o.client_display_name || o.client_name}</td>
                                  <td className="px-4 py-3 font-bold text-slate-600">{o.items.length} items</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                                        ['pending'].includes(o.status)
                                          ? 'bg-red-50 text-red-700 border border-red-100'
                                          : ['in_progress'].includes(o.status) ||
                                              (!['fulfilled'].includes(o.status) &&
                                                (o.shipping_status === 'packed' ||
                                                  o.shipping_status === 'shipped' ||
                                                  o.return_status))
                                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                            : o.status === 'fulfilled'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                       {o.status === 'fulfilled' ? 'Completed' : o.status === 'pending' ? 'Remaining' : 'In-Progress'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 flex gap-2 flex-col items-start min-w-[200px] whitespace-normal">
                                    <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">
                                      {o.shipping_status && <span>Ship: {o.shipping_status.replace(/_/g, ' ')}</span>}
                                      {o.return_status && <span className="text-red-500 bg-red-100/50 px-1 rounded">Ret: {o.return_status.replace(/_/g, ' ')}</span>}
                                      {o.refund_status && <span className="text-amber-600">Ref: {o.refund_status.replace(/_/g, ' ')}</span>}
                                    </div>
                                    {renderOrderActions(o)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
=======
            filtered.map((o) => (
              <div
                key={o.id}
                className="border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden flex flex-col group"
              >
                <div className="p-5 border-b border-slate-50 flex items-start justify-between bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                  <div>
                    <h3 className="font-black text-lg text-slate-900 leading-tight flex items-center gap-2">
                      <UserRound className="w-4 h-4 text-violet-500 shrink-0" />
                      {o.client_display_name || o.client_name}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>
                        Order #{o.id} · {formatDate(o.created_at, dateFormat)}
                      </span>
                      {o.gst_number && user?.role !== 'operator' && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Receipt className="w-3 h-3" /> {o.gst_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                      ['pending'].includes(o.status)
                        ? 'bg-red-50 text-red-700 border-red-100'
                        : ['in_progress'].includes(o.status) ||
                            (!['fulfilled'].includes(o.status) &&
                              (o.shipping_status === 'packed' ||
                                o.shipping_status === 'shipped' ||
                                o.return_status))
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : o.status === 'fulfilled'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {o.status === 'fulfilled'
                      ? 'Completed'
                      : o.status === 'pending'
                        ? 'Remaining'
                        : 'In-Progress'}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-3">
                  {/* Shipping address */}
                  {o.shipping_address && (
                    <div className="flex items-start gap-2 bg-violet-50/60 rounded-xl p-3 border border-violet-100/60">
                      <MapPin className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-violet-700 uppercase tracking-wide">
                          {o.shipping_label}
                        </p>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          {o.shipping_address}
                        </p>
                      </div>
                    </div>
                  )}
                  {o.notes && (
                    <p className="text-sm text-slate-600 italic bg-blue-50/30 p-3 rounded-lg border border-blue-100/50">
                      "{o.notes}"
                    </p>
                  )}
                  <div className="space-y-1.5 mt-auto">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Order Items
                    </p>
                    {o.items.map((item) => (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{item.color_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase ml-2">
                            {item.business_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[11px] font-medium">
                            {item.pack_size_kg}kg
                          </span>
                          <span className="font-black text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                            {item.quantity}x
                          </span>
>>>>>>> origin/main
                        </div>
                      )
                    )}
                  </div>
<<<<<<< HEAD
                )
              })}
            </div>
=======
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      {o.shipping_status && (
                        <span>Ship: {o.shipping_status.replace(/_/g, ' ')}</span>
                      )}
                      {o.return_status && (
                        <span className="text-red-500 bg-red-100/50 px-1 rounded">
                          Ret: {o.return_status.replace(/_/g, ' ')}
                        </span>
                      )}
                      {o.refund_status && (
                        <span className="text-amber-600">
                          Ref: {o.refund_status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {/* Shipping Flow */}
                      {(!o.shipping_status || o.shipping_status === 'pending') &&
                        (isOrderInStock(o) ? (
                          <button
                            onClick={() =>
                              updateOrderStatus(o.id, {
                                shipping_status: 'packed',
                                status: 'in_progress',
                              })
                            }
                            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                          >
                            Pack Order
                          </button>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-md text-[10px] uppercase font-black tracking-wider shadow-sm cursor-not-allowed border border-slate-200">
                              Out of Stock
                            </span>
                            <a
                              href="/production"
                              className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm inline-flex items-center"
                            >
                              Create Colour (Production)
                            </a>
                          </div>
                        ))}
                      {o.shipping_status === 'packed' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, {
                              shipping_status: 'shipped',
                            })
                          }
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                        >
                          Ship Order (Left to ship)
                        </button>
                      )}
                      {o.shipping_status === 'shipped' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, {
                              shipping_status: 'delivered',
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {/* Returns Flow */}
                      {o.shipping_status === 'delivered' &&
                        !o.return_status &&
                        o.refund_status !== 'refund_successfully' && (
                          <button
                            onClick={() =>
                              updateOrderStatus(o.id, {
                                return_status: 'pick_up_order',
                                status: 'in_progress',
                              })
                            }
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                          >
                            Initiate Return
                          </button>
                        )}
                      {o.return_status === 'pick_up_order' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, {
                              return_status: 'on_the_way',
                            })
                          }
                          className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                        >
                          Pick Up (On the way)
                        </button>
                      )}
                      {o.return_status === 'on_the_way' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, {
                              return_status: 'delivered_to_warehouse',
                              refund_status: 'initiated',
                            })
                          }
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                        >
                          Deliver to Warehouse
                        </button>
                      )}
                      {o.refund_status === 'initiated' && (
                        <button
                          onClick={() =>
                            updateOrderStatus(o.id, {
                              refund_status: 'refund_successfully',
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md text-[10px] uppercase font-black tracking-wider transition-colors shadow-sm"
                        >
                          Complete Refund
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-right">
                    Has {o.items.length} item{o.items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))
>>>>>>> origin/main
          )}
        </div>
      </div>

      {/* New Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false)
              resetModal()
            }}
            aria-hidden="true"
          />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-200 scale-in-center">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" /> Create Client Order
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Record a new incoming sales order
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  resetModal()
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="order-form" onSubmit={handleCreateOrder} className="space-y-6">
                {/* Client selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Client *
                    </label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value ? Number(e.target.value) : '')
                        setSelectedShippingId('')
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold outline-none"
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.gst_number ? ` (${c.gst_number})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                      Shipping Address
                    </label>
                    <select
                      value={selectedShippingId}
                      onChange={(e) =>
                        setSelectedShippingId(e.target.value ? Number(e.target.value) : '')
                      }
                      disabled={!selectedClientId}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold outline-none disabled:opacity-50"
                    >
                      <option value="">-- No specific address --</option>
                      {selectedClient?.shipping_addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                          {a.is_default ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected client info badge */}
                {selectedClient && (
                  <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                    <UserRound className="w-4 h-4 text-violet-600 shrink-0" />
                    <div className="text-xs">
                      <span className="font-black text-violet-900">{selectedClient.name}</span>
                      {selectedClient.gst_number && (
                        <span className="text-violet-600 ml-2 font-bold">
                          GST: {selectedClient.gst_number}
                        </span>
                      )}
                      {selectedClient.contact_phone && (
                        <span className="text-violet-500 ml-2">{selectedClient.contact_phone}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Order Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Delivery instructions, special requirements..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium outline-none"
                  />
                </div>

                {/* Add Items */}
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-inner">
                  <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Add Products to Order
                  </h3>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="w-full md:flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Product
                      </label>
                      <select
                        value={selectedColorId}
                        onChange={(e) => {
                          setSelectedColorId(e.target.value ? Number(e.target.value) : '')
                          setSelectedPackSize('')
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      >
                        <option value="">-- Select Product --</option>
                        {colors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.business_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-32">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Pack Size
                      </label>
                      <select
                        value={selectedPackSize}
                        onChange={(e) =>
                          setSelectedPackSize(e.target.value ? Number(e.target.value) : '')
                        }
                        disabled={!selectedColorId}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:opacity-50"
                      >
                        <option value="">-- Size --</option>
                        {defaultPackSizes.map((size) => (
                          <option key={size} value={size}>
                            {size}kg
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-24">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="w-full md:w-32">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Total kg
                      </label>
                      <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-indigo-50/50 text-indigo-700 text-sm font-black flex items-center h-[38px]">
                        {selectedPackSize && quantity > 0
                          ? `${Number(selectedPackSize) * quantity}kg`
                          : '0kg'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedColorId || !selectedPackSize || quantity <= 0}
                      className="w-full md:w-auto px-4 py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-lg disabled:opacity-50 hover:bg-slate-800 transition-colors shadow-md h-[38px]"
                    >
                      Add
                    </button>
                  </div>
                  {/* Realtime Stock Checker */}
                  {selectedColorId && selectedPackSize && (
                    <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">
                          Current Stock:
                        </span>
                        <span className="font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                          {getStockAvailability(selectedColorId, selectedPackSize)} Units
                        </span>
                      </div>
                      <div>
                        {getStockAvailability(selectedColorId, selectedPackSize)! >= quantity ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                            Available in Finished Stock (Ready to Pack)
                          </span>
                        ) : (
                          <span className="text-orange-600 font-bold flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">
                            Deficit of{' '}
                            {quantity - getStockAvailability(selectedColorId, selectedPackSize)!}{' '}
                            units (Will queue Production Demand)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Added items */}
                {newOrderItems.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left bg-white">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                        <tr>
                          <th className="px-4 py-2">Product</th>
                          <th className="px-4 py-2">Size</th>
                          <th className="px-4 py-2 text-center">Qty</th>
                          <th className="px-4 py-2 text-center text-indigo-600">Total Target</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {newOrderItems.map((item, idx) => {
                          const color = colors.find((c) => c.id === item.colorId)
                          const avail = getStockAvailability(item.colorId, item.packSizeKg) || 0
                          const inStock = avail >= item.quantity
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-slate-800">
                                {color?.name}
                                {!inStock && (
                                  <span className="ml-2 mt-1 inline-block text-[8px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 px-1.5 py-0.5 border border-orange-200 rounded">
                                    Needs Prod
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-600">
                                {item.packSizeKg}kg
                              </td>
                              <td className="px-4 py-3 text-center text-blue-700 font-black">
                                <span className="bg-blue-50 px-2 py-0.5 rounded">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-black text-indigo-700">
                                {item.packSizeKg * item.quantity}kg
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewOrderItems(newOrderItems.filter((_, i) => i !== idx))
                                  }
                                  className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  resetModal()
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="order-form"
                disabled={isSubmitting || newOrderItems.length === 0 || !selectedClientId}
                className="inline-flex items-center px-6 py-2.5 text-sm font-black bg-blue-600 shadow-lg shadow-blue-200 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-widest active:scale-95"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
