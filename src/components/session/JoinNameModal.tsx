import { useState } from 'react'

interface JoinNameModalProps {
  onSubmit: (name: string) => void
}

export default function JoinNameModal({ onSubmit }: JoinNameModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim() || 'Anonyme'
    onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6"
      >
        <h2 className="mb-1 text-lg font-semibold">Rejoindre la session</h2>
        <p className="mb-4 text-sm text-text-muted">
          Choisissez un nom à afficher pour les autres participants.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom..."
          maxLength={30}
          autoFocus
          className="mb-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Rejoindre
        </button>
      </form>
    </div>
  )
}
