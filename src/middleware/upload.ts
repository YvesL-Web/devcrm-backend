import multer from 'multer'

export const upload = multer({
  storage: multer.memoryStorage(), // we'll write ourselves to disk with our key
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // max 10 files per request
  },
  fileFilter: (_req, file, cb) => {
    //basic allowlist; extend if needed
    const ok = /^(image\/|application\/pdf|text\/|application\/zip|application\/x-zip)/.test(
      file.mimetype
    )
    if (ok) cb(null, true)
    else cb(new Error('Unsupported file type'))
  }
})
