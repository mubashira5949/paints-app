import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea, Select,
    Modal, Table, Th, Td, Badge, useResource, fmtKg, fmtMoney, fmtDate,
} from '../components/ui'
import { Plus, Send, Truck, CheckSquare } from 'lucide-react'

interface Supplier { id: number; name: string }
interface Resource { id: number; name: string }
interface POListItem {
    id: number; supplier_id: number; supplier_name: string
    status: 'draft' | 'ordered' | 'shipped' | 'received' | 'cancelled'
    currency: string; notes: string | null
    total_cost: string | number; item_count: string | number
    ordered_at: string | null; shipped_at: string | null; received_at: string | null
    created_at: string
}
interface POItem {
    id: number; kind: 'resource' | 'finished_paint'
    resource_id: number | null; resource_name: string | null
    variant_id: number | null; paint_name: string | null
    classification: string | null; ink_series: string | null
    pack_size_kg: string | number | null
    quantity_kg: string | number | null
    quantity_packs: number | null
    landed_cost_per_kg: string | number
    received_quantity_kg: string | number
    received_packs: number | string
}
interface POFull extends POListItem { items: POItem[] }
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

const STATUS_COLOR: Record<POListItem['status'], 'slate' | 'blue' | 'amber' | 'green' | 'red'> = {
    draft: 'slate', ordered: 'blue', shipped: 'amber', received: 'green', cancelled: 'red',
}

