import { Hono } from 'hono'
import { db, schema } from '../db/index.js'
import { success } from '../utils/response.js'
import { toSnakeCaseArray } from '../utils/transform.js'

const app = new Hono()

app.get('/', async (c) => {
  const rows = await db.select().from(schema.genres)
  return success(c, { items: toSnakeCaseArray(rows) })
})

export default app
