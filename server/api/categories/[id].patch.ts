// Mengubah kategori. Field di-whitelist sesuai UpdateCategoryRequest;
// ownership tidak pernah dapat diubah dari sini.
const ALLOWED_BODY_KEYS = [
  'name',
  'icon'
] as const

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const raw = await readBody<Record<string, unknown>>(event)
  const body: Record<string, unknown> = {}

  for (const key of ALLOWED_BODY_KEYS) {
    const value = raw?.[key]

    if (value !== undefined) {
      body[key] = value === '' && key === 'icon' ? null : value
    }
  }

  return laravelFetch(event, `/categories/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body
  })
})
