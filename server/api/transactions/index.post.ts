// Mencatat transaksi. Field di-whitelist sesuai StoreTransactionRequest
// (helper teruji unit di server/utils/transactionBody — termasuk
// wallet_id sejak Phase 15.2.2; destination_wallet_id menyusul bersama
// fitur transfer 15.2.3); household ditentukan server, source_* tidak
// pernah diteruskan.
import { pickTransactionCreateBody } from '../../utils/transactionBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/transactions', {
    method: 'POST',
    body: pickTransactionCreateBody(raw)
  })
})
