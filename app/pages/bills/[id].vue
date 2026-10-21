<script setup lang="ts">
import BillFormModal from '~/components/bills/BillFormModal.vue'
import BillPaymentModal from '~/components/bills/BillPaymentModal.vue'
import BillRecurrenceModal from '~/components/bills/BillRecurrenceModal.vue'
import type { BillDetail, BillFormValues, BillItem, BillPayFormValues, BillRecurrenceFormValues } from '~/types/bills'
import { BILL_UI_STATUS_LABELS, billStatusChipClass, billUiStatus, frequencyLabel } from '~/utils/bills'
import { formatTransactionAmount } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

// Detail tagihan deep-linkable (Phase 15.3.3) — menggantikan
// BillDetailModal: dibuka langsung via /bills/{id} tanpa state tab/modal,
// mandiri terhadap daftar (direct URL & refresh berfungsi). Sumber data
// GET /api/bills/{id} lewat proxy Nuxt yang ada; status/aturan lifecycle
// selalu mengikuti field backend — backend tetap otoritas
// (BILL_ALREADY_PAID, BILL_NOT_PAID, BILL_ARCHIVED, INSUFFICIENT_FUNDS).
definePageMeta({ middleware: ['auth', 'onboarding'] })

const route = useRoute()
const toast = useToast()
const auth = useAuth()
const bills = useBills()
const categories = useCategories()
const wallets = useWallets()

const { items: categoryItems, pending: categoriesPending, error: categoriesError } = categories
const { items: walletItems, pending: walletsPending, error: walletsError } = wallets

const billId = computed(() => String(route.params.id ?? ''))

const detail = ref<BillDetail | null>(null)
const loading = ref(true)
const detailError = ref<string | null>(null)
const notFound = ref(false)
const confirmDelete = ref(false)
const confirmArchive = ref(false)

const formOpen = ref(false)
const payOpen = ref(false)
const recurrenceOpen = ref(false)
const recurrenceSource = ref<BillItem | null>(null)

const isOwner = computed(() => auth.isHouseholdOwner.value)

// 404 (ID asing/rusak) = state khusus: tanpa retry — hanya tawarkan
// kembali ke daftar. Proxy [id].get mempertahankan status 401/404 utuh.
function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false
  }

  const top = err as { statusCode?: number, status?: number, data?: unknown }

  if (top.statusCode === 404 || top.status === 404) {
    return true
  }

  // Envelope Laravel: { data: { error: { code } } } — bisa nested satu
  // level lagi saat diteruskan Nitro.
  let node: unknown = top

  for (let depth = 0; depth < 3; depth++) {
    if (typeof node !== 'object' || node === null) {
      break
    }

    const candidate = node as { error?: { code?: string }, data?: unknown }

    if (candidate.error?.code === 'BILL_NOT_FOUND') {
      return true
    }

    node = candidate.data
  }

  return false
}

async function loadDetail(): Promise<void> {
  loading.value = true
  detailError.value = null
  notFound.value = false
  confirmDelete.value = false
  confirmArchive.value = false

  try {
    detail.value = await bills.fetchOne(billId.value)
  } catch (err) {
    detail.value = null
    notFound.value = isNotFound(err)
    detailError.value = readError(err, 'Detail belum dapat dimuat.')
  } finally {
    loading.value = false
  }
}

// Peringatan "periode aktif terakhir" (G-1) hanya boleh muncul bila
// daftar benar-benar termuat — direct URL tanpa konteks daftar tidak
// boleh mengklaim seri tanpa data (guard: items kosong = tanpa klaim).
const lastActivePeriod = computed(() => {
  const bill = detail.value
  const recurrenceId = bill?.recurrence?.id

  if (!bill || !recurrenceId) {
    return false
  }

  if (bills.items.value.length === 0) {
    return false
  }

  return bills.items.value.every(other =>
    other.id === bill.id || !other.is_active || other.recurrence?.id !== recurrenceId
  )
})

const statusKey = computed(() => detail.value ? billUiStatus(detail.value) : 'unpaid')

