const homePoints = [
  { label: 'Properti', text: 'Catat alamat, tipe, dan status kepemilikan tiap properti.' },
  { label: 'Aset', text: 'Daftarkan barang-barang rumah beserta lokasi penyimpanannya.' },
  { label: 'Perawatan', text: 'Jadwalkan dan lacak riwayat servis atau perbaikan.' }
]

const vehiclePoints = [
  { label: 'Servis', text: 'Jadwal dan riwayat servis tersimpan per kendaraan.' },
  { label: 'Odometer', text: 'Catat jarak tempuh setiap kali servis dilakukan.' },
  { label: 'Kewajiban', text: 'Pantau jatuh tempo pajak, STNK, dan KIR.' }
]

const listPoints = [
  { label: 'Daftar aktif', text: 'Satu daftar belanja utama selalu siap dipakai.' },
  { label: 'Item dan estimasi', text: 'Tambah item dengan jumlah, satuan, dan perkiraan harga.' },
  { label: 'Langsung jadi pengeluaran', text: 'Setelah selesai belanja, harga aktual otomatis jadi catatan.' }
]

const moneyPoints = [
  { label: 'Transaksi', text: 'Catat pemasukan, pengeluaran, dan transfer antar dompet.' },
  { label: 'Anggaran', text: 'Tetapkan pagu bulanan dan pantau sisanya secara real-time.' },
  { label: 'Tagihan', text: 'Lacak jatuh tempo dan status pembayaran tiap tagihan.' },
  { label: 'Dompet', text: 'Lihat saldo di setiap dompet sekaligus.' }
]

const householdPoints = [
  {
    label: 'Undang lewat email',
    text: 'Kirim undangan ke pasangan atau anggota keluarga. Masing-masing pakai akun sendiri.'
  },
  { label: 'Peran pemilik dan anggota', text: 'Pemilik bisa mengatur siapa saja yang bergabung.' },
  { label: 'Data tetap privat', text: 'Semua data dibatasi ke rumah tangga aktif, tidak bocor ke luar.' }
]

export const FeatureStoryItem = [
  {
    id: 'uang',
    title: 'Semua catatan keuangan, satu tempat.',
    lede: 'Catat pemasukan, pengeluaran, dan transfer. Pantau anggaran dan tagihan — tanpa perlu buka aplikasi lain.',
    points: moneyPoints
  },
  {
    id: 'rumah',
    title: 'Rumah Anda, tercatat dengan rapi.',
    lede: 'Simpan properti, inventaris aset, dan jadwal perawatan. Tahu apa yang dimiliki dan kapan terakhir dirawat.',
    points: homePoints
  },
  {
    id: 'kendaraan',
    title: 'Kendaraan lebih dari sekadar servis.',
    lede: 'Catat riwayat servis, odometer, dan kewajiban administratif. Tidak ada lagi yang terlewat atau terlupa.',
    points: vehiclePoints
  },
  {
    id: 'daftar',
    title: 'Belanja terencana, pengeluaran tercatat.',
    lede: 'Buat daftar, estimasikan harga, centang yang sudah dibeli — lalu simpan sebagai pengeluaran sekaligus.',
    points: listPoints
  },
  {
    id: 'rumah-tangga',
    title: 'Satu data, dikelola bersama keluarga.',
    lede: 'Undang pasangan atau anggota keluarga. Satu rumah tangga, satu lingkup data — tanpa campur aduk.',
    points: householdPoints,
    note: 'Belum ada kolaborasi real-time atau izin berbeda per anggota.'
  }
]
