<script setup lang="ts">
import type { CreatedHouseholdInvitation } from '~/types/householdInvitations'
import type { HouseholdMemberItem } from '~/types/householdMembers'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const members = useHouseholdMembers()
const auth = useAuth()
const {
  items,
  pending,
  submitting,
  error,
  inviteFieldErrors,
  loaded,
  load,
  invite,
  changeRole,
  remove,
  clearInviteError
} = members
const toast = useToast()
const requestUrl = useRequestURL()
const inviteEmail = ref('')
const inviteLocalError = ref<string | null>(null)
const lastInvite = ref<CreatedHouseholdInvitation | null>(null)
const copied = ref(false)
const confirmRemoveId = ref<string | null>(null)
const canManage = computed(() => auth.isHouseholdOwner.value)
const inviteError = computed(() => inviteLocalError.value ?? inviteFieldErrors.value.email ?? null)

const inviteLink = computed(() => {
  if (!lastInvite.value) {
    return ''
  }

  const id = encodeURIComponent(lastInvite.value.invitation.id)
  const token = encodeURIComponent(lastInvite.value.token)

  return `${requestUrl.origin}/invitations/${id}?token=${token}`
})

function roleLabel(role: HouseholdMemberItem['role']): string {
  return role === 'owner' ? 'Owner' : 'Member'
}

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

// Validasi bentuk email di klien hanya untuk umpan balik cepat. Aturan
// otoritatif tetap validasi Laravel (`required|string|email|max:255`).
function validateInviteEmail(value: string): string | null {
  const email = value.trim()

  if (!email) {
    return 'Email wajib diisi.'
  }

  if (email.length > 255) {
    return 'Email maksimal 255 karakter.'
  }

  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    return 'Format email tidak valid.'
  }

  return null
}

function onInviteInput(): void {
  inviteLocalError.value = null
  clearInviteError()
}

async function submitInvite(): Promise<void> {
  inviteLocalError.value = validateInviteEmail(inviteEmail.value)

  if (inviteLocalError.value) {
    return
  }

  const created = await invite(inviteEmail.value)

  if (!created) {
    return
  }

  inviteLocalError.value = null
  lastInvite.value = created
  copied.value = false
  inviteEmail.value = ''
  toast.add({
    title: 'Undangan dibuat',
    description: 'Bagikan tautan undangan kepada anggota yang dituju.',
    color: 'success'
  })
}

async function copyInviteLink(): Promise<void> {
  if (!inviteLink.value) {
    return
  }

  // Peramban tanpa Clipboard API (mis. origin non-secure) tetap harus
  // mendapat jalan keluar: salin manual dari kolom tautan.
  if (!navigator.clipboard) {
    toast.add({
      title: 'Salin tautan secara manual',
      description: 'Peramban ini tidak menyediakan akses papan klip. Pilih dan salin tautan dari kolom di atas.',
      color: 'warning'
    })

    return
  }

  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
    toast.add({ title: 'Tautan disalin', color: 'success' })
  } catch {
    toast.add({
      title: 'Tautan belum dapat disalin',
      description: 'Salin tautan secara manual dari kolom di atas.',
      color: 'error'
    })
  }
}

function retry(): void {
  void load(true)
}

async function updateRole(member: HouseholdMemberItem, event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement
  const role = select.value as HouseholdMemberItem['role']

  if (role === member.role) {
    return
  }

  if (await changeRole(member.id, role)) {
    toast.add({ title: 'Peran anggota diubah', color: 'success' })
  } else {
    // Jangan biarkan select menampilkan peran yang gagal disimpan server.
    select.value = member.role
  }
}

async function removeMember(member: HouseholdMemberItem): Promise<void> {
  if (confirmRemoveId.value !== member.id) {
    confirmRemoveId.value = member.id

    return
  }

  if (await remove(member.id)) {
    toast.add({ title: 'Anggota dihapus', color: 'success' })
  }

  confirmRemoveId.value = null
}

