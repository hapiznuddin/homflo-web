// Mengubah transaksi. Field di-whitelist sesuai UpdateTransactionRequest
// via pickTransactionUpdateBody (teruji unit — termasuk wallet_id dan
// destination_wallet_id sejak Phase 15.2.3); ownership dan source_*
// tidak pernah dapat diubah dari sini.
import { pickTransactionUpdateBody } from '../../utils/transactionBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/transactions/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: pickTransactionUpdateBody(raw)
  })
})
