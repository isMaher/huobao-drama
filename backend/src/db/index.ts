import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { DDL } from './ddl.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../../data/daw_el_leil.db')

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH, { timeout: 30000 })
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 30000')
sqlite.exec(DDL)

export const db = drizzle(sqlite, { schema })
export { schema }
export type DB = typeof db
