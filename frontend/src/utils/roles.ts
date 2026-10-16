/** Admin is a superuser and matches every role check. */
export function hasRole(userRole: string | undefined | null, ...allowed: string[]): boolean {
  if (!userRole) return false
  if (userRole === 'admin') return true
  return allowed.includes(userRole)
}

export function isAdmin(role?: string | null): boolean {
  return role === 'admin'
}
