import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Textarea,
    Modal, Table, Th, Td, Badge, useResource, fmtDate,
} from '../components/ui'
import { Plus, Archive, RotateCcw } from 'lucide-react'

type Classification = 'oil_based' | 'water_based'
type InkSeries      = 'LCS' | 'STD' | 'OPQ_JS'

interface Paint {
    id: number
    name: string
    swatch?: string | null
    hsn_code?: string | null
    product_code?: string | null
    notes?: string | null
    tags: string[]
    classifications: Classification[]
    ink_series: InkSeries[]
    variant_count: number | string
    archived_at: string | null
    created_at: string
}

interface PaintsPage {
    items: Paint[]
    total: number
    page: number
    page_size: number
}

const CLASSIFICATIONS: Classification[] = ['oil_based', 'water_based']
const INK_SERIES: InkSeries[]            = ['LCS', 'STD', 'OPQ_JS']

export default function Paints() {
    const [search, setSearch] = useState('')
    const [includeArchived, setIncludeArchived] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const query = `?page_size=100${search ? `&search=${encodeURIComponent(search)}` : ''}${includeArchived ? '&include_archived=true' : ''}`
    const { data, isLoading, error, reload } = useResource<PaintsPage>(`/paints${query}`)

    return (
        <Page
            title="Paints"
            description="Catalog of paints. Each paint expands into variants by classification × ink series."
            actions={
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus size={16} /> New Paint
                </Button>
            }
        >
            <ErrorBanner error={error} />

            <div className="flex flex-wrap items-center gap-3">
                <Input
                    placeholder="Search name / HSN / product code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                        type="checkbox"
                        checked={includeArchived}
                        onChange={(e) => setIncludeArchived(e.target.checked)}
                    />
                    Show archived
                </label>
            </div>

            {isLoading ? (
                <Loading />
            ) : !data || data.items.length === 0 ? (
                <EmptyState message="No paints yet. Click 'New Paint' to add one." />
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>Name</Th>
                            <Th>HSN / Code</Th>
                            <Th>Classifications</Th>
                            <Th>Ink Series</Th>
                            <Th>Variants</Th>
                            <Th>Status</Th>
                            <Th>Created</Th>
                            <Th></Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.items.map((p) => (
                            <PaintRow key={p.id} paint={p} reload={reload} />
                        ))}
                    </tbody>
                </Table>
            )}

            {createOpen && (
                <CreatePaintModal
                    onClose={() => setCreateOpen(false)}
                    onSaved={() => { setCreateOpen(false); reload() }}
                />
            )}
        </Page>
    )
}

function PaintRow({ paint, reload }: { paint: Paint; reload: () => void }) {
    const [busy, setBusy] = useState(false)
    async function toggle() {
        setBusy(true)
        try {
            await apiRequest(`/paints/${paint.id}/${paint.archived_at ? 'restore' : 'archive'}`, { method: 'POST', body: {} })
            reload()
        } catch (err: any) {
            alert(err.message || 'Failed')
        } finally {
            setBusy(false)
        }
    }
    return (
        <tr className="hover:bg-slate-50">
            <Td>
                <div className="flex items-center gap-2">
                    {paint.swatch && <span className="inline-block size-4 rounded border border-slate-200" style={{ background: paint.swatch }} />}
                    <span className="font-semibold">{paint.name}</span>
                </div>
            </Td>
            <Td>
                <div className="text-xs">
                    {paint.hsn_code && <div className="text-slate-500">HSN: {paint.hsn_code}</div>}
                    {paint.product_code && <div className="font-mono text-slate-700">{paint.product_code}</div>}
                </div>
            </Td>
            <Td>
                <div className="flex flex-wrap gap-1">
                    {paint.classifications.map((c) => <Badge key={c} color="blue">{c}</Badge>)}
                </div>
            </Td>
            <Td>
                <div className="flex flex-wrap gap-1">
                    {paint.ink_series.map((s) => <Badge key={s} color="purple">{s}</Badge>)}
                </div>
            </Td>
            <Td>{paint.variant_count}</Td>
            <Td>{paint.archived_at ? <Badge color="slate">Archived</Badge> : <Badge color="green">Active</Badge>}</Td>
            <Td className="text-xs text-slate-500">{fmtDate(paint.created_at)}</Td>
            <Td>
                <Button variant="ghost" loading={busy} onClick={toggle}>
                    {paint.archived_at ? <><RotateCcw size={14} /> Restore</> : <><Archive size={14} /> Archive</>}
                </Button>
            </Td>
        </tr>
    )
}

function CreatePaintModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [name, setName] = useState('')
    const [hsn, setHsn] = useState('')
    const [productCode, setProductCode] = useState('')
    const [swatch, setSwatch] = useState('#3b82f6')
    const [notes, setNotes] = useState('')
    const [tags, setTags] = useState('')
    const [classifications, setClassifications] = useState<Classification[]>(['oil_based'])
    const [inkSeries, setInkSeries] = useState<InkSeries[]>(['LCS'])
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    function toggleArr<T>(arr: T[], setArr: (v: T[]) => void, v: T) {
        setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!name || classifications.length === 0 || inkSeries.length === 0) {
            setErr('Name + at least one classification + at least one ink series are required')
            return
        }
        setBusy(true); setErr(null)
        try {
            await apiRequest('/paints', {
                method: 'POST',
                body: {
                    name,
                    hsn_code: hsn || undefined,
                    product_code: productCode || undefined,
                    swatch: swatch || undefined,
                    notes: notes || undefined,
                    tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
                    classifications, ink_series: inkSeries,
                },
            })
            onSaved()
        } catch (e: any) { setErr(e.message || 'Failed') }
        finally { setBusy(false) }
    }

    return (
        <Modal
            open onClose={onClose} title="New Paint"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} loading={busy}>Create</Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Name *"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
                    <Field label="Swatch (color)"><Input type="color" value={swatch} onChange={(e) => setSwatch(e.target.value)} /></Field>
                    <Field label="HSN Code"><Input value={hsn} onChange={(e) => setHsn(e.target.value)} /></Field>
                    <Field label="Product Code"><Input value={productCode} onChange={(e) => setProductCode(e.target.value)} /></Field>
                </div>
                <Field label="Tags" hint="Comma-separated, e.g. premium, architectural">
                    <Input value={tags} onChange={(e) => setTags(e.target.value)} />
                </Field>
                <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Classifications *">
                        <div className="flex flex-wrap gap-2">
                            {CLASSIFICATIONS.map((c) => (
                                <label key={c} className="flex items-center gap-1 text-sm">
                                    <input type="checkbox" checked={classifications.includes(c)} onChange={() => toggleArr(classifications, setClassifications, c)} />
                                    {c}
                                </label>
                            ))}
                        </div>
                    </Field>
                    <Field label="Ink Series *">
                        <div className="flex flex-wrap gap-2">
                            {INK_SERIES.map((s) => (
                                <label key={s} className="flex items-center gap-1 text-sm">
                                    <input type="checkbox" checked={inkSeries.includes(s)} onChange={() => toggleArr(inkSeries, setInkSeries, s)} />
                                    {s}
                                </label>
                            ))}
                        </div>
                    </Field>
                </div>
            </form>
        </Modal>
    )
}
