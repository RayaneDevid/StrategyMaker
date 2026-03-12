import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function HomePage() {
  const [sessionCode, setSessionCode] = useState('')
  const navigate = useNavigate()

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = sessionCode.trim()
    if (!trimmed) return
    // Accept full URL or just the UUID
    const id = trimmed.includes('/session/')
      ? trimmed.split('/session/').pop()
      : trimmed
    if (id) navigate(`/session/${id}`)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Stratégie <span className="text-accent">collaborative</span>
        </h1>
        <p className="mt-4 text-lg text-text-muted">
          Uploadez une image, dessinez dessus en temps réel avec votre équipe.
          Annotations, flèches, texte — tout est synchronisé en direct.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Link
          to="/create"
          className="rounded-lg bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Créer une session
        </Link>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value)}
            placeholder="Coller un lien ou code…"
            className="w-64 rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  )
}
