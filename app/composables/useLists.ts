import { LIST_ERROR_CODES } from '~/types/lists'
import { readFieldErrors } from '~/composables/useApiError'

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
  ListErrorCode,
} from '~/types/lists'

// ---------------------------------------------------------------------------
// Read-model + mutasi lists: Browser -> Nuxt /api/lists -> Laravel -> PostgreSQL.
// Satu sumber kebenaran tetap di backend; payload selalu envelope { success, data }.
// ---------------------------------------------------------------------------

export function useLists() {
  const lists = useState<ListSummary[]>('lists-items', () => [])
  const selectedList = useState<ListSummary | null>('lists-selected', () => null)
  const selectedItem = useState<ListItem | null>('lists-item-selected', () => null)
  const pending = useState<boolean>('lists-pending', () => false)
  const submitting = useState<boolean>('lists-submitting', () => false)
  const error = useState<string | null>('lists-error', () => null)
  const fieldErrors = useState<Record<string, string>>('lists-field-errors', () => ({}))
  const filters = useState<{ include_archived?: boolean }>('lists-filters', () => ({}))
  const defaultList = useState<ListSummary | null>('lists-default', () => null)
  const items = useState<ListItem[]>('lists-items-detail', () => [])
  const inflightKey = useState<string | null>('lists-inflight', () => null)
  const requestSeq = useState<number>('lists-request-seq', () => 0)

  function requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' }

    if (import.meta.server) {
      const { cookie } = useRequestHeaders(['cookie'])

      if (cookie) {
        headers.Cookie = cookie
      }
    }

    return headers
  }

  async function loadLists(next?: { include_archived?: boolean }, force = false): Promise<void> {
    const active: { include_archived?: boolean } = { ...next }
    filters.value = active
    const key = active.include_archived ? 'archived' : 'active'

    if (inflightKey.value === key) {
      return
    }

    // Already have fresh data for these filters.
    if (!force && lists.value.length > 0 && key === 'active' && !error.value) {
      return
    }

    inflightKey.value = key
    pending.value = true
    error.value = null
    fieldErrors.value = {}
    requestSeq.value += 1

    const current = requestSeq.value

    try {
      const params: Record<string, string> = {}

      if (active.include_archived) {
        params.include_archived = 'true'
      }

      const envelope = await $fetch<{ success: boolean, data: ListSummary[] }>('/api/lists', {
        params,
        credentials: 'include',
        headers: requestHeaders(),
      })

      if (current !== requestSeq.value) {
        return
      }

      lists.value = envelope.data
      items.value = envelope.data
    } catch (err) {
      if (current !== requestSeq.value) {
        return
      }

      error.value = 'Gagal memuat daftar list'
    } finally {
      if (current === requestSeq.value) {
        pending.value = false
        inflightKey.value = null
      }
    }
  }

  async function refreshLists(): Promise<void> {
    await loadLists(undefined, true)
  }

  async function loadDefaultList(): Promise<ListSummary | null> {
    try {
      const envelope = await $fetch<{ success: boolean, data: ListSummary }>('/api/lists/default', {
        credentials: 'include',
        headers: requestHeaders(),
      })

      if (envelope.success && envelope.data) {
        const listData = envelope.data.data || envelope.data
        selectedList.value = listData
        defaultList.value = listData
        return listData
      }

      if (envelope.data && envelope.data.code === 'DEFAULT_LIST_REQUIRED') {
        defaultList.value = null
        return null
      }

      error.value = 'Gagal memuat default list'
      return null
    } catch (err: any) {
      if (err.statusCode === 409 && err.data?.error?.code === 'DEFAULT_LIST_REQUIRED') {
        defaultList.value = null
        return null
      }

      error.value = 'Gagal memuat default list'
      return null
    }
  }

  async function getList(listId: string): Promise<ListSummary> {
    try {
      const envelope = await $fetch<{ success: boolean, data: ListSummary }>(
        `/api/lists/${encodeURIComponent(listId)}`,
        {
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      if (envelope.success && envelope.data) {
        selectedList.value = envelope.data
        return envelope.data
      }

      error.value = 'Gagal memuat list'
      return {} as ListSummary
    } catch (err) {
      error.value = 'Gagal memuat list'
      return {} as ListSummary
    }
  }

  async function loadListItems(listId: string, status?: 'active' | 'completed'): Promise<ListItemsResponse> {
    try {
      const params: Record<string, string> = {}

      if (status) {
        params.status = status
      }

      const envelope = await $fetch<{ success: boolean, data: ListItem[] }>(
        `/api/lists/${encodeURIComponent(listId)}/items`,
        {
          params,
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      if (envelope.success && envelope.data) {
        return envelope.data as ListItemsResponse
      }

      return []
    } catch (err) {
      error.value = `Gagal memuat item list ${listId}`
      return []
    }
  }

  async function createList(values: ListCreateFormValues): Promise<ListSummary | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListSummary }>('/api/lists', {
        method: 'POST',
        body: values,
        credentials: 'include',
        headers: requestHeaders(),
      })

      await refreshLists()

      return envelope.data
    } catch (err: any) {
      const fieldErr = readFieldErrors(err)
      if (Object.keys(fieldErr).length > 0) {
        error.value = Object.values(fieldErr)[0]
      } else {
        error.value = 'Gagal membuat list'
      }
      fieldErrors.value = fieldErr
      return null
    } finally {
      submitting.value = false
    }
  }

  async function updateList(listId: string, values: { name?: string }): Promise<ListSummary | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListSummary }>(
        `/api/lists/${encodeURIComponent(listId)}`,
        {
          method: 'PATCH',
          body: values,
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await refreshLists()

      return envelope.data
    } catch (err: any) {
      const fieldErr = readFieldErrors(err)
      if (Object.keys(fieldErr).length > 0) {
        error.value = Object.values(fieldErr)[0]
      } else {
        error.value = 'Gagal memperbarui list'
      }
      fieldErrors.value = fieldErr
      return null
    } finally {
      submitting.value = false
    }
  }

  async function archiveList(listId: string): Promise<ListSummary | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListSummary }>(
        `/api/lists/${encodeURIComponent(listId)}/archive`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await refreshLists()

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal mengarsip list'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

  async function restoreList(listId: string): Promise<ListSummary | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListSummary }>(
        `/api/lists/${encodeURIComponent(listId)}/restore`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await refreshLists()

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal memulihkan list'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

  async function createListItem(listId: string, values: ListItemFormValues): Promise<ListItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListItem }>(
        `/api/lists/${encodeURIComponent(listId)}/items`,
        {
          method: 'POST',
          body: values,
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await loadListItems(listId)

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal membuat item list'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

  async function getListItem(listId: string, itemId: string): Promise<ListItem> {
    try {
      const envelope = await $fetch<{ success: boolean, data: ListItem }>(
        `/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
        {
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      if (envelope.success && envelope.data) {
        selectedItem.value = envelope.data
        return envelope.data
      }

      return {} as ListItem
    } catch (err) {
      return {} as ListItem
    }
  }

  async function updateListItem(
    listId: string,
    itemId: string,
    values: Partial<ListItemFormValues>
  ): Promise<ListItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListItem }>(
        `/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
        {
          method: 'PATCH',
          body: values,
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await loadListItems(listId)

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal memperbarui item list'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

  async function completeListItem(listId: string, itemId: string): Promise<ListItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListItem }>(
        `/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/complete`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await loadListItems(listId)

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal menyelesaikan item'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

  async function uncompleteListItem(listId: string, itemId: string): Promise<ListItem | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const envelope = await $fetch<{ success: boolean, data: ListItem }>(
        `/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/uncomplete`,
        {
          method: 'POST',
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await loadListItems(listId)

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal membatalkan completion item'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

  async function createListItemExpense(
    listId: string,
    itemId: string,
    actualPrice?: string
  ): Promise<ListItemExpense | null> {
    if (submitting.value) {
      return null
    }

    submitting.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const body = actualPrice !== undefined ? { actual_price: actualPrice } : {}

      const envelope = await $fetch<{ success: boolean, data: ListItemExpense }>(
        `/api/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/expense`,
        {
          method: 'POST',
          body,
          credentials: 'include',
          headers: requestHeaders(),
        }
      )

      await loadListItems(listId)

      return envelope.data
    } catch (err: any) {
      error.value = 'Gagal membuat expense untuk item'
      fieldErrors.value = readFieldErrors(err)
      return null
    } finally {
      submitting.value = false
    }
  }

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

  function clearError(): void {
    error.value = null
    fieldErrors.value = {}
  }

  return {
    lists,
    selectedList,
    selectedItem,
    pending,
    submitting,
    error,
    fieldErrors,
    loadLists,
    refreshLists,
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
    uncompleteListItem,    createListItemExpense,
    clearError,
    LIST_ERROR_CODES,
    defaultList,
    items,
  }
}

