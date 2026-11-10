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
  <div class="overflow-hidden rounded-xl border border-border bg-card text-foreground">
    <div class="flex items-center justify-between gap-3 border-b border-rule px-4 py-3.5">
      <div class="flex min-w-0 items-center gap-2.5">
        <span
          class="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <UIcon name="i-lucide-house" class="size-4" />
        </span>
        <div>
          <p class="m-0 text-sm font-semibold leading-[1.3]">Rumah Tangga Budi</p>
          <p class="m-0 text-xs leading-[1.4] text-muted-foreground">November 2026</p>
        </div>
      </div>
      <span
        class="shrink-0 rounded-full border border-border px-2 py-[3px] text-xs leading-[1.4] text-muted-foreground"
        >Data contoh</span
      >
    </div>

    <div
      class="flex gap-0.5 overflow-x-auto border-b border-rule px-2 py-1.5"
      role="tablist"
      aria-label="Pratinjau area Homflo"
    >
      <button
        v-for="(tab, index) in tabs"
        :id="`preview-tab-${uid}-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="active === tab.id"
        :aria-controls="`preview-panel-${uid}-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        class="shrink-0 cursor-pointer rounded-lg border-0 bg-transparent px-[11px] py-[7px] text-[0.8125rem] font-medium text-muted-foreground transition-[background-color,color] duration-[160ms] hover:text-foreground aria-selected:bg-soft-strong aria-selected:text-primary"
        @click="active = tab.id"
        @keydown="onTabKey($event, index)"
      >
        {{ tab.label }}
      </button>
    </div>

    <Transition name="preview-panel" mode="out-in">
      <div
        v-if="active === 'uang'"
        :id="`preview-panel-${uid}-uang`"
        class="flex flex-col gap-3 p-3.5"
        role="tabpanel"
        :aria-labelledby="`preview-tab-${uid}-uang`"
      >
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div class="rounded-lg border border-rule bg-background p-2.5">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Pendapatan</p>
            <p
              class="mt-[3px] mb-0 text-base font-semibold leading-[1.25] tracking-[-0.02em] tabular-nums"
            >
              {{ formatRupiah(12400000) }}
            </p>
          </div>
          <div class="rounded-lg border border-rule bg-background p-2.5">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Pengeluaran</p>
            <p
              class="mt-[3px] mb-0 text-base font-semibold leading-[1.25] tracking-[-0.02em] tabular-nums"
            >
              {{ formatRupiah(7850000) }}
            </p>
          </div>
          <div class="rounded-lg border border-rule bg-background p-2.5">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Arus kas</p>
            <p
              class="mt-[3px] mb-0 text-base font-semibold leading-[1.25] tracking-[-0.02em] tabular-nums text-success"
            >
              {{ formatRupiah(4550000, true) }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-lg border border-rule bg-background p-[11px]">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Anggaran bulan ini</p>
              <span class="text-xs leading-[1.35] text-muted-foreground">3 kategori</span>
            </div>
            <div v-for="budget in budgets" :key="budget.label" class="mb-[9px] last:mb-0">
              <div
                class="flex items-baseline justify-between gap-2.5 text-xs leading-[1.35] [&>span:last-child]:tabular-nums [&>span:last-child]:text-muted-foreground"
              >
                <span>{{ budget.label }}</span>
                <span>{{ budget.used }}%</span>
              </div>
              <div
                class="my-[5px] h-1 overflow-hidden rounded-full bg-soft-strong"
                aria-hidden="true"
              >
                <span
                  class="block h-full rounded-[inherit] bg-primary"
                  :style="{ width: `${budget.used}%` }"
                />
              </div>
              <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ budget.amount }}</p>
            </div>
          </div>

          <div class="rounded-lg border border-rule bg-background p-[11px]">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Tagihan terdekat</p>
              <span class="text-xs leading-[1.35] text-muted-foreground">2 tagihan</span>
            </div>
            <div
              v-for="bill in bills"
              :key="bill.label"
              class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
            >
              <span
                class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                aria-hidden="true"
              >
                <UIcon
                  :name="bill.state === 'paid' ? 'i-lucide-check' : 'i-lucide-receipt'"
                  class="size-4"
                />
              </span>
              <div class="min-w-0 flex-auto">
                <p class="m-0 text-xs font-medium leading-[1.35]">{{ bill.label }}</p>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ bill.due }}</p>
              </div>
              <p class="m-0 shrink-0 text-xs font-semibold tabular-nums">
                {{ formatRupiah(bill.amount) }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-rule bg-background p-[11px]">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Transaksi terbaru</p>
            <span class="text-xs leading-[1.35] text-muted-foreground">Contoh</span>
          </div>
          <div
            v-for="transaction in transactions"
            :key="transaction.label"
            class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
          >
            <div class="min-w-0 flex-auto">
              <p class="m-0 text-xs font-medium leading-[1.35]">{{ transaction.label }}</p>
              <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ transaction.meta }}</p>
            </div>
            <p
              class="m-0 shrink-0 text-xs font-semibold tabular-nums"
              :class="transaction.amount > 0 ? 'text-success' : ''"
            >
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
        class="flex flex-col gap-3 p-3.5"
        role="tabpanel"
        :aria-labelledby="`preview-tab-${uid}-rumah`"
      >
        <div class="flex items-center justify-between gap-3 rounded-lg bg-soft p-[13px]">
          <div>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Properti</p>
            <p class="mt-0.5 mb-0 text-[0.9375rem] font-semibold tracking-[-0.02em]">Rumah Utama</p>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">
              Rumah tinggal · Milik sendiri
            </p>
          </div>
          <span
            class="shrink-0 rounded-full border border-success/40 px-2 py-[3px] text-xs leading-[1.4] text-success"
            >Aktif</span
          >
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-lg border border-rule bg-background p-[11px]">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Aset rumah</p>
            <div
              v-for="asset in assets"
              :key="asset.label"
              class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
            >
              <span
                class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                aria-hidden="true"
              >
                <UIcon name="i-lucide-package" class="size-4" />
              </span>
              <div class="min-w-0 flex-auto">
                <p class="m-0 text-xs font-medium leading-[1.35]">{{ asset.label }}</p>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ asset.meta }}</p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-rule bg-background p-[11px]">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Perawatan berikutnya</p>
            <div
              v-for="item in maintenance"
              :key="item.label"
              class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
            >
              <div
                class="inline-flex min-w-11 shrink-0 items-center justify-center rounded-md bg-soft px-1.5 py-1 text-xs font-semibold text-primary"
              >
                {{ item.date }}
              </div>
              <div class="min-w-0 flex-auto">
                <p class="m-0 text-xs font-medium leading-[1.35]">{{ item.label }}</p>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ item.state }}</p>
              </div>
            </div>
          </div>
        </div>

        <p class="m-0 text-xs leading-[1.5] text-muted-foreground">
          Properti dapat dihubungkan dengan aset dan riwayat perawatan.
        </p>
      </div>

      <div
        v-else-if="active === 'kendaraan'"
        :id="`preview-panel-${uid}-kendaraan`"
        class="flex flex-col gap-3 p-3.5"
        role="tabpanel"
        :aria-labelledby="`preview-tab-${uid}-kendaraan`"
      >
        <div class="flex items-center justify-start gap-3 rounded-lg bg-soft p-[13px]">
          <span
            class="inline-flex size-[38px] shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-car" class="size-6" />
          </span>
          <div>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Kendaraan</p>
            <p class="mt-0.5 mb-0 text-[0.9375rem] font-semibold tracking-[-0.02em]">
              Mobil Keluarga
            </p>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">
              Toyota Avanza 2021, B 1234 XYZ
            </p>
          </div>
          <div class="ms-auto text-end">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Odometer</p>
            <p
              class="mt-[3px] mb-0 text-base font-semibold leading-[1.25] tracking-[-0.02em] tabular-nums"
            >
              42.500 km
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div class="rounded-lg border border-rule bg-background p-[11px]">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Jadwal servis</p>
            <div
              class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
            >
              <div
                class="inline-flex min-w-11 shrink-0 items-center justify-center rounded-md bg-soft px-1.5 py-1 text-xs font-semibold text-primary"
              >
                18 Nov
              </div>
              <div class="min-w-0 flex-auto">
                <p class="m-0 text-xs font-medium leading-[1.35]">Servis rutin 10.000 km</p>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Terjadwal</p>
              </div>
            </div>
            <p class="m-0 text-xs leading-[1.5] text-muted-foreground">
              Riwayat servis tersimpan di kendaraan yang sama.
            </p>
          </div>

          <div class="rounded-lg border border-rule bg-background p-[11px]">
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Kewajiban</p>
            <div
              v-for="item in obligations"
              :key="item.label"
              class="flex items-center gap-2 border-t border-rule py-[7px] first-of-type:border-t-0"
            >
              <span
                class="inline-flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-soft text-primary"
                aria-hidden="true"
              >
                <UIcon name="i-lucide-file-text" class="size-4" />
              </span>
              <div class="min-w-0 flex-auto">
                <p class="m-0 text-xs font-medium leading-[1.35]">{{ item.label }}</p>
                <p class="m-0 text-xs leading-[1.35] text-muted-foreground">{{ item.state }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        :id="`preview-panel-${uid}-daftar`"
        class="flex flex-col gap-3 p-3.5"
        role="tabpanel"
        :aria-labelledby="`preview-tab-${uid}-daftar`"
      >
        <div class="flex items-center justify-between gap-3 rounded-lg bg-soft p-[13px]">
          <div>
            <p class="m-0 text-xs leading-[1.35] text-muted-foreground">Daftar belanja</p>
            <p class="mt-0.5 mb-0 text-[0.9375rem] font-semibold tracking-[-0.02em]">
              Belanja mingguan
            </p>
          </div>
          <span class="text-xs leading-[1.35] text-muted-foreground">4 item</span>
        </div>

        <div class="border-t border-rule">
          <div
            v-for="item in shopping"
            :key="item.label"
            class="flex items-center gap-2.5 border-b border-rule py-[9px]"
          >
            <span
              class="inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border text-primary-foreground"
              :class="item.done ? 'border-primary bg-primary' : 'border-border'"
              aria-hidden="true"
            >
              <UIcon v-if="item.done" name="i-lucide-check" class="size-3.5" />
            </span>
            <span
              class="min-w-0 flex-auto"
              :class="item.done ? 'text-muted-foreground line-through' : ''"
              >{{ item.label }}</span
            >
            <span class="shrink-0 text-xs font-semibold tabular-nums">{{
              formatRupiah(item.price)
            }}</span>
          </div>
        </div>

        <div class="flex items-baseline justify-between gap-3 pt-2.5 text-xs">
          <span>Estimasi total</span>
          <strong class="text-[0.9375rem] tabular-nums">{{ formatRupiah(188000) }}</strong>
        </div>

        <p class="m-0 text-xs leading-[1.5] text-muted-foreground">
          Item yang selesai dapat dicatat sebagai pengeluaran.
        </p>
      </div>
    </Transition>

    <p
      class="m-0 border-t border-rule px-3.5 pt-2 pb-[11px] text-xs leading-[1.4] text-muted-foreground text-pretty"
    >
      Pratinjau antarmuka dengan data sintetis. Bukan tangkapan layar akun pengguna.
    </p>
  </div>
</template>