export default function PurchaseOrders() {
    const [status, setStatus] = useState<string>('')
    const [createOpen, setCreateOpen] = useState(false)
    const [detailId, setDetailId] = useState<number | null>(null)
    const q = `?page_size=100${status ? `&status=${status}` : ''}`
    const { data, isLoading, error, reload } = useResource<PageOf<POListItem>>(`/purchase-orders${q}`)

    return (
        <Page
            title="Purchase Orders"
            description="Supplier-facing POs. On receipt, resource lines update weighted-avg cost (§3.7) and finished-paint lines drop into inventory."
            actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New PO</Button>}
        >
            <ErrorBanner error={error} />
            <div className="flex flex-wrap items-center gap-3">
                <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
                    <option value="">All statuses</option>
                    {['draft','ordered','shipped','received','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
            </div>

            {isLoading ? <Loading /> : !data || data.items.length === 0 ? <EmptyState message="No purchase orders yet." /> : (
                <Table>
                    <thead><tr><Th>PO #</Th><Th>Supplier</Th><Th>Status</Th><Th>Items</Th><Th>Total</Th><Th>Created</Th></tr></thead>
                    <tbody className="divide-y">
                        {data.items.map((po) => (
                            <tr key={po.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetailId(po.id)}>
                                <Td className="font-semibold text-blue-600">PO-{po.id}</Td>
                                <Td>{po.supplier_name}</Td>
                                <Td><Badge color={STATUS_COLOR[po.status]}>{po.status}</Badge></Td>
                                <Td>{po.item_count}</Td>
                                <Td>{fmtMoney(po.total_cost, po.currency)}</Td>
                                <Td className="text-xs text-slate-500">{fmtDate(po.created_at)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload() }} />}
            {detailId !== null && <DetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={reload} />}
        </Page>
    )
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [resources, setResources] = useState<Resource[]>([])
    const [supplierId, setSupplierId] = useState('')
    const [currency, setCurrency] = useState('INR')
    const [notes, setNotes] = useState('')
    const [rows, setRows] = useState<Array<{ kind: 'resource'; resource_id: string; quantity_kg: string; landed_cost_per_kg: string }>>([
        { kind: 'resource', resource_id: '', quantity_kg: '', landed_cost_per_kg: '' },
    ])
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            apiRequest<PageOf<Supplier>>('/suppliers?page_size=200'),
            apiRequest<PageOf<Resource>>('/resources?page_size=200'),
        ]).then(([s, r]) => { setSuppliers(s.items); setResources(r.items) })
            .catch((e) => setErr(e.message))
    }, [])

    function updateRow(i: number, patch: Partial<typeof rows[0]>) { setRows((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r))) }
    function addRow() { setRows((arr) => [...arr, { kind: 'resource', resource_id: '', quantity_kg: '', landed_cost_per_kg: '' }]) }
    function removeRow(i: number) { setRows((arr) => arr.filter((_, idx) => idx !== i)) }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!supplierId) { setErr('Supplier required'); return }
        const items = rows
            .filter((r) => r.resource_id && r.quantity_kg && r.landed_cost_per_kg)
            .map((r) => ({ kind: 'resource' as const, resource_id: Number(r.resource_id), quantity_kg: Number(r.quantity_kg), landed_cost_per_kg: Number(r.landed_cost_per_kg) }))
        if (items.length === 0) { setErr('At least one line required'); return }
        setBusy(true); setErr(null)
        try {
            await apiRequest('/purchase-orders', { method: 'POST', body: { supplier_id: Number(supplierId), currency, notes: notes || undefined, items } })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <Modal open onClose={onClose} title="New Purchase Order" size="lg"
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create draft</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Supplier *">
                        <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                            <option value="">— Select —</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </Field>
                    <Field label="Currency"><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></Field>
                </div>
                <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Resource lines</span>
                        <Button type="button" variant="ghost" onClick={addRow}><Plus size={14} /> Add</Button>
                    </div>
                    <div className="space-y-2">
                        {rows.map((row, i) => (
                            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                                <Select value={row.resource_id} onChange={(e) => updateRow(i, { resource_id: e.target.value })}>
                                    <option value="">— Resource —</option>
                                    {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </Select>
                                <Input type="number" step="0.001" placeholder="qty (kg)" value={row.quantity_kg} onChange={(e) => updateRow(i, { quantity_kg: e.target.value })} />
                                <Input type="number" step="0.0001" placeholder="cost / kg" value={row.landed_cost_per_kg} onChange={(e) => updateRow(i, { landed_cost_per_kg: e.target.value })} />
                                <Button type="button" variant="ghost" onClick={() => removeRow(i)} className="px-2">×</Button>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </Modal>
    )
}

function DetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
    const { data, isLoading, error, reload } = useResource<POFull>(`/purchase-orders/${id}`)
    const [busy, setBusy] = useState(false)

    async function transition(to: 'ordered' | 'shipped' | 'cancelled') {
        setBusy(true)
        try { await apiRequest(`/purchase-orders/${id}/transition`, { method: 'POST', body: { to } }); reload(); onChanged() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    async function receiveAll() {
        if (!data) return
        if (!confirm('Receive all remaining quantities now?')) return
        setBusy(true)
        try {
            await apiRequest(`/purchase-orders/${id}/receive`, { method: 'POST', body: { items: data.items.map((i) => ({ id: i.id })) } })
            reload(); onChanged()
        } catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }

    if (isLoading || !data) return <Modal open onClose={onClose} title="Purchase Order">{error ? <ErrorBanner error={error} /> : <Loading />}</Modal>

    return (
        <Modal open onClose={onClose} title={`PO-${data.id} · ${data.supplier_name}`} size="lg">
            <div className="space-y-4">
                <ErrorBanner error={error} />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Badge color={STATUS_COLOR[data.status]}>{data.status}</Badge>
                    <span className="text-slate-500">{data.currency}</span>
                    {data.notes && <span className="text-slate-700">— {data.notes}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {data.status === 'draft'   && <Button onClick={() => transition('ordered')}  loading={busy}><Send size={14} /> Mark ordered</Button>}
                    {data.status === 'ordered' && <Button onClick={() => transition('shipped')}  loading={busy}><Truck size={14} /> Mark shipped</Button>}
                    {(data.status === 'ordered' || data.status === 'shipped') && (
                        <Button onClick={receiveAll} loading={busy}><CheckSquare size={14} /> Receive all remaining</Button>
                    )}
                    {(data.status === 'draft' || data.status === 'ordered' || data.status === 'shipped') &&
                        <Button variant="danger" onClick={() => transition('cancelled')} loading={busy}>Cancel</Button>}
                </div>
                <Table>
                    <thead>
                        <tr><Th>Kind</Th><Th>Item</Th><Th>Quantity</Th><Th>Landed cost/kg</Th><Th>Received</Th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.items.map((i) => (
                            <tr key={i.id}>
                                <Td><Badge color={i.kind === 'resource' ? 'blue' : 'purple'}>{i.kind}</Badge></Td>
                                <Td>
                                    {i.resource_name ?? (i.paint_name ? `${i.paint_name} ${i.classification}/${i.ink_series}` : '—')}
                                </Td>
                                <Td>
                                    {i.kind === 'resource'
                                        ? fmtKg(i.quantity_kg)
                                        : `${i.quantity_packs} × ${fmtKg(i.pack_size_kg)}`}
                                </Td>
                                <Td>{fmtMoney(i.landed_cost_per_kg, data.currency)}</Td>
                                <Td>
                                    {i.kind === 'resource'
                                        ? `${fmtKg(i.received_quantity_kg)} / ${fmtKg(i.quantity_kg)}`
                                        : `${i.received_packs} / ${i.quantity_packs}`}
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Modal>
    )
}
