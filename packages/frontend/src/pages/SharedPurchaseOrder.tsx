import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Loader2, Link as LinkIcon, Mail } from 'lucide-react'
import { apiRequest } from '../services/api'
import { useDateFormatPreference, formatDate } from '../utils/dateFormatter'

interface POItem {
  id: number
  resource_name: string
  quantity: number
  unit: string
  unit_price: number
}

interface PurchaseOrder {
  id: number
  supplier_name: string
  supplier_email: string
  supplier_phone?: string
  supplier_address?: string
  supplier_gst?: string
  status: string
  created_at: string
  items: POItem[]
}

const BUYER_INFO = {
  name: 'Beautiful Advertising agency',
  address: '220-A, VEENA DALWAI INDUSTRIAL ESTATE, OSHIWARA, S.V ROAD, JOGESHWARI WEST, MUMBAI 400102',
  gstin: '27AAAPQ0220C1ZH',
  phone: '+91 98334 13855',
  email: 'beautyflextpi@gmail.com',
}

export default function SharedPurchaseOrder() {
  const { token } = useParams<{ token: string }>()
  const dateFormat = useDateFormatPreference()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSharedPO = async () => {
      try {
        const data = await apiRequest<PurchaseOrder>(`/purchase-orders/shared/${token}`)
        setOrder(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load Purchase Order. Link may be invalid or expired.')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (token) {
      fetchSharedPO()
    }
  }, [token])

  const generateUniquePONumber = (id: number, createdAt: string) => {
    const year = new Date(createdAt).getFullYear()
    return `PO${year}${id.toString().padStart(4, '0')}`
  }

  const calculateSubtotal = (items: POItem[]) => {
    return items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.18
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-6">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading Secure Document...
        </p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl text-center border border-red-100">
          <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <LinkIcon className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-sm font-bold text-slate-500">{error || 'This Purchase Order could not be found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Header Actions - Hidden on Print */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Shared Document</span>
            <span className="text-lg font-black text-slate-900">{generateUniquePONumber(order.id, order.created_at)}</span>
          </div>
          <div className="flex items-center gap-3">
             <button
                onClick={() => (window.location.href = `mailto:${BUYER_INFO.email}`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                <Mail className="h-4 w-4" />
                Contact Buyer
              </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 text-orange-600 text-[11px] font-black uppercase tracking-widest hover:bg-orange-100 transition-all"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="p-8 lg:p-12 print:p-0 print:pt-4">
          <h2 className="text-center text-4xl font-black text-orange-500 uppercase tracking-widest mb-12 print:mb-6">
            Purchase Order
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 print:gap-6 print:mb-6">
            <div className="space-y-6">
              <div className="text-sm font-bold text-slate-500 space-y-1">
                <p className="text-slate-800">{BUYER_INFO.name}</p>
                <p className="max-w-[300px] leading-relaxed">{BUYER_INFO.address}</p>
                <p className="text-slate-900 font-black flex items-center gap-2 mt-4 uppercase tracking-tighter">
                  GSTIN: {BUYER_INFO.gstin}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:items-end md:text-right space-y-6">
              <div className="space-y-1">
                <span className="text-sm font-black text-slate-900">Purchase Date:</span>
                <p className="text-sm font-bold text-slate-500">
                  {formatDate(order.created_at, dateFormat)}
                </p>
              </div>
              <div className="px-4 py-1.5 border-2 border-orange-500 rounded-xl bg-orange-50/50 inline-block">
                <span className="text-xs font-black text-orange-600 uppercase tracking-widest">
                  PO Number: {generateUniquePONumber(order.id, order.created_at)}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-black text-slate-900">Delivery Date:</span>
                <p className="text-sm font-bold text-slate-500">
                  {formatDate(
                    new Date(new Date(order.created_at).getTime() + 15 * 24 * 60 * 60 * 1000),
                    dateFormat,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-12 print:gap-6 print:mb-6">
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
                  <p className="font-black text-slate-900">
                    {order.supplier_phone || 'PH: N/A'}
                  </p>
                  <p className="font-black text-slate-900">
                    {order.supplier_email || 'Email: N/A'}
                  </p>
                </div>
              </div>
            </div>

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

          <div className="mb-10 print:mb-6 overflow-x-auto">
            <h4 className="text-lg font-black text-slate-900 mb-4">Order Details</h4>
            <table className="w-full border-collapse min-w-[600px]">
              <thead className="bg-slate-100">
                <tr className="border-y border-slate-300">
                  <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase">Item No.</th>
                  <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-left">Item Description</th>
                  <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-center">Quantity</th>
                  <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-center">Unit Price</th>
                  <th className="px-6 py-3 text-xs font-black text-slate-700 uppercase text-right">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-6 py-4 print:py-2 text-center font-bold text-slate-500">{index + 1}.</td>
                    <td className="px-6 py-4 print:py-2">
                      <span className="font-black text-slate-900 uppercase tracking-tight">{item.resource_name}</span>
                    </td>
                    <td className="px-6 py-4 print:py-2 text-center font-bold text-slate-600">{item.quantity}</td>
                    <td className="px-6 py-4 print:py-2 text-center font-bold text-slate-600">₹{item.unit_price.toFixed(2)}</td>
                    <td className="px-6 py-4 print:py-2 text-right font-black text-slate-900 tracking-tight">
                      ₹{(item.quantity * item.unit_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-16 print:mb-6">
            <div className="w-full max-w-[320px] rounded-2xl bg-orange-50 border border-orange-200 overflow-hidden shadow-sm">
              <div className="p-6 space-y-4 font-bold text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Sub Total</span>
                  <span className="text-slate-900">₹{calculateSubtotal(order.items).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax Rate(%)</span>
                  <span className="text-slate-900">18%</span>
                </div>
                <div className="flex justify-between text-slate-500 border-b border-orange-200 pb-4">
                  <span>Taxes (₹)</span>
                  <span className="text-slate-900">₹{calculateTax(calculateSubtotal(order.items)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-orange-600 font-black uppercase text-[10px] tracking-widest">Standard Total</span>
                  <span className="text-2xl font-black text-orange-500 tracking-tighter">
                    ₹{(calculateSubtotal(order.items) + calculateTax(calculateSubtotal(order.items))).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-10 print:pt-6 border-t border-slate-200">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-900 font-black">
                Authorized By: Alex Mercer
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                System Automated Signature
              </p>
            </div>
            <div className="text-right text-xs font-black text-slate-400 uppercase tracking-widest">
              Date: {formatDate(new Date(), dateFormat)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
