import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Select, Modal, Field, Input, Textarea,
    Table, Th, Td, Badge, useResource, fmtKg, fmtDateTime, num,
} from '../components/ui'
import { Plus, Play, Factory } from 'lucide-react'

interface ProductionRequest {
    id: number; variant_id: number; pack_size_kg: string | number; quantity_packs: number
    origin: 'customer_order' | 'demand_suggestion'; status: string
    paint_name: string; classification: string; ink_series: string; created_at: string
}
interface ProductionRun {
    id: number; batch_number: string; status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
    expected_output_kg: string | number; actual_output_kg: string | number | null
    wastage_pct: string | number | null; wastage_flagged: boolean
    dilution_total_kg: string | number; dilution_flagged: boolean
    operator: string; paint_name: string; classification: string; ink_series: string
    created_at: string; completed_at: string | null
}
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

const RUN_STATUS_COLOR: Record<ProductionRun['status'], 'slate' | 'blue' | 'green' | 'red'> = {
    planned: 'slate', in_progress: 'blue', completed: 'green', cancelled: 'red',
}

export default function Production() {
    const [statusFilter, setStatusFilter] = useState('')
    const requests = useResource<ProductionRequest[]>('/production/requests?status=pending')
    const runsQ = `?page_size=100${statusFilter ? `&status=${statusFilter}` : ''}`
    const runs = useResource<PageOf<ProductionRun>>(`/production/runs${runsQ}`)

    return (
        <Page
            title="Production"
            description="Operator queue and run history. Picking a request opens a new run pre-filled with the variant's default formula."
            actions={<Link to="/production/new"><Button><Plus size={16} /> New Run</Button></Link>}
        >
            <ErrorBanner error={requests.error || runs.error} />

            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Pending Requests</h2>
                {requests.isLoading ? <Loading /> : !requests.data || requests.data.length === 0 ? (
                    <EmptyState message="No pending production requests." />
                ) : (
                    <Table>
                        <thead><tr><Th>Variant</Th><Th>Pack × Qty</Th><Th>Origin</Th><Th>Created</Th><Th></Th></tr></thead>
                        <tbody className="divide-y">
                            {requests.data.map((r) => (
                                <tr key={r.id}>
                                    <Td>
                                        <div className="font-semibold">{r.paint_name}</div>
                                        <div className="text-xs text-slate-500">{r.classification} · {r.ink_series}</div>
                                    </Td>
                                    <Td>{fmtKg(r.pack_size_kg)} × {r.quantity_packs}</Td>
                                    <Td><Badge color={r.origin === 'customer_order' ? 'blue' : 'amber'}>{r.origin.replace('_', ' ')}</Badge></Td>
                                    <Td className="text-xs text-slate-500">{fmtDateTime(r.created_at)}</Td>
                                    <Td>
                                        <Link to={`/production/new?request_id=${r.id}&variant_id=${r.variant_id}&qty=${num(r.pack_size_kg) * r.quantity_packs}`}>
                                            <Button variant="ghost"><Play size={14} /> Start run</Button>
                                        </Link>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>

            <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Runs</h2>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
                        <option value="">All statuses</option>
                        {['planned', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
                {runs.isLoading ? <Loading /> : !runs.data || runs.data.items.length === 0 ? (
                    <EmptyState message="No production runs yet." />
                ) : (
                    <Table>
                        <thead>
                            <tr><Th>Batch</Th><Th>Variant</Th><Th>Status</Th><Th>Expected</Th><Th>Actual</Th><Th>Wastage</Th><Th>Operator</Th><Th></Th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {runs.data.items.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                    <Td><Link to={`/production/${r.id}`} className="font-semibold text-blue-600">{r.batch_number}</Link></Td>
                                    <Td>
                                        <div className="font-medium">{r.paint_name}</div>
                                        <div className="text-xs text-slate-500">{r.classification} · {r.ink_series}</div>
                                    </Td>
                                    <Td><Badge color={RUN_STATUS_COLOR[r.status]}>{r.status}</Badge></Td>
                                    <Td>{fmtKg(r.expected_output_kg)}</Td>
                                    <Td>{r.actual_output_kg != null ? fmtKg(r.actual_output_kg) : '—'}</Td>
                                    <Td>
                                        {r.wastage_pct != null ? (
                                            <span className={r.wastage_flagged ? 'font-semibold text-red-600' : ''}>
                                                {num(r.wastage_pct).toFixed(2)}%
                                            </span>
                                        ) : '—'}
                                    </Td>
                                    <Td className="text-xs">{r.operator}</Td>
                                    <Td>
                                        {r.status === 'completed' && (
                                            <Link to={`/production/${r.id}/packaging`}>
                                                <Button variant="ghost"><Factory size={14} /> Pack</Button>
                                            </Link>
                                        )}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>
        </Page>
    )
}
