import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  res.status(500).json({
    error: {
      message: isDevelopment ? err.message : 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
    },
  })
}
