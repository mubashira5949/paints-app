import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea,
    Modal, Table, Th, Td, Badge, useResource, fmtDate,
} from '../components/ui'
import { Plus, Archive, RotateCcw } from 'lucide-react'

interface Supplier {
    id: number; name: string
    contact_name: string | null; email: string | null; phone: string | null
    gst_number: string | null; archived_at: string | null; created_at: string
}
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

export default function Suppliers() {
    const [search, setSearch] = useState('')
    const [includeArchived, setIncludeArchived] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const q = `?page_size=100${search ? `&search=${encodeURIComponent(search)}` : ''}${includeArchived ? '&include_archived=true' : ''}`
    const { data, isLoading, error, reload } = useResource<PageOf<Supplier>>(`/suppliers${q}`)

    return (
        <Page
            title="Suppliers"
            description="Vendors that provide raw materials and supplier-supplied finished paint."
            actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Supplier</Button>}
        >
            <ErrorBanner error={error} />
            <div className="flex flex-wrap items-center gap-3">
                <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                    Show archived
                </label>
            </div>
            {isLoading ? <Loading /> : !data || data.items.length === 0 ? <EmptyState message="No suppliers yet." /> : (
                <Table>
                    <thead><tr><Th>Name</Th><Th>Contact</Th><Th>GST</Th><Th>Status</Th><Th>Created</Th><Th></Th></tr></thead>
                    <tbody className="divide-y">
                        {data.items.map((s) => <SupplierRow key={s.id} s={s} reload={reload} />)}
                    </tbody>
                </Table>
            )}
            {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload() }} />}
        </Page>
    )
}

function SupplierRow({ s, reload }: { s: Supplier; reload: () => void }) {
    const [busy, setBusy] = useState(false)
    async function toggle() {
        setBusy(true)
        try { await apiRequest(`/suppliers/${s.id}/${s.archived_at ? 'restore' : 'archive'}`, { method: 'POST', body: {} }); reload() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    return (
        <tr className="hover:bg-slate-50">
            <Td className="font-semibold">{s.name}{s.contact_name && <div className="text-xs text-slate-500 font-normal">{s.contact_name}</div>}</Td>
            <Td className="text-xs">{s.email && <div>{s.email}</div>}{s.phone && <div>{s.phone}</div>}</Td>
            <Td className="text-xs font-mono">{s.gst_number ?? '—'}</Td>
            <Td>{s.archived_at ? <Badge color="slate">Archived</Badge> : <Badge color="green">Active</Badge>}</Td>
            <Td className="text-xs text-slate-500">{fmtDate(s.created_at)}</Td>
            <Td>
                <Button variant="ghost" loading={busy} onClick={toggle}>
                    {s.archived_at ? <><RotateCcw size={14} /> Restore</> : <><Archive size={14} /> Archive</>}
                </Button>
            </Td>
        </tr>
    )
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ name: '', contact_name: '', email: '', phone: '', address: '', website: '', gst_number: '', notes: '' })
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!f.name) { setErr('Name is required'); return }
        setBusy(true); setErr(null)
        try {
            const body: any = { name: f.name }
            for (const k of ['contact_name','email','phone','address','website','gst_number','notes'] as const)
                if (f[k]) body[k] = f[k]
            await apiRequest('/suppliers', { method: 'POST', body })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title="New Supplier" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
                    <Field label="Contact name"><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></Field>
                    <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
                    <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
                    <Field label="Website"><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></Field>
                    <Field label="GST number"><Input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} /></Field>
                </div>
                <Field label="Address"><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
                <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            </form>
        </Modal>
    )
}
