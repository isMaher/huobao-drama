import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string
beforeAll(() => { file = useTempDb() })
afterAll(() => cleanupDb(file))

describe('seed', () => {
  it('populates a living catalogue with a pending title for moderation', async () => {
    const { seed } = await import('../src/db/seed.js')
    const { db, schema } = await import('../src/db/index.js')
    await seed()
    const genres = await db.select().from(schema.genres)
    const studios = await db.select().from(schema.studios)
    const titles = await db.select().from(schema.titles)
    const users = await db.select().from(schema.users)
    expect(genres.length).toBeGreaterThanOrEqual(4)
    expect(studios.length).toBeGreaterThanOrEqual(2)
    expect(titles.length).toBeGreaterThanOrEqual(4)
    expect(users.some(u => u.role === 'admin')).toBe(true)
    expect(users.some(u => u.role === 'studio')).toBe(true)
    expect(titles.some(t => t.status === 'approved')).toBe(true)
    expect(titles.some(t => t.status === 'pending')).toBe(true)
  })

  it('is idempotent (re-seeding does not duplicate)', async () => {
    const { seed } = await import('../src/db/seed.js')
    const { db, schema } = await import('../src/db/index.js')
    await seed()
    const g1 = (await db.select().from(schema.genres)).length
    await seed()
    const g2 = (await db.select().from(schema.genres)).length
    expect(g2).toBe(g1)
  })
})
