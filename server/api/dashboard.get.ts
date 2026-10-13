import type { LaravelDashboardPayload } from '~/utils/dashboardMapper'

// Batas validasi disamakan dengan DashboardPeriodRequest di Laravel agar
// kegagalan input ditolak cepat di boundary tanpa satu hop tambahan.
const MONTH_MIN = 1
const MONTH_MAX = 12
const YEAR_MIN = 2000
const YEAR_MAX = 2100

function parsePeriodParam(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null
  }

  return parsed
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const month = parsePeriodParam(query.month, MONTH_MIN, MONTH_MAX)
  const year = parsePeriodParam(query.year, YEAR_MIN, YEAR_MAX)
  const errors: Record<string, string[]> = {}

  if (month === null) {
    errors.month = ['Bulan harus berupa angka 1 sampai 12.']
  }

  if (year === null) {
    errors.year = ['Tahun harus berupa angka 2000 sampai 2100.']
  }

  if (month === null || year === null) {
    throw createError({
      statusCode: 422,
      message: 'Periode tidak valid.',
      data: { message: 'Periode tidak valid.', errors }
    })
  }

  const params: Record<string, number> = {}

  if (month !== undefined) {
    params.month = month
  }

  if (year !== undefined) {
    params.year = year
  }

  try {
    // Explicit generic: without it, Nitro tries to infer the response type
    // by matching the URL against every registered route, which blows up
    // with "excessive stack depth" on complex route tables.
    return await $fetch<LaravelDashboardPayload>(`${laravelBase()}/dashboard`, {
      params,
      headers: {
        Accept: 'application/json',
        ...forwardAuthHeaders(event)
      }
    })
  } catch (err: unknown) {
    // Preserve Laravel's status (401 tamu, 404 tanpa household, 422 periode)
    // instead of letting it explode into a Nitro 500, so the client can
    // resolve clean states.
    const status =
      typeof err === 'object' &&
      err !== null &&
      'statusCode' in err &&
      typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500
    const data =
      typeof err === 'object' && err !== null && 'data' in err
        ? (err as { data?: unknown }).data
        : null

    throw createError({ statusCode: status, data })
  }
})
