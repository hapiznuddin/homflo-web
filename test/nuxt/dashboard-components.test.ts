import { mountSuspended } from '@nuxt/test-utils/runtime'
import UDropdownMenu from '@nuxt/ui/components/DropdownMenu.vue'
import { describe, expect, it } from 'vitest'
import type {
  DashboardBudgetCategory,
  DashboardMaintenance as DashboardMaintenanceItem,
  DashboardPeriod,
  DashboardTransaction,
  DashboardUpcomingBill
} from '~/types/dashboard'
import { formatRupiah, greetingForHour } from '~/utils/format'
import DashboardBudget from '~/components/dashboard/DashboardBudget.vue'
import DashboardGreeting from '~/components/dashboard/DashboardGreeting.vue'
import DashboardKpiCard from '~/components/dashboard/DashboardKpiCard.vue'
import DashboardMaintenance from '~/components/dashboard/DashboardMaintenance.vue'
import DashboardQuickActions from '~/components/dashboard/DashboardQuickActions.vue'
import DashboardRecentTransactions from '~/components/dashboard/DashboardRecentTransactions.vue'
import DashboardUpcomingBills from '~/components/dashboard/DashboardUpcomingBills.vue'

const periods: DashboardPeriod[] = [
  { key: '2026-10', label: 'Oktober 2026' },
  { key: '2026-09', label: 'September 2026' }
]

describe('DashboardGreeting', () => {
  it('menyapa nama depan dengan greeting sesuai jam saat ini', async () => {
    const wrapper = await mountSuspended(DashboardGreeting, {
      props: { userName: 'Budi Santoso', periods, currentKey: '2026-10' },
      route: false
    })

    const expected = `${greetingForHour(new Date().getHours())}, Budi`

    expect(wrapper.get('h1').text()).toBe(expected)
    expect(wrapper.text()).toContain('Kelola rumah tangga dalam satu tempat.')
  })

  it('menampilkan label periode aktif pada trigger dropdown', async () => {
    const wrapper = await mountSuspended(DashboardGreeting, {
      props: { userName: 'Budi', periods, currentKey: '2026-10' },
      route: false
    })

    const trigger = wrapper.get('button[aria-label="Pilih periode"]')

    expect(trigger.text()).toContain('Oktober 2026')
    expect(trigger.text()).not.toContain('September 2026')
  })

  it('memilih periode lain memancarkan event select dengan periode yang tepat', async () => {
    const wrapper = await mountSuspended(DashboardGreeting, {
      props: { userName: 'Budi', periods, currentKey: '2026-10' },
      route: false
    })

    // getComponent tidak dapat menyimpulkan props generik UDropdownMenu;
    // struktur items diambil secara struktural (bukan lewat implementasi).
    const dropdown = wrapper.getComponent(UDropdownMenu) as unknown as {
      props: (key: 'items') => Array<Array<{ label: string; onSelect?: () => void }>>
    }
    const groups = dropdown.props('items')

    groups[0]?.[1]?.onSelect?.()

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')?.[0]).toEqual([periods[1]])
  })
})

describe('DashboardKpiCard', () => {
  const baseProps = {
    title: 'Pendapatan Bulan Ini',
    value: formatRupiah(15000000),
    subtitle: '↑ +8% dari bulan lalu',
    icon: 'i-lucide-trending-up'
  }

  it('merender title, value, dan subtitle dari props', async () => {
    const wrapper = await mountSuspended(DashboardKpiCard, {
      props: { ...baseProps, tone: 'positive' },
      route: false
    })

    expect(wrapper.text()).toContain('Pendapatan Bulan Ini')
    expect(wrapper.text()).toContain(formatRupiah(15000000))
    expect(wrapper.text()).toContain('↑ +8% dari bulan lalu')
  })

  it('tone positive memberi warna semantic text-success pada subtitle', async () => {
    const wrapper = await mountSuspended(DashboardKpiCard, {
      props: { ...baseProps, tone: 'positive' },
      route: false
    })

    const subtitle = wrapper.findAll('p').find(p => p.text().includes('↑ +8%'))

    expect(subtitle).toBeDefined()
    expect(subtitle!.classes()).toContain('text-success')
  })

  it('tone negative memberi warna semantic text-destructive pada subtitle', async () => {
    const wrapper = await mountSuspended(DashboardKpiCard, {
      props: {
        title: 'Arus Kas Bersih',
        value: formatRupiah(-2500000, true),
        subtitle: 'Perlu perhatian bulan ini',
        icon: 'i-lucide-wallet',
        tone: 'negative'
      },
      route: false
    })

    const subtitle = wrapper.findAll('p').find(p => p.text().includes('Perlu perhatian'))

    expect(subtitle).toBeDefined()
    expect(subtitle!.classes()).toContain('text-destructive')
  })
})

