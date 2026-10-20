<script setup lang="ts">
import type { BillDetail, BillItem } from '~/types/bills'
import { BILL_UI_STATUS_LABELS, billStatusChipClass, billUiStatus, frequencyLabel } from '~/utils/bills'
import { formatTransactionAmount } from '~/utils/transactions'
import { formatYmd } from '~/utils/format'

// Detail tagihan + riwayat pembayaran (read-only — backend tanpa endpoint
// ubah/hapus pembayaran) + trigger aksi lifecycle. Aksi hanya dirender
// untuk owner dan mengikuti field backend (status/overdue/is_active);
// penyembunyian tombol adalah UX, backend tetap otoritas (BILL_ALREADY_PAID,
// BILL_NOT_PAID, BILL_ARCHIVED).

interface Props {
  open: boolean
  item: BillDetail | null
  loading: boolean
  error: string | null
  deleting: boolean
  confirmDelete: boolean
  archiving: boolean
  confirmArchive: boolean
  isOwner: boolean
  /** true bila bill ini satu-satunya periode AKTIF tersisa dari jadwalnya (deteksi daftar saat ini). */
  lastActivePeriod: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [open: boolean]
  'edit': [bill: BillItem]
  'pay': [bill: BillItem]
  'archive': []
  'delete': []
  'cancel-delete': []
  'cancel-archive': []
  'open-recurrence': [bill: BillItem]
  'retry': []
}>()

const modalOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const statusKey = computed(() => props.item ? billUiStatus(props.item) : 'unpaid')
const statusLabel = computed(() => BILL_UI_STATUS_LABELS[statusKey.value])
const statusClass = computed(() => billStatusChipClass(statusKey.value))

const deleteDescription = computed(() => {
  const parts: string[] = ['Data yang dihapus tidak dapat dikembalikan.']
  const recurrence = props.item?.recurrence

  if (recurrence) {
    parts.push('Periode ini dilewati secara PERMANEN — tidak akan dibuat ulang.')
    parts.push(
      'Menghapus tagihan TIDAK menghentikan jadwal: backend tetap dapat membuat periode baru nanti. '
      + 'Untuk menghentikan seluruh jadwal, nonaktifkan lewat Ubah jadwal.'
    )

    if (props.lastActivePeriod) {
      parts.push(
        'Ini periode AKTIF terakhir dari jadwal ini — nonaktifkan jadwal lebih dulu bila Anda ingin '
        + 'serinya berhenti setelah penghapusan.'
      )
    }
  }

  return parts.join(' ')
})
</script>

<template>
  <UModal v-model:open="modalOpen" title="Detail tagihan">
    <template #body>
      <div v-if="props.loading" class="flex flex-col gap-3" aria-label="Memuat detail tagihan">
        <USkeleton class="h-8 w-full" />
        <USkeleton class="h-5 w-2/3" />
        <USkeleton class="h-5 w-1/2" />
      </div>

      <div v-else-if="props.error" class="flex flex-col gap-3">
        <UAlert color="error" variant="soft" title="Detail belum dapat dimuat." :description="props.error" />
        <UButton color="neutral" variant="outline" block @click="emit('retry')">Coba lagi</UButton>
      </div>

      <div v-else-if="props.item" class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated" aria-hidden="true">
            <UIcon name="i-lucide-receipt" class="size-5 text-default" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-bold tracking-tight text-highlighted">
              {{ formatTransactionAmount(props.item.amount) }}
            </p>
            <p class="truncate text-sm text-muted">{{ props.item.title }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" :class="statusClass">
            {{ statusLabel }}
          </span>
        </div>

        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Jatuh tempo</dt>
            <dd class="font-medium">{{ props.item.due_date ? formatYmd(props.item.due_date) : 'Tanpa tanggal' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Kategori</dt>
            <dd class="font-medium">{{ props.item.category?.name ?? 'Tanpa kategori' }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Sudah dibayar</dt>
            <dd class="font-medium text-success">{{ formatTransactionAmount(props.item.paid_amount) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">Sisa tagihan</dt>
            <dd class="font-medium">{{ formatTransactionAmount(props.item.remaining_amount) }}</dd>
          </div>
          <div v-if="props.item.recurrence" class="flex justify-between gap-3">
            <dt class="text-muted">Jadwal</dt>
            <dd class="text-right font-medium">
              {{ frequencyLabel(props.item.recurrence.frequency) }} · tanggal {{ props.item.recurrence.due_day }}
              · {{ props.item.recurrence.is_active ? 'aktif' : 'nonaktif' }}
            </dd>
          </div>
          <div v-if="props.item.notes" class="flex flex-col gap-1">
            <dt class="text-muted">Catatan</dt>
            <dd>{{ props.item.notes }}</dd>
          </div>
        </dl>

        <div v-if="props.item.payments.length > 0" class="flex flex-col gap-2">
          <p class="text-xs font-medium text-muted uppercase">Riwayat pembayaran</p>
          <ul class="flex flex-col divide-y divide-default rounded-2xl border border-default px-3">
            <li
              v-for="payment in props.item.payments"
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

        <!-- Aksi: owner-only + mengikuti lifecycle backend. -->
        <div v-if="props.isOwner && !props.confirmDelete && !props.confirmArchive" class="flex flex-col gap-2 pt-1">
          <div v-if="props.item.is_active && props.item.status === 'unpaid'" class="flex gap-2">
            <UButton block @click="emit('pay', props.item)">Bayar</UButton>
            <UButton color="neutral" variant="outline" block @click="emit('edit', props.item)">Ubah</UButton>
            <UButton color="error" variant="outline" @click="emit('delete')">Hapus</UButton>
          </div>

          <div v-else-if="props.item.is_active && props.item.status === 'paid'" class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="emit('archive')">
              Arsipkan
            </UButton>
          </div>

          <p v-if="!props.item.is_active" class="text-xs text-muted">
            Tagihan diarsipkan — hanya dapat dibaca.
          </p>

          <UButton
            v-if="props.item.recurrence"
            color="neutral"
            variant="outline"
            icon="i-lucide-repeat"
            block
            @click="emit('open-recurrence', props.item)"
          >
            Ubah jadwal
          </UButton>
        </div>

        <div v-else-if="props.isOwner && props.confirmDelete" class="flex flex-col gap-2 pt-1">
          <UAlert color="error" variant="soft" title="Hapus tagihan ini?" :description="deleteDescription" />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="emit('cancel-delete')">Batal</UButton>
            <UButton color="error" block :loading="props.deleting" :disabled="props.deleting" @click="emit('delete')">Ya, hapus</UButton>
          </div>
        </div>

        <div v-else-if="props.isOwner && props.confirmArchive" class="flex flex-col gap-2 pt-1">
          <UAlert
            color="warning"
            variant="soft"
            title="Arsipkan tagihan ini?"
            description="Arsip bersifat permanen — aplikasi tidak menyediakan aksi kembalikan. Tagihan lunas tetap terbaca di tab Arsip beserta riwayat pembayarannya."
          />
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" block @click="emit('cancel-archive')">Batal</UButton>
            <UButton block :loading="props.archiving" :disabled="props.archiving" @click="emit('archive')">Ya, arsipkan</UButton>
          </div>
        </div>

        <p v-if="!props.isOwner" class="text-xs text-muted">
          Anda anggota rumah tangga — tagihan hanya dapat dilihat; pengelolaan dilakukan pemilik.
        </p>
      </div>
    </template>
  </UModal>
</template>
