import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string, app: any
beforeAll(async () => {
  file = useTempDb()
  const { seed } = await import('../src/db/seed.js')
  await seed()
  app = (await import('../src/index.js')).app
})
afterAll(() => cleanupDb(file))

describe('studios', () => {
  it('lists active studios with localized name', async () => {
    const res = await app.request('/api/v1/studios?locale=en')
    const json = await res.json()
    expect(json.data.items.length).toBeGreaterThanOrEqual(2)
    expect(json.data.items[0]).toHaveProperty('name')
  })
  it('returns a studio with its approved titles', async () => {
    const list = await (await app.request('/api/v1/studios')).json()
    const id = list.data.items[0].id
    const res = await app.request(`/api/v1/studios/${id}?locale=ar`)
    const json = await res.json()
    expect(json.data).toHaveProperty('titles')
    expect(json.data.titles.every((t: any) => t.status === 'approved')).toBe(true)
  })
})
