import { randomUUID } from 'crypto'
import { NextFunction, Request, Response } from 'express'

export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  const id = (req.headers['x-request-id'] as string) || randomUUID()
  ;(req as any).requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
