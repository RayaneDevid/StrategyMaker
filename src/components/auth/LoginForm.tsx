import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function LoginForm() {
  const { signInWithEmail, signUpWithEmail, signInWithDiscord } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </h1>
        <p className="mt-2 text-text-muted">
          {isSignUp
            ? 'Inscrivez-vous pour créer des sessions'
            : 'Connectez-vous pour accéder à vos sessions'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-text-muted">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? '...' : isSignUp ? "S'inscrire" : 'Se connecter'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-bg px-2 text-text-muted">ou</span>
        </div>
      </div>

      <button
        onClick={signInWithDiscord}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 font-medium transition-colors hover:border-accent"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
        Continuer avec Discord
      </button>

      <p className="text-center text-sm text-text-muted">
        {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-accent hover:underline"
        >
          {isSignUp ? 'Se connecter' : "S'inscrire"}
        </button>
      </p>
    </div>
  )
}
