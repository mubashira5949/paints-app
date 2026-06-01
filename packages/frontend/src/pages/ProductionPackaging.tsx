import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { Page, ErrorBanner, Loading, Button, Field, Input, useResource, fmtKg, num } from '../components/ui'
import { Plus, Trash } from 'lucide-react'

interface PackSize { pack_size_kg: string }
interface RunDetail {
    id: number; batch_number: string
    actual_output_kg: string | number | null; dilution_total_kg: string | number
    paint_name: string; classification: string; ink_series: string
}

export default function ProductionPackaging() {
    const { id } = useParams()
    const nav = useNavigate()
    const { data: run, isLoading } = useResource<RunDetail>(`/production/runs/${id}`, { deps: [id] })
    const { data: sizes } = useResource<PackSize[]>(`/settings/pack-sizes`)
    const [packs, setPacks] = useState<Array<{ pack_size_kg: string; units: string }>>([{ pack_size_kg: '', units: '' }])
    const [stashKg, setStashKg] = useState('')
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)

    if (isLoading || !run) return <Page title="Packaging"><Loading /></Page>

    const available = num(run.actual_output_kg) + num(run.dilution_total_kg)
    const allocated = packs.reduce((sum, p) => sum + (num(p.pack_size_kg) * num(p.units)), 0) + num(stashKg)
    const remaining = available - allocated

    function updatePack(i: number, patch: Partial<{ pack_size_kg: string; units: string }>) {
        setPacks((arr) => arr.map((p, idx) => idx === i ? { ...p, ...patch } : p))
    }
    function addPack() { setPacks((arr) => [...arr, { pack_size_kg: '', units: '' }]) }
    function removePack(i: number) { setPacks((arr) => arr.filter((_, idx) => idx !== i)) }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        const valid = packs.filter((p) => p.pack_size_kg && p.units).map((p) => ({ pack_size_kg: Number(p.pack_size_kg), units: Number(p.units) }))
        if (valid.length === 0 && !stashKg) { setErr('Add at least one pack or some stash kg'); return }
        if (remaining < -1e-6) { setErr(`Over-allocated by ${Math.abs(remaining).toFixed(3)} kg`); return }
        setBusy(true); setErr(null)
        try {
            await apiRequest(`/production/runs/${id}/packaging`, {
                method: 'POST',
                body: { packs: valid, stash_kg: stashKg ? Number(stashKg) : undefined },
            })
            nav(`/production/${id}`)
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <Page
            title={`Package run ${run.batch_number}`}
            description={`${run.paint_name} · ${run.classification} · ${run.ink_series}`}
            actions={<Link to={`/production/${id}`}><Button variant="secondary">← Back</Button></Link>}
        >
            <ErrorBanner error={err} />

            <div className="grid grid-cols-3 gap-3">
                <Stat label="Available output" value={`${available.toFixed(3)} kg`} />
                <Stat label="Allocated" value={`${allocated.toFixed(3)} kg`} />
                <Stat label="Remaining" value={`${remaining.toFixed(3)} kg`} highlight={Math.abs(remaining) > 1e-6} />
            </div>

            <form onSubmit={submit} className="space-y-4 max-w-3xl">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-600">Pack rows</span>
                        <Button type="button" variant="ghost" onClick={addPack}><Plus size={14} /> Add row</Button>
                    </div>
                    <div className="space-y-2">
                        {packs.map((p, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                                <Field label={i === 0 ? 'Pack size (kg)' : ''}>
                                    <select className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white" value={p.pack_size_kg} onChange={(e) => updatePack(i, { pack_size_kg: e.target.value })}>
                                        <option value="">— Pack size —</option>
                                        {(sizes ?? []).map((s) => <option key={s.pack_size_kg} value={s.pack_size_kg}>{fmtKg(s.pack_size_kg)}</option>)}
                                    </select>
                                </Field>
                                <Field label={i === 0 ? 'Units' : ''}>
                                    <Input type="number" min="1" value={p.units} onChange={(e) => updatePack(i, { units: e.target.value })} />
                                </Field>
                                <button type="button" onClick={() => removePack(i)} className="self-end mb-1 text-slate-400 hover:text-red-600 p-2"><Trash size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <Field label="Send residue to stash (kg)" hint="Leftover that doesn't fit a pack size. Goes to paint_variant_stash for the next run / repack.">
                    <Input type="number" step="0.001" min="0" value={stashKg} onChange={(e) => setStashKg(e.target.value)} />
                </Field>

                <div className="flex justify-end gap-2">
                    <Link to={`/production/${id}`}><Button variant="secondary" type="button">Cancel</Button></Link>
                    <Button type="submit" loading={busy}>Save packs</Button>
                </div>
            </form>
        </Page>
    )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{label}</div>
            <div className={`mt-1 text-xl font-semibold ${highlight ? 'text-red-600' : ''}`}>{value}</div>
        </div>
    )
}
