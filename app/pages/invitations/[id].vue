<script setup lang="ts">
import type { HouseholdInvitationSummary } from '~/types/householdInvitations'

definePageMeta({ layout: 'auth', middleware: ['auth', 'verified'] })

const route = useRoute()
const auth = useAuth()
const toast = useToast()
const invitations = useInvitations()
const { items, pending, submitting, error, load, accept } = invitations

const invitationId = computed(() => String(route.params.id ?? ''))
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const invitation = computed<HouseholdInvitationSummary | null>(() =>
  items.value.find(item => item.id === invitationId.value) ?? null
)
const alreadyInHousehold = computed(() => auth.household.value !== null)
const canAccept = computed(() => token.value !== '' && !alreadyInHousehold.value)

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

async function onAccept(): Promise<void> {
  if (!canAccept.value) {
    return
  }

  const householdName = invitation.value?.household.name
  const member = await accept(invitationId.value, token.value)

  if (!member) {
    return
  }

  await auth.refresh()
  toast.add({
    title: 'Undangan diterima',
    description: `Anda bergabung dengan ${householdName ?? 'rumah tangga'}.`,
    color: 'success'
  })
  await navigateTo(auth.postAuthDestination())
}

await load()
</script>

<template>
  <div class="flex w-full flex-col gap-5">
    <div>
      <p class="text-sm text-muted">Undangan rumah tangga</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-highlighted">Bergabung dengan rumah tangga</h1>
      <p class="mt-1 text-sm text-muted">
        Terima undangan untuk menjadi anggota rumah tangga yang mengundang Anda.
      </p>
    </div>

    <UAlert
      v-if="!token"
      color="error"
      variant="soft"
      title="Tautan undangan tidak lengkap"
      description="Tautan ini tidak memuat token undangan. Minta tautan terbaru kepada pemilik rumah tangga."
    />

    <template v-else>
      <div v-if="pending && !invitation" class="flex flex-col gap-3" aria-label="Memuat undangan">
        <USkeleton class="h-28" />
      </div>

      <div v-else-if="invitation" class="rounded-2xl border border-default bg-background p-4">
        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-muted">Rumah tangga</dt>
            <dd class="text-right font-medium text-highlighted">{{ invitation.household.name }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">Email diundang</dt>
            <dd class="text-right font-medium text-highlighted">{{ invitation.email }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted">Berlaku sampai</dt>
            <dd class="text-right font-medium text-highlighted">{{ formatExpiry(invitation.expires_at) }}</dd>
          </div>
        </dl>
      </div>

      <UAlert
        v-else-if="!error"
        color="warning"
        variant="soft"
        title="Undangan tidak ditemukan untuk akun ini"
        description="Undangan mungkin sudah kedaluwarsa, sudah diterima, atau ditujukan untuk email lain. Anda tetap dapat mencoba menerima tautan ini."
      />

      <UAlert
        v-if="alreadyInHousehold"
        color="warning"
        variant="soft"
        title="Akun ini sudah tergabung dalam rumah tangga"
        description="Kontrak saat ini belum menyediakan pemilihan rumah tangga aktif, sehingga undangan tidak dapat diterima dari akun yang sudah memiliki rumah tangga."
      />

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        title="Undangan belum dapat diproses"
        :description="error"
      />

      <UButton
        block
        size="xl"
        :loading="submitting"
        :disabled="submitting || !canAccept"
        @click="onAccept"
      >
        Terima undangan
      </UButton>

      <UButton
        block
        color="neutral"
        variant="ghost"
        :to="alreadyInHousehold ? '/dashboard' : '/onboarding'"
      >
        Kembali
      </UButton>
    </template>
  </div>
</template>
