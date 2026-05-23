/**
 * Customers page (mounted at /clients for nav continuity).
 * Backed by /customers per spec §2.1.
 */

import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea,
    Modal, Table, Th, Td, Badge, useResource, fmtDate,
} from '../components/ui'
import { Plus, Archive, RotateCcw, MapPin } from 'lucide-react'

interface Customer {
    id: number
    name: string
    contact_name: string | null
    contact_phone: string | null
    contact_email: string | null
    gst_number: string | null
    default_currency: string
    archived_at: string | null
    created_at: string
}
interface CustomerDetail extends Customer {
    billing_address: string | null
    notes: string | null
    updated_at: string
    shipping_addresses: Array<{ id: number; label: string; address: string; is_default: boolean }>
}
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

export default function Clients() {
    const [search, setSearch] = useState('')
    const [includeArchived, setIncludeArchived] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [openDetail, setOpenDetail] = useState<number | null>(null)
    const q = `?page_size=100${search ? `&search=${encodeURIComponent(search)}` : ''}${includeArchived ? '&include_archived=true' : ''}`
    const { data, isLoading, error, reload } = useResource<PageOf<Customer>>(`/customers${q}`)

    return (
        <Page
            title="Customers"
            description="Buyers of finished paint. Each customer can have multiple shipping addresses."
            actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Customer</Button>}
        >
            <ErrorBanner error={error} />
            <div className="flex flex-wrap items-center gap-3">
                <Input placeholder="Search name / email / GST…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                    Show archived
                </label>
            </div>

            {isLoading ? <Loading /> : !data || data.items.length === 0 ? (
                <EmptyState message="No customers yet." />
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th><Th>Contact</Th><Th>GST</Th><Th>Currency</Th><Th>Status</Th><Th>Created</Th><Th></Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.items.map((c) => (
                            <CustomerRow key={c.id} customer={c} onOpen={() => setOpenDetail(c.id)} reload={reload} />
                        ))}
                    </tbody>
                </Table>
            )}

            {createOpen && <CreateCustomerModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload() }} />}
            {openDetail !== null && <DetailModal id={openDetail} onClose={() => setOpenDetail(null)} onChanged={reload} />}
        </Page>
    )
}

function CustomerRow({ customer, onOpen, reload }: { customer: Customer; onOpen: () => void; reload: () => void }) {
    const [busy, setBusy] = useState(false)
    async function toggle() {
        setBusy(true)
        try { await apiRequest(`/customers/${customer.id}/${customer.archived_at ? 'restore' : 'archive'}`, { method: 'POST', body: {} }); reload() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    return (
        <tr className="hover:bg-slate-50">
            <Td>
                <button onClick={onOpen} className="font-semibold text-blue-600 hover:underline">{customer.name}</button>
                {customer.contact_name && <div className="text-xs text-slate-500">{customer.contact_name}</div>}
            </Td>
            <Td className="text-xs">
                {customer.contact_email && <div>{customer.contact_email}</div>}
                {customer.contact_phone && <div>{customer.contact_phone}</div>}
            </Td>
            <Td className="text-xs font-mono">{customer.gst_number ?? '—'}</Td>
            <Td><Badge color="blue">{customer.default_currency}</Badge></Td>
            <Td>{customer.archived_at ? <Badge color="slate">Archived</Badge> : <Badge color="green">Active</Badge>}</Td>
            <Td className="text-xs text-slate-500">{fmtDate(customer.created_at)}</Td>
            <Td>
                <Button variant="ghost" loading={busy} onClick={toggle}>
                    {customer.archived_at ? <><RotateCcw size={14} /> Restore</> : <><Archive size={14} /> Archive</>}
                </Button>
            </Td>
        </tr>
    )
}

function CreateCustomerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({
        name: '', contact_name: '', contact_phone: '', contact_email: '',
        billing_address: '', gst_number: '', default_currency: 'INR', notes: '',
    })
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!f.name.trim()) { setErr('Name is required'); return }
        setBusy(true); setErr(null)
        try {
            const body: any = { name: f.name }
            for (const k of ['contact_name','contact_phone','contact_email','billing_address','gst_number','notes'] as const)
                if (f[k]) body[k] = f[k]
            if (f.default_currency) body.default_currency = f.default_currency.toUpperCase()
            await apiRequest('/customers', { method: 'POST', body })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title="New Customer" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
                    <Field label="Contact name"><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></Field>
                    <Field label="Email"><Input type="email" value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
                    <Field label="Phone"><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></Field>
                    <Field label="GST number"><Input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} /></Field>
                    <Field label="Default currency"><Input value={f.default_currency} onChange={(e) => setF({ ...f, default_currency: e.target.value })} maxLength={3} /></Field>
                </div>
                <Field label="Billing address"><Textarea rows={2} value={f.billing_address} onChange={(e) => setF({ ...f, billing_address: e.target.value })} /></Field>
                <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            </form>
        </Modal>
    )
}

function DetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
    const { data, isLoading, error, reload } = useResource<CustomerDetail>(`/customers/${id}`)
    const [adding, setAdding] = useState(false)
    const [newAddr, setNewAddr] = useState({ label: '', address: '', is_default: false })
    const [busy, setBusy] = useState(false)

    async function addAddress(e: React.FormEvent) {
        e.preventDefault()
        if (!newAddr.label || !newAddr.address) return
        setBusy(true)
        try {
            await apiRequest(`/customers/${id}/shipping-addresses`, { method: 'POST', body: newAddr })
            setNewAddr({ label: '', address: '', is_default: false })
            setAdding(false)
            reload(); onChanged()
        } catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    async function removeAddr(addrId: number) {
        if (!confirm('Remove this address?')) return
        try { await apiRequest(`/customers/shipping-addresses/${addrId}`, { method: 'DELETE' }); reload(); onChanged() }
        catch (e: any) { alert(e.message) }
    }

    return (
        <Modal open onClose={onClose} title={data ? data.name : 'Customer'} size="lg">
            <ErrorBanner error={error} />
            {isLoading || !data ? <Loading /> : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <KV k="Contact"  v={data.contact_name ?? '—'} />
                        <KV k="Email"    v={data.contact_email ?? '—'} />
                        <KV k="Phone"    v={data.contact_phone ?? '—'} />
                        <KV k="GST"      v={data.gst_number ?? '—'} />
                        <KV k="Currency" v={data.default_currency} />
                        <KV k="Created"  v={fmtDate(data.created_at)} />
                    </div>
                    {data.billing_address && (
                        <div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Billing address</div>
                            <div className="rounded border bg-slate-50 p-3 text-sm whitespace-pre-line">{data.billing_address}</div>
                        </div>
                    )}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Shipping addresses</div>
                            <Button variant="ghost" onClick={() => setAdding((x) => !x)}><Plus size={14} /> Add</Button>
                        </div>
                        {data.shipping_addresses.length === 0 ? (
                            <EmptyState message="No shipping addresses yet." />
                        ) : (
                            <ul className="space-y-2">
                                {data.shipping_addresses.map((a) => (
                                    <li key={a.id} className="rounded border bg-white p-3 flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-semibold text-sm">
                                                {a.label} {a.is_default && <Badge color="blue">Default</Badge>}
                                            </div>
                                            <div className="text-xs text-slate-600 whitespace-pre-line">{a.address}</div>
                                        </div>
                                        <Button variant="ghost" onClick={() => removeAddr(a.id)}>Remove</Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {adding && (
                            <form onSubmit={addAddress} className="mt-3 space-y-2 rounded border bg-slate-50 p-3">
                                <Field label="Label"><Input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="HQ / Warehouse" /></Field>
                                <Field label="Address"><Textarea rows={2} value={newAddr.address} onChange={(e) => setNewAddr({ ...newAddr, address: e.target.value })} /></Field>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={newAddr.is_default} onChange={(e) => setNewAddr({ ...newAddr, is_default: e.target.checked })} />
                                    Make default
                                </label>
                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" type="button" onClick={() => setAdding(false)}>Cancel</Button>
                                    <Button type="submit" loading={busy}><MapPin size={14} /> Add</Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    )
}

function KV({ k, v }: { k: string; v: string }) {
    return (
        <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{k}</div>
            <div className="text-sm font-medium">{v}</div>
        </div>
    )
}
