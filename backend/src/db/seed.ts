import { db, schema } from './index.js'
import { hashPassword } from '../utils/password.js'

const now = () => new Date().toISOString()

export const DEMO = {
  admin:  { email: 'admin@dawelleil.demo',  password: 'daw-admin-2026',  displayName: 'مدير المنصة' },
  studio: { email: 'studio@dawelleil.demo', password: 'daw-studio-2026', displayName: 'استوديو الشام' },
  viewer: { email: 'viewer@dawelleil.demo', password: 'daw-viewer-2026', displayName: 'مشاهد' },
}

export async function seed(): Promise<void> {
  const ts = now()

  // Idempotent: clear Phase-1 tables (respect FK-ish order)
  for (const t of [schema.watchHistory, schema.subscriptions, schema.reviews,
                   schema.episodes, schema.titles, schema.studios, schema.sessions,
                   schema.genres, schema.users]) {
    await db.delete(t)
  }

  // Users
  const [adminU] = await db.insert(schema.users).values({
    email: DEMO.admin.email, passwordHash: await hashPassword(DEMO.admin.password),
    displayName: DEMO.admin.displayName, role: 'admin', locale: 'ar', createdAt: ts, updatedAt: ts,
  }).returning()
  const [studioU] = await db.insert(schema.users).values({
    email: DEMO.studio.email, passwordHash: await hashPassword(DEMO.studio.password),
    displayName: DEMO.studio.displayName, role: 'studio', locale: 'ar', createdAt: ts, updatedAt: ts,
  }).returning()
  await db.insert(schema.users).values({
    email: DEMO.viewer.email, passwordHash: await hashPassword(DEMO.viewer.password),
    displayName: DEMO.viewer.displayName, role: 'viewer', locale: 'ar', createdAt: ts, updatedAt: ts,
  })

  // Genres
  const genreRows = [
    { key: 'drama',      nameAr: 'دراما',   nameEn: 'Drama' },
    { key: 'historical', nameAr: 'تاريخي',  nameEn: 'Historical' },
    { key: 'comedy',     nameAr: 'كوميديا', nameEn: 'Comedy' },
    { key: 'romance',    nameAr: 'رومانسي', nameEn: 'Romance' },
    { key: 'social',     nameAr: 'اجتماعي', nameEn: 'Social' },
  ]
  const genres = await db.insert(schema.genres).values(genreRows).returning()
  const g = (key: string) => genres.find(x => x.key === key)!.id

  // Studios
  const [shamStudio] = await db.insert(schema.studios).values({
    ownerId: studioU.id, nameAr: 'استوديو الشام', nameEn: 'Sham Studio', slug: 'sham-studio',
    descriptionAr: 'إنتاج درامي سوري أصيل من قلب دمشق.',
    descriptionEn: 'Authentic Syrian drama from the heart of Damascus.',
    status: 'active', createdAt: ts, updatedAt: ts,
  }).returning()
  const [halabStudio] = await db.insert(schema.studios).values({
    ownerId: adminU.id, nameAr: 'استوديو حلب', nameEn: 'Aleppo Studio', slug: 'aleppo-studio',
    descriptionAr: 'حكايات حلب وطربها.', descriptionEn: 'Stories and tarab from Aleppo.',
    status: 'active', createdAt: ts, updatedAt: ts,
  }).returning()

  // Sample video (public-domain / placeholder MP4)
  const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  // Helper to insert a title + its episodes
  async function addTitle(opts: {
    studioId: number; kind: 'film'|'series'; titleAr: string; titleEn: string;
    synopsisAr: string; synopsisEn: string; genreKey: string; year: number;
    status: 'approved'|'pending'; episodes: number; ratingAvg?: number; ratingCount?: number;
  }) {
    const [t] = await db.insert(schema.titles).values({
      studioId: opts.studioId, kind: opts.kind, titleAr: opts.titleAr, titleEn: opts.titleEn,
      synopsisAr: opts.synopsisAr, synopsisEn: opts.synopsisEn, genreId: g(opts.genreKey),
      year: opts.year, status: opts.status,
      publishedAt: opts.status === 'approved' ? ts : null,
      ratingAvg: opts.ratingAvg ?? 0, ratingCount: opts.ratingCount ?? 0,
      posterUrl: null, backdropUrl: null, createdAt: ts, updatedAt: ts,
    }).returning()
    const eps = Array.from({ length: opts.episodes }, (_, i) => ({
      titleId: t.id, number: i + 1,
      nameAr: opts.kind === 'film' ? opts.titleAr : `الحلقة ${i + 1}`,
      nameEn: opts.kind === 'film' ? opts.titleEn : `Episode ${i + 1}`,
      videoUrl: SAMPLE, durationSec: 45 * 60, thumbnailUrl: null, createdAt: ts, updatedAt: ts,
    }))
    await db.insert(schema.episodes).values(eps)
    return t
  }

  await addTitle({ studioId: shamStudio.id, kind: 'series', titleAr: 'باب الحارة', titleEn: 'Bab al-Hara',
    synopsisAr: 'حياة حارة دمشقية في زمن الانتداب، بجيرانها وحكاياتها.',
    synopsisEn: 'Life in a Damascene quarter under the Mandate, its neighbours and their tales.',
    genreKey: 'historical', year: 2006, status: 'approved', episodes: 3, ratingAvg: 4.7, ratingCount: 128 })

  await addTitle({ studioId: shamStudio.id, kind: 'series', titleAr: 'الخوالي', titleEn: 'Al-Khawali',
    synopsisAr: 'لوحات من الحياة الشامية القديمة بروح كوميدية دافئة.',
    synopsisEn: 'Warm, comic vignettes of old Damascene life.',
    genreKey: 'comedy', year: 2000, status: 'approved', episodes: 2, ratingAvg: 4.5, ratingCount: 96 })

  await addTitle({ studioId: halabStudio.id, kind: 'series', titleAr: 'ضيعة ضايعة', titleEn: "Day'a Day'a",
    synopsisAr: 'قرية نائية وشخصياتها الطريفة في كوميديا اجتماعية.',
    synopsisEn: 'A remote village and its quirky characters in a social comedy.',
    genreKey: 'comedy', year: 2008, status: 'approved', episodes: 2, ratingAvg: 4.6, ratingCount: 110 })

  await addTitle({ studioId: halabStudio.id, kind: 'film', titleAr: 'أحلام المدينة', titleEn: 'Dreams of the City',
    synopsisAr: 'دمشق في الخمسينيات من عيون صبي يكبر وسط التحولات.',
    synopsisEn: '1950s Damascus through the eyes of a boy amid upheaval.',
    genreKey: 'drama', year: 1984, status: 'approved', episodes: 1, ratingAvg: 4.8, ratingCount: 54 })

  // A pending title so the admin moderation queue demos out of the box
  await addTitle({ studioId: shamStudio.id, kind: 'series', titleAr: 'ليالي الصالحية', titleEn: 'Salhieh Nights',
    synopsisAr: 'عمل جديد بانتظار الموافقة الإدارية.',
    synopsisEn: 'A new title awaiting admin approval.',
    genreKey: 'social', year: 2026, status: 'pending', episodes: 2 })
}

// Run directly: `tsx src/db/seed.ts`
const isDirect = process.argv[1] && process.argv[1].endsWith('seed.ts')
if (isDirect) {
  seed().then(() => { console.log('✨ Seed complete'); process.exit(0) })
       .catch((e) => { console.error(e); process.exit(1) })
}
