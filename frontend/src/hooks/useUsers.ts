import { useEffect, useState, useCallback } from 'react'
import { usersApi } from '../utils/api'
import { getDb } from '../utils/db'
import type { User } from '../types'

export function useUsers(role?: string) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const db = await getDb()
      const cached = (await db.getAll('users')) as unknown as User[]
      const filtered = role ? cached.filter((u) => u.role === role) : cached
      if (filtered.length > 0) { setUsers(filtered); setLoading(false) }

      const { data } = await usersApi.list(role)
      const tx = db.transaction('users', 'readwrite')
      for (const u of data) await tx.store.put(u as unknown as Record<string, unknown>)
      await tx.done
      setUsers(data)
    } catch { /* keep cached */ }
    finally { setLoading(false) }
  }, [role])

  useEffect(() => { refresh() }, [refresh])

  return { users, loading, refresh }
}
