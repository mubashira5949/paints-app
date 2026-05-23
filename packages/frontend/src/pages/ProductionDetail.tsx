import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, Button, Field, Input, Textarea, Select,
    Table, Th, Td, Badge, useResource, fmtKg, fmtDateTime, num,
} from '../components/ui'
import { Play, Droplets, Package, X } from 'lucide-react'

interface RunDetail {
    id: number; batch_number: string; status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
    expected_output_kg: string | number; actual_output_kg: string | number | null
    wastage_pct: string | number | null; wastage_flagged: boolean
    dilution_total_kg: string | number; dilution_flagged: boolean
    started_at: string | null; completed_at: string | null; created_at: string
    paint_name: string; classification: string; ink_series: string
    formula_id: number; formula_name: string; standard_output_kg: string
    notes: string | null; operator: string
    actuals: Array<{ resource_id: number; resource_name: string; expected_kg: string; actual_kg: string; variance_pct: string | null; flagged: boolean }>
    dilution: Array<{ id: number; resource_id: number; resource_name: string; kg_added: string; notes: string | null; created_at: string }>
    packs: Array<{ id: number; pack_size_kg: string; status: string; cost_per_kg: string }>
}
interface FormulaIng { resource_id: number; resource_name: string; quantity_kg: string }
interface FormulaDetail { id: number; ingredients: FormulaIng[] }

const STATUS_COLOR: Record<RunDetail['status'], 'slate' | 'blue' | 'green' | 'red'> = {
    planned: 'slate', in_progress: 'blue', completed: 'green', cancelled: 'red',
}

