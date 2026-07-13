import fs from 'fs'
import os from 'os'
import path from 'path'

/** Point db/index.ts at a throwaway DB file before it is imported. */
export function useTempDb(): string {
  const file = path.join(os.tmpdir(), `dawtest-${process.pid}-${Math.floor(performance.now())}.db`)
  process.env.DB_PATH = file
  process.env.NODE_ENV = 'test'
  return file
}

export function cleanupDb(file: string) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(file + suffix) } catch { /* ignore */ }
  }
}
