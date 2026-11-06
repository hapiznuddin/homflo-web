<script setup lang="ts">
import { formatRupiah } from '~/utils/format'

type PreviewTab = 'uang' | 'rumah' | 'kendaraan' | 'daftar'

const tabs: { id: PreviewTab; label: string }[] = [
  { id: 'uang', label: 'Uang' },
  { id: 'rumah', label: 'Rumah' },
  { id: 'kendaraan', label: 'Kendaraan' },
  { id: 'daftar', label: 'Daftar' }
]

const active = ref<PreviewTab>('uang')
const uid = useId()

const budgets = [
  { label: 'Kebutuhan Rumah', used: 68, amount: 'Rp 1.360.000 dari Rp 2.000.000' },
  { label: 'Tagihan', used: 54, amount: 'Rp 1.620.000 dari Rp 3.000.000' },
  { label: 'Transportasi', used: 41, amount: 'Rp 615.000 dari Rp 1.500.000' }
]

const bills = [
  { label: 'Internet', due: 'Jatuh tempo 5 Nov', amount: 416250, state: 'due' },
  { label: 'Listrik', due: 'Sudah dibayar', amount: 289000, state: 'paid' }
]

const transactions = [
  { label: 'Belanja supermarket', meta: 'Rekening utama, 2 Nov', amount: -685000 },
  { label: 'Gaji bulanan', meta: 'Rekening utama, 1 Nov', amount: 12400000 },
  { label: 'Transfer antar dompet', meta: 'Dompet tunai, 1 Nov', amount: 1500000 }
]

const assets = [
  { label: 'AC Kamar Utama', meta: 'Ruang keluarga' },
  { label: 'Kulkas Dapur', meta: 'Dapur' },
  { label: 'Mesin Cuci', meta: 'Area servis' }
]

const maintenance = [
  { label: 'Servis AC', date: '12 Nov', state: 'Terjadwal' },
  { label: 'Ganti filter air', date: '20 Nov', state: 'Terjadwal' }
]

const obligations = [
  { label: 'Pajak Kendaraan', state: 'Aktif' },
  { label: 'STNK / Registrasi', state: 'Aktif' }
]

const shopping = [
  { label: 'Beras 5 kg', price: 72000, done: true },
  { label: 'Telur 1 kg', price: 32000, done: false },
  { label: 'Sabun cuci 2 pcs', price: 46000, done: false },
  { label: 'Minyak goreng 2 L', price: 38000, done: false }
]

function onTabKey(event: KeyboardEvent, index: number): void {
  const keys: Record<string, number> = {
    ArrowRight: index + 1,
    ArrowLeft: index - 1,
    Home: 0,
    End: tabs.length - 1
  }

  const next = keys[event.key]

  if (next === undefined) {
    return
  }

  event.preventDefault()

  const target = tabs[(next + tabs.length) % tabs.length]!

  active.value = target.id

  const buttons = (
    event.currentTarget as HTMLElement
  ).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')

  buttons?.[(next + tabs.length) % tabs.length]?.focus()
}
</script>

