import path from 'path'
import { ensureDir } from '../utils/fsx'
import { env } from './env'

export const UPLOAD_DIR = env.UPLOADS_DIR || path.resolve(process.cwd(), 'var', 'uploads')
ensureDir(UPLOAD_DIR)

// build a safe storage key: org/task/uuid-filename
export function buildStorageKey(args: {
  orgId: string
  taskId: string
  filename: string
  id: string
}) {
  const safe = args.filename.replace(/[^\w.\-\+@]+/g, '_').slice(0, 180)
  return `${args.orgId}/${args.taskId}/${args.id}__${safe}`
}

export function storagePathFor(key: string) {
  return path.join(UPLOAD_DIR, key)
}
