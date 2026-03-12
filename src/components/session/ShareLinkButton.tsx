import { useState } from 'react'

interface ShareLinkButtonProps {
  sessionId: string
}

export default function ShareLinkButton({ sessionId }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/session/${sessionId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copié !
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
          </svg>
          Copier le lien
        </>
      )}
    </button>
  )
}
