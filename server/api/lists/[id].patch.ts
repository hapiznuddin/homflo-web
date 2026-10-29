// Mengubah nama list. type bersifat immutable dan tidak pernah diteruskan.
import { pickListUpdateBody } from '../../utils/listBody'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)

  return laravelFetch(event, `/lists/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: pickListUpdateBody(raw)
  })
})
