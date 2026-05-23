import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Select,
    Modal, Table, Th, Td, Badge, useResource, fmtMoney, fmtDate, num,
} from '../components/ui'
import { Plus, Receipt } from 'lucide-react'

interface SaleListItem {
    id: number; order_id: number; customer_id: number; customer_name: string
    currency: string; sale_date: string; due_date: string | null; created_by: number
    billed: string | number | null; collected: string | number | null
    payment_status: 'unpaid' | 'partial' | 'paid' | 'overpaid' | null
}
interface SaleDetail extends SaleListItem {
    items: Array<{ id: number; paint_name: string; classification: string; ink_series: string; pack_size_kg: string | number; quantity: number; price_per_pack: string | number | null }>
    payments: Array<{ id: number; amount: string | number; currency: string; date_received: string; method: string; reference_number: string | null }>
    notes: string | null
}

const STATUS_COLOR: Record<NonNullable<SaleListItem['payment_status']>, 'slate' | 'green' | 'amber' | 'red'> = {
    unpaid: 'slate', partial: 'amber', paid: 'green', overpaid: 'red',
}

export default function SalesHistory() {
    const { data, isLoading, error, reload } = useResource<SaleListItem[]>(`/sales/transactions`)
    const [detail, setDetail] = useState<number | null>(null)

    return (
        <Page title="Sales History" description="All sales you can see. Sales reps only see their own financials (§3.4).">
            <ErrorBanner error={error} />
            {isLoading ? <Loading /> : !data || data.length === 0 ? <EmptyState message="No sales yet." /> : (
                <Table>
                    <thead><tr><Th>Sale</Th><Th>Order</Th><Th>Customer</Th><Th>Sale date</Th><Th>Billed</Th><Th>Collected</Th><Th>Status</Th></tr></thead>
                    <tbody className="divide-y">
                        {data.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(s.id)}>
                                <Td className="font-semibold text-blue-600">SAL-{s.id}</Td>
                                <Td>ORD-{s.order_id}</Td>
                                <Td>{s.customer_name}</Td>
                                <Td className="text-xs text-slate-500">{fmtDate(s.sale_date)}</Td>
                                <Td>{s.billed != null ? fmtMoney(s.billed, s.currency) : <span className="text-slate-400">restricted</span>}</Td>
                                <Td>{s.collected != null ? fmtMoney(s.collected, s.currency) : <span className="text-slate-400">restricted</span>}</Td>
                                <Td>{s.payment_status ? <Badge color={STATUS_COLOR[s.payment_status]}>{s.payment_status}</Badge> : '—'}</Td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
            {detail !== null && <SaleDetailModal id={detail} onClose={() => setDetail(null)} onChanged={reload} />}
        </Page>
    )
}

function SaleDetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
    const { data, isLoading, error, reload } = useResource<SaleDetail>(`/sales/transactions/${id}`, { deps: [id] })
    const [payOpen, setPayOpen] = useState(false)

    if (isLoading || !data) return <Modal open onClose={onClose} title="Sale">{error ? <ErrorBanner error={error} /> : <Loading />}</Modal>

    const billed = num(data.billed); const collected = num(data.collected)

    return (
        <Modal open onClose={onClose} title={`SAL-${data.id} · ${data.customer_name}`} size="lg">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    {data.payment_status && <Badge color={STATUS_COLOR[data.payment_status]}>{data.payment_status}</Badge>}
                    <span className="text-slate-500">Billed: {fmtMoney(billed, data.currency)}</span>
                    <span className="text-slate-500">Collected: {fmtMoney(collected, data.currency)}</span>
                    {data.due_date && <span className="text-slate-500">Due: {fmtDate(data.due_date)}</span>}
                </div>
                <section>
                    <div className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Items</div>
                    <Table>
                        <thead><tr><Th>Variant</Th><Th>Pack × Qty</Th><Th>Price</Th></tr></thead>
                        <tbody className="divide-y">
                            {data.items.map((it) => (
                                <tr key={it.id}>
                                    <Td>{it.paint_name} <span className="text-xs text-slate-500">({it.classification} · {it.ink_series})</span></Td>
                                    <Td>{num(it.pack_size_kg)} kg × {it.quantity}</Td>
                                    <Td>{it.price_per_pack != null ? fmtMoney(it.price_per_pack, data.currency) : '—'}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </section>
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Payments ({data.payments.length})</div>
                        <Button variant="ghost" onClick={() => setPayOpen(true)}><Plus size={14} /> Record payment</Button>
                    </div>
                    {data.payments.length === 0 ? <EmptyState message="No payments yet." /> : (
                        <Table>
                            <thead><tr><Th>Date</Th><Th>Amount</Th><Th>Method</Th><Th>Reference</Th></tr></thead>
                            <tbody className="divide-y">
                                {data.payments.map((p) => (
                                    <tr key={p.id}>
                                        <Td>{fmtDate(p.date_received)}</Td>
                                        <Td>{fmtMoney(p.amount, p.currency)}</Td>
                                        <Td><Badge>{p.method}</Badge></Td>
                                        <Td className="text-xs text-slate-500">{p.reference_number ?? '—'}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </section>
                {payOpen && <PaymentModal saleId={data.id} currency={data.currency} onClose={() => setPayOpen(false)} onSaved={() => { setPayOpen(false); reload(); onChanged() }} />}
            </div>
        </Modal>
    )
}

function PaymentModal({ saleId, currency, onClose, onSaved }: { saleId: number; currency: string; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ amount: '', date_received: new Date().toISOString().slice(0, 10), method: 'upi', reference_number: '', notes: '' })
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)
    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!f.amount || !f.date_received) { setErr('Amount and date required'); return }
        setBusy(true); setErr(null)
        try {
            const body: any = {
                amount: Number(f.amount), currency, date_received: f.date_received, method: f.method,
                reference_number: f.reference_number || undefined,
                notes: f.notes || undefined,
            }
            await apiRequest(`/sales/transactions/${saleId}/payments`, { method: 'POST', body })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title="Record payment"
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}><Receipt size={14} /> Save</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label={`Amount (${currency})`}><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
                    <Field label="Date received"><Input type="date" value={f.date_received} onChange={(e) => setF({ ...f, date_received: e.target.value })} required /></Field>
                    <Field label="Method">
                        <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
                            {['cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other'].map((m) => <option key={m} value={m}>{m}</option>)}
                        </Select>
                    </Field>
                    <Field label="Reference #"><Input value={f.reference_number} onChange={(e) => setF({ ...f, reference_number: e.target.value })} /></Field>
                </div>
                <Field label="Notes"><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            </form>
        </Modal>
    )
}
