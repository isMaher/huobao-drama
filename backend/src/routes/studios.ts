import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, notFound } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { withLocale, type Locale } from '../utils/localized.js'

const app = new Hono()
function loc(c: any): Locale { return c.req.query('locale') === 'en' ? 'en' : 'ar' }

app.get('/', async (c) => {
  const locale = loc(c)
  const rows = await db.select().from(schema.studios).where(eq(schema.studios.status, 'active'))
  const items = rows.map(s => ({
    ...toSnakeCase(withLocale(s, ['name', 'description'], locale)),
  }))
  return success(c, { items })
})

app.get('/:id', async (c) => {
  const locale = loc(c)
  const id = Number(c.req.param('id'))
  const [s] = await db.select().from(schema.studios).where(eq(schema.studios.id, id))
  if (!s || s.status !== 'active') return notFound(c, 'studio not found')

  const titles = await db.select().from(schema.titles).where(
    and(eq(schema.titles.studioId, id), eq(schema.titles.status, 'approved'), isNull(schema.titles.deletedAt)),
  )
  return success(c, {
    ...toSnakeCase(withLocale(s, ['name', 'description'], locale)),
    titles: titles.map(t => toSnakeCase(withLocale(t, ['title', 'synopsis'], locale))),
  })
})

export default app
