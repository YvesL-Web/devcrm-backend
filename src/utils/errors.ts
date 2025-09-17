import { ZodError } from 'zod'

export class AppError extends Error {
  status: number
  code: string
  details?: any
  expose: boolean

  constructor(status: number, code: string, message: string, details?: any, expose = true) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.expose = expose
  }

  static badRequest(message = 'Bad Request', details?: any) {
    return new AppError(400, 'BAD_REQUEST', message, details)
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'UNAUTHORIZED', message)
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, 'FORBIDDEN', message)
  }
  static notFound(message = 'Not Found') {
    return new AppError(404, 'NOT_FOUND', message)
  }
  static conflict(message = 'Conflict', details?: any) {
    return new AppError(409, 'CONFLICT', message, details)
  }
  static internal(message = 'Internal Server Error', details?: any) {
    return new AppError(500, 'INTERNAL', message, details, false)
  }
  static tooManyRequests(message = 'Too Many Requests', details?: any) {
    return new AppError(429, 'TOO_MANY_REQUESTS', message, details)
  }
}

export const isAppError = (error: any): error is AppError => error instanceof AppError

export function zodToAppError(err: ZodError) {
  return AppError.badRequest('Validation failed', err.issues)
}

export type ErrorResponse = {
  error: {
    code: string
    message: string
    details?: any
    requestId?: string
  }
}
