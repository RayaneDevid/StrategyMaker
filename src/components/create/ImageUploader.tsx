import { useCallback, useState } from 'react'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'

interface ImageUploaderProps {
  onFileSelect: (file: File) => void
  preview: string | null
}

export default function ImageUploader({ onFileSelect, preview }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null)
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Format non supporté. Utilisez PNG, JPG ou WEBP.')
        return
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError('Image trop lourde (10 MB max).')
        return
      }
      onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) validateAndSelect(file)
    },
    [validateAndSelect],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
  }

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm text-text-muted">
        Image de fond
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-accent/50'
        }`}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <svg
              className="h-10 w-10 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm text-text-muted">
              Glissez une image ici ou{' '}
              <span className="text-accent">parcourez</span>
            </p>
            <p className="text-xs text-text-muted">PNG, JPG, WEBP — 10 MB max</p>
          </div>
        )}

        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