const deleteDescription = computed(() => {
  const parts: string[] = ['Data yang dihapus tidak dapat dikembalikan.']
  const recurrence = detail.value?.recurrence

  if (recurrence) {
    parts.push('Periode ini dilewati secara PERMANEN — tidak akan dibuat ulang.')
    parts.push(
      'Menghapus tagihan TIDAK menghentikan jadwal: backend tetap dapat membuat periode baru nanti. '
      + 'Untuk menghentikan seluruh jadwal, nonaktifkan lewat Ubah jadwal.'
    )

    if (lastActivePeriod.value) {
      parts.push(
        'Ini periode AKTIF terakhir dari jadwal ini — nonaktifkan jadwal lebih dulu bila Anda ingin '
        + 'serinya berhenti setelah penghapusan.'
      )
    }
  }

  return parts.join(' ')
})

function openPay(): void {
  bills.clearError()
  // Dimuat saat dibutuhkan (fresh-guard composable mencegah pemuatan
  // berulang); read-only GET /api/wallets.
  void wallets.load()
  payOpen.value = true
}

async function onPaySubmit(values: BillPayFormValues): Promise<void> {
  const result = await bills.pay(billId.value, values)

  if (result) {
    payOpen.value = false
    toast.add({
      title: 'Tagihan dibayar',
      description: 'Pembayaran lunas tercatat.',
      color: 'success'
    })

    await loadDetail()
    void wallets.refresh()
  }
}

function onPayOpenChange(value: boolean): void {
  payOpen.value = value

  if (!value) {
    // Tutup gagal/selesai dari UI: buang error modal agar tidak
    // menempel, lalu segarkan status terbaru (mis. sudah dibayar).
    bills.clearError()
    void bills.refresh()
    void loadDetail()
  }
}

function openEdit(): void {
  if (!detail.value) {
    return
  }

  bills.clearError()
  // Non-blocking (fresh-guard composable mencegah pemuatan berulang).
  void categories.load()
  formOpen.value = true
}

async function onFormSubmit(values: BillFormValues): Promise<void> {
  const saved = await bills.update(billId.value, values)

  if (saved) {
    formOpen.value = false
    toast.add({
      title: 'Tagihan diubah',
      description: 'Data tersimpan.',
      color: 'success'
    })

    // Bill segar dari server (termasuk payments) — PATCH mengembalikan
    // BillItem tanpa riwayat, jadi muat ulang detail penuh.
    await loadDetail()
  }
}

async function onDeleteRequest(): Promise<void> {
  if (!detail.value) {
    return
  }

  if (!confirmDelete.value) {
    confirmDelete.value = true
    confirmArchive.value = false

    return
  }

  const target = detail.value
  const ok = await bills.remove(target.id)

  if (ok) {
    toast.add({
      title: 'Tagihan dihapus',
      description: target.recurrence
        ? 'Periode ini dilewati secara permanen; jadwal tidak ikut berhenti.'
        : 'Data terhapus.',
      color: 'success'
    })

    await navigateTo('/bills')
  }
}

async function onArchiveRequest(): Promise<void> {
  if (!detail.value) {
    return
  }

  if (!confirmArchive.value) {
    confirmArchive.value = true
    confirmDelete.value = false

    return
  }

  const ok = await bills.archive(detail.value.id)

  if (ok) {
    toast.add({
      title: 'Tagihan diarsipkan',
      description: 'Tersimpan di tab Arsip; riwayat pembayaran tetap ada.',
      color: 'success'
    })

    await navigateTo('/bills')
  }
}

function openRecurrence(bill: BillItem): void {
  if (!bill.recurrence) {
    return
  }

  bills.clearError()
  recurrenceSource.value = bill
  recurrenceOpen.value = true
}

async function onRecurrenceSubmit(changes: Partial<BillRecurrenceFormValues>): Promise<void> {
  const source = recurrenceSource.value

  if (!source?.recurrence) {
    return
  }

  const updated = await bills.updateRecurrence(source.recurrence.id, changes)

  if (updated) {
    recurrenceOpen.value = false
    recurrenceSource.value = null
    toast.add({
      title: 'Jadwal diubah',
      description: 'Hanya periode yang belum dibayar dan aktif yang diperbarui.',
      color: 'success'
    })

    // Bill segar: tautan recurrence/periode pada baris bisa berubah.
    await loadDetail()
  }
}

