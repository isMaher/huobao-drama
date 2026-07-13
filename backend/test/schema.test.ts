import { describe, it, expect } from 'vitest'
import * as schema from '../src/db/schema.js'

describe('schema', () => {
  it('exports all Phase-1 tables', () => {
    for (const t of ['users','studios','genres','titles','episodes','reviews','subscriptions','watchHistory','sessions']) {
      expect(schema, `missing table ${t}`).toHaveProperty(t)
    }
  })
})
