<script setup lang="ts">
import type { HouseholdMemberItem } from '~/types/householdMembers'

definePageMeta({ middleware: ['auth', 'onboarding'] })

const members = useHouseholdMembers()
const auth = useAuth()
const { items, pending, submitting, error, load, invite, changeRole, remove } = members
const toast = useToast()
const inviteEmail = ref('')
const confirmRemoveId = ref<string | null>(null)
const canManage = computed(() => auth.isHouseholdOwner.value)

function roleLabel(role: HouseholdMemberItem['role']): string {
  return role === 'owner' ? 'Owner' : 'Member'
}

async function submitInvite(): Promise<void> {
  if (await invite(inviteEmail.value)) {
    toast.add({ title: 'Undangan dikirim', description: 'Undangan anggota berhasil dibuat.', color: 'success' })
    inviteEmail.value = ''
  }
}

async function updateRole(member: HouseholdMemberItem, event: Event): Promise<void> {
  const role = (event.target as HTMLSelectElement).value as HouseholdMemberItem['role']

  if (role === member.role) {
    return
  }

  if (await changeRole(member.id, role)) {
    toast.add({ title: 'Peran anggota diubah', color: 'success' })
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

    <div v-if="pending && items.length === 0" class="flex flex-col gap-3" aria-label="Memuat anggota">
      <USkeleton v-for="index in 3" :key="index" class="h-16" />
    </div>

    <UAlert
      v-else-if="error && items.length === 0"
      color="error"
      variant="soft"
      title="Data anggota belum dapat dimuat."
      :description="error"
      :actions="[{ label: 'Coba lagi', onClick: load }]"
    />

    <template v-else>
      <form v-if="canManage" class="flex gap-2 rounded-2xl border border-default bg-background p-3" @submit.prevent="submitInvite">
        <UInput v-model="inviteEmail" type="email" autocomplete="email" placeholder="email@contoh.com" :disabled="submitting" class="min-w-0 flex-1" required />
        <UButton type="submit" :loading="submitting" :disabled="submitting">Undang</UButton>
      </form>

      <ul class="divide-y divide-default overflow-hidden rounded-2xl border border-default bg-background">
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
      v-if="error && items.length > 0"
      color="error"
      variant="soft"
      title="Pemuatan terakhir gagal."
      :description="error"
    />
  </div>
</template>
