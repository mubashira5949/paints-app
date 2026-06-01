import { useState } from 'react'
import { apiRequest } from '../services/api'
import {
    Page, ErrorBanner, Loading, EmptyState, Button, Field, Input, Select,
    Modal, Table, Th, Td, Badge, useResource, fmtDateTime,
} from '../components/ui'
import { Plus, Check, X, KeyRound } from 'lucide-react'

interface User { id: number; username: string; email: string | null; role: string; is_active: boolean; last_login: string | null; created_at: string }
interface DeviceRequest { id: number; user: string; device: string | null; last_seen_ip: string | null; requested_at: string; status: string }

export default function Users() {
    const [tab, setTab] = useState<'users' | 'devices'>('users')
    const users = useResource<User[]>('/users')
    const devices = useResource<DeviceRequest[]>('/users/device-requests')
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <Page title="Users & Access" actions={tab === 'users' ? <Button onClick={() => setCreateOpen(true)}><Plus size={16} /> New User</Button> : undefined}>
            <ErrorBanner error={users.error || devices.error} />
            <div className="flex border-b">
                {(['users', 'devices'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {t === 'users' ? 'Users' : `Device Approvals${devices.data ? ` (${devices.data.length})` : ''}`}
                    </button>
                ))}
            </div>

            {tab === 'users' && (
                users.isLoading ? <Loading /> : !users.data || users.data.length === 0 ? <EmptyState message="No users yet." /> : (
                    <Table>
                        <thead><tr><Th>Username</Th><Th>Email</Th><Th>Role</Th><Th>Active</Th><Th>Last login</Th><Th></Th></tr></thead>
                        <tbody className="divide-y">
                            {users.data.map((u) => (
                                <tr key={u.id}>
                                    <Td className="font-semibold">{u.username}</Td>
                                    <Td className="text-slate-500">{u.email ?? '—'}</Td>
                                    <Td><Badge color={u.role === 'manager' ? 'blue' : u.role === 'operator' ? 'amber' : 'purple'}>{u.role}</Badge></Td>
                                    <Td>{u.is_active ? <Badge color="green">Active</Badge> : <Badge color="slate">Disabled</Badge>}</Td>
                                    <Td className="text-xs text-slate-500">{fmtDateTime(u.last_login)}</Td>
                                    <Td><ResetPasswordButton id={u.id} username={u.username} /></Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )
            )}

            {tab === 'devices' && (
                devices.isLoading ? <Loading /> : !devices.data || devices.data.length === 0 ? <EmptyState message="No pending device approvals." /> : (
                    <Table>
                        <thead><tr><Th>User</Th><Th>Device</Th><Th>Last IP</Th><Th>Requested</Th><Th></Th></tr></thead>
                        <tbody className="divide-y">
                            {devices.data.map((d) => (
                                <tr key={d.id}>
                                    <Td className="font-semibold">{d.user}</Td>
                                    <Td className="text-xs">{d.device ?? '—'}</Td>
                                    <Td className="text-xs text-slate-500">{d.last_seen_ip ?? '—'}</Td>
                                    <Td className="text-xs text-slate-500">{fmtDateTime(d.requested_at)}</Td>
                                    <Td>
                                        <div className="flex gap-2">
                                            <ApproveReject id={d.id} action="approve" onDone={devices.reload} />
                                            <ApproveReject id={d.id} action="reject"  onDone={devices.reload} />
                                        </div>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )
            )}

            {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); users.reload() }} />}
        </Page>
    )
}

function ResetPasswordButton({ id, username }: { id: number; username: string }) {
    const [busy, setBusy] = useState(false)
    async function reset() {
        if (!confirm(`Reset password for "${username}"?\nTheir password will be cleared and they'll be asked to set a new one on next sign-in.`)) return
        setBusy(true)
        try {
            await apiRequest(`/users/${id}/reset-password`, { method: 'POST', body: {} })
            alert(`Password cleared for ${username}. They must set a new one on next sign-in.`)
        } catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    return (
        <Button variant="ghost" loading={busy} onClick={reset}>
            <KeyRound size={14} /> Reset password
        </Button>
    )
}

function ApproveReject({ id, action, onDone }: { id: number; action: 'approve' | 'reject'; onDone: () => void }) {
    const [busy, setBusy] = useState(false)
    async function call() {
        setBusy(true)
        try { await apiRequest(`/users/device-requests/${id}/${action}`, { method: 'POST', body: {} }); onDone() }
        catch (e: any) { alert(e.message) } finally { setBusy(false) }
    }
    return (
        <Button variant={action === 'approve' ? 'primary' : 'danger'} loading={busy} onClick={call}>
            {action === 'approve' ? <Check size={14} /> : <X size={14} />} {action}
        </Button>
    )
}

function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ username: '', email: '', password: '', role: 'operator' })
    const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)
    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!f.username || !f.email || !f.password) { setErr('All fields required'); return }
        setBusy(true); setErr(null)
        try { await apiRequest('/users', { method: 'POST', body: f }); onSaved() }
        catch (e: any) { setErr(e.message) } finally { setBusy(false) }
    }
    return (
        <Modal open onClose={onClose} title="New User"
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Create</Button></>}>
            <form onSubmit={submit} className="space-y-3">
                <ErrorBanner error={err} />
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Username"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
                    <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
                    <Field label="Password"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
                    <Field label="Role">
                        <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                            <option value="manager">Manager</option>
                            <option value="operator">Operator</option>
                            <option value="sales">Sales</option>
                        </Select>
                    </Field>
                </div>
            </form>
        </Modal>
    )
}
