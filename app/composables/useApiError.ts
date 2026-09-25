interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
  error?: { message?: string }
}

// Map backend/validation failures to a single human-readable message.
// 401 here means the credential check itself failed, not a session state.
export function readError(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback
  }

  const body = (error as { data?: ApiErrorBody }).data ?? (error as ApiErrorBody)

  const firstFieldError = body.errors ? Object.values(body.errors).flat()[0] : undefined

  return firstFieldError ?? body.error?.message ?? body.message ?? fallback
}
