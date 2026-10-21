import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import MobileNavbar from '~/components/MobileNavbar.vue'
import DefaultLayout from '~/layouts/default.vue'

// T-7: aksesibilitas halaman Bills dari navigasi utama — item sidebar
// "Tagihan" dan quick action MobileNavbar "Tagihan".
// Phase 15.3.1 (OV-2): aksi "Catat Transaksi" di drawer MobileNavbar
// kini aktif → /transactions (lihat describe "navigasi Transaksi").

const authMock = vi.hoisted(() => ({
  user: {
    value: {
      id: 'u1',
      username: 'budi',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      email_verified_at: '2026-01-01T00:00:00.000Z'
    }
  },
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  onboarding: { value: { required: false } },
  isHouseholdOwner: { value: true },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

// Catatan: tidak ada pembersihan document.body di sini — drawer/sidebar
// reka-ui merender sebagian node di body; menghapusnya saat komponen masih
// hidup memicu race patch Vue (insertBefore null). Tidak ada telepon modal
// yang butuh pembersihan eksplisit di file ini.

async function flush(): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

describe('navigasi Bills', () => {
  it('sidebar menampilkan item Tagihan → /bills setelah Anggaran', async () => {
    const wrapper = await mountSuspended(DefaultLayout, { route: '/bills' })

    const links = Array.from(wrapper.findAll('a'))
    const hrefs = links.map(link => link.attributes('href'))

    expect(hrefs).toContain('/bills')

    const tagihan = links.find(link => (link.text() ?? '').trim() === 'Tagihan')

    expect(tagihan).toBeDefined()
    expect(tagihan!.attributes('href')).toBe('/bills')

    // Posisi setelah Anggaran (kontrak urutan sidebar).
    const anggaranIdx = links.findIndex(link => (link.text() ?? '').trim() === 'Anggaran')
    const tagihanIdx = links.findIndex(link => (link.text() ?? '').trim() === 'Tagihan')

    expect(anggaranIdx).toBeGreaterThanOrEqual(0)
    expect(tagihanIdx).toBeGreaterThan(anggaranIdx)
  })

  it('quick action Tagihan di MobileNavbar aktif menuju /bills; aksi lain tetap disabled', async () => {
    const wrapper = await mountSuspended(MobileNavbar, { route: '/dashboard' })

    // Buka drawer quick actions (tombol tengah). Drawer memakai
    // portal=false — konten dirender in-place di subtree, bukan body.
    const opener = wrapper.find('button[aria-label="Catat baru"]')

    expect(opener.exists()).toBe(true)

    await opener.trigger('click')
    await flush()

    // Quick action Tagihan: link aktif ke /bills, tanpa disabled.
    const tagihan = wrapper.find('a[href="/bills"]')

    expect(tagihan.exists()).toBe(true)
    expect(tagihan.text()).toContain('Tagihan')
    expect(tagihan.attributes('aria-disabled')).not.toBe('true')
    expect(tagihan.attributes('disabled')).toBeUndefined()

    // Aksi lain tetap disabled (coming soon) tanpa tujuan.
    const daftarBelanja = wrapper.findAll('button')
      .find(button => button.text().includes('Daftar Belanja'))

    expect(daftarBelanja).toBeDefined()
    expect(
      daftarBelanja!.attributes('disabled') !== undefined
      || daftarBelanja!.attributes('aria-disabled') === 'true'
    ).toBe(true)

    // Tutup kembali drawer agar pembersihan DOM antar test tidak
    // bertabrakan dengan state dialog yang masih terbuka.
    await opener.trigger('click')
    await flush()
  })
})

describe('navigasi Transaksi (Phase 15.3.1)', () => {
  it('drawer "Catat Transaksi" aktif → /transactions, bukan disabled "segera hadir"', async () => {
    const wrapper = await mountSuspended(MobileNavbar, { route: '/dashboard' })

    const opener = wrapper.find('button[aria-label="Catat baru"]')

    expect(opener.exists()).toBe(true)

    await opener.trigger('click')
    await flush()

    // Bottom-nav "Transaksi" juga menunjuk /transactions; pilih anchor
    // yang berlabel "Catat Transaksi" dari isi drawer.
    const catat = wrapper.findAll('a[href="/transactions"]')
      .find(link => (link.text() ?? '').includes('Catat Transaksi'))

    expect(catat).toBeDefined()
    expect(catat!.attributes('aria-disabled')).not.toBe('true')
    expect(catat!.attributes('disabled')).toBeUndefined()
    expect(catat!.attributes('title')).not.toBe('Fitur segera hadir')
    expect(opener.attributes('aria-expanded')).toBe('true')

    // Klik aksi: NuxtLink memicu navigasi client-side (href di atas) dan
    // @click menutup drawer — pola quick action yang sudah ada.
    await catat!.trigger('click')
    await flush()

    expect(opener.attributes('aria-expanded')).toBe('false')
  })
})