await load()
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-5">
    <div>
      <UButton to="/settings" color="neutral" variant="link" icon="i-lucide-arrow-left" class="-ml-2">Pengaturan</UButton>
      <h1 class="mt-2 text-xl font-bold tracking-tight text-highlighted sm:text-2xl">Anggota</h1>
      <p class="mt-1 text-sm text-muted">Anggota rumah tangga aktif dan perannya.</p>
    </div>

    <div v-if="pending && !loaded" class="flex flex-col gap-3" aria-label="Memuat anggota">
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && !loaded"
      color="error"
      variant="soft"
      title="Data anggota belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: retry }]"
    />

    <template v-else>
      <form
        v-if="canManage"
        class="flex flex-wrap items-start gap-2 rounded-2xl border border-default bg-background p-3"
        novalidate
        @submit.prevent="submitInvite"
      >
        <div class="min-w-0 flex-1">
          <UInput
            v-model="inviteEmail"
            type="email"
            autocomplete="email"
            placeholder="email@contoh.com"
            aria-label="Email anggota yang diundang"
            :disabled="submitting"
            :aria-invalid="inviteError ? 'true' : undefined"
            :aria-describedby="inviteError ? 'invite-email-error' : undefined"
            class="w-full"
            required
            @update:model-value="onInviteInput"
          />
          <p v-if="inviteError" id="invite-email-error" role="alert" class="mt-1 text-xs text-error">
            {{ inviteError }}
          </p>
        </div>
        <UButton type="submit" :loading="submitting" :disabled="submitting">Undang</UButton>
      </form>

      <div
        v-if="canManage && lastInvite"
        class="flex flex-col gap-3 rounded-2xl border border-default bg-elevated/40 p-4"
        aria-live="polite"
      >
        <div>
          <p class="text-sm font-medium text-highlighted">Tautan undangan untuk {{ lastInvite.invitation.email }}</p>
          <p class="mt-1 text-xs text-muted">
            Berlaku sampai {{ formatExpiry(lastInvite.invitation.expires_at) }}. Homflo belum mengirim email otomatis;
            bagikan tautan ini langsung kepada anggota. Tautan berisi token rahasia dan hanya ditampilkan sekali.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UInput
            :model-value="inviteLink"
            readonly
            aria-label="Tautan undangan"
            class="min-w-0 flex-1"
          />
          <UButton color="neutral" variant="outline" @click="copyInviteLink">
            {{ copied ? 'Tersalin' : 'Salin' }}
          </UButton>
        </div>
        <a :href="inviteLink" target="_blank" rel="noopener noreferrer" class="text-sm underline">
          Buka tautan undangan
        </a>
      </div>

      <div v-if="items.length === 0" class="rounded-2xl border border-default bg-background px-4 py-10 text-center">
        <p class="text-sm font-medium text-highlighted">Belum ada anggota yang dapat ditampilkan.</p>
        <p class="mt-1 text-xs text-muted">Muat ulang data anggota untuk memeriksa kembali.</p>
        <UButton color="neutral" variant="outline" size="sm" class="mt-3" @click="retry">Muat ulang</UButton>
      </div>

      <ul v-else class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-background">
        <li v-for="member in items" :key="member.id" class="flex flex-wrap items-center gap-3 px-4 py-3">
          <UAvatar :alt="member.name" :text="member.name.charAt(0).toUpperCase()" size="sm" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-highlighted">{{ member.name }}</p>
            <p class="truncate text-xs text-muted">{{ member.email }}</p>
          </div>
          <template v-if="canManage && confirmRemoveId !== member.id">
            <select
              :value="member.role"
              :disabled="submitting"
              :aria-label="`Peran ${member.name}`"
              class="rounded-md border border-default bg-background px-2 py-1 text-xs"
              @change="updateRole(member, $event)"
            >
              <option value="owner">Owner</option>
              <option value="member">Member</option>
            </select>
            <UButton color="error" variant="ghost" size="xs" :disabled="submitting" @click="removeMember(member)">Hapus</UButton>
          </template>
          <template v-else-if="canManage">
            <span class="text-xs text-muted">Hapus {{ member.name }}?</span>
            <UButton color="neutral" variant="outline" size="xs" @click="confirmRemoveId = null">Batal</UButton>
            <UButton color="error" size="xs" :loading="submitting" :disabled="submitting" @click="removeMember(member)">Ya, hapus</UButton>
          </template>
          <UBadge v-else color="neutral" variant="subtle">{{ roleLabel(member.role) }}</UBadge>
        </li>
      </ul>
    </template>

    <UAlert
      v-if="error && loaded"
      color="error"
      variant="soft"
      title="Aksi terakhir gagal."
      :description="error"
    />
  </div>
</template>
