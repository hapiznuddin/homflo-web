// Undangan yang ditujukan kepada email pengguna. Token mentah tidak pernah
// ada pada respons list; token hanya dikembalikan sekali saat pembuatan.
export default defineEventHandler(async (event) => {
  return laravelFetch(event, '/invitations')
})
