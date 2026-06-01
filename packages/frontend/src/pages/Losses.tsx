/**
 * Production Irregularity Report (spec §3.9).
 * Wastage / variance / dilution are computed metrics on production_runs.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Page, ErrorBanner, Loading, EmptyState, Field, Input, Table, Th, Td, Badge, useResource, fmtDate, num,
} from '../components/ui'

interface IrregularityRow {
    id: number; batch_number: string; status: string
    expected_output_kg: string | number; actual_output_kg: string | number | null
    wastage_pct: string | number | null; wastage_flagged: boolean
    dilution_total_kg: string | number; dilution_flagged: boolean
    completed_at: string | null; operator: string
    resource_variances: Array<{ resource_id: number; resource_name: string; variance_pct: string | null; flagged: boolean }>
    dilution_adjustments: Array<{ resource_id: number; resource_name: string; kg_added: string; notes: string | null }>
}
interface OperatorRow { operator_id: number; operator: string; runs: string | number; flagged_runs: string | number; wastage_kg: string | number }

export default function Losses() {
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const qParts: string[] = []
    if (from) qParts.push(`from=${from}`)
    if (to)   qParts.push(`to=${to}`)
    const q = qParts.length ? `?${qParts.join('&')}` : ''

    const report = useResource<IrregularityRow[]>(`/api/losses${q}`)
    const summary = useResource<OperatorRow[]>(`/api/losses/operator-summary${q}`)

    return (
        <Page title="Production Irregularity Report" description="Flagged runs (wastage / per-resource variance / dilution). Threshold defaults: 5 / 10 / 10%, Manager-tunable.">
            <ErrorBanner error={report.error || summary.error} />
            <div className="flex gap-3 max-w-md">
                <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
                <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>

            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Per-operator summary</h2>
                {summary.isLoading ? <Loading /> : !summary.data || summary.data.length === 0 ? <EmptyState message="No runs in this window." /> : (
                    <Table>
                        <thead><tr><Th>Operator</Th><Th>Runs</Th><Th>Flagged</Th><Th>Wastage kg</Th></tr></thead>
                        <tbody className="divide-y">
                            {summary.data.map((r) => (
                                <tr key={r.operator_id}>
                                    <Td className="font-semibold">{r.operator}</Td>
                                    <Td>{r.runs}</Td>
                                    <Td><Badge color={num(r.flagged_runs) > 0 ? 'red' : 'slate'}>{r.flagged_runs}</Badge></Td>
                                    <Td>{num(r.wastage_kg).toFixed(2)} kg</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>

            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">Flagged runs</h2>
                {report.isLoading ? <Loading /> : !report.data || report.data.length === 0 ? <EmptyState message="No flagged runs." /> : (
                    <Table>
                        <thead><tr><Th>Batch</Th><Th>Operator</Th><Th>Expected → Actual</Th><Th>Wastage</Th><Th>Dilution</Th><Th>Variance flags</Th><Th>Completed</Th></tr></thead>
                        <tbody className="divide-y">
                            {report.data.map((r) => (
                                <tr key={r.id}>
                                    <Td><Link to={`/production/${r.id}`} className="font-semibold text-blue-600">{r.batch_number}</Link></Td>
                                    <Td className="text-xs">{r.operator}</Td>
                                    <Td>
                                        {num(r.expected_output_kg).toFixed(2)} → {r.actual_output_kg != null ? num(r.actual_output_kg).toFixed(2) : '—'} kg
                                    </Td>
                                    <Td className={r.wastage_flagged ? 'font-bold text-red-600' : ''}>
                                        {r.wastage_pct != null ? `${num(r.wastage_pct).toFixed(2)}%` : '—'}
                                    </Td>
                                    <Td className={r.dilution_flagged ? 'font-bold text-red-600' : ''}>
                                        {num(r.dilution_total_kg).toFixed(2)} kg
                                    </Td>
                                    <Td>
                                        {r.resource_variances.filter((v) => v.flagged).length > 0 ? (
                                            <Badge color="red">{r.resource_variances.filter((v) => v.flagged).length}</Badge>
                                        ) : '—'}
                                    </Td>
                                    <Td className="text-xs text-slate-500">{fmtDate(r.completed_at)}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </section>
        </Page>
    )
}
