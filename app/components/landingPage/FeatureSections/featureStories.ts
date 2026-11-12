const homePoints = [
  { label: 'Properti', text: 'Alamat, tipe, dan status kepemilikan.' },
  { label: 'Aset', text: 'Barang rumah dan properti tempatnya.' },
  { label: 'Perawatan', text: 'Jadwal, prioritas, dan riwayat.' }
]

const vehiclePoints = [
  { label: 'Servis', text: 'Jadwal dan riwayat dalam satu kendaraan.' },
  { label: 'Odometer', text: 'Catatan jarak tempuh saat servis.' },
  { label: 'Kewajiban', text: 'Pajak, STNK, dan KIR.' }
]

const listPoints = [
  { label: 'Daftar aktif', text: 'Satu daftar utama selalu tersedia.' },
  { label: 'Item dan estimasi', text: 'Jumlah, satuan, dan perkiraan harga.' },
  { label: 'Selesai dan catat', text: 'Harga aktual menjadi pengeluaran.' }
]

const moneyPoints = [
  { label: 'Transaksi', text: 'Pemasukan, pengeluaran, transfer.' },
  { label: 'Anggaran', text: 'Pagu bulanan dan sisa.' },
  { label: 'Tagihan', text: 'Jatuh tempo, status, pembayaran.' },
  { label: 'Dompet', text: 'Saldo per dompet.' }
]

const householdPoints = [
  {
    label: 'Undangan lewat email',
    text: 'Kirim undangan, lalu anggota menerima dengan akun sendiri.'
  },
  { label: 'Peran pemilik dan anggota', text: 'Pemilik mengelola anggota dan undangan.' },
  { label: 'Data terpisah per rumah tangga', text: 'Akses dibatasi ke rumah tangga aktif.' }
]

export const FeatureStoryItem = [
  {
    id: 'uang',
    title: 'Uang masuk dan keluar, tercatat.',
    lede: 'Catat pemasukan, pengeluaran, dan transfer. Lihat anggaran dan tagihan tanpa pindah aplikasi.',
    points: moneyPoints
  },
  {
    id: 'rumah',
    title: 'Rumah punya catatan.',
    lede: 'Simpan properti, aset, dan riwayat perawatan. Tahu apa yang dimiliki dan kapan dirawat.',
    points: homePoints
  },
  {
    id: 'kendaraan',
    title: 'Kendaraan tidak hanya soal servis.',
    lede: 'Catat kendaraan, jadwal dan riwayat servis, serta kewajiban administratif.',
    points: vehiclePoints
  },
  {
    id: 'daftar',
    title: 'Belanja rumah, tanpa daftar yang hilang.',
    lede: 'Buat daftar, tambah item, centang yang sudah dibeli, lalu catat pengeluarannya.',
    points: listPoints
  },
  {
    id: 'rumah-tangga',
    title: 'Satu rumah tangga, satu lingkup data.',
    lede: 'Undang anggota ke rumah tangga. Setiap anggota memakai akun sendiri, dan data dibatasi ke rumah tangga aktif.',
    points: householdPoints,
    note: 'Belum ada kolaborasi real-time atau izin per anggota.'
  }
]
