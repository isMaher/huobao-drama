import { Hono } from 'hono'
import { and, eq, isNull, desc, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, notFound } from '../utils/response.js'
import { toSnakeCase, toSnakeCaseArray } from '../utils/transform.js'
import { withLocale, type Locale } from '../utils/localized.js'

const app = new Hono()

function loc(c: any): Locale { return c.req.query('locale') === 'en' ? 'en' : 'ar' }

/** ids of studios that are active (not suspended) */
async function activeStudioIds(): Promise<number[]> {
  const rows = await db.select().from(schema.studios).where(eq(schema.studios.status, 'active'))
  return rows.map(s => s.id)
}

app.get('/', async (c) => {
  const locale = loc(c)
  const page = Number(c.req.query('page') || 1)
  const pageSize = Number(c.req.query('page_size') || 24)
  const kind = c.req.query('kind')
  const year = c.req.query('year')
  const genre = c.req.query('genre')     // genre key
  const studioId = c.req.query('studio_id')
  const keyword = c.req.query('keyword')

  const activeIds = await activeStudioIds()
  const studios = await db.select().from(schema.studios)
  const genres = await db.select().from(schema.genres)
  const genreIdByKey = Object.fromEntries(genres.map(g => [g.key, g.id]))

  let rows = await db.select().from(schema.titles).where(
    and(eq(schema.titles.status, 'approved'), isNull(schema.titles.deletedAt)),
  ).orderBy(desc(schema.titles.publishedAt))

  rows = rows.filter(t => activeIds.includes(t.studioId))
  if (kind) rows = rows.filter(t => t.kind === kind)
  if (year) rows = rows.filter(t => t.year === Number(year))
  if (genre && genreIdByKey[genre] != null) rows = rows.filter(t => t.genreId === genreIdByKey[genre])
  if (studioId) rows = rows.filter(t => t.studioId === Number(studioId))
  if (keyword) {
    const k = keyword.toLowerCase()
    rows = rows.filter(t => `${t.titleAr} ${t.titleEn}`.toLowerCase().includes(k))
  }

  const total = rows.length
  const paged = rows.slice((page - 1) * pageSize, page * pageSize)
  const items = paged.map(t => {
    const studio = studios.find(s => s.id === t.studioId)
    const localized = withLocale(t, ['title', 'synopsis'], locale)
    return {
      ...toSnakeCase(localized),
      studio_name: studio ? (locale === 'ar' ? studio.nameAr : studio.nameEn) : '',
    }
  })

  return success(c, {
    items,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
  })
})

app.get('/:id', async (c) => {
  const locale = loc(c)
  const id = Number(c.req.param('id'))
  const [t] = await db.select().from(schema.titles).where(eq(schema.titles.id, id))
  if (!t || t.status !== 'approved' || t.deletedAt) return notFound(c, 'title not found')

  const [studio] = await db.select().from(schema.studios).where(eq(schema.studios.id, t.studioId))
  if (!studio || studio.status !== 'active') return notFound(c, 'title not found')

  const eps = await db.select().from(schema.episodes)
    .where(eq(schema.episodes.titleId, id)).orderBy(schema.episodes.number)
  const revs = await db.select().from(schema.reviews).where(eq(schema.reviews.titleId, id))
  const reviewers = revs.length
    ? await db.select().from(schema.users).where(inArray(schema.users.id, revs.map(r => r.userId)))
    : []

  const localized = withLocale(t, ['title', 'synopsis'], locale)
  return success(c, {
    ...toSnakeCase(localized),
    studio: {
      ...toSnakeCase(studio),
      name: locale === 'ar' ? studio.nameAr : studio.nameEn,
    },
    episodes: eps.map(e => toSnakeCase(withLocale(e, ['name'], locale))),
    reviews: revs.map(r => ({
      ...toSnakeCase(r),
      user_name: reviewers.find(u => u.id === r.userId)?.displayName ?? '',
    })),
  })
})

export default app
