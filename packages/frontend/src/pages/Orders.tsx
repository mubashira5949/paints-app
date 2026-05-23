import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea, Select,
    Modal, Table, Th, Td, Badge, useResource, fmtMoney, fmtDate, num,
} from '../components/ui'
import { Plus, FileText, Check, X } from 'lucide-react'

type OrderStatus = 'draft' | 'pending_approval' | 'approved' | 'in_production' | 'ready_for_shipment' | 'shipped' | 'completed' | 'cancelled'
type PaymentTerms = 'prepaid' | 'cod' | 'net'

interface OrderListItem {
    id: number; customer_id: number; customer_name: string
    status: OrderStatus; currency: string
    payment_terms: PaymentTerms; payment_net_days: number | null
    order_date: string; scheduled_ship_date: string | null; due_date: string | null
    created_by: number; created_by_name: string
    item_count: number | string
}
interface OrderDetail extends OrderListItem {
    items: Array<{
        id: number; variant_id: number; paint_name: string; classification: string; ink_series: string
        pack_size_kg: string | number; quantity: number
        negotiated_price_per_pack: string | number | null
        cost_to_build_per_pack: string | number | null
    }>
    notes: string | null
    shipping_label: string | null; shipping_address: string | null
}
interface Customer { id: number; name: string; default_currency: string; shipping_addresses?: Array<{ id: number; label: string; address: string; is_default: boolean }> }
interface PaintBrief { id: number; name: string; variants: Array<{ id: number; classification: string; ink_series: string }> }
interface PackSize { pack_size_kg: string }
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

const STATUS_COLOR: Record<OrderStatus, 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'purple'> = {
    draft: 'slate', pending_approval: 'amber', approved: 'blue',
    in_production: 'blue', ready_for_shipment: 'purple', shipped: 'purple',
    completed: 'green', cancelled: 'red',
}

