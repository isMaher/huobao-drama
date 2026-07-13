import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { useTempDb, cleanupDb } from './helpers/testdb.js'

let file: string
beforeAll(() => { file = useTempDb() })
afterAll(() => cleanupDb(file))

describe('db init', () => {
  it('creates all Phase-1 tables', async () => {
    const { db } = await import('../src/db/index.js')
    const rows = (db as any).$client
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all().map((r: any) => r.name)
    for (const t of ['users','studios','genres','titles','episodes','reviews','subscriptions','watch_history','sessions']) {
      expect(rows, `missing ${t}`).toContain(t)
    }
  })
})
