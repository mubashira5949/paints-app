/**
 * Settings: irregularity thresholds + pack sizes (spec §3.3 / §3.6).
 */

import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Modal, Badge, useResource, num,
} from '../components/ui'
import { Plus, Trash, Save } from 'lucide-react'

interface SettingEntry { value: any; source: 'configured' | 'default'; updated_at?: string; updated_by?: number }
type SettingsResponse = Record<string, SettingEntry>
interface PackSize { pack_size_kg: string }

const KNOWN_KEYS = [
    { key: 'wastage_threshold_pct',           label: 'Wastage threshold',           unit: '%', description: 'Symmetric; flags over- or under-production. Default 5%.' },
    { key: 'resource_variance_threshold_pct', label: 'Resource variance threshold', unit: '%', description: 'Asymmetric — only over-consumption flags. Default 10%.' },
    { key: 'dilution_threshold_pct',          label: 'Dilution threshold',          unit: '%', description: 'Σ(dilution kg) / actual output kg. Default 10%.' },
    { key: 'low_stock_threshold_kg',          label: 'Low-stock default (kg)',      unit: 'kg', description: 'Used when a resource has no per-resource override. JSON: {"kg": N}.' },
    { key: 'financial_tolerance',             label: 'Financial tolerance',         unit: '',   description: 'JSON: {"mode": "pct"|"absolute", "value": N}.' },
]

export default function Settings() {
    const settings = useResource<SettingsResponse>('/settings')
    const packSizes = useResource<PackSize[]>('/settings/pack-sizes')
    const [editingKey, setEditingKey] = useState<string | null>(null)
    const [packOpen, setPackOpen] = useState(false)

    return (
        <Page title="Settings" description="Manager-configurable thresholds and pack sizes.">
            <ErrorBanner error={settings.error || packSizes.error} />

            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Thresholds</h2>
                {settings.isLoading ? <Loading /> : !settings.data ? null : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {KNOWN_KEYS.map(({ key, label, unit, description }) => {
                            const entry = settings.data![key]
                            return (
                                <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-sm">{label}</div>
                                            <div className="text-xs text-slate-500 mt-1">{description}</div>
                                        </div>
                                        {entry && <Badge color={entry.source === 'configured' ? 'blue' : 'slate'}>{entry.source}</Badge>}
                                    </div>
                                    <div className="mt-3 text-lg font-mono">
                                        {entry ? JSON.stringify(entry.value) : '—'} {unit && <span className="text-sm font-normal text-slate-500">{unit}</span>}
                                    </div>
                                    <Button variant="ghost" onClick={() => setEditingKey(key)}>Edit</Button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Pack Sizes</h2>
                    <Button variant="ghost" onClick={() => setPackOpen(true)}><Plus size={14} /> Add</Button>
                </div>
                {packSizes.isLoading ? <Loading /> : !packSizes.data || packSizes.data.length === 0 ? <EmptyState message="No pack sizes configured." /> : (
                    <div className="flex flex-wrap gap-2">
                        {packSizes.data.map((p) => (
                            <PackChip key={p.pack_size_kg} kg={p.pack_size_kg} onDelete={() => packSizes.reload()} />
                        ))}
                    </div>
                )}
            </section>

            {editingKey && (
                <EditSettingModal
                    settingKey={editingKey}
                    initial={settings.data?.[editingKey]?.value}
                    onClose={() => setEditingKey(null)}
                    onSaved={() => { setEditingKey(null); settings.reload() }}
                />
            )}
            {packOpen && <AddPackModal onClose={() => setPackOpen(false)} onSaved={() => { setPackOpen(false); packSizes.reload() }} />}
        </Page>
    )
}

function PackChip({ kg, onDelete }: { kg: string; onDelete: () => void }) {
    const [busy, setBusy] = useState(false)
    async function del() {
        if (!confirm(`Remove ${num(kg)} kg pack size?`)) return
        setBusy(true)
        try { await apiRequest(`/settings/pack-sizes/${num(kg)}`, { method: 'DELETE' }); onDelete() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    return (
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm shadow-sm">
            <span className="font-medium">{num(kg)} kg</span>
            <button onClick={del} disabled={busy} className="text-slate-400 hover:text-red-600"><Trash size={12} /></button>
        </div>
    )
}

function EditSettingModal({ settingKey, initial, onClose, onSaved }: { settingKey: string; initial: any; onClose: () => void; onSaved: () => void }) {
    const isObject = typeof initial === 'object' && initial !== null
    const [text, setText] = useState(isObject ? JSON.stringify(initial, null, 2) : String(initial ?? ''))
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)
    async function submit() {
        setBusy(true); setErr(null)
        try {
            let value: any = text
            if (isObject || text.trim().startsWith('{')) value = JSON.parse(text)
            else if (!isNaN(Number(text))) value = Number(text)
            await apiRequest(`/settings/${settingKey}`, { method: 'PUT', body: { value } })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title={`Edit ${settingKey}`}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}><Save size={14} /> Save</Button></>}>
            <ErrorBanner error={err} />
            <Field label="Value" hint="Numbers like 5 are stored as numbers; JSON like {&quot;kg&quot;: 20} stored as objects.">
                <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm font-mono" rows={6} />
            </Field>
        </Modal>
    )
}

function AddPackModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [kg, setKg] = useState('')
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)
    async function submit() {
        if (!kg || Number(kg) <= 0) { setErr('Must be > 0'); return }
        setBusy(true); setErr(null)
        try { await apiRequest('/settings/pack-sizes', { method: 'POST', body: { pack_size_kg: Number(kg) } }); onSaved() }
        catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title="Add pack size"
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Add</Button></>}>
            <ErrorBanner error={err} />
            <Field label="Pack size (kg)"><Input type="number" step="0.001" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
        </Modal>
    )
}