export default function Orders() {
    const nav = useNavigate()
    const [status, setStatus] = useState('')
    const [createOpen, setCreateOpen] = useState(false)
    const [detailId, setDetailId] = useState<number | null>(null)
    const q = `?page_size=100${status ? `&status=${status}` : ''}`
    const { data, isLoading, error, reload } = useResource<PageOf<OrderListItem>>(`/sales/orders${q}`)

    return (
        <Page
            title="Customer Orders"
            description="Customer-facing orders. Sales drafts → submits → Manager approves → Operator produces."
            actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Order</Button>}
        >
            <ErrorBanner error={error} />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
                <option value="">All statuses</option>
                {(Object.keys(STATUS_COLOR) as OrderStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            {isLoading ? <Loading /> : !data || data.items.length === 0 ? <EmptyState message="No orders yet." /> : (
                <Table>
                    <thead><tr><Th>Order</Th><Th>Customer</Th><Th>Status</Th><Th>Terms</Th><Th>Items</Th><Th>Created by</Th><Th>Date</Th></tr></thead>
                    <tbody className="divide-y">
                        {data.items.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetailId(o.id)}>
                                <Td className="font-semibold text-blue-600">ORD-{o.id}</Td>
                                <Td>{o.customer_name}</Td>
                                <Td><Badge color={STATUS_COLOR[o.status]}>{o.status}</Badge></Td>
                                <Td>
                                    <Badge color="slate">{o.payment_terms}</Badge>
                                    {o.payment_terms === 'net' && <span className="ml-1 text-xs text-slate-500">+{o.payment_net_days}d</span>}
                                </Td>
                                <Td>{o.item_count}</Td>
                                <Td className="text-xs">{o.created_by_name}</Td>
                                <Td className="text-xs text-slate-500">{fmtDate(o.order_date)}</Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            {createOpen && <CreateOrderModal onClose={() => setCreateOpen(false)} onSaved={(id) => { setCreateOpen(false); reload(); setDetailId(id) }} />}
            {detailId !== null && <OrderDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={reload} onSale={() => nav('/sales/new?order_id=' + detailId)} />}
        </Page>
    )
}

function CreateOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: number) => void }) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [paints, setPaints] = useState<PaintBrief[]>([])
    const [packSizes, setPackSizes] = useState<PackSize[]>([])
    const [customerId, setCustomerId] = useState('')
    const [shippingAddressId, setShippingAddressId] = useState('')
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('prepaid')
    const [netDays, setNetDays] = useState('15')
    const [shipDate, setShipDate] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<Array<{ paint_id: string; variant_id: string; pack_size_kg: string; quantity: string; negotiated_price_per_pack: string }>>([
        { paint_id: '', variant_id: '', pack_size_kg: '', quantity: '1', negotiated_price_per_pack: '' },
    ])
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            apiRequest<PageOf<Customer>>('/customers?page_size=200'),
            apiRequest<PageOf<PaintBrief>>('/paints?page_size=200'),
            apiRequest<PackSize[]>('/settings/pack-sizes'),
        ]).then(([c, p, s]) => { setCustomers(c.items); setPaints(p.items); setPackSizes(s) }).catch((e) => setErr(e.message))
    }, [])

    const selectedCustomer = customers.find((c) => String(c.id) === customerId)
    const shippingAddresses = selectedCustomer?.shipping_addresses ?? []

    function updateItem(i: number, patch: Partial<typeof items[0]>) { setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it)) }
    function addItem() { setItems((arr) => [...arr, { paint_id: '', variant_id: '', pack_size_kg: '', quantity: '1', negotiated_price_per_pack: '' }]) }
    function removeItem(i: number) { setItems((arr) => arr.filter((_, idx) => idx !== i)) }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!customerId) { setErr('Customer required'); return }
        const cleaned = items
            .filter((i) => i.variant_id && i.pack_size_kg && i.quantity && i.negotiated_price_per_pack)
            .map((i) => ({
                variant_id: Number(i.variant_id),
                pack_size_kg: Number(i.pack_size_kg),
                quantity: Number(i.quantity),
                negotiated_price_per_pack: Number(i.negotiated_price_per_pack),
            }))
        if (cleaned.length === 0) { setErr('Add at least one line item'); return }
        setBusy(true); setErr(null)
        try {
            const body: any = {
                customer_id: Number(customerId), items: cleaned,
                payment_terms: paymentTerms,
                shipping_address_id: shippingAddressId ? Number(shippingAddressId) : undefined,
                scheduled_ship_date: shipDate || undefined,
                notes: notes || undefined,
            }
            if (paymentTerms === 'net') body.payment_net_days = Number(netDays)
            const r = await apiRequest<{ id: number }>('/sales/orders', { method: 'POST', body })
            onSaved(r.id)
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <Modal open onClose={onClose} title="New Customer Order" size="xl"
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create draft</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Customer *">
                        <Select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setShippingAddressId('') }} required>
                            <option value="">— Select —</option>
                            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </Field>
                    <Field label="Shipping address">
                        <Select value={shippingAddressId} onChange={(e) => setShippingAddressId(e.target.value)} disabled={!customerId}>
                            <option value="">— Default / pickup —</option>
                            {shippingAddresses.map((a) => <option key={a.id} value={a.id}>{a.label}{a.is_default ? ' (default)' : ''}</option>)}
                        </Select>
                    </Field>
                    <Field label="Payment terms">
                        <Select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}>
                            <option value="prepaid">Prepaid</option>
                            <option value="cod">Pay on delivery</option>
                            <option value="net">Net (X days)</option>
                        </Select>
                    </Field>
                    {paymentTerms === 'net' && <Field label="Net days"><Input type="number" min="0" value={netDays} onChange={(e) => setNetDays(e.target.value)} /></Field>}
                    {paymentTerms === 'cod' && <Field label="Scheduled ship date"><Input type="date" value={shipDate} onChange={(e) => setShipDate(e.target.value)} /></Field>}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-600">Line items</span>
                        <Button type="button" variant="ghost" onClick={addItem}><Plus size={14} /> Add line</Button>
                    </div>
                    <div className="space-y-2">
                        {items.map((it, i) => (
                            <LineRow key={i} item={it} paints={paints} packSizes={packSizes} onChange={(patch) => updateItem(i, patch)} onRemove={() => removeItem(i)} />
                        ))}
                    </div>
                </div>

                <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </form>
        </Modal>
    )
}

function LineRow({
    item, paints, packSizes, onChange, onRemove,
}: {
    item: { paint_id: string; variant_id: string; pack_size_kg: string; quantity: string; negotiated_price_per_pack: string }
    paints: PaintBrief[]; packSizes: PackSize[]
    onChange: (patch: Partial<typeof item>) => void
    onRemove: () => void
}) {
    const paint = paints.find((p) => String(p.id) === item.paint_id)
    const variants = paint?.variants ?? []
    return (
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_0.7fr_1fr_auto] gap-2 items-end">
            <Field label="Paint">
                <Select value={item.paint_id} onChange={(e) => onChange({ paint_id: e.target.value, variant_id: '' })}>
                    <option value="">—</option>
                    {paints.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
            </Field>
            <Field label="Variant (cls × ink)">
                <Select value={item.variant_id} onChange={(e) => onChange({ variant_id: e.target.value })} disabled={!item.paint_id}>
                    <option value="">—</option>
                    {variants.map((v) => <option key={v.id} value={v.id}>{v.classification} · {v.ink_series}</option>)}
                </Select>
            </Field>
            <Field label="Pack size">
                <Select value={item.pack_size_kg} onChange={(e) => onChange({ pack_size_kg: e.target.value })}>
                    <option value="">—</option>
                    {packSizes.map((s) => <option key={s.pack_size_kg} value={s.pack_size_kg}>{num(s.pack_size_kg)} kg</option>)}
                </Select>
            </Field>
            <Field label="Qty"><Input type="number" min="1" value={item.quantity} onChange={(e) => onChange({ quantity: e.target.value })} /></Field>
            <Field label="Price / pack"><Input type="number" step="0.01" min="0" value={item.negotiated_price_per_pack} onChange={(e) => onChange({ negotiated_price_per_pack: e.target.value })} /></Field>
            <button type="button" onClick={onRemove} className="self-end mb-1 text-slate-400 hover:text-red-600 p-2"><X size={16} /></button>
        </div>
    )
}

