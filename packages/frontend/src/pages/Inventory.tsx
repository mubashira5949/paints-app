import { useState } from 'react'
import {
    Page, ErrorBanner, Loading, EmptyState, Table, Th, Td, Badge, useResource, fmtKg, num, Input,
} from '../components/ui'

interface FinishedGroup {
    variant_id: number; paint_id: number; paint_name: string
    classification: string; ink_series: string
    pack_size_kg: string | number; status: string
    units: string | number; total_kg: string | number; avg_cost_per_kg: string | number
}
interface StashEntry { variant_id: number; kg_remaining: string; updated_at: string; paint_name: string; classification: string; ink_series: string }
interface ResourceInv {
    id: number; name: string; aliases: string[]
    current_stock_kg: string; weighted_avg_cost_per_kg: string
    effective_threshold_kg: string; is_low_stock: boolean
}

export default function Inventory() {
    const [tab, setTab] = useState<'finished' | 'stash' | 'resources'>('finished')
    const finished = useResource<FinishedGroup[]>('/inventory/finished')
    const stash = useResource<StashEntry[]>('/inventory/finished/stash')
    const resources = useResource<ResourceInv[]>('/inventory/resources')

    const err = finished.error || stash.error || resources.error

    return (
        <Page title="Inventory" description="Finished packs, stash residue, and raw-material stock.">
            <ErrorBanner error={err} />
            <div className="flex border-b">
                {(['finished', 'stash', 'resources'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {t === 'finished' ? 'Finished Packs' : t === 'stash' ? 'Stash' : 'Resources'}
                    </button>
                ))}
            </div>

            {tab === 'finished' && (
                finished.isLoading ? <Loading /> : !finished.data || finished.data.length === 0 ? <EmptyState message="No finished packs yet. Run production to create them." /> : (
                    <Table>
                        <thead><tr><Th>Paint</Th><Th>Variant</Th><Th>Pack</Th><Th>Status</Th><Th>Units</Th><Th>Total kg</Th><Th>Avg cost/kg</Th></tr></thead>
                        <tbody className="divide-y">
                            {finished.data.map((g, i) => (
                                <tr key={i}>
                                    <Td className="font-semibold">{g.paint_name}</Td>
                                    <Td className="text-xs">{g.classification} · {g.ink_series}</Td>
                                    <Td>{fmtKg(g.pack_size_kg)}</Td>
                                    <Td><Badge color={g.status === 'in_stock' ? 'green' : g.status === 'sold' ? 'slate' : 'blue'}>{g.status}</Badge></Td>
                                    <Td>{g.units}</Td>
                                    <Td>{fmtKg(g.total_kg)}</Td>
                                    <Td>{num(g.avg_cost_per_kg).toFixed(2)}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )
            )}

            {tab === 'stash' && (
                stash.isLoading ? <Loading /> : !stash.data || stash.data.length === 0 ? <EmptyState message="No stash residue." /> : (
                    <Table>
                        <thead><tr><Th>Paint</Th><Th>Variant</Th><Th>Remaining</Th><Th>Updated</Th></tr></thead>
                        <tbody className="divide-y">
                            {stash.data.map((s) => (
                                <tr key={s.variant_id}>
                                    <Td className="font-semibold">{s.paint_name}</Td>
                                    <Td className="text-xs">{s.classification} · {s.ink_series}</Td>
                                    <Td>{fmtKg(s.kg_remaining)}</Td>
                                    <Td className="text-xs text-slate-500">{new Date(s.updated_at).toLocaleString()}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )
            )}

            {tab === 'resources' && (
                resources.isLoading ? <Loading /> : !resources.data || resources.data.length === 0 ? <EmptyState message="No resources." /> : (
                    <Table>
                        <thead><tr><Th>Name</Th><Th>Stock</Th><Th>Threshold</Th><Th>Avg cost/kg</Th><Th>Status</Th></tr></thead>
                        <tbody className="divide-y">
                            {resources.data.map((r) => (
                                <tr key={r.id}>
                                    <Td className="font-semibold">{r.name}</Td>
                                    <Td>{fmtKg(r.current_stock_kg)}</Td>
                                    <Td className="text-slate-500">{fmtKg(r.effective_threshold_kg)}</Td>
                                    <Td>{num(r.weighted_avg_cost_per_kg).toFixed(2)}</Td>
                                    <Td>{r.is_low_stock ? <Badge color="red">Low</Badge> : <Badge color="green">OK</Badge>}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )
            )}
        </Page>
    )
}
