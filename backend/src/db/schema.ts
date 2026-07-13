/**
 * Daw el-Leil — Drizzle schema (streaming catalogue).
 * Runtime table creation lives in db/ddl.ts; this file is the typed query surface.
 */
import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('viewer'), // viewer | studio | admin
  locale: text('locale').notNull().default('ar'),  // ar | en
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const studios = sqliteTable('studios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: integer('owner_id').notNull(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull().unique(),
  descriptionAr: text('description_ar'),
  descriptionEn: text('description_en'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  status: text('status').notNull().default('active'), // active | suspended
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const genres = sqliteTable('genres', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
})

export const titles = sqliteTable('titles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studioId: integer('studio_id').notNull(),
  kind: text('kind').notNull().default('series'), // film | series
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  synopsisAr: text('synopsis_ar'),
  synopsisEn: text('synopsis_en'),
  genreId: integer('genre_id'),
  year: integer('year'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  status: text('status').notNull().default('pending'), // pending | approved | rejected
  moderationNote: text('moderation_note'),
  ratingAvg: real('rating_avg').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  viewsCount: integer('views_count').notNull().default(0),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
})

export const episodes = sqliteTable('episodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titleId: integer('title_id').notNull(),
  number: integer('number').notNull().default(1),
  nameAr: text('name_ar'),
  nameEn: text('name_en'),
  videoUrl: text('video_url'),
  durationSec: integer('duration_sec').notNull().default(0),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  titleId: integer('title_id').notNull(),
  rating: integer('rating').notNull(), // 1..5
  body: text('body'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({ uniqUserTitle: unique().on(t.userId, t.titleId) }))

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  studioId: integer('studio_id').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => ({ uniqUserStudio: unique().on(t.userId, t.studioId) }))

export const watchHistory = sqliteTable('watch_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
  episodeId: integer('episode_id').notNull(),
  positionSec: integer('position_sec').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({ uniqUserEpisode: unique().on(t.userId, t.episodeId) }))

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // opaque token
  userId: integer('user_id').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
})