function onRecurrenceOpenChange(value: boolean): void {
  recurrenceOpen.value = value

  if (!value) {
    recurrenceSource.value = null
    bills.clearError()
  }
}

await loadDetail()
</script>

<template>
  <div class="flex w-full flex-col gap-4 sm:gap-5">
    <NuxtLink
      to="/bills"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted hover:text-highlighted"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" aria-hidden="true" />
      Kembali ke daftar
    </NuxtLink>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-3" aria-label="Memuat detail tagihan">
      <USkeleton class="h-24 w-full rounded-2xl" />
      <USkeleton class="h-40 w-full rounded-2xl" />
    </div>

    <!-- Not-found (404): tanpa retry, hanya jalan pulang. -->
    <div
      v-else-if="notFound"
      class="flex flex-col items-center gap-3 rounded-2xl border border-default bg-background px-4 py-10 text-center"
    >
      <span class="flex size-11 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
        <UIcon name="i-lucide-search-x" class="size-5 text-muted" aria-hidden="true" />
      </span>
      <p class="text-sm font-medium text-highlighted">Tagihan tidak ditemukan.</p>
      <p class="text-sm text-muted">Tagihan mungkin sudah dihapus atau bukan milik rumah tangga ini.</p>
      <UButton color="neutral" variant="outline" to="/bills">Kembali ke daftar</UButton>
    </div>

    <!-- Error lain + retry -->
    <div v-else-if="detailError" class="flex flex-col gap-3">
      <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="detailError" />
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/bills">Kembali ke daftar</UButton>
        <UButton block @click="loadDetail()">Coba lagi</UButton>
      </div>
    </div>

    <template v-else-if="detail">
      <section class="flex flex-col gap-3 rounded-2xl border border-default bg-background p-4 sm:p-5">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon name="i-lucide-receipt" class="size-5 text-default" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xl font-bold tracking-tight text-highlighted">
              {{ formatTransactionAmount(detail.amount) }}
            </p>
            <p class="truncate text-sm text-muted">{{ detail.title }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="billStatusChipClass(statusKey)">
            {{ BILL_UI_STATUS_LABELS[statusKey] }}
          </span>
        </div>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Jatuh tempo</dt>
            <dd class="font-medium">{{ detail.due_date ? formatYmd(detail.due_date) : 'Tanpa tanggal' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Kategori</dt>
            <dd class="font-medium">{{ detail.category?.name ?? 'Tanpa kategori' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Sudah dibayar</dt>
            <dd class="font-medium text-success">{{ formatTransactionAmount(detail.paid_amount) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Sisa tagihan</dt>
            <dd class="font-medium">{{ formatTransactionAmount(detail.remaining_amount) }}</dd>
          </div>
          <div v-if="detail.recurrence" class="flex justify-between gap-3">
            <dt class="text-muted">Jadwal</dt>
            <dd class="text-right font-medium">
              {{ frequencyLabel(detail.recurrence.frequency) }} · tanggal {{ detail.recurrence.due_day }}
              · {{ detail.recurrence.is_active ? 'aktif' : 'nonaktif' }}
            </dd>
          </div>
          <div v-if="detail.notes" class="flex flex-col gap-1">
            <dt class="text-muted">Catatan</dt>
            <dd>{{ detail.notes }}</dd>
          </div>
        </dl>

        <div v-if="detail.payments.length > 0" class="flex flex-col gap-2">
          <p class="text-xs font-medium text-muted uppercase">Riwayat pembayaran</p>
          <ul class="flex flex-col divide-y divide-default rounded-2xl border border-default px-3">
            <li
              v-for="payment in detail.payments"
              :key="payment.id"
              class="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span class="min-w-0">
                <span class="block font-medium text-highlighted">{{ formatTransactionAmount(payment.amount) }}</span>
                <span class="block truncate text-xs text-muted">
                  {{ payment.occurred_on ? formatYmd(payment.occurred_on) : 'Tanpa tanggal' }}<span v-if="payment.wallet"> · {{ payment.wallet.name }}</span>
                </span>
              </span>
              <span v-if="payment.description" class="max-w-32 truncate text-right text-xs text-muted">
                {{ payment.description }}
              </span>
            </li>
          </ul>
          <p class="text-[11px] text-muted">
            Pembayaran tagihan bersifat tetap — aplikasi tidak menyediakan ubah/hapus/reversal.
          </p>
        </div>

        <!-- Aksi: owner-only + mengikuti lifecycle backend (Phase 15.3.3,
             aturan tidak berubah): unpaid (termasuk overdue) → Bayar/Ubah/
             Hapus; paid → Arsipkan; arsip → read-only. -->
        <div v-if="isOwner && !confirmDelete && !confirmArchive" class="flex flex-col gap-2 pt-1">
          <div v-if="detail.is_active && detail.status === 'unpaid'" class="flex gap-2">
            <UButton block @click="openPay()">Bayar</UButton>
            <UButton color="neutral" variant="outline" block @click="openEdit()">Ubah</UButton>
            <UButton color="error" variant="outline" @click="confirmDelete = true">Hapus</UButton>
          </div>

          <div v-else-if="detail.is_active && detail.status === 'paid'" class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="confirmArchive = true">
              Arsipkan
            </UButton>
          </div>

          <p v-if="!detail.is_active" class="text-xs text-muted">
            Tagihan diarsipkan — hanya dapat dibaca.
          </p>

          <UButton
            v-if="detail.recurrence"
            color="neutral"
            variant="outline"
            icon="i-lucide-repeat"
            block
            @click="openRecurrence(detail)"
          >
            Ubah jadwal
          </UButton>
        </div>

        <div v-else-if="isOwner && confirmDelete" class="flex flex-col gap-2 pt-1">
          <UAlert color="error" variant="soft" title="Hapus tagihan ini?" :description="deleteDescription" />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="confirmDelete = false">Batal</UButton>
            <UButton color="error" block :loading="bills.submitting.value" :disabled="bills.submitting.value" @click="onDeleteRequest()">
              Ya, hapus
            </UButton>
          </div>
        </div>

        <div v-else-if="isOwner && confirmArchive" class="flex flex-col gap-2 pt-1">
          <UAlert
            color="warning"
            variant="soft"
            title="Arsipkan tagihan ini?"
            description="Arsip bersifat permanen — aplikasi tidak menyediakan aksi kembalikan. Tagihan lunas tetap terbaca di tab Arsip beserta riwayat pembayarannya."
          />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="confirmArchive = false">Batal</UButton>
            <UButton block :loading="bills.submitting.value" :disabled="bills.submitting.value" @click="onArchiveRequest()">
              Ya, arsipkan
            </UButton>
          </div>
        </div>

        <p v-if="!isOwner" class="text-xs text-muted">
          Anda anggota rumah tangga — tagihan hanya dapat dilihat; pengelolaan dilakukan pemilik.
        </p>
      </section>
    </template>

    <BillFormModal
      v-model:open="formOpen"
      :editing="detail"
      :submitting="bills.submitting.value"
      :error="bills.error.value"
      :field-errors="bills.fieldErrors.value"
      :categories="categoryItems"
      :categories-pending="categoriesPending"
      :categories-error="categoriesError"
      @submit="onFormSubmit"
      @retry-categories="categories.refresh()"
      @open-recurrence="openRecurrence"
    />

    <BillPaymentModal
      :open="payOpen"
      :bill="detail"
      :wallets="walletItems"
      :wallets-pending="walletsPending"
      :wallets-error="walletsError"
      :submitting="bills.submitting.value"
      :error="bills.error.value"
      @update:open="onPayOpenChange"
      @submit="onPaySubmit"
      @retry-wallets="wallets.refresh()"
    />

    <BillRecurrenceModal
      :open="recurrenceOpen"
      :bill="recurrenceSource"
      :submitting="bills.submitting.value"
      :error="bills.error.value"
      :field-errors="bills.fieldErrors.value"
      @update:open="onRecurrenceOpenChange"
      @submit="onRecurrenceSubmit"
    />
  </div>
</template>
