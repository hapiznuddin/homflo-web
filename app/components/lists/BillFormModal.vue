<script setup lang="ts">
import { defineEmits, type EmitsOptions, type PropType, ref, computed } from 'vue'
import { useToast } from '~/composables/useToast'
import { useLists } from '~/composables/useLists'
import { useRoute } from 'nuxt'
import { useStore } from 'vuex'

const props = defineProps<{
  modelValue: boolean
  listId: string
}>const emit = defineEmits<[ 'update:modelValue' ]>const router = useRouter()
const store = useStore()
const toast = useToast()
const { createListItem, mapErrorCode, LIST_ERROR_CODES } = useLists()

const title = ref('')
const quantity = ref(null as string | null)
const unit = ref(null as string | null)
const estimated_price = ref(null as string | null)
const submitting = ref(false)
const error = ref<string | null>(null)

// Emit close
function close(): void {
  emit('update:modelValue', false)
}

// Handle submit
async function onSubmit(): Promise<void> {
  submitting.value = true
  error.value = null

  try {
    await createListItem(listId, { title, quantity: quantity.value, unit: unit.value, estimated_price: estimated_price.value })
    toast.add({
      title: 'Item ditambahkan',
      description: 'Item berhasil ditambahkan ke list.',
      color: 'success'
    })
    emit('update:modelValue', false)
    router.push(`/lists/${listId}`)
  } catch (err: any) {
    error.value = mapErrorCode(err.code as any) || err.message || 'Gagal menambah item'
    toast.add({
      title: 'Error',
      description: error.value,
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-6">Tambah Item List</h2>

    <div v-if="error" class="mb-4 p-3 rounded bg-red-100 text-red-800">
      {{ error }}
    </div>

    <form @submit.prevent="onSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Judul Item</label>
        <input
          v-model="title"
          type="text"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          required
          placeholder="Contoh: Sabun cuci"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Kuantitas</label>
        <input
          v-model.number="quantity"
          type="number"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="1 (opsional)"
        />
        <p class="text-xs text-muted">Null = tidak ditentukan; bukan 0.</p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Satuan</label>
        <input
          v-model="unit"
          type="text"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="pcs (opsional)"
        />
        <p class="text-xs text-muted">Varchar(20) bebas teks; di-copy persis dari legacy.</p>
      </div>

      <div v-if="estimated_price !== null">
        <label class="block text-sm font-medium mb-2">Harga Estimasi</label>
        <input
          v-model.number="estimated_price"
          type="number"
          class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Estimasi harga (opsional)"
        />
        <p class="text-xs text-muted">Decimal(15,2); diisi saat completion.</p>
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="w-full py-2 px-4 font-medium text-primary hover:bg-primary/10"
      >
        <template v-if="submitting">Membuat...</template>
        <template v-else>Buat Item</template>
      </button>

      <button
        type="button"
        class="w-full py-2 px-4 text-secondary hover:bg-secondary/10"
        @click="close"
      >
        Batal
      </button>
    </form>
  </div>
</template>