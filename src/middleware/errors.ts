import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError, isAppError, zodToAppError } from '../utils/errors'

export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(AppError.notFound())
}

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  let appErr: AppError
  if (err instanceof ZodError) appErr = zodToAppError(err)
  else if (isAppError(err)) appErr = err
  else {
    console.error('Unexpected error: ', err)
    appErr = AppError.internal()
  }

  const payload = {
    error: {
      code: appErr.code,
      message: appErr.message,
      details: appErr.details,
      requestId: (req as any).requestId
    }
  }
  res.status(appErr.status).json(payload)
}
