// Mencatat transaksi. Field di-whitelist sesuai StoreTransactionRequest
// (helper teruji unit di server/utils/transactionBody — wallet_id sejak
// Phase 15.2.2, destination_wallet_id sejak 15.2.3 khusus transfer);
// household ditentukan server, source_* tidak pernah diteruskan.
import { pickTransactionCreateBody } from '../../utils/transactionBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/transactions', {
    method: 'POST',
    body: pickTransactionCreateBody(raw)
  })
})
