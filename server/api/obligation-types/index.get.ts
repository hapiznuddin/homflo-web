// Daftar jenis kewajiban: tipe sistem plus custom milik household aktif.
// Array terurut backend (sistem lalu nama), tanpa pagination. Tidak ada
// endpoint show terpisah; detail memakai list ini.
export default defineEventHandler(async (event) => {
  return laravelFetch(event, '/obligation-types')
})
