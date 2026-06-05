import { useEffect, useState, useCallback } from 'react'
import { usersApi } from '../utils/api'
import type { User } from '../types'

export function useUsers(role?: string) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    usersApi.list(role).then(({ data }) => setUsers(data)).finally(() => setLoading(false))
  }, [role])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { users, loading, refresh }
}
