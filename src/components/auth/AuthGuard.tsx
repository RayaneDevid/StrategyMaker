import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isAnonymous } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!user || isAnonymous) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