export default function ProductionDetail() {
    const { id } = useParams()
    const nav = useNavigate()
    const { data, isLoading, error, reload } = useResource<RunDetail>(`/production/runs/${id}`, { deps: [id] })

    if (isLoading || !data) return <Page title="Production Run"><ErrorBanner error={error} />{!isLoading && <p>Not found.</p>}{isLoading && <Loading />}</Page>

    return (
        <Page
            title={`Run ${data.batch_number}`}
            description={`${data.paint_name} · ${data.classification} · ${data.ink_series}`}
            actions={<Link to="/production"><Button variant="secondary">← Back</Button></Link>}
        >
            <ErrorBanner error={error} />

            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Status" value={<Badge color={STATUS_COLOR[data.status]}>{data.status}</Badge>} />
                <Stat label="Expected" value={fmtKg(data.expected_output_kg)} />
                <Stat label="Actual" value={data.actual_output_kg != null ? fmtKg(data.actual_output_kg) : '—'} />
                <Stat label="Wastage" value={
                    data.wastage_pct != null ? (
                        <span className={data.wastage_flagged ? 'text-red-600 font-bold' : ''}>{num(data.wastage_pct).toFixed(2)}%</span>
                    ) : '—'
                } />
                <Stat label="Formula" value={data.formula_name} />
                <Stat label="Operator" value={data.operator} />
                <Stat label="Started" value={fmtDateTime(data.started_at)} />
                <Stat label="Completed" value={fmtDateTime(data.completed_at)} />
            </section>

            <section className="flex flex-wrap gap-2">
                {data.status === 'planned' && (
                    <Button onClick={async () => { await apiRequest(`/production/runs/${id}/start`, { method: 'POST', body: {} }); reload() }}>
                        <Play size={14} /> Start
                    </Button>
                )}
                {(data.status === 'planned' || data.status === 'in_progress') && (
                    <ActualsButton runId={Number(id)} formulaId={data.formula_id} onSaved={reload} />
                )}
                {data.status === 'in_progress' && (
                    <DilutionButton runId={Number(id)} onSaved={reload} />
                )}
                {data.status === 'in_progress' && (
                    <Button onClick={async () => { if (!confirm('Complete this run?')) return; await apiRequest(`/production/runs/${id}/complete`, { method: 'POST', body: {} }); reload() }}>
                        Complete
                    </Button>
                )}
                {data.status === 'completed' && (
                    <Button onClick={() => nav(`/production/${id}/packaging`)}>
                        <Package size={14} /> Package
                    </Button>
                )}
                {(data.status === 'planned' || data.status === 'in_progress') && (
                    <Button variant="danger" onClick={async () => { if (!confirm('Cancel this run?')) return; await apiRequest(`/production/runs/${id}/cancel`, { method: 'POST', body: {} }); reload() }}>
                        <X size={14} /> Cancel
                    </Button>
                )}
            </section>

            <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Resource actuals</h3>
                {data.actuals.length === 0 ? <div className="text-sm text-slate-500">No actuals logged yet.</div> : (
                    <Table>
                        <thead><tr><Th>Resource</Th><Th>Expected</Th><Th>Actual</Th><Th>Variance</Th></tr></thead>
                        <tbody className="divide-y">
                            {data.actuals.map((a) => (
                                <tr key={a.resource_id}>
                                    <Td>{a.resource_name}</Td>
                                    <Td>{fmtKg(a.expected_kg)}</Td>
                                    <Td>{fmtKg(a.actual_kg)}</Td>
                                    <Td className={a.flagged ? 'text-red-600 font-bold' : ''}>
                                        {a.variance_pct != null ? `${num(a.variance_pct).toFixed(2)}%` : '—'}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>

            <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Dilution adjustments {data.dilution_flagged && <Badge color="red">Flagged</Badge>}
                    <span className="ml-2 text-slate-400 font-normal">Total: {fmtKg(data.dilution_total_kg)}</span>
                </h3>
                {data.dilution.length === 0 ? <div className="text-sm text-slate-500">None.</div> : (
                    <Table>
                        <thead><tr><Th>Resource</Th><Th>Added</Th><Th>Notes</Th><Th>At</Th></tr></thead>
                        <tbody className="divide-y">
                            {data.dilution.map((d) => (
                                <tr key={d.id}>
                                    <Td>{d.resource_name}</Td>
                                    <Td>{fmtKg(d.kg_added)}</Td>
                                    <Td className="text-slate-500">{d.notes ?? '—'}</Td>
                                    <Td className="text-xs text-slate-500">{fmtDateTime(d.created_at)}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>

            <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Packs ({data.packs.length})
                </h3>
                {data.packs.length === 0 ? <div className="text-sm text-slate-500">No packs created yet.</div> : (
                    <Table>
                        <thead><tr><Th>Pack #</Th><Th>Size</Th><Th>Cost / kg</Th><Th>Status</Th></tr></thead>
                        <tbody className="divide-y">
                            {data.packs.map((p) => (
                                <tr key={p.id}>
                                    <Td className="font-mono">#{p.id}</Td>
                                    <Td>{fmtKg(p.pack_size_kg)}</Td>
                                    <Td>{num(p.cost_per_kg).toFixed(2)}</Td>
                                    <Td><Badge>{p.status}</Badge></Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>
        </Page>
    )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-sm font-semibold">{value}</div>
        </div>
    )
}

function ActualsButton({ runId, formulaId, onSaved }: { runId: number; formulaId: number; onSaved: () => void }) {
    const [open, setOpen] = useState(false)
    const [actualOutput, setActualOutput] = useState('')
    const [rows, setRows] = useState<FormulaIng[]>([])
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)

    async function openModal() {
        const f = await apiRequest<FormulaDetail>(`/formulas/${formulaId}`)
        setRows(f.ingredients.map((i) => ({ ...i, quantity_kg: i.quantity_kg })))
        setOpen(true)
    }
    async function submit() {
        if (!actualOutput) { setErr('Actual output is required'); return }
        setBusy(true); setErr(null)
        try {
            await apiRequest(`/production/runs/${runId}/actuals`, {
                method: 'POST',
                body: {
                    actual_output_kg: Number(actualOutput),
                    resources: rows.map((r) => ({ resource_id: r.resource_id, actual_kg: Number(r.quantity_kg) })),
                },
            })
            setOpen(false); onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <>
            <Button onClick={openModal}>Log actuals</Button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
                    <div className="relative w-full max-w-2xl mt-16 rounded-xl bg-white shadow-2xl border">
                        <div className="border-b px-5 py-3 font-semibold">Log production actuals</div>
                        <div className="p-5 space-y-3">
                            <ErrorBanner error={err} />
                            <Field label="Actual output (kg) *">
                                <Input type="number" step="0.001" value={actualOutput} onChange={(e) => setActualOutput(e.target.value)} required />
                            </Field>
                            <div>
                                <div className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2">Resource consumption</div>
                                {rows.map((r, i) => (
                                    <div key={r.resource_id} className="grid grid-cols-[2fr_1fr] gap-2 mb-2 items-center">
                                        <span className="text-sm">{r.resource_name}</span>
                                        <Input type="number" step="0.001" value={r.quantity_kg} onChange={(e) => setRows((arr) => arr.map((row, idx) => idx === i ? { ...row, quantity_kg: e.target.value } : row))} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3 rounded-b-xl">
                            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={submit} loading={busy}>Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function DilutionButton({ runId, onSaved }: { runId: number; onSaved: () => void }) {
    const [open, setOpen] = useState(false)
    const [resources, setResources] = useState<Array<{ id: number; name: string }>>([])
    const [form, setForm] = useState({ resource_id: '', kg_added: '', notes: '' })
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)

    async function openModal() {
        const r = await apiRequest<{ items: Array<{ id: number; name: string }> }>('/resources?page_size=200')
        setResources(r.items); setOpen(true)
    }
    async function submit() {
        if (!form.resource_id || !form.kg_added) { setErr('Resource and kg required'); return }
        setBusy(true); setErr(null)
        try {
            await apiRequest(`/production/runs/${runId}/dilution`, {
                method: 'POST',
                body: { resource_id: Number(form.resource_id), kg_added: Number(form.kg_added), notes: form.notes || undefined },
            })
            setOpen(false); onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <>
            <Button variant="secondary" onClick={openModal}><Droplets size={14} /> Add dilution</Button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
                    <div className="relative w-full max-w-lg mt-16 rounded-xl bg-white shadow-2xl border">
                        <div className="border-b px-5 py-3 font-semibold">Post-mix dilution</div>
                        <div className="p-5 space-y-3">
                            <ErrorBanner error={err} />
                            <Field label="Resource">
                                <Select value={form.resource_id} onChange={(e) => setForm({ ...form, resource_id: e.target.value })}>
                                    <option value="">— Select —</option>
                                    {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </Select>
                            </Field>
                            <Field label="kg added">
                                <Input type="number" step="0.001" value={form.kg_added} onChange={(e) => setForm({ ...form, kg_added: e.target.value })} />
                            </Field>
                            <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                        </div>
                        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3 rounded-b-xl">
                            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={submit} loading={busy}>Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
