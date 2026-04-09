import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import {
  Mail,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Loader2,
  PencilLine,
  Printer,
  UserCheck,
  XCircle,
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

      {isLoading && !orders.length ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Compiling Professional Document...
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`group bg-white overflow-hidden transition-all duration-500 ${expandedId === order.id ? 'no-shadow print:shadow-none' : 'rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl'}`}
            >
              {/* Summary Bar - Hidden for printing when expanded */}
              <div
                className={`p-10 flex flex-col md:flex-row items-center justify-between gap-8 cursor-pointer no-print ${expandedId === order.id ? 'border-b border-orange-100 bg-orange-50/30' : ''}`}
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Purchase Order
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {generateUniquePONumber(order.id, order.created_at)}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-slate-200" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Commercial Partner
                    </span>
                    <span className="text-xl font-black text-slate-900">{order.supplier_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      order.status === 'received'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : order.status === 'ordered'
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}
                  >
                    {order.status}
                  </div>
                  {expandedId === order.id ? (
                    <ChevronUp className="h-6 w-6 text-orange-500" />
                  ) : (
                    <ChevronDown className="h-6 w-6 text-slate-300" />
                  )}
                </div>
              </div>

              {expandedId === order.id && (
                <div className="relative p-12 lg:p-20 bg-white print:p-0">
                  {/* Main Title */}
                  <h2 className="text-center text-[54px] font-black text-orange-500 uppercase tracking-tight mb-20">
                    Purchase Order
                  </h2>
                  <div className="grid grid-cols-2 gap-20 mb-20">
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

                  <div className="grid grid-cols-2 gap-20 mb-16">
                    {/* Middle Left: Bill To */}
                    <div className="space-y-6">
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
                    <div className="space-y-6">
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
                  <div className="mb-12">
                    <h4 className="text-lg font-black text-slate-900 mb-6">Order Details</h4>
                    <table className="w-full border-collapse border-b-2 border-orange-500">
                      <thead>
                        <tr className="bg-white border-t-2 border-orange-500">
                          <th className="px-6 py-4 text-xs font-black text-slate-900 uppercase border-r border-orange-100">
                            Item No.
                          </th>
                          <th className="px-6 py-4 text-xs font-black text-slate-900 uppercase text-left border-r border-orange-100">
                            Item Description
                          </th>
                          <th className="px-6 py-4 text-xs font-black text-slate-900 uppercase text-center border-r border-orange-100">
                            Quantity
                          </th>
                          <th className="px-6 py-4 text-xs font-black text-slate-900 uppercase text-center border-r border-orange-100">
                            Unit Price
                          </th>
                          <th className="px-6 py-4 text-xs font-black text-slate-900 uppercase text-right">
                            Total Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-orange-50">
                        {order.items?.map((item, index) => (
                          <tr key={item.id}>
                            <td className="px-6 py-6 text-center border-r border-orange-100 font-bold text-slate-500">
                              {index + 1}.
                            </td>
                            <td className="px-6 py-6 border-r border-orange-100">
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
                            <td className="px-6 py-6 text-center border-r border-orange-100 font-bold text-slate-600">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-6 text-center border-r border-orange-100 font-bold text-slate-600">
                              ₹{item.unit_price.toFixed(2)}
                            </td>
                            <td className="px-6 py-6 text-right font-black text-slate-900 tracking-tight">
                              ₹{(item.quantity * item.unit_price).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Section */}
                  <div className="flex justify-end mb-24">
                    <div className="w-full max-w-[320px] rounded-2xl bg-orange-50/50 border-2 border-orange-100 overflow-hidden shadow-2xl shadow-orange-100/50">
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
                  <div className="flex items-center justify-between pt-10 border-t-2 border-slate-100">
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

                  {/* Document Actions Bar (Floating/Fixed) */}
                  <div className="mt-20 no-print flex items-center justify-between bg-slate-50 p-6 rounded-[32px] border border-slate-200">
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ordered')}
                        className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
                      >
                        Confirm Dispatch
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'received')}
                        className="px-6 py-3 rounded-2xl bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-orange-100"
                      >
                        Certify Receipt
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => window.print()}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-orange-500 transition-all shadow-sm"
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                      <div className="h-8 w-px bg-slate-200" />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            window.location.host + '/po/' + order.share_token,
                          )
                          alert('PO URL Copied!')
                        }}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-500 transition-all shadow-sm"
                      >
                        <LinkIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => (window.location.href = `mailto:${order.supplier_email}`)}
                        className="px-6 py-3 rounded-2xl bg-blue-50 text-blue-600 text-[11px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                      >
                        <Mail className="h-4 w-4 inline mr-2" /> Dispatch Email
                      </button>
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
