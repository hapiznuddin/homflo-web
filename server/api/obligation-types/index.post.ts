// Membuat jenis kewajiban custom milik household aktif. Hanya `name` yang
// diteruskan; household_id/is_system/code ditentukan server. Tipe bawaan
// tidak dapat dibuat melalui endpoint ini.
import { pickObligationTypeBody } from '../../utils/obligationTypeBody'

export default defineEventHandler(async (event) => {
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, '/obligation-types', {
    method: 'POST',
    body: pickObligationTypeBody(raw)
  })
})
