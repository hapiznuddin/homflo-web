// Mengubah nama jenis kewajiban custom. Tipe sistem ditolak backend
// (OBLIGATION_TYPE_IMMUTABLE); ownership tetap berasal dari session.
import { pickObligationTypeBody } from '../../utils/obligationTypeBody'

export default defineEventHandler(async (event) => {
  const obligationTypeId = getRouterParam(event, 'obligationTypeId')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(
    event,
    `/obligation-types/${encodeURIComponent(String(obligationTypeId))}`,
    {
      method: 'PATCH',
      body: pickObligationTypeBody(raw)
    }
  )
})