describe('DashboardBudget', () => {
  const categories: DashboardBudgetCategory[] = [
    {
      id: 'kebutuhan',
      name: 'Kebutuhan Rumah',
      icon: 'i-lucide-shopping-basket',
      spent: 4200000,
      budget: 5000000,
      percent: 84,
      status: 'warning'
    },
    {
      id: 'tagihan',
      name: 'Tagihan & Utilitas',
      icon: 'i-lucide-receipt',
      spent: 2850000,
      budget: 3000000,
      percent: 95,
      status: 'near-limit',
      note: 'Mendekati limit'
    },
    {
      id: 'kendaraan',
      name: 'Operasional Kendaraan',
      icon: 'i-lucide-car',
      spent: 1650000,
      budget: 1500000,
      percent: 110,
      status: 'over'
    }
  ]

  it('merender nama kategori, persentase, dan nominal spent/budget', async () => {
    const wrapper = await mountSuspended(DashboardBudget, { props: { categories }, route: false })

    expect(wrapper.text()).toContain('Kebutuhan Rumah')
    expect(wrapper.text()).toContain('84%')
    expect(wrapper.text()).toContain(formatRupiah(4200000))
    expect(wrapper.text()).toContain(formatRupiah(5000000))
    expect(wrapper.text()).toContain('110%')
  })

  it('kategori near-limit menampilkan note peringatan, kategori normal tidak', async () => {
    const wrapper = await mountSuspended(DashboardBudget, { props: { categories }, route: false })

    const warningLi = wrapper.findAll('li').find(li => li.text().includes('Tagihan & Utilitas'))
    const normalLi = wrapper.findAll('li').find(li => li.text().includes('Kebutuhan Rumah'))

    expect(warningLi?.text()).toContain('Mendekati limit')
    expect(normalLi?.text()).not.toContain('Mendekati limit')
  })

  it('progress bar membawa aria-label kategori + persen (a11y contract)', async () => {
    const wrapper = await mountSuspended(DashboardBudget, { props: { categories }, route: false })

    expect(wrapper.find('[aria-label="Tagihan & Utilitas 95 persen"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Operasional Kendaraan 110 persen"]').exists()).toBe(true)
  })

  it('daftar kosong menampilkan empty state yang jujur', async () => {
    const wrapper = await mountSuspended(DashboardBudget, {
      props: { categories: [] },
      route: false
    })

    expect(wrapper.text()).toContain('Belum ada anggaran')
  })
})

describe('DashboardUpcomingBills', () => {
  const bills: DashboardUpcomingBill[] = [
    {
      id: 'bill-1',
      title: 'Internet',
      icon: 'i-lucide-wifi',
      dueLabel: 'Jatuh tempo 5 Okt',
      amount: 416250,
      urgent: true
    },
    {
      id: 'bill-2',
      title: 'Air PAM',
      icon: 'i-lucide-droplets',
      dueLabel: 'Jatuh tempo 14 Okt',
      amount: 135000,
      urgent: false
    }
  ]

  it('merender judul, jatuh tempo, dan nominal tagihan', async () => {
    const wrapper = await mountSuspended(DashboardUpcomingBills, { props: { bills }, route: false })

    expect(wrapper.text()).toContain('Internet')
    expect(wrapper.text()).toContain('Jatuh tempo 5 Okt')
    expect(wrapper.text()).toContain(formatRupiah(416250))
    expect(wrapper.text()).toContain('Air PAM')
    expect(wrapper.text()).toContain(formatRupiah(135000))
  })

  it('daftar kosong menampilkan empty state', async () => {
    const wrapper = await mountSuspended(DashboardUpcomingBills, {
      props: { bills: [] },
      route: false
    })

    expect(wrapper.text()).toContain('Tidak ada tagihan terdekat')
  })
})

