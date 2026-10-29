import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountPage from '~/pages/account.vue'

const authMock = vi.hoisted(() => ({
  user: {
    value: {
      id: 'u1',
      username: 'budi',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      email_verified_at: '2026-01-01T00:00:00.000Z'
    },
    __v_isRef: true
  },
  household: { value: { id: 'h1', name: 'Rumah Budi', role: 'owner' } },
  isEmailVerified: { value: true, __v_isRef: true },
  bootstrap: vi.fn(async () => 'authenticated'),
  logout: vi.fn()
}))

mockNuxtImport('useAuth', () => () => authMock)

const nuxtApiMock = vi.hoisted(() => vi.fn())

mockNuxtImport('useLaravel', () => () => ({ nuxtApi: nuxtApiMock }))

function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

async function mountPage() {
  return mountSuspended(AccountPage, { route: '/account' })
}

async function fillPasswordForm(
  wrapper: Awaited<ReturnType<typeof mountPage>>,
  values: { current: string, password: string, confirmation: string }
): Promise<void> {
  await wrapper.find('#account-current-password').setValue(values.current)
  await wrapper.find('#account-password').setValue(values.password)
  await wrapper.find('#account-password-confirmation').setValue(values.confirmation)
}

describe('account page', () => {
  beforeEach(() => {
    nuxtApiMock.mockReset()
    authMock.logout.mockReset()
  })

  it('menampilkan profil dan hanya mengirim form yang valid', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Budi Santoso')
    expect(wrapper.text()).toContain('budi@example.com')
    expect(wrapper.text()).toContain('Email terverifikasi')

    await wrapper.find('form').trigger('submit')
    await flush()

    expect(wrapper.text()).toContain('Kata sandi saat ini wajib diisi.')
    expect(nuxtApiMock).not.toHaveBeenCalled()
  })

  it('menolak konfirmasi kata sandi yang tidak cocok tanpa memanggil API', async () => {
    const wrapper = await mountPage()

    await fillPasswordForm(wrapper, {
      current: 'password',
      password: 'newpassword123',
      confirmation: 'differentpassword'
    })
    await wrapper.find('form').trigger('submit')
    await flush()

    expect(wrapper.text()).toContain('Konfirmasi kata sandi baru tidak cocok.')
    expect(nuxtApiMock).not.toHaveBeenCalled()
  })

  it('mengirim password lewat proxy Nuxt dan membersihkan form saat sukses', async () => {
    nuxtApiMock.mockResolvedValueOnce({ success: true })

    const wrapper = await mountPage()

    await fillPasswordForm(wrapper, {
      current: 'password',
      password: 'newpassword123',
      confirmation: 'newpassword123'
    })
    await wrapper.find('form').trigger('submit')
    await flush()

    expect(nuxtApiMock).toHaveBeenCalledWith('/password/change', {
      method: 'POST',
      body: {
        current_password: 'password',
        password: 'newpassword123',
        password_confirmation: 'newpassword123'
      }
    })
    expect(wrapper.text()).toContain('Kata sandi berhasil diubah.')
    expect((wrapper.find('#account-current-password').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#account-password').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#account-password-confirmation').element as HTMLInputElement).value).toBe('')
  })

  it('menampilkan error domain backend tanpa logout', async () => {
    nuxtApiMock.mockRejectedValueOnce({
      statusCode: 422,
      data: {
        data: {
          success: false,
          error: {
            code: 'INVALID_CURRENT_PASSWORD',
            message: 'The provided password is incorrect.'
          }
        }
      }
    })

    const wrapper = await mountPage()

    await fillPasswordForm(wrapper, {
      current: 'wrong-password',
      password: 'newpassword123',
      confirmation: 'newpassword123'
    })
    await wrapper.find('form').trigger('submit')
    await flush()

    expect(wrapper.text()).toContain('Kata sandi saat ini salah. Silakan coba lagi.')
    expect(authMock.logout).not.toHaveBeenCalled()
  })
})
