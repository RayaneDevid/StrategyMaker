import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const { user, loading, isAnonymous, signOut } = useAuth()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <Link to="/" className="text-lg font-bold tracking-tight">
        Strategy<span className="text-accent">Maker</span>
      </Link>

      <div className="flex items-center gap-3">
        {!loading && user && !isAnonymous ? (
          <>
            <span className="text-sm text-text-muted">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent"
            >
              Déconnexion
            </button>
          </>
        ) : !loading ? (
          <Link
            to="/login"
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        ) : null}
      </div>
    </header>
  )
}
