import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea, Select,
    Modal, Table, Th, Td, Badge, useResource, fmtKg, fmtDate, num,
} from '../components/ui'
import { Plus, Archive, RotateCcw, Star } from 'lucide-react'

interface Formula {
    id: number; variant_id: number; name: string; standard_output_kg: string
    is_default: boolean; archived_at: string | null; created_at: string
    paint_id: number; paint_name: string; classification: string; ink_series: string
    wastage_threshold_pct: string | number | null
    resource_variance_threshold_pct: string | number | null
    dilution_threshold_pct: string | number | null
}
interface Variant { id: number; paint_id: number; paint_name: string; classification: string; ink_series: string }
interface Paint { id: number; name: string; variants: Variant[] }
interface Resource { id: number; name: string }
interface FormulaDetail extends Formula {
    notes: string | null
    ingredients: Array<{ resource_id: number; resource_name: string; quantity_kg: string }>
}
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

export default function Formulas() {
    const [search, setSearch] = useState('')
    const [createOpen, setCreateOpen] = useState(false)
    const [detailId, setDetailId] = useState<number | null>(null)
    const q = `?page_size=100${search ? `&search=${encodeURIComponent(search)}` : ''}`
    const { data, isLoading, error, reload } = useResource<PageOf<Formula>>(`/formulas${q}`)

    return (
        <Page
            title="Formulas"
            description="Recipes per variant. The most recent (or explicitly default) formula is used to compute cost-to-build."
            actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Formula</Button>}
        >
            <ErrorBanner error={error} />
            <Input placeholder="Search formula or paint name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

            {isLoading ? <Loading /> : !data || data.items.length === 0 ? <EmptyState message="No formulas yet. Create a paint with variants first, then add a formula." /> : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Formula</Th><Th>Variant</Th><Th>Std Output</Th><Th>Default</Th><Th>Created</Th><Th></Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.items.map((f) => (
                            <tr key={f.id} className="hover:bg-slate-50">
                                <Td>
                                    <button onClick={() => setDetailId(f.id)} className="font-semibold text-blue-600 hover:underline">
                                        {f.name}
                                    </button>
                                </Td>
                                <Td>
                                    <div className="font-medium">{f.paint_name}</div>
                                    <div className="text-xs text-slate-500">{f.classification} · {f.ink_series}</div>
                                </Td>
                                <Td>{fmtKg(f.standard_output_kg)}</Td>
                                <Td>{f.is_default ? <Badge color="amber"><Star size={10} className="inline" /> Default</Badge> : null}</Td>
                                <Td className="text-xs text-slate-500">{fmtDate(f.created_at)}</Td>
                                <Td><FormulaActions formula={f} reload={reload} /></Td>
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

function FormulaActions({ formula, reload }: { formula: Formula; reload: () => void }) {
    const [busy, setBusy] = useState(false)
    async function call(path: string) {
        setBusy(true)
        try { await apiRequest(path, { method: 'POST', body: {} }); reload() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    if (formula.archived_at) {
        return <Button variant="ghost" loading={busy} onClick={() => call(`/formulas/${formula.id}/restore`)}><RotateCcw size={14} /> Restore</Button>
    }
    return (
        <div className="flex gap-1">
            {!formula.is_default && (
                <Button variant="ghost" loading={busy} onClick={() => call(`/formulas/${formula.id}/default`)}>
                    <Star size={14} /> Make default
                </Button>
            )}
            <Button variant="ghost" loading={busy} onClick={() => call(`/formulas/${formula.id}/archive`)}>
                <Archive size={14} /> Archive
            </Button>
        </div>
    )
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [variants, setVariants] = useState<Variant[]>([])
    const [resources, setResources] = useState<Resource[]>([])
    const [f, setF] = useState({
        variant_id: '', name: '', standard_output_kg: '100', is_default: true, notes: '',
    })
    const [ingredients, setIngredients] = useState<Array<{ resource_id: string; quantity_kg: string }>>([{ resource_id: '', quantity_kg: '' }])
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        let cancel = false
        Promise.all([
            apiRequest<PageOf<Paint>>('/paints?page_size=200'),
            apiRequest<PageOf<Resource>>('/resources?page_size=200'),
        ]).then(([paintsResp, resResp]) => {
            if (cancel) return
            const allVariants: Variant[] = []
            for (const p of paintsResp.items) {
                if (!p.variants) continue
                for (const v of p.variants as any[]) {
                    allVariants.push({ id: v.id, paint_id: p.id, paint_name: p.name, classification: v.classification, ink_series: v.ink_series })
                }
            }
            setVariants(allVariants)
            setResources(resResp.items)
        }).catch((e) => setErr(e.message))
        return () => { cancel = true }
    }, [])

    function updateIngredient(i: number, patch: Partial<{ resource_id: string; quantity_kg: string }>) {
        setIngredients((arr) => arr.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
    }
    function addIngredient() { setIngredients((arr) => [...arr, { resource_id: '', quantity_kg: '' }]) }
    function removeIngredient(i: number) { setIngredients((arr) => arr.filter((_, idx) => idx !== i)) }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!f.variant_id || !f.name || !f.standard_output_kg) { setErr('Variant, name, and standard output are required'); return }
        const cleaned = ingredients
            .filter((r) => r.resource_id && r.quantity_kg && Number(r.quantity_kg) > 0)
            .map((r) => ({ resource_id: Number(r.resource_id), quantity_kg: Number(r.quantity_kg) }))
        if (cleaned.length === 0) { setErr('Add at least one ingredient'); return }
        setBusy(true); setErr(null)
        try {
            await apiRequest('/formulas', {
                method: 'POST',
                body: {
                    variant_id: Number(f.variant_id),
                    name: f.name,
                    standard_output_kg: Number(f.standard_output_kg),
                    is_default: f.is_default,
                    notes: f.notes || undefined,
                    ingredients: cleaned,
                },
            })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <Modal open onClose={onClose} title="New Formula" size="lg"
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create</Button></>}>
            <form onSubmit={submit} className="space-y-4">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Variant *">
                        <Select value={f.variant_id} onChange={(e) => setF({ ...f, variant_id: e.target.value })} required>
                            <option value="">— Select a variant —</option>
                            {variants.map((v) => (
                                <option key={v.id} value={v.id}>{v.paint_name} · {v.classification} · {v.ink_series}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Standard output (kg) *">
                        <Input type="number" step="0.001" value={f.standard_output_kg} onChange={(e) => setF({ ...f, standard_output_kg: e.target.value })} required />
                    </Field>
                </div>
                <Field label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required placeholder="e.g. baseline v1" /></Field>
                <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={f.is_default} onChange={(e) => setF({ ...f, is_default: e.target.checked })} />
                    Make this the default formula for the variant
                </label>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ingredients</span>
                        <Button type="button" variant="ghost" onClick={addIngredient}><Plus size={14} /> Add</Button>
                    </div>
                    <div className="space-y-2">
                        {ingredients.map((row, i) => (
                            <div key={i} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                                <Select value={row.resource_id} onChange={(e) => updateIngredient(i, { resource_id: e.target.value })}>
                                    <option value="">— Resource —</option>
                                    {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </Select>
                                <Input type="number" step="0.001" placeholder="kg" value={row.quantity_kg} onChange={(e) => updateIngredient(i, { quantity_kg: e.target.value })} />
                                <Button type="button" variant="ghost" onClick={() => removeIngredient(i)} className="px-2">×</Button>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </Modal>
    )
}

function DetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
    const { data, isLoading, error } = useResource<FormulaDetail>(`/formulas/${id}`)
    return (
        <Modal open onClose={onClose} title={data ? `Formula: ${data.name}` : 'Formula'} size="lg">
            <ErrorBanner error={error} />
            {isLoading || !data ? <Loading /> : (
                <div className="space-y-4">
                    <div className="text-sm text-slate-700">
                        <span className="font-semibold">{data.paint_name}</span>
                        <span className="text-slate-500"> · {data.classification} · {data.ink_series}</span>
                        <span className="text-slate-500"> · {fmtKg(data.standard_output_kg)} standard output</span>
                        {data.is_default && <Badge color="amber"> Default</Badge>}
                    </div>
                    {data.notes && <div className="rounded border bg-slate-50 p-3 text-sm whitespace-pre-line">{data.notes}</div>}
                    <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Ingredients</div>
                        <Table>
                            <thead><tr><Th>Resource</Th><Th>Quantity (kg)</Th></tr></thead>
                            <tbody className="divide-y">
                                {data.ingredients.map((ing) => (
                                    <tr key={ing.resource_id}><Td>{ing.resource_name}</Td><Td>{fmtKg(ing.quantity_kg)}</Td></tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="text-xs text-slate-500">
                        Per-formula thresholds —
                        wastage: {data.wastage_threshold_pct != null ? `${num(data.wastage_threshold_pct)}%` : 'inherits'},
                        resource variance: {data.resource_variance_threshold_pct != null ? `${num(data.resource_variance_threshold_pct)}%` : 'inherits'},
                        dilution: {data.dilution_threshold_pct != null ? `${num(data.dilution_threshold_pct)}%` : 'inherits'}
                    </div>
                </div>
            )}
        </Modal>
    )
}
