// Menghapus jenis kewajiban custom. Tipe sistem ditolak backend
// (OBLIGATION_TYPE_IMMUTABLE); tipe yang masih dipakai ditolak dengan
// OBLIGATION_TYPE_IN_USE tanpa memindahkan obligation ke tipe lain.
export default defineEventHandler(async (event) => {
  const obligationTypeId = getRouterParam(event, 'obligationTypeId')

  return laravelFetch(
    event,
    `/obligation-types/${encodeURIComponent(String(obligationTypeId))}`,
    {
      method: 'DELETE'
    }
  )
})
