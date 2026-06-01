/**
 * Tiny UI kit used by every page. Plain Tailwind, no external dep.
 */

import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { apiRequest } from '../services/api'

// ---------- Page shell ----------

export function Page({
    title, description, actions, children,
}: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
            {children}
        </div>
    )
}

// ---------- Error + empty + loading ----------

export function ErrorBanner({ error }: { error?: string | null }) {
    if (!error) return null
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3 shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
    )
}

export function Loading() {
    return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
    )
}

export function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">
            {message}
        </div>
    )
}

// ---------- Buttons / inputs ----------

export function Button({
    className = '', variant = 'primary', loading, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean }) {
    const styles =
        variant === 'primary'
            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
        : variant === 'danger'
            ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
        : variant === 'ghost'
            ? 'bg-transparent text-slate-700 hover:bg-slate-100'
        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    return (
        <button
            {...props}
            disabled={props.disabled || loading}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {props.children}
        </button>
    )
}

export function Field({
    label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
            {children}
            {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
            {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
        </label>
    )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${props.className ?? ''}`}
        />
    )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${props.className ?? ''}`}
        />
    )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${props.className ?? ''}`}
        />
    )
}

// ---------- Modal ----------

export function Modal({
    open, onClose, title, children, footer, size = 'md',
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
        if (open) window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])
    if (!open) return null
    const sizeClass = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
            <div className={`relative w-full ${sizeClass} mt-16 rounded-xl bg-white shadow-2xl border border-slate-200`}>
                <div className="flex items-center justify-between border-b px-5 py-3">
                    <h2 className="text-base font-semibold">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3 rounded-b-xl">{footer}</div>}
            </div>
        </div>
    )
}

// ---------- Table ----------

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
            <table className="w-full text-sm">{children}</table>
        </div>
    )
}

export function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <th className={`h-11 px-4 text-left align-middle font-semibold text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50 ${className}`}>
            {children}
        </th>
    )
}

export function Td({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <td className={`p-4 align-middle ${className}`}>{children}</td>
}

// ---------- Badge ----------

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: 'slate' | 'blue' | 'green' | 'red' | 'amber' | 'purple' }) {
    const styles = {
        slate:  'bg-slate-100 text-slate-700',
        blue:   'bg-blue-100 text-blue-700',
        green:  'bg-emerald-100 text-emerald-700',
        red:    'bg-red-100 text-red-700',
        amber:  'bg-amber-100 text-amber-700',
        purple: 'bg-purple-100 text-purple-700',
    }[color]
    return <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styles}`}>{children}</span>
}

// ---------- Fetch hook ----------

export function useResource<T>(endpoint: string | null, opts: { deps?: any[] } = {}) {
    const [data, setData] = useState<T | null>(null)
    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [tick, setTick] = useState(0)

    useEffect(() => {
        if (!endpoint) { setLoading(false); return }
        const controller = new AbortController()
        setLoading(true)
        apiRequest<T>(endpoint, { signal: controller.signal })
            .then((d) => { setData(d); setError(null) })
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Failed to load') })
            .finally(() => setLoading(false))
        return () => controller.abort()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, tick, ...(opts.deps ?? [])])

    return { data, isLoading, error, reload: () => setTick((t) => t + 1) }
}

// ---------- Helpers ----------

export const num = (v: unknown): number => (typeof v === 'string' ? Number(v) : Number(v ?? 0))

export const fmtMoney = (amount: unknown, currency = 'INR') => {
    const n = num(amount)
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(n) }
    catch { return `${currency} ${n.toFixed(2)}` }
}

export const fmtKg = (kg: unknown) => `${num(kg).toFixed(2)} kg`

export const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—')

export const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—')
