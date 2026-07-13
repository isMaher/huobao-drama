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

describe('GET /api/v1/titles', () => {
  it('returns only approved titles', async () => {
    const res = await app.request('/api/v1/titles?locale=en')
    const json = await res.json()
    expect(json.data.items.length).toBe(4) // 4 approved, 1 pending hidden
    expect(json.data.items.every((t: any) => t.status === 'approved')).toBe(true)
    expect(json.data.items[0]).toHaveProperty('title')       // resolved localized field
    expect(json.data.items[0]).toHaveProperty('studio_name')
  })

  it('filters by kind', async () => {
    const res = await app.request('/api/v1/titles?kind=film')
    const json = await res.json()
    expect(json.data.items.every((t: any) => t.kind === 'film')).toBe(true)
  })

  it('returns a title detail with episodes, hides pending', async () => {
    const list = await (await app.request('/api/v1/titles?locale=ar')).json()
    const id = list.data.items[0].id
    const res = await app.request(`/api/v1/titles/${id}?locale=ar`)
    const json = await res.json()
    expect(json.data.episodes.length).toBeGreaterThanOrEqual(1)
    expect(json.data).toHaveProperty('studio')
  })

  it('404s a pending title by id', async () => {
    const { db, schema } = await import('../src/db/index.js')
    const pending = (await db.select().from(schema.titles)).find((t: any) => t.status === 'pending')
    const res = await app.request(`/api/v1/titles/${pending.id}`)
    expect(res.status).toBe(404)
  })
})
