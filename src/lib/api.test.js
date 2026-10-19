import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const jsonResponse = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

// The throttle state lives in the module, so each test gets a fresh copy.
async function loadApi() {
  vi.resetModules()
  return import('./api')
}

describe('api request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends same-origin, uncached requests with a sanitized JSON body', async () => {
    const api = await loadApi()
    fetch.mockResolvedValue(jsonResponse(200, { data: { id: 'a1' } }))

    await api.bookAppointment({ doctorId: 'd1', startAt: '2026-11-02T09:00:00Z', patientNotes: '  Chest pain  ' })

    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/appointments')
    expect(init.credentials).toBe('same-origin')
    expect(init.cache).toBe('no-store')
    expect(init.headers['X-Requested-With']).toBe('XMLHttpRequest')
    expect(JSON.parse(init.body).patientNotes).toBe('Chest pain')
  })

  it('stops calling an endpoint after a 429 until Retry-After passes', async () => {
    const api = await loadApi()
    fetch.mockResolvedValue(
      jsonResponse(429, { error: { code: 'RATE_LIMITED', message: 'Slow down' } }, { 'Retry-After': '30' })
    )

    await expect(api.listDoctors()).rejects.toMatchObject({ status: 429 })
    await expect(api.listDoctors()).rejects.toMatchObject({ code: 'CLIENT_THROTTLED' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throttles repeated login attempts on the client', async () => {
    const api = await loadApi()
    fetch.mockImplementation(async () => jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'No' } }))

    for (let i = 0; i < 5; i += 1) {
      await expect(api.login({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    }
    await expect(api.login({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({ code: 'CLIENT_THROTTLED' })
    expect(fetch).toHaveBeenCalledTimes(5)
  })

  it('rejects non-JSON success responses instead of trusting them', async () => {
    const api = await loadApi()
    fetch.mockResolvedValue(new Response('<html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }))

    await expect(api.me()).rejects.toMatchObject({ code: 'BAD_RESPONSE' })
  })

  it('accepts an empty 204 response', async () => {
    const api = await loadApi()
    fetch.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(api.deleteTimeOff('t1')).resolves.toBeUndefined()
  })
})
