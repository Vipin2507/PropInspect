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

const FALLBACK_JWT_SECRET = 'dev_secret_minimum_32_characters_long'

function jwtSecrets(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of [process.env.JWT_SECRET, FALLBACK_JWT_SECRET]) {
    if (s && !seen.has(s)) {
      seen.add(s)
      out.push(s)
    }
  }
  return out
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

/** Bearer from Authorization, or X-Auth-Token (nginx/CloudPanel often drops Authorization). */
function getBearerToken(req: Request): string | null {
  const candidates = [
    headerValue(req.headers.authorization),
    headerValue(req.headers['x-auth-token']),
    headerValue(req.headers['x-authorization']),
  ]
  for (const raw of candidates) {
    if (!raw?.trim()) continue
    const v = raw.trim()
    if (v.toLowerCase().startsWith('bearer ')) return v.slice(7).trim()
    return v
  }
  return null
}

function verifyToken(token: string): { userId: string } {
  let lastErr: unknown
  for (const secret of jwtSecrets()) {
    try {
      return jwt.verify(token, secret) as { userId: string }
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Invalid token')
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  try {
    const payload = verifyToken(token)
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
  const secret = process.env.JWT_SECRET || FALLBACK_JWT_SECRET
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'
  return jwt.sign({ userId }, secret, { expiresIn } as SignOptions)
}
