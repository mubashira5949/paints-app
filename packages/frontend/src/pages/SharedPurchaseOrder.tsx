/**
 * Public PO view via share_token. The backend doesn't expose a public-by-token
 * endpoint yet; this is a placeholder until that lands. The route is kept for
 * link continuity.
 */

import { useParams } from 'react-router-dom'
import { Page } from '../components/ui'

export default function SharedPurchaseOrder() {
    const { token } = useParams()
    return (
        <div className="min-h-screen p-8 max-w-3xl mx-auto">
            <Page title="Purchase Order" description="Public PO view (token-gated).">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
                    Public-token PO view isn't wired yet. Token: <code className="font-mono">{token}</code>.
                </div>
            </Page>
        </div>
    )
}
