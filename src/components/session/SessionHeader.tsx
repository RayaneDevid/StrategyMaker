import { useNavigate } from 'react-router-dom'
import { useCloseSession } from '@/hooks/useSession'
import ShareLinkButton from './ShareLinkButton'

interface SessionHeaderProps {
  sessionName: string
  sessionId: string
  isHost: boolean
  participantCount: number
}

export default function SessionHeader({
  sessionName,
  sessionId,
  isHost,
  participantCount,
}: SessionHeaderProps) {
  const closeSession = useCloseSession()
  const navigate = useNavigate()

  const handleClose = async () => {
    if (!confirm('Êtes-vous sûr de vouloir fermer cette session ?')) return
    await closeSession.mutateAsync(sessionId)
    navigate('/')
  }

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">{sessionName}</h2>
        <span className="rounded-full bg-bg px-2 py-0.5 text-xs text-text-muted">
          {participantCount} participant{participantCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ShareLinkButton sessionId={sessionId} />
        {isHost && (
          <button
            onClick={handleClose}
            disabled={closeSession.isPending}
            className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10"
          >
            Fermer la session
          </button>
        )}
      </div>
    </div>
  )
}
