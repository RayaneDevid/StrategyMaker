import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateSession } from '@/hooks/useSession'
import ImageUploader from './ImageUploader'

export default function CreateSessionForm() {
  const [name, setName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const navigate = useNavigate()
  const createSession = useCreateSession()

  const preview = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !imageFile) return

    const session = await createSession.mutateAsync({
      name: name.trim(),
      imageFile,
    })
    navigate(`/session/${session.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Nouvelle session
        </h1>
        <p className="mt-2 text-text-muted">
          Uploadez une image de fond et donnez un nom à votre session.
        </p>
      </div>

      <div>
        <label htmlFor="session-name" className="mb-1 block text-sm text-text-muted">
          Nom de la session
        </label>
        <input
          id="session-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
          placeholder="Ex: Stratégie du match retour"
        />
      </div>

      <ImageUploader onFileSelect={setImageFile} preview={preview} />

      {createSession.error && (
        <p className="text-sm text-danger">
          {createSession.error instanceof Error
            ? createSession.error.message
            : 'Erreur lors de la création'}
        </p>
      )}

      <button
        type="submit"
        disabled={!name.trim() || !imageFile || createSession.isPending}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {createSession.isPending ? 'Création en cours…' : 'Créer la session'}
      </button>
    </form>
  )
}
