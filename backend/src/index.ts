import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'path'
import { fileURLToPath } from 'url'

import { requestLogger, errorHandler } from './middleware/logger.js'
import genres from './routes/genres.js'
import studios from './routes/studios.js'
import titles from './routes/titles.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

export const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3013', 'http://localhost:5679'],
  credentials: true,
}))
app.use('*', requestLogger)
app.use('*', errorHandler)

app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

const api = new Hono()
api.route('/genres', genres)
api.route('/studios', studios)
api.route('/titles', titles)
app.route('/api/v1', api)

// Static (posters/backdrops uploaded under data/static)
app.use('/static/*', serveStatic({ root: path.join(projectRoot, 'data') }))

// Frontend production build
const distPath = path.join(projectRoot, 'frontend', 'dist')
app.use('*', serveStatic({ root: distPath }))
app.get('*', serveStatic({ root: distPath, path: 'index.html' }))

if (process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT || 5679)
  console.log(`✨ Daw el-Leil server on http://localhost:${port}`)
  serve({ fetch: app.fetch, port })
}
