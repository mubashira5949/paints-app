/**
 * Raw Materials = /resources per spec §3.2.
 * Stock movement is automatic via PO receipts and production consumption.
 */

import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea,
    Modal, Table, Th, Td, Badge, useResource, fmtKg, fmtMoney, num,
} from '../components/ui'
import { Plus, Archive, RotateCcw } from 'lucide-react'

interface Resource {
    id: number
    name: string
    description: string | null
    aliases: string[]
    import_source: string | null
    current_stock_kg: string | number
    weighted_avg_cost_per_kg: string | number
    low_stock_threshold_kg: string | number | null
    archived_at: string | null
}
interface PageOf<T> { items: T[]; total: number; page: number; page_size: number }

export default function RawMaterials() {
    const [search, setSearch] = useState('')
    const [lowOnly, setLowOnly] = useState(false)
    const [includeArchived, setIncludeArchived] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)

    const q = `?page_size=100${search ? `&search=${encodeURIComponent(search)}` : ''}${lowOnly ? '&low_stock_only=true' : ''}${includeArchived ? '&include_archived=true' : ''}`
    const { data, isLoading, error, reload } = useResource<PageOf<Resource>>(`/resources${q}`)

    return (
        <Page
            title="Raw Materials"
            description="Pigments, binders, solvents, additives. Stock moves through PO receipts and production runs."
            actions={<Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New Resource</Button>}
        >
            <ErrorBanner error={error} />
            <div className="flex flex-wrap items-center gap-3">
                <Input placeholder="Search name / alias…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
                    Low stock only
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                    Show archived
                </label>
            </div>
            {isLoading ? <Loading /> : !data || data.items.length === 0 ? <EmptyState message="No resources yet." /> : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th><Th>Current Stock</Th><Th>Weighted Avg Cost</Th><Th>Low-Stock Threshold</Th><Th>Status</Th><Th></Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.items.map((r) => <ResourceRow key={r.id} r={r} reload={reload} />)}
                    </tbody>
                </Table>
            )}
            {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload() }} />}
        </Page>
    )
}

function ResourceRow({ r, reload }: { r: Resource; reload: () => void }) {
    const [busy, setBusy] = useState(false)
    const threshold = r.low_stock_threshold_kg != null ? num(r.low_stock_threshold_kg) : null
    const stock = num(r.current_stock_kg)
    const low = threshold != null && stock < threshold
    async function toggle() {
        setBusy(true)
        try { await apiRequest(`/resources/${r.id}/${r.archived_at ? 'restore' : 'archive'}`, { method: 'POST', body: {} }); reload() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    return (
        <tr className="hover:bg-slate-50">
            <Td>
                <div className="font-semibold">{r.name}</div>
                {r.aliases && r.aliases.length > 0 && (
                    <div className="text-xs text-slate-500">{r.aliases.join(', ')}</div>
                )}
            </Td>
            <Td className={low ? 'font-semibold text-red-600' : 'font-semibold'}>{fmtKg(r.current_stock_kg)}</Td>
            <Td className="text-slate-700">{fmtMoney(r.weighted_avg_cost_per_kg)}/kg</Td>
            <Td className="text-slate-500">{threshold != null ? fmtKg(threshold) : <span className="text-slate-300">—</span>}</Td>
            <Td>
                {r.archived_at ? <Badge color="slate">Archived</Badge> :
                 low                ? <Badge color="red">Low</Badge> :
                                      <Badge color="green">OK</Badge>}
            </Td>
            <Td>
                <Button variant="ghost" loading={busy} onClick={toggle}>
                    {r.archived_at ? <><RotateCcw size={14} /> Restore</> : <><Archive size={14} /> Archive</>}
                </Button>
            </Td>
        </tr>
    )
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ name: '', description: '', aliases: '', import_source: '', low_stock_threshold_kg: '' })
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!f.name) { setErr('Name is required'); return }
        setBusy(true); setErr(null)
        try {
            const body: any = { name: f.name }
            if (f.description) body.description = f.description
            if (f.aliases) body.aliases = f.aliases.split(',').map((s) => s.trim()).filter(Boolean)
            if (f.import_source) body.import_source = f.import_source
            if (f.low_stock_threshold_kg) body.low_stock_threshold_kg = Number(f.low_stock_threshold_kg)
            await apiRequest('/resources', { method: 'POST', body })
            onSaved()
        } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title="New Resource" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <Field label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
                <Field label="Description"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
                <Field label="Aliases" hint="Comma-separated (e.g. PR254, DPP Red)">
                    <Input value={f.aliases} onChange={(e) => setF({ ...f, aliases: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Import source"><Input value={f.import_source} onChange={(e) => setF({ ...f, import_source: e.target.value })} placeholder="e.g. China, BASF" /></Field>
                    <Field label="Low-stock threshold (kg)"><Input type="number" step="0.001" value={f.low_stock_threshold_kg} onChange={(e) => setF({ ...f, low_stock_threshold_kg: e.target.value })} /></Field>
                </div>
            </form>
        </Modal>
    )
}
