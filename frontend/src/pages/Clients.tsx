import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import {
  UserRound,
  Plus,
  Loader2,
  Search,
  X,
  MapPin,
  Phone,
  Mail,
  Building2,
  ChevronDown,
  ChevronUp,
  Receipt,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { useDateFormatPreference, formatDate } from '../utils/dateFormatter'
import { useAuth } from '../contexts/AuthContext'

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
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  billing_address: string | null
  onboarded_by: string | null
  updated_by_username: string | null
  created_at: string
  updated_at: string | null
  shipping_addresses: ShippingAddress[]
}

interface NewAddress {
  label: string
  address: string
  isDefault: boolean
}

export default function Clients() {
  const dateFormat = useDateFormatPreference()
  const { user } = useAuth()
  const isManager = user?.role === 'admin' || user?.role === 'manager'

  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Edit modal state
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  // Edit form fields
  const [editName, setEditName] = useState('')
  const [editGst, setEditGst] = useState('')
  const [editContactName, setEditContactName] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editBillingAddress, setEditBillingAddress] = useState('')

  // Edit — new address form
  const [editAddrLabel, setEditAddrLabel] = useState('')
  const [editAddrAddress, setEditAddrAddress] = useState('')
  const [editAddrIsDefault, setEditAddrIsDefault] = useState(false)
  const [isAddingAddress, setIsAddingAddress] = useState(false)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Create form fields
  const [name, setName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddresses, setShippingAddresses] = useState<NewAddress[]>([])
  const [addrLabel, setAddrLabel] = useState('')
  const [addrAddress, setAddrAddress] = useState('')
  const [addrIsDefault, setAddrIsDefault] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await apiRequest<Client[]>('/clients')
      setClients(res)
    } catch (err) {
      console.error('Failed to fetch clients', err)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Create Modal helpers ──────────────────────────────────────────────────
  const resetForm = () => {
    setName('')
    setGstNumber('')
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setBillingAddress('')
    setShippingAddresses([])
    setAddrLabel('')
    setAddrAddress('')
    setAddrIsDefault(false)
  }

  const handleAddAddress = () => {
    if (!addrLabel || !addrAddress) return
    setShippingAddresses((prev) => [
      ...prev.map((a) => (addrIsDefault ? { ...a, isDefault: false } : a)),
      { label: addrLabel, address: addrAddress, isDefault: addrIsDefault },
    ])
    setAddrLabel('')
    setAddrAddress('')
    setAddrIsDefault(false)
  }

  const handleRemoveAddress = (idx: number) => {
    setShippingAddresses(shippingAddresses.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setIsSubmitting(true)

    // Auto-flush any pending address the user typed but forgot to click "+ ADD" for
    const finalAddresses = [...shippingAddresses]
    if (addrLabel && addrAddress) {
      finalAddresses.push({
        label: addrLabel,
        address: addrAddress,
        isDefault: addrIsDefault,
      })
    }

    try {
      await apiRequest('/clients', {
        method: 'POST',
        body: {
          name,
          gstNumber: gstNumber || undefined,
          contactName: contactName || undefined,
          contactPhone: contactPhone || undefined,
          contactEmail: contactEmail || undefined,
          billingAddress: billingAddress || undefined,
          shippingAddresses: finalAddresses.map((a) => ({
            label: a.label,
            address: a.address,
            isDefault: a.isDefault,
          })),
        },
      })
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        setIsModalOpen(false)
        resetForm()
        fetchClients()
      }, 1500)
    } catch (err: any) {
      alert(err.message || 'Failed to onboard client')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Edit Modal helpers ────────────────────────────────────────────────────
  const openEditModal = (c: Client) => {
    setEditClient(c)
    setEditName(c.name)
    setEditGst(c.gst_number || '')
    setEditContactName(c.contact_name || '')
    setEditContactPhone(c.contact_phone || '')
    setEditContactEmail(c.contact_email || '')
    setEditBillingAddress(c.billing_address || '')
    setEditAddrLabel('')
    setEditAddrAddress('')
    setEditAddrIsDefault(false)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editClient) return
    setIsEditSubmitting(true)
    try {
      // Auto-flush pending address if the user typed one but forgot to click "+ Add"
      if (editAddrLabel && editAddrAddress) {
        // We eat any errors here to ensure the main client update still proceeds
        await apiRequest(`/clients/${editClient.id}/addresses`, {
          method: 'POST',
          body: {
            label: editAddrLabel,
            address: editAddrAddress,
            isDefault: editAddrIsDefault,
          },
        }).catch((err) => console.error('Failed to auto-save pending address:', err))
      }

      await apiRequest(`/clients/${editClient.id}`, {
        method: 'PUT',
        body: {
          name: editName || undefined,
          gstNumber: editGst || undefined,
          contactName: editContactName || undefined,
          contactPhone: editContactPhone || undefined,
          contactEmail: editContactEmail || undefined,
          billingAddress: editBillingAddress || undefined,
        },
      })
      setEditSuccess(true)
      setTimeout(() => {
        setEditSuccess(false)
        setIsEditModalOpen(false)
        setEditClient(null)
        fetchClients()
      }, 1200)
    } catch (err: any) {
      alert(err.message || 'Failed to update client')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const handleAddEditAddress = async () => {
    if (!editClient || !editAddrLabel || !editAddrAddress) return
    setIsAddingAddress(true)
    try {
      await apiRequest(`/clients/${editClient.id}/addresses`, {
        method: 'POST',
        body: {
          label: editAddrLabel,
          address: editAddrAddress,
          isDefault: editAddrIsDefault,
        },
      })
      // Refresh client addresses
      const updated = await apiRequest<Client[]>('/clients')
      setClients(updated)
      const refreshed = updated.find((c) => c.id === editClient.id)
      if (refreshed) setEditClient(refreshed)
      setEditAddrLabel('')
      setEditAddrAddress('')
      setEditAddrIsDefault(false)
    } catch (err: any) {
      alert(err.message || 'Failed to add address')
    } finally {
      setIsAddingAddress(false)
    }
  }

  const handleRemoveEditAddress = async (addrId: number) => {
    if (!editClient) return
    try {
      await apiRequest(`/clients/${editClient.id}/addresses/${addrId}`, {
        method: 'DELETE',
      })
      const updated = await apiRequest<Client[]>('/clients')
      setClients(updated)
      const refreshed = updated.find((c) => c.id === editClient.id)
      if (refreshed) setEditClient(refreshed)
    } catch (err: any) {
      alert(err.message || 'Failed to remove address')
    }
  }

  // ── Delete helpers ────────────────────────────────────────────────────────
  const handleDeleteClient = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(true)
    try {
      await apiRequest(`/clients/${deleteConfirmId}`, { method: 'DELETE' })
      setDeleteConfirmId(null)
      fetchClients()
    } catch (err: any) {
      alert(err.message || 'Failed to delete client')
    } finally {
      setIsDeleting(false)
    }
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gst_number && c.gst_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.contact_email && c.contact_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.contact_phone && c.contact_phone.includes(searchTerm)),
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-200">
              <UserRound className="h-6 w-6 text-white" />
            </div>
            Clients
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Onboard and manage your customer accounts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Onboard Client
        </button>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, GST, phone or email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border-slate-200 bg-white text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
            {filtered.length} clients
          </p>
        </div>

        {/* Client list */}
        <div className="divide-y divide-slate-50">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">Loading clients...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <UserRound className="w-10 h-10 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-bold">No clients found</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="group">
                {/* Client row */}
                <div className="p-5 flex items-start gap-5 hover:bg-slate-50/60 transition-colors">
                  {/* Clickable expand area */}
                  <div
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="flex items-start gap-5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 shadow-inner">
                      <Building2 className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 text-lg leading-tight">
                          {c.name}
                        </h3>
                        {c.gst_number && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest">
                            <Receipt className="w-3 h-3" /> GST: {c.gst_number}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-slate-500 font-medium">
                        {c.contact_name && (
                          <span className="font-bold text-slate-700">{c.contact_name}</span>
                        )}
                        {c.contact_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {c.contact_phone}
                          </span>
                        )}
                        {c.contact_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {c.contact_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200">
                      {c.shipping_addresses.length} addr.
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(c)
                      }}
                      className="p-2 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"
                      title="Edit client"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isManager && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(c.id)
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div
                      onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                      className="cursor-pointer p-1"
                    >
                      {expandedId === c.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === c.id && (
                  <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Billing address */}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Billing Address
                        </p>
                        {c.billing_address ? (
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">
                            {c.billing_address}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">Not provided</p>
                        )}
                      </div>

                      {/* Shipping addresses */}
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Shipping Addresses
                        </p>
                        {c.shipping_addresses.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">
                            No shipping addresses added
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {c.shipping_addresses.map((addr) => (
                              <div
                                key={addr.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${addr.is_default ? 'bg-violet-50 border-violet-100' : 'bg-white border-slate-100'}`}
                              >
                                <MapPin
                                  className={`w-4 h-4 mt-0.5 shrink-0 ${addr.is_default ? 'text-violet-600' : 'text-slate-400'}`}
                                />
                                <div>
                                  <p className="font-bold text-slate-800 flex items-center gap-2">
                                    {addr.label}
                                    {addr.is_default && (
                                      <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                        Default
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                                    {addr.address}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Audit trail */}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 border-t border-slate-100 pt-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Created by {c.onboarded_by || 'system'} ·{' '}
                        {formatDate(c.created_at, dateFormat)}
                      </p>
                      {c.updated_at && c.updated_at !== c.created_at && (
                        <p className="text-[10px] text-violet-500 uppercase tracking-widest font-bold">
                          Last edited
                          {c.updated_by_username ? ` by ${c.updated_by_username}` : ''} ·{' '}
                          {formatDate(c.updated_at, dateFormat)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
            aria-hidden="true"
          />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-6 border border-red-100 scale-in-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2.5 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Delete Client?</h2>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              All shipping addresses associated with this client will also be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={isDeleting}
                className="inline-flex items-center px-5 py-2.5 text-sm font-black bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-200"
              >
                {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Client Modal ────────────────────────────────────────────────── */}
      {isEditModalOpen && editClient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setIsEditModalOpen(false)
              setEditClient(null)
            }}
            aria-hidden="true"
          />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-200 scale-in-center">
            {/* Modal header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-violet-600" /> Edit Client
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {editClient.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditClient(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success overlay */}
            {editSuccess && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-200">
                <div className="bg-emerald-100 p-4 rounded-full mb-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Client Updated!</h3>
              </div>
            )}

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Company Info */}
              <form id="edit-client-form" onSubmit={handleEditSubmit}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Company Information
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      Company / Client Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={editGst}
                      onChange={(e) => setEditGst(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      value={editBillingAddress}
                      onChange={(e) => setEditBillingAddress(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-5">
                  Primary Contact
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editContactEmail}
                      onChange={(e) => setEditContactEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                    />
                  </div>
                </div>
              </form>

              {/* Shipping Addresses section */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Shipping Addresses
                </p>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Existing addresses */}
                  {editClient.shipping_addresses.length === 0 ? (
                    <div className="p-4 text-sm text-slate-400 italic text-center">
                      No shipping addresses yet
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {editClient.shipping_addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <MapPin
                              className={`w-4 h-4 mt-0.5 shrink-0 ${addr.is_default ? 'text-violet-600' : 'text-slate-400'}`}
                            />
                            <div>
                              <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                {addr.label}
                                {addr.is_default && (
                                  <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                    Default
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">{addr.address}</p>
                            </div>
                          </div>
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEditAddress(addr.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-3 shrink-0"
                              title="Remove address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new address */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Add New Address
                    </p>
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="w-full md:w-36">
                        <input
                          type="text"
                          value={editAddrLabel}
                          onChange={(e) => setEditAddrLabel(e.target.value)}
                          placeholder="Label (e.g. Main)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={editAddrAddress}
                          onChange={(e) => setEditAddrAddress(e.target.value)}
                          placeholder="Full address"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-1">
                        <input
                          type="checkbox"
                          id="edit-addr-default"
                          checked={editAddrIsDefault}
                          onChange={(e) => setEditAddrIsDefault(e.target.checked)}
                          className="w-4 h-4 rounded accent-violet-600"
                        />
                        <label
                          htmlFor="edit-addr-default"
                          className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                        >
                          Default
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditAddress}
                        disabled={!editAddrLabel || !editAddrAddress || isAddingAddress}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg disabled:opacity-40 hover:bg-slate-800 transition-colors h-[38px] flex items-center gap-1.5"
                      >
                        {isAddingAddress ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditClient(null)
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-client-form"
                disabled={isEditSubmitting || !editName}
                className="inline-flex items-center px-6 py-2.5 text-sm font-black bg-violet-600 shadow-lg shadow-violet-200 text-white rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50 uppercase tracking-widest active:scale-95"
              >
                {isEditSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboard Client Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false)
              resetForm()
            }}
            aria-hidden="true"
          />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-200 scale-in-center">
            {/* Modal header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <UserRound className="w-5 h-5 text-violet-600" /> Onboard New Client
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Fill in the customer details below
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success overlay */}
            {submitSuccess && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center rounded-3xl animate-in fade-in duration-200">
                <div className="bg-emerald-100 p-4 rounded-full mb-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Client Onboarded!</h3>
              </div>
            )}

            {/* Form body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Company Info */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Company Information
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Company / Client Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Acme Pvt. Ltd."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        GST Number
                      </label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Billing Address
                      </label>
                      <input
                        type="text"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Full billing address"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Primary Contact
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="rahul@acme.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-sm font-medium outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Addresses */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Shipping Addresses
                  </p>
                  <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 space-y-3">
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="w-full md:w-36">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                          Label
                        </label>
                        <input
                          type="text"
                          value={addrLabel}
                          onChange={(e) => setAddrLabel(e.target.value)}
                          placeholder="e.g. Warehouse A"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                          Full Address
                        </label>
                        <input
                          type="text"
                          value={addrAddress}
                          onChange={(e) => setAddrAddress(e.target.value)}
                          placeholder="Street, City, State, PIN"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 pb-1">
                        <input
                          type="checkbox"
                          id="addr-default"
                          checked={addrIsDefault}
                          onChange={(e) => setAddrIsDefault(e.target.checked)}
                          className="w-4 h-4 rounded accent-violet-600"
                        />
                        <label
                          htmlFor="addr-default"
                          className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                        >
                          Default
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAddress}
                        disabled={!addrLabel || !addrAddress}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-lg disabled:opacity-40 hover:bg-slate-800 transition-colors h-[38px]"
                      >
                        Add
                      </button>
                    </div>

                    {shippingAddresses.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {shippingAddresses.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-white rounded-xl border border-slate-100 px-3 py-2.5 text-sm shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                              <span className="font-bold text-slate-800">{a.label}</span>
                              <span className="text-slate-500 truncate max-w-[200px]">
                                {a.address}
                              </span>
                              {a.isDefault && (
                                <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded font-black uppercase">
                                  Default
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddress(i)}
                              className="text-red-400 hover:text-red-600 transition-colors text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  resetForm()
                }}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="client-form"
                disabled={isSubmitting || !name}
                className="inline-flex items-center px-6 py-2.5 text-sm font-black bg-violet-600 shadow-lg shadow-violet-200 text-white rounded-xl hover:bg-violet-700 transition-all disabled:opacity-50 uppercase tracking-widest active:scale-95"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Onboard Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
