import { use into useApiError } from '~/composables/useApiError'

// Import types
import type {
  ListSummary,
  ListItem,
  ListItemFormValues,
  ListCreateFormValues,
  ListArchiveFormValues,
  ListItemExpense,
  ListItemExpenseResponse,
  ListsResponse,
  ListDetailResponse,
  ListItemsResponse,
  LIST_ERROR_CODES,
  ListErrorCode,
} from '~/types/lists'

// Import existing composables
import { useLaravel } from '~/composables/useLaravel'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'

export function useLists() {
  const { api, nuxtApi, csrf } = useLaravel()
  const toast = useToast()
  const auth = useAuth()

  // GET /api/lists — index
  async function loadLists(includeArchived = false): Promise<ListsResponse> {
    try {
      const result = await nuxtApi.get('/lists', {
        params: { include_archived: includeArchived ? 'true' : undefined },
      })
      return result.data as ListsResponse
    } catch (err) {
      throw useApiError(err, 'Gagal memuat daftar list')
    }
  }

  // GET /api/lists/default
  async function loadDefaultList(): Promise<ListSummary | null> {
    try {
      const result = await nuxtApi.get('/lists/default')
      return result.data.data as ListSummary
    } catch (err) {
      const code = useApiError(err, 'Gagal memuat default list')
      if (code === 'LIST_REQUIRED') return null
      throw err
    }
  }

  // GET /api/lists/{list}
  async function getList(listId: string): Promise<ListSummary> {
    try {
      const result = await nuxtApi.get(`/lists/${listId}`)
      return result.data.data as ListSummary
    } catch (err) {
      throw useApiError(err, `Gagal memuat list ${listId}`)
    }
  }

  // GET /api/lists/{list}/items
  async function loadListItems(listId: string, status?: 'active' | 'completed'): Promise<ListItemsResponse> {
    try {
      let params: any = {}
      if (status) {
        params.status = status
      }
      const result = await nuxtApi.get(`/lists/${listId}/items`, { params })
      return result.data as ListItemsResponse
    } catch (err) {
      throw useApiError(err, `Gagal memuat item list ${listId}`)
    }
  }

  // POST /api/lists — create (verified gate)
  async function createList(values: ListCreateFormValues): Promise<ListSummary> {
    try {
      const result = await nuxtApi.post('/lists', values, {
        headers: await csrf(),
      })
      return result.data.data as ListSummary
    } catch (err) {
      throw useApiError(err, 'Gagal membuat list')
    }
  }

  // PATCH /api/lists/{list}
  async function updateList(listId: string, values: { name?: string }): Promise<ListSummary> {
    try {
      const result = await nuxtApi.patch(`/lists/${listId}`, values, {
        headers: await csrf(),
      })
      return result.data.data as ListSummary
    } catch (err) {
      throw useApiError(err, `Gagal memperbarui list ${listId}`)
    }
  }

  // POST /api/lists/{list}/archive
  async function archiveList(listId: string): Promise<ListSummary> {
    try {
      const result = await nuxtApi.post(`/lists/${listId}/archive`)
      return result.data.data as ListSummary
    } catch (err) {
      throw useApiError(err, `Gagal mengarsip list ${listId}`)
    }
  }

  // POST /api/lists/{list}/restore
  async function restoreList(listId: string): Promise<ListSummary> {
    try {
      const result = await nuxtApi.post(`/lists/${listId}/restore`)
      return result.data.data as ListSummary
    } catch (err) {
      throw useApiError(err, `Gagal memulihkan list ${listId}`)
    }
  }

  // POST /api/lists/{list}/items — store
  async function createListItem(listId: string, values: ListItemFormValues): Promise<ListItem> {
    try {
      const result = await nuxtApi.post(`/lists/${listId}/items`, values, {
        headers: await csrf(),
      })
      return result.data.data as ListItem
    } catch (err) {
      throw useApiError(err, 'Gagal membuat item list')
    }
  }

  // GET /api/lists/{list}/items/{item}
  async function getListItem(listId: string, itemId: string): Promise<ListItem> {
    try {
      const result = await nuxtApi.get(`/lists/${listId}/items/${itemId}`)
      return result.data.data as ListItem
    } catch (err) {
      throw useApiError(err, `Gagal memuat item list ${itemId}`)
    }
  }

  // PATCH /api/lists/{list}/items/{item}
  async function updateListItem(listId: string, itemId: string, values: Partial<ListItemFormValues>): Promise<ListItem> {
    try {
      const result = await nuxtApi.patch(`/lists/${listId}/items/${itemId}`, values, {
        headers: await csrf(),
      })
      return result.data.data as ListItem
    } catch (err) {
      throw useApiError(err, `Gagal memperbarui item list ${itemId}`)
    }
  }

  // POST /api/lists/{list}/items/{item}/complete
  async function completeListItem(listId: string, itemId: string): Promise<ListItem> {
    try {
      const result = await nuxtApi.post(`/lists/${listId}/items/${itemId}/complete`)
      return result.data.data as ListItem
    } catch (err) {
      throw useApiError(err, `Gagal menyelesaikan item ${itemId}`)
    }
  }

  // POST /api/lists/{list}/items/{item}/uncomplete
  async function uncompleteListItem(listId: string, itemId: string): Promise<ListItem> {
    try {
      const result = await nuxtApi.post(`/lists/${listId}/items/${itemId}/uncomplete`)
      return result.data.data as ListItem
    } catch (err) {
      throw useApiError(err, `Gagal membatalkan completion item ${itemId}`)
    }
  }

  // POST /api/lists/{list}/items/{item}/expense
  async function createListItemExpense(listId: string, itemId: string, actualPrice?: string): Promise<ListItemExpense> {
    try {
      const result = await nuxtApi.post(
        `/lists/${listId}/items/${itemId}/expense`,
        actualPrice !== undefined ? { actual_price: actualPrice } : {},
        { headers: await csrf() }
      )
      return result.data.data as ListItemExpense
    } catch (err) {
      throw useApiError(err, 'Gagal membuat expense untuk item')
    }
  }

  // Helper: cek apakah user owner rumah tangga
  const isOwner = computed(() => auth.isHouseholdOwner.value)

  // Helper: mapping error code ke pesan user
  function mapErrorCode(code: ListErrorCode): string {
    const messages: Record<ListErrorCode, string> = {
      [LIST_ERROR_CODES.ARCHIVED]: 'List ini diarsipkan; aksi tidak diperbolehkan.',
      [LIST_ERROR_CODES.NOT_FOUND]: 'List tidak ditemukan.',
      [LIST_ERROR_CODES.ITEM_NOT_FOUND]: 'Item list tidak ditemukan.',
      [LIST_ERROR_CODES.ALREADY_COMPLETED]: 'Item sudah completed.',
      [LIST_ERROR_CODES.NOT_COMPLETED]: 'Item belum completed.',
      [LIST_ERROR_CODES.PRICE_LOCKED]: 'Harga actual dikunci; Expense sudah ada.',
      [LIST_ERROR_CODES.ACTUAL_PRICE_REQUIRED]: 'Actual price wajib diisi dan > 0.',
    }
    return messages[code] || 'Terjadi kesalahan.'
  }

  return {
    loadLists,
    loadDefaultList,
    getList,
    loadListItems,
    createList,
    updateList,
    archiveList,
    restoreList,
    createListItem,
    getListItem,
    updateListItem,
    completeListItem,
    uncompleteListItem,
    createListItemExpense,
    isOwner,
    mapErrorCode,
    LIST_ERROR_CODES,
  }
}