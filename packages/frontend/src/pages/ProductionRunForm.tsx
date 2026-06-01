import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { Page, ErrorBanner, Button, Field, Input, Textarea, Select, useResource, fmtKg } from '../components/ui'

interface Variant { id: number; paint_name: string; classification: string; ink_series: string }
interface PaintBrief { id: number; name: string; variants: Variant[] }
interface FormulaBrief { id: number; name: string; standard_output_kg: string; is_default: boolean }
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

export default function ProductionRunForm() {
    const nav = useNavigate()
    const [search] = useSearchParams()
    const presetRequest = search.get('request_id')
    const presetVariant = search.get('variant_id')
    const presetQty = search.get('qty')

    const [variantId, setVariantId] = useState(presetVariant ?? '')
    const [formulaId, setFormulaId] = useState('')
    const [batchNumber, setBatchNumber] = useState(`B-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`)
    const [expected, setExpected] = useState(presetQty ?? '')
    const [notes, setNotes] = useState('')
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)

    const { data: paintsResp } = useResource<PageOf<PaintBrief>>('/paints?page_size=200')
    const variants: Variant[] = (paintsResp?.items ?? []).flatMap((p) =>
        (p.variants ?? []).map((v) => ({ id: v.id, paint_name: p.name, classification: v.classification, ink_series: v.ink_series }))
    )
    const { data: formulasResp } = useResource<FormulaBrief[]>(variantId ? `/formulas/variants/${variantId}` : null, { deps: [variantId] })

    useEffect(() => {
        if (formulasResp && formulasResp.length > 0 && !formulaId) {
            const def = formulasResp.find((f) => f.is_default) ?? formulasResp[0]
            setFormulaId(String(def.id))
        }
    }, [formulasResp, formulaId])

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!variantId || !formulaId || !batchNumber || !expected) { setErr('Variant, formula, batch number and expected output are required'); return }
        setBusy(true); setErr(null)
        try {
            const r = await apiRequest<{ id: number }>('/production/runs', {
                method: 'POST',
                body: {
                    request_id: presetRequest ? Number(presetRequest) : undefined,
                    variant_id: Number(variantId),
                    formula_id: Number(formulaId),
                    batch_number: batchNumber,
                    expected_output_kg: Number(expected),
                    notes: notes || undefined,
                },
            })
            nav(`/production/${r.id}`)
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }

    return (
        <Page title="New Production Run" description="Opens a planned run. Log actuals from the run's detail page.">
            <form onSubmit={submit} className="space-y-4 max-w-2xl">
                <ErrorBanner error={err} />
                <Field label="Variant *">
                    <Select value={variantId} onChange={(e) => { setVariantId(e.target.value); setFormulaId('') }} required>
                        <option value="">— Select a variant —</option>
                        {variants.map((v) => <option key={v.id} value={v.id}>{v.paint_name} · {v.classification} · {v.ink_series}</option>)}
                    </Select>
                </Field>
                <Field label="Formula *" hint="Defaults to the variant's default formula.">
                    <Select value={formulaId} onChange={(e) => setFormulaId(e.target.value)} required disabled={!variantId}>
                        <option value="">— Select a formula —</option>
                        {(formulasResp ?? []).map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.name} {f.is_default ? '(default)' : ''} — std {fmtKg(f.standard_output_kg)}
                            </option>
                        ))}
                    </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Batch number *"><Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required /></Field>
                    <Field label="Expected output (kg) *"><Input type="number" step="0.001" value={expected} onChange={(e) => setExpected(e.target.value)} required /></Field>
                </div>
                <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" type="button" onClick={() => nav('/production')}>Cancel</Button>
                    <Button type="submit" loading={busy}>Open run</Button>
                </div>
            </form>
        </Page>
    )
}
