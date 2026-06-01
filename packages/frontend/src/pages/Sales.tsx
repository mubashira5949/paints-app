/**
 * Log a sale against an existing customer order.
 * URL: /sales/new?order_id=N (pre-selects the order) or pick from a list.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { Page, ErrorBanner, Loading, Button, Field, Input, Select, useResource, fmtMoney, num, Badge } from '../components/ui'

interface OrderListItem { id: number; customer_name: string; status: string; currency: string; item_count: string | number }
interface OrderDetail {
    id: number; customer_name: string; currency: string; status: string
    items: Array<{ id: number; variant_id: number; paint_name: string; classification: string; ink_series: string; pack_size_kg: string | number; quantity: number; negotiated_price_per_pack: string | number | null }>
}
interface PackRow { id: number; pack_size_kg: string; status: string; cost_per_kg: string }
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

export default function Sales() {
    const nav = useNavigate()
    const [search] = useSearchParams()
    const orderIdParam = search.get('order_id')
    const [orderId, setOrderId] = useState(orderIdParam ?? '')
    const ordersResource = useResource<PageOf<OrderListItem>>('/sales/orders?status=approved')

    return (
        <Page title="Log Sale" description="Record a sale against an approved order.">
            <ErrorBanner error={ordersResource.error} />
            <div className="max-w-2xl space-y-3">
                <Field label="Order to log sale for">
                    <Select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                        <option value="">— Select an approved order —</option>
                        {(ordersResource.data?.items ?? []).map((o) => (
                            <option key={o.id} value={o.id}>ORD-{o.id} · {o.customer_name} · {o.item_count} items</option>
                        ))}
                    </Select>
                </Field>
                {orderId && <SaleForm orderId={Number(orderId)} onDone={() => nav('/sales/history')} />}
            </div>
            <p className="text-xs text-slate-500">
                Don't see an order? <Link to="/sales/orders" className="text-blue-600 underline">Create or approve one first</Link>.
            </p>
        </Page>
    )
}

function SaleForm({ orderId, onDone }: { orderId: number; onDone: () => void }) {
    const order = useResource<OrderDetail>(`/sales/orders/${orderId}`, { deps: [orderId] })
    const [lines, setLines] = useState<Array<{ order_item_id: number; variant_id: number; pack_size_kg: string | number; quantity: number; price_per_pack: string; pack_ids: string }>>([])
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)
    const [availability, setAvailability] = useState<Record<number, PackRow[]>>({})

    useEffect(() => {
        if (!order.data) return
        setLines(order.data.items.map((it) => ({
            order_item_id: it.id, variant_id: it.variant_id,
            pack_size_kg: it.pack_size_kg, quantity: it.quantity,
            price_per_pack: String(num(it.negotiated_price_per_pack ?? 0)),
            pack_ids: '',
        })))
        // Pre-fetch available packs per variant
        for (const it of order.data.items) {
            apiRequest<PackRow[]>(`/inventory/finished/by-variant/${it.variant_id}`)
                .then((rows) => setAvailability((a) => ({ ...a, [it.variant_id]: rows.filter((r) => r.status === 'in_stock' || r.status === 'ready_for_shipment') })))
                .catch(() => {})
        }
    }, [order.data])

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!order.data) return
        setBusy(true); setErr(null)
        try {
            const items = lines.map((l) => ({
                order_item_id: l.order_item_id,
                variant_id: l.variant_id,
                pack_size_kg: num(l.pack_size_kg),
                quantity: l.quantity,
                price_per_pack: l.price_per_pack ? Number(l.price_per_pack) : undefined,
                pack_ids: l.pack_ids ? l.pack_ids.split(',').map((s) => Number(s.trim())).filter(Boolean) : undefined,
            }))
            const r = await apiRequest<{ id: number }>(`/sales/orders/${orderId}/sale`, { method: 'POST', body: { items } })
            alert(`Sale #${r.id} logged.`)
            onDone()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    if (order.isLoading || !order.data) return <Loading />

    return (
        <form onSubmit={submit} className="space-y-4 mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <ErrorBanner error={err} />
            <div className="text-sm">
                <span className="font-semibold">{order.data.customer_name}</span> · <Badge>{order.data.status}</Badge> · {order.data.currency}
            </div>
            {lines.map((l, i) => {
                const it = order.data!.items[i]
                const matchingPacks = (availability[l.variant_id] ?? []).filter((p) => num(p.pack_size_kg) === num(l.pack_size_kg))
                return (
                    <div key={l.order_item_id} className="border-t pt-3 space-y-2">
                        <div className="text-sm">
                            <strong>{it.paint_name}</strong>{' '}
                            <span className="text-slate-500">{it.classification} · {it.ink_series} · {num(it.pack_size_kg)} kg × {it.quantity}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Field label="Quantity"><Input type="number" min="1" value={l.quantity} onChange={(e) => setLines((arr) => arr.map((row, idx) => idx === i ? { ...row, quantity: Number(e.target.value) } : row))} /></Field>
                            <Field label="Price / pack"><Input type="number" step="0.01" value={l.price_per_pack} onChange={(e) => setLines((arr) => arr.map((row, idx) => idx === i ? { ...row, price_per_pack: e.target.value } : row))} /></Field>
                            <Field label={`Pack IDs (${matchingPacks.length} available)`} hint="Comma-separated, optional. Leave blank to skip pack assignment.">
                                <Input value={l.pack_ids} onChange={(e) => setLines((arr) => arr.map((row, idx) => idx === i ? { ...row, pack_ids: e.target.value } : row))} placeholder={matchingPacks.slice(0, 3).map((p) => p.id).join(', ')} />
                            </Field>
                        </div>
                    </div>
                )
            })}
            <div className="flex justify-end gap-2">
                <Link to="/sales/orders"><Button type="button" variant="secondary">Cancel</Button></Link>
                <Button type="submit" loading={busy}>Log sale</Button>
            </div>
        </form>
    )
}
