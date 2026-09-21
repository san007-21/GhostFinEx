import { useContext } from 'react'
import { AuthContext } from './context.js'

/** Access the mocked auth layer (swap for the real provider later). */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
