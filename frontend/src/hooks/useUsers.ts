import { useEffect, useState, useCallback, useRef } from 'react'
import { usersApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { User } from '../types'

const memCache: Map<string, User[]> = new Map()

export function useUsers(role?: string) {
  const key = role ?? 'all'
  const initial = memCache.get(key) ?? []

  const [users, setUsers] = useState<User[]>(initial)
  const [loading, setLoading] = useState(initial.length === 0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [role])

  const refresh = useCallback(async () => {
    if (!memCache.has(key)) {
      try {
        const db = await getDb()
        const all = (await db.getAll('users')) as unknown as User[]
        const filtered = role ? all.filter((u) => u.role === role) : all
        if (filtered.length > 0) {
          memCache.set(key, filtered)
          if (mounted.current) { setUsers(filtered); setLoading(false) }
        }
      } catch { /* ignore */ }
    }

    try {
      const { data } = await usersApi.list(role)
      const db = await getDb()
      const tx = db.transaction('users', 'readwrite')
      for (const u of data) await tx.store.put(u as unknown as Record<string, unknown>)
      await tx.done
      memCache.set(key, data)
      if (mounted.current) setUsers(data)
    } catch { /* keep cached */ }
    finally { if (mounted.current) setLoading(false) }
  }, [role, key])

  useEffect(() => { refresh() }, [refresh])

  return { users, loading, refresh }
}