describe('DashboardRecentTransactions', () => {
  const transactions: DashboardTransaction[] = [
    {
      id: 'tx-1',
      title: 'Belanja Supermarket',
      icon: 'i-lucide-shopping-cart',
      dateLabel: '2 Okt 2026',
      wallet: 'Rekening BCA Utama',
      amount: 685000,
      direction: 'out'
    },
    {
      id: 'tx-2',
      title: 'Freelance Consultation',
      icon: 'i-lucide-briefcase',
      dateLabel: '1 Okt 2026',
      wallet: 'Rekening Mandiri',
      amount: 3500000,
      direction: 'in'
    }
  ]

  it('merender judul transaksi, dompet, dan tanggal', async () => {
    const wrapper = await mountSuspended(DashboardRecentTransactions, {
      props: { transactions },
      route: false
    })

    expect(wrapper.text()).toContain('Belanja Supermarket')
    expect(wrapper.text()).toContain('Rekening BCA Utama')
    expect(wrapper.text()).toContain('2 Okt 2026')
    expect(wrapper.text()).toContain('Freelance Consultation')
  })

  it('arahan masuk vs keluar dibedakan dengan warna semantic (text-success vs text-muted)', async () => {
    const wrapper = await mountSuspended(DashboardRecentTransactions, {
      props: { transactions },
      route: false
    })

    const items = wrapper.findAll('li')
    const incomeLi = items.find(li => li.text().includes('Freelance Consultation'))
    const expenseLi = items.find(li => li.text().includes('Belanja Supermarket'))

    expect(incomeLi).toBeDefined()
    expect(expenseLi).toBeDefined()

    expect(incomeLi!.get('p.shrink-0').classes()).toContain('text-success')
    expect(expenseLi!.get('p.shrink-0').classes()).toContain('text-muted')
  })

  it('nominal memakai format rupiah signed dari util format', async () => {
    const wrapper = await mountSuspended(DashboardRecentTransactions, {
      props: { transactions },
      route: false
    })

    const incomeLi = wrapper.findAll('li').find(li => li.text().includes('Freelance Consultation'))

    expect(incomeLi!.get('p.shrink-0').text()).toBe(formatRupiah(3500000, true))
  })

  it('daftar kosong menampilkan empty state + ajakan tambah transaksi', async () => {
    const wrapper = await mountSuspended(DashboardRecentTransactions, {
      props: { transactions: [] },
      route: false
    })

    expect(wrapper.text()).toContain('Belum ada transaksi bulan ini')
    expect(wrapper.text()).toContain('Tambah Transaksi')
  })
})

describe('DashboardMaintenance', () => {
  const items: DashboardMaintenanceItem[] = [
    {
      id: 'mnt-1',
      title: 'Cuci & Service AC Master',
      priority: 'tinggi',
      dateLabel: '3 Okt',
      location: 'Kamar Utama'
    },
    {
      id: 'mnt-2',
      title: 'Kuras & Sterilisasi Toren',
      priority: 'rutin',
      dateLabel: '11 Okt',
      location: 'Toren Atas'
    }
  ]

  it('merender judul, label prioritas, tanggal, dan lokasi', async () => {
    const wrapper = await mountSuspended(DashboardMaintenance, { props: { items }, route: false })

    expect(wrapper.text()).toContain('Cuci & Service AC Master')
    expect(wrapper.text()).toContain('Prioritas Tinggi')
    expect(wrapper.text()).toContain('Rutin')
    expect(wrapper.text()).toContain('3 Okt')
    expect(wrapper.text()).toContain('Kamar Utama')
  })

  it('header menampilkan jumlah jadwal pemeliharaan', async () => {
    const wrapper = await mountSuspended(DashboardMaintenance, { props: { items }, route: false })

    expect(wrapper.text()).toContain('Perawatan & Pemeliharaan')
    expect(wrapper.text()).toContain('2 jadwal pemeliharaan terdekat')
  })

  it('daftar kosong menampilkan empty state', async () => {
    const wrapper = await mountSuspended(DashboardMaintenance, {
      props: { items: [] },
      route: false
    })

    expect(wrapper.text()).toContain('Tidak ada jadwal pemeliharaan')
  })
})

describe('DashboardQuickActions', () => {
  it('menampilkan seluruh aksi cepat yang tersedia', async () => {
    const wrapper = await mountSuspended(DashboardQuickActions, { route: false })

    expect(wrapper.text()).toContain('Aksi Cepat')

    for (const label of [
      'Tambah Transaksi',
      'Tambah Tagihan',
      'Tambah Aset',
      'Tambah Kendaraan'
    ]) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('semua aksi disabled + honest label "Segera hadir" (tidak memalsukan navigasi)', async () => {
    const wrapper = await mountSuspended(DashboardQuickActions, { route: false })

    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(4)

    for (const button of buttons) {
      expect(button.attributes('aria-disabled')).toBe('true')
      expect(button.attributes('title')).toBe('Segera hadir')
    }
  })
})
