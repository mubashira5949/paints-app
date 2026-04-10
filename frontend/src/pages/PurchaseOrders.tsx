import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import {
  Mail,
  Link as LinkIcon,
  ChevronDown,
  Loader2,
  PencilLine,
  UserCheck,
  XCircle,
  Search,
  Filter,
  Calendar,
  Download,
} from 'lucide-react'

interface PurchaseOrderPOC {
  name: string
  email?: string
  phone?: string
  role?: string
}

interface POItem {
  id: number
  purchase_order_id: number
  resource_id: number
  resource_name: string
  quantity: number
  unit: string
  unit_price: number
  received_quantity: number
  refunded_quantity: number
  refund_status: 'none' | 'pending' | 'completed' | 'rejected'
}

interface PurchaseOrder {
  id: number
  supplier_id: number
  supplier_name: string
  supplier_email: string
  supplier_phone?: string
  supplier_address?: string
  supplier_gst?: string
  supplier_pocs?: PurchaseOrderPOC[]
  status: 'draft' | 'pending' | 'ordered' | 'received' | 'partially_received' | 'cancelled'
  notes: string | null
  share_token: string
  created_at: string
  items: POItem[]
}

const BUYER_INFO = {
  name: 'Beautiful Advertising agency',
  address:
    '220-A, VEENA DALWAI INDUSTRIAL ESTATE, OSHIWARA, S.V ROAD, JOGESHWARI WEST, MUMBAI 400102',
  gstin: '27AAAPQ0220C1ZH',
  phone: '+91 98334 13855',
  email: 'beautyflextpi@gmail.com',
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<POItem | null>(null)
  const [editData, setEditData] = useState({ quantity: '', unit_price: '' })

  const fetchOrders = async () => {
    setIsLoading(true)
    try {
      const data = await apiRequest<PurchaseOrder[]>('/purchase-orders')
      setOrders(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await apiRequest(`/purchase-orders/${id}/status`, {
        method: 'PUT',
        body: { status },
      })
      fetchOrders()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const generateUniquePONumber = (id: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear()
    return `PO${year}${id.toString().padStart(4, '0')}`
  }

  const calculateSubtotal = (items: POItem[]) => {
    return items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.18 // 18% GST (Standard in India)
  }

  const openEditModal = (item: POItem) => {
    setSelectedItem(item)
    setEditData({
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    try {
      await apiRequest(
        `/purchase-orders/${selectedItem.purchase_order_id}/items/${selectedItem.id}`,
        {
          method: 'PUT',
          body: {
            quantity: parseFloat(editData.quantity),
            unit_price: parseFloat(editData.unit_price),
          },
        },
      )
      setIsEditModalOpen(false)
      fetchOrders()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 py-12 print:p-0 print:max-w-none">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Standard Procurement Ledger
        </h1>
        <div className="px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" /> Final Confirmation
          Layout
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 no-print">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Purchase Order..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-bold placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select className="pl-10 pr-8 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none text-sm font-bold text-slate-600 bg-white min-w-[140px] cursor-pointer">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="date"
              className="pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm font-bold text-slate-600 bg-white min-w-[140px] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {isLoading && !orders.length ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Compiling Professional Document...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`group bg-white overflow-hidden transition-all duration-300 ${expandedId === order.id ? 'no-shadow print:shadow-none' : 'rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md'}`}
            >
              {/* Summary Bar - Hidden for printing when expanded */}
              <div
                className={`px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors no-print ${expandedId === order.id ? 'border-b border-orange-100 bg-orange-50/30' : ''}`}
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-900">
                      {generateUniquePONumber(order.id, order.created_at)}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-bold text-slate-500">{order.supplier_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 justify-end">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      order.status === 'received'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : order.status === 'ordered'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {order.status === 'received' 
                      ? '✅' 
                      : order.status === 'cancelled' 
                        ? '❌'
                        : order.status === 'ordered' 
                          ? '📦' 
                          : '⏳'}
                    <span className="uppercase tracking-widest text-[10px]">{order.status}</span>
                  </div>
                  <ChevronDown 
                    className={`h-6 w-6 transition-transform duration-300 ${expandedId === order.id ? 'rotate-180 text-orange-500' : 'text-slate-400'}`} 
                  />
                </div>
              </div>

              {expandedId === order.id && (
                <div className="relative bg-white print:p-0">
                  {/* Sticky Header with Actions */}
                  <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Document</span>
                      <span className="text-lg font-black text-slate-900">{generateUniquePONumber(order.id, order.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ordered')}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md"
                      >
                        Confirm Dispatch
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'received')}
                        className="px-5 py-2.5 rounded-xl border-2 border-orange-500 text-orange-600 text-[11px] font-black uppercase tracking-widest hover:bg-orange-50 transition-all bg-white"
                      >
                        Certify Receipt
                      </button>
                      <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block" />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            window.location.host + '/po/' + order.share_token,
                          )
                          alert('PO URL Copied!')
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all bg-white"
                        title="Share Link"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => (window.location.href = `mailto:${order.supplier_email}`)}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all bg-white"
                        title="Email Partner"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-[11px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all ml-1"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>

                  <div className="p-8 lg:p-12">
                    {/* Main Title */}
                    <h2 className="text-center text-4xl font-black text-orange-500 uppercase tracking-widest mb-12">
                      Purchase Order
                    </h2>
                  <div className="grid grid-cols-2 gap-12 mb-12">
                    {/* Top Left: Company Details */}
                    <div className="space-y-6">
                      <div className="text-sm font-bold text-slate-500 space-y-1">
                        <p className="text-slate-800">{BUYER_INFO.name}</p>
                        <p className="max-w-[300px] leading-relaxed">{BUYER_INFO.address}</p>
                        <p className="text-slate-900 font-black flex items-center gap-2 mt-4 uppercase tracking-tighter">
                          GSTIN: {BUYER_INFO.gstin}
                        </p>
                      </div>
                    </div>

                    {/* Top Right: PO Meta */}
                    <div className="flex flex-col items-end text-right space-y-6">
                      <div className="space-y-1">
                        <span className="text-sm font-black text-slate-900">Purchase Date:</span>
                        <p className="text-sm font-bold text-slate-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="px-4 py-1.5 border-2 border-orange-500 rounded-xl bg-orange-50/50">
                        <span className="text-xs font-black text-orange-600 uppercase tracking-widest">
                          PO Number: {generateUniquePONumber(order.id, order.created_at)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm font-black text-slate-900">Delivery Date:</span>
                        <p className="text-sm font-bold text-slate-500">
                          {new Date(
                            new Date(order.created_at).getTime() + 15 * 24 * 60 * 60 * 1000,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 items-start mb-12">
                    {/* Middle Left: Bill To */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-slate-900">Bill To</h4>
                      <div className="text-sm font-bold text-slate-500 space-y-1">
                        <p className="text-slate-800 font-black">{order.supplier_name}</p>
                        <p className="max-w-[300px] leading-relaxed italic">
                          {order.supplier_address || 'Official registered address not linked'}
                        </p>
                        {order.supplier_gst && (
                          <p className="flex items-center gap-2 font-black text-slate-900 uppercase pt-1">
                            GSTIN: {order.supplier_gst}
                          </p>
                        )}
                        <div className="flex flex-col gap-1 mt-6 text-xs font-bold text-slate-600 border-t border-orange-50 pt-4">
                          {order.supplier_pocs?.[0] && (
                            <div className="flex flex-col">
                              <p className="text-slate-900 font-black text-[10px] uppercase tracking-widest mb-1">
                                Primary Liaison
                              </p>
                              <p className="text-slate-800 font-black mb-1">
                                {order.supplier_pocs[0].name}
                              </p>
                              {order.supplier_pocs[0].phone && (
                                <p>PH: {order.supplier_pocs[0].phone}</p>
                              )}
                              {order.supplier_pocs[0].email && (
                                <p>EM: {order.supplier_pocs[0].email}</p>
                              )}
                            </div>
                          )}
                          {!order.supplier_pocs?.[0] && (
                            <p className="font-black text-slate-900">
                              {order.supplier_phone || 'PH: N/A'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Right: Delivery Address */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-slate-900">Delivery Address</h4>
                      <div className="text-sm font-bold text-slate-500 space-y-1">
                        <p className="text-slate-800">{BUYER_INFO.name}</p>
                        <p className="max-w-[300px] leading-relaxed">{BUYER_INFO.address}</p>
                        <p className="flex items-center gap-2 mt-4 font-black text-slate-900">
                          Contact No.- {BUYER_INFO.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Details Table */}
                  <div className="mb-10">
                    <h4 className="text-lg font-black text-slate-900 mb-4">Order Details</h4>
                    <table className="w-full border-collapse">
                      <thead className="bg-slate-100">
                        <tr className="border-y border-slate-300">
                          <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase">
                            Item No.
                          </th>
                          <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-left">
                            Item Description
                          </th>
                          <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-center">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-center">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-right">
                            Total Price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map((item, index) => (
                          <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-center font-bold text-slate-500">
                              {index + 1}.
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 uppercase tracking-tight">
                                  {item.resource_name}
                                </span>
                                <span
                                  className="text-[10px] text-slate-400 font-bold uppercase no-print cursor-pointer hover:text-orange-500 truncate mt-1"
                                  onClick={() => openEditModal(item)}
                                >
                                  Edit Unit Quantity
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-600">
                              ₹{item.unit_price.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900 tracking-tight">
                              ₹{(item.quantity * item.unit_price).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-16">
                    <div className="w-full max-w-[320px] rounded-2xl bg-orange-50 border border-orange-200 overflow-hidden shadow-sm">
                      <div className="p-6 space-y-4 font-bold text-sm">
                        <div className="flex justify-between text-slate-500">
                          <span>Sub Total</span>
                          <span className="text-slate-900">
                            ₹{calculateSubtotal(order.items).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tax Rate(%)</span>
                          <span className="text-slate-900">18%</span>
                        </div>
                        <div className="flex justify-between text-slate-500 border-b border-orange-200 pb-4">
                          <span>Taxes (₹)</span>
                          <span className="text-slate-900">
                            ₹{calculateTax(calculateSubtotal(order.items)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-orange-600 font-black uppercase text-[10px] tracking-widest">
                            Standard Total
                          </span>
                          <span className="text-2xl font-black text-orange-500 tracking-tighter">
                            ₹
                            {(
                              calculateSubtotal(order.items) +
                              calculateTax(calculateSubtotal(order.items))
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-10 border-t border-slate-200">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-900 font-black">
                        <UserCheck className="h-5 w-5 text-orange-500" /> Authorized By: Alex Mercer
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-7">
                        System Automated Signature
                      </p>
                    </div>
                    <div className="text-right text-xs font-black text-slate-400 uppercase tracking-widest">
                      Date:{' '}
                      {new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Quantity Modal */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-[40px] bg-white p-10 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white">
                  <PencilLine className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Scale Order</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {selectedItem.resource_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl text-slate-400"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  New Quantity ({selectedItem.unit})
                </label>
                <input
                  required
                  type="number"
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-black"
                  value={editData.quantity}
                  onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                />
              </div>
              <button className="w-full py-4 rounded-3xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all active:scale-[0.98]">
                UPDATE OFFICIAL RECORD
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