<template>
  <div class="lp-preview">
    <div class="lp-preview-head">
      <div class="lp-preview-brand">
        <span class="lp-preview-mark" aria-hidden="true">
          <UIcon name="i-lucide-house" class="size-4" />
        </span>
        <div>
          <p class="lp-preview-title">Rumah Tangga Budi</p>
          <p class="lp-preview-caption">November 2026</p>
        </div>
      </div>
      <span class="lp-demo-tag">Data contoh</span>
    </div>

    <div class="lp-preview-tabs" role="tablist" aria-label="Pratinjau area Homflo">
      <button
        v-for="(tab, index) in tabs"
        :id="`preview-tab-${uid}-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="active === tab.id"
        :aria-controls="`preview-panel-${uid}-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        class="lp-preview-tab"
        @click="active = tab.id"
        @keydown="onTabKey($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="active === 'uang'"
      :id="`preview-panel-${uid}-uang`"
      class="lp-preview-body lp-preview-money"
      role="tabpanel"
      :aria-labelledby="`preview-tab-${uid}-uang`"
    >
      <div class="lp-preview-kpis">
        <div>
          <p class="lp-preview-label">Pendapatan</p>
          <p class="lp-preview-value">{{ formatRupiah(12400000) }}</p>
        </div>
        <div>
          <p class="lp-preview-label">Pengeluaran</p>
          <p class="lp-preview-value">{{ formatRupiah(7850000) }}</p>
        </div>
        <div>
          <p class="lp-preview-label">Arus kas</p>
          <p class="lp-preview-value lp-positive">{{ formatRupiah(4550000, true) }}</p>
        </div>
      </div>

      <div class="lp-preview-columns">
        <div class="lp-preview-panel">
          <div class="lp-panel-head">
            <p class="lp-preview-label">Anggaran bulan ini</p>
            <span class="lp-preview-footnote">3 kategori</span>
          </div>
          <div v-for="budget in budgets" :key="budget.label" class="lp-budget">
            <div class="lp-budget-line">
              <span>{{ budget.label }}</span>
              <span>{{ budget.used }}%</span>
            </div>
            <div class="lp-budget-track" aria-hidden="true">
              <span :style="{ width: `${budget.used}%` }" />
            </div>
            <p class="lp-preview-footnote">{{ budget.amount }}</p>
          </div>
        </div>

        <div class="lp-preview-panel">
          <div class="lp-panel-head">
            <p class="lp-preview-label">Tagihan terdekat</p>
            <span class="lp-preview-footnote">2 tagihan</span>
          </div>
          <div v-for="bill in bills" :key="bill.label" class="lp-bill-row">
            <span class="lp-row-icon" aria-hidden="true">
              <UIcon
                :name="bill.state === 'paid' ? 'i-lucide-check' : 'i-lucide-receipt'"
                class="size-4"
              />
            </span>
            <div class="lp-row-main">
              <p>{{ bill.label }}</p>
              <p class="lp-preview-footnote">{{ bill.due }}</p>
            </div>
            <p class="lp-row-amount">{{ formatRupiah(bill.amount) }}</p>
          </div>
        </div>
      </div>

      <div class="lp-preview-panel">
        <div class="lp-panel-head">
          <p class="lp-preview-label">Transaksi terbaru</p>
          <span class="lp-preview-footnote">Contoh</span>
        </div>
        <div
          v-for="transaction in transactions"
          :key="transaction.label"
          class="lp-transaction-row"
        >
          <div class="lp-row-main">
            <p>{{ transaction.label }}</p>
            <p class="lp-preview-footnote">{{ transaction.meta }}</p>
          </div>
          <p class="lp-row-amount" :class="transaction.amount > 0 ? 'lp-positive' : ''">
            {{
              transaction.amount > 0
                ? formatRupiah(transaction.amount, true)
                : formatRupiah(transaction.amount)
            }}
          </p>
        </div>
      </div>
    </div>

    <div
      v-else-if="active === 'rumah'"
      :id="`preview-panel-${uid}-rumah`"
      class="lp-preview-body"
      role="tabpanel"
      :aria-labelledby="`preview-tab-${uid}-rumah`"
    >
      <div class="lp-property-head">
        <div>
          <p class="lp-preview-label">Properti</p>
          <p class="lp-property-name">Rumah Utama</p>
          <p class="lp-preview-footnote">Rumah tinggal · Milik sendiri</p>
        </div>
        <span class="lp-status">Aktif</span>
      </div>

      <div class="lp-preview-columns">
        <div class="lp-preview-panel">
          <p class="lp-preview-label">Aset rumah</p>
          <div v-for="asset in assets" :key="asset.label" class="lp-simple-row">
            <span class="lp-row-icon" aria-hidden="true">
              <UIcon name="i-lucide-package" class="size-4" />
            </span>
            <div class="lp-row-main">
              <p>{{ asset.label }}</p>
              <p class="lp-preview-footnote">{{ asset.meta }}</p>
            </div>
          </div>
        </div>

        <div class="lp-preview-panel">
          <p class="lp-preview-label">Perawatan berikutnya</p>
          <div v-for="item in maintenance" :key="item.label" class="lp-simple-row">
            <div class="lp-date-chip">{{ item.date }}</div>
            <div class="lp-row-main">
              <p>{{ item.label }}</p>
              <p class="lp-preview-footnote">{{ item.state }}</p>
            </div>
          </div>
        </div>
      </div>

      <p class="lp-preview-note">Properti dapat dihubungkan dengan aset dan riwayat perawatan.</p>
    </div>

    <div
      v-else-if="active === 'kendaraan'"
      :id="`preview-panel-${uid}-kendaraan`"
      class="lp-preview-body"
      role="tabpanel"
      :aria-labelledby="`preview-tab-${uid}-kendaraan`"
    >
      <div class="lp-vehicle-head">
        <span class="lp-vehicle-icon" aria-hidden="true">
          <UIcon name="i-lucide-car" class="size-6" />
        </span>
        <div>
          <p class="lp-preview-label">Kendaraan</p>
          <p class="lp-property-name">Mobil Keluarga</p>
          <p class="lp-preview-footnote">Toyota Avanza 2021, B 1234 XYZ</p>
        </div>
        <div class="lp-vehicle-odo">
          <p class="lp-preview-label">Odometer</p>
          <p class="lp-preview-value">42.500 km</p>
        </div>
      </div>

      <div class="lp-preview-columns">
        <div class="lp-preview-panel">
          <p class="lp-preview-label">Jadwal servis</p>
          <div class="lp-simple-row">
            <div class="lp-date-chip">18 Nov</div>
            <div class="lp-row-main">
              <p>Servis rutin 10.000 km</p>
              <p class="lp-preview-footnote">Terjadwal</p>
            </div>
          </div>
          <p class="lp-preview-note">Riwayat servis tersimpan di kendaraan yang sama.</p>
        </div>

        <div class="lp-preview-panel">
          <p class="lp-preview-label">Kewajiban</p>
          <div v-for="item in obligations" :key="item.label" class="lp-simple-row">
            <span class="lp-row-icon" aria-hidden="true">
              <UIcon name="i-lucide-file-text" class="size-4" />
            </span>
            <div class="lp-row-main">
              <p>{{ item.label }}</p>
              <p class="lp-preview-footnote">{{ item.state }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      :id="`preview-panel-${uid}-daftar`"
      class="lp-preview-body"
      role="tabpanel"
      :aria-labelledby="`preview-tab-${uid}-daftar`"
    >
      <div class="lp-list-head">
        <div>
          <p class="lp-preview-label">Daftar belanja</p>
          <p class="lp-property-name">Belanja mingguan</p>
        </div>
        <span class="lp-preview-footnote">4 item</span>
      </div>

      <div class="lp-shopping">
        <div
          v-for="item in shopping"
          :key="item.label"
          class="lp-shopping-row"
          :class="{ 'lp-is-done': item.done }"
        >
          <span class="lp-check" :class="{ 'lp-is-done': item.done }" aria-hidden="true">
            <UIcon v-if="item.done" name="i-lucide-check" class="size-3.5" />
          </span>
          <span class="lp-row-main">{{ item.label }}</span>
          <span class="lp-row-amount">{{ formatRupiah(item.price) }}</span>
        </div>
      </div>

      <div class="lp-list-total">
        <span>Estimasi total</span>
        <strong>{{ formatRupiah(188000) }}</strong>
      </div>

      <p class="lp-preview-note">Item yang selesai dapat dicatat sebagai pengeluaran.</p>
    </div>

    <p class="lp-preview-disclaimer">
      Pratinjau antarmuka dengan data sintetis. Bukan tangkapan layar akun pengguna.
    </p>
  </div>
</template>
