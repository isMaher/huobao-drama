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

describe('GET /api/v1/genres', () => {
  it('returns seeded genres', async () => {
    const res = await app.request('/api/v1/genres')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.code).toBe(200)
    expect(json.data.items.length).toBeGreaterThanOrEqual(4)
    expect(json.data.items[0]).toHaveProperty('name_ar')
  })
})
