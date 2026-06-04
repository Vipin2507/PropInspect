import { Request, Response, NextFunction } from 'express'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { getDB, rowToUser } from '../db/database'

export interface AuthUser {
  id: string
  name: string
  email: string
  mobile: string
  role: string
  avatar?: string
  isActive: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  const token = header.slice(7)
  try {
    const secret = process.env.JWT_SECRET || 'dev_secret_minimum_32_characters_long'
    const payload = jwt.verify(token, secret) as { userId: string }
    const row = getDB().prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.userId)
    if (!row) {
      res.status(401).json({ error: 'User not found or inactive' })
      return
    }
    req.user = rowToUser(row as Record<string, unknown>) as AuthUser
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'dev_secret_minimum_32_characters_long'
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign({ userId }, secret, { expiresIn } as SignOptions)
}