function OrderDetailModal({ id, onClose, onChanged, onSale }: { id: number; onClose: () => void; onChanged: () => void; onSale: () => void }) {
    const { data, isLoading, error, reload } = useResource<OrderDetail>(`/sales/orders/${id}`)
    const [busy, setBusy] = useState(false)

    async function action(path: string, method: 'POST' = 'POST') {
        setBusy(true)
        try { await apiRequest(`/sales/orders/${id}/${path}`, { method, body: {} }); reload(); onChanged() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    async function genConfirmation() {
        try {
            const r = await apiRequest<any>(`/sales/orders/${id}/confirmation`, { method: 'POST', body: {} })
            alert(`Confirmation v${r.confirmation.version} generated. Total: ${r.payload.total}`)
        } catch (e: any) { alert(e.message) }
    }

    if (isLoading || !data) return <Modal open onClose={onClose} title="Order">{error ? <ErrorBanner error={error} /> : <Loading />}</Modal>

    const billed = data.items.reduce((s, it) => s + num(it.quantity) * num(it.negotiated_price_per_pack ?? 0), 0)

    return (
        <Modal open onClose={onClose} title={`ORD-${data.id} · ${data.customer_name}`} size="xl">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Badge color={STATUS_COLOR[data.status]}>{data.status}</Badge>
                    <Badge color="slate">{data.payment_terms}</Badge>
                    <span className="text-slate-500">Due: {fmtDate(data.due_date)}</span>
                    <span className="text-slate-500">Currency: {data.currency}</span>
                </div>
                {data.shipping_address && (
                    <div className="rounded border bg-slate-50 p-3 text-sm">
                        <div className="text-xs font-medium text-slate-500">{data.shipping_label}</div>
                        <div className="whitespace-pre-line">{data.shipping_address}</div>
                    </div>
                )}
                <Table>
                    <thead><tr><Th>Variant</Th><Th>Pack</Th><Th>Qty</Th><Th>Price</Th><Th>Line total</Th><Th>Cost-to-build</Th></tr></thead>
                    <tbody className="divide-y">
                        {data.items.map((it) => (
                            <tr key={it.id}>
                                <Td>
                                    <div className="font-medium">{it.paint_name}</div>
                                    <div className="text-xs text-slate-500">{it.classification} · {it.ink_series}</div>
                                </Td>
                                <Td>{num(it.pack_size_kg)} kg</Td>
                                <Td>{it.quantity}</Td>
                                <Td>{it.negotiated_price_per_pack != null ? fmtMoney(it.negotiated_price_per_pack, data.currency) : <span className="text-slate-400">restricted</span>}</Td>
                                <Td>
                                    {it.negotiated_price_per_pack != null
                                        ? fmtMoney(num(it.quantity) * num(it.negotiated_price_per_pack), data.currency)
                                        : '—'}
                                </Td>
                                <Td className="text-slate-500">{it.cost_to_build_per_pack != null ? fmtMoney(it.cost_to_build_per_pack, data.currency) : '—'}</Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                <div className="text-right text-sm font-semibold">Billed total: {fmtMoney(billed, data.currency)}</div>

                <div className="flex flex-wrap gap-2">
                    {data.status === 'draft' && <Button onClick={() => action('submit')} loading={busy}>Submit for approval</Button>}
                    {data.status === 'pending_approval' && <Button onClick={() => action('approve')} loading={busy}><Check size={14} /> Approve</Button>}
                    {(data.status === 'approved' || data.status === 'in_production' || data.status === 'ready_for_shipment' || data.status === 'shipped') &&
                        <Button onClick={onSale}>Log Sale →</Button>}
                    {data.status !== 'cancelled' && data.status !== 'completed' && data.status !== 'shipped' &&
                        <Button variant="danger" onClick={() => { if (confirm('Cancel order?')) action('cancel') }} loading={busy}>Cancel</Button>}
                    <Button variant="secondary" onClick={genConfirmation}><FileText size={14} /> Generate Confirmation</Button>
                </div>
            </div>
        </Modal>
    )
}
