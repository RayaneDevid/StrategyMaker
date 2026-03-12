import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { useSessionRole } from '@/hooks/useSessionRole'
import { useParticipants, useJoinSession } from '@/hooks/useParticipants'
import { CURSOR_COLORS } from '@/lib/constants'
import SessionHeader from '@/components/session/SessionHeader'
import WhiteboardCanvas from '@/components/session/WhiteboardCanvas'
import ParticipantsPanel from '@/components/session/ParticipantsPanel'
import JoinNameModal from '@/components/session/JoinNameModal'

export default function SessionPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading, signInAnonymously } = useAuth()
  const { data: session, isLoading: sessionLoading, error: sessionError } = useSession(sessionId!)
  const { canEdit, isHost, isLoading: roleLoading } = useSessionRole(sessionId!)
  const { data: participants = [] } = useParticipants(sessionId!)
  const joinSession = useJoinSession()

  // Whether the user has completed the join flow (name chosen & joined)
  const [hasJoined, setHasJoined] = useState(false)
  const [chosenName, setChosenName] = useState<string | null>(null)

  // Auto sign-in anonymously if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      signInAnonymously()
    }
  }, [authLoading, user, signInAnonymously])

  // Check if user is already a participant (returning user or host)
  useEffect(() => {
    if (!user || !sessionId || hasJoined) return
    const existing = participants.find((p) => p.user_id === user.id)
    if (existing) {
      setChosenName(existing.display_name)
      setHasJoined(true)
      // Mark online again
      joinSession.mutate({
        sessionId,
        userId: user.id,
        displayName: existing.display_name,
        color: existing.color,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sessionId, participants.length])

  // Handle name submission from the modal
  const handleNameSubmit = useCallback(
    (name: string) => {
      if (!user || !sessionId || !session) return
      const colorIndex = participants.length % CURSOR_COLORS.length
      const color = CURSOR_COLORS[colorIndex]

      setChosenName(name)
      setHasJoined(true)

      joinSession.mutate({
        sessionId,
        userId: user.id,
        displayName: name,
        color,
      })
    },
    [user, sessionId, session, participants.length, joinSession],
  )

  // Mark user as offline on unmount
  useEffect(() => {
    return () => {
      if (user && sessionId) {
        import('@/lib/supabase').then(({ supabase }) => {
          supabase
            .from('session_participants')
            .update({ is_online: false })
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
        })
      }
    }
  }, [user, sessionId])

  if (authLoading || sessionLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (sessionError || !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg">
        <p className="text-text-muted">Session introuvable ou inactive.</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  if (!user) return null

  // Show name modal if user hasn't joined yet
  if (!hasJoined) {
    return (
      <div className="relative h-screen bg-bg">
        <JoinNameModal onSubmit={handleNameSubmit} />
      </div>
    )
  }

  const displayName = chosenName ?? 'Anonyme'
  const myParticipant = participants.find((p) => p.user_id === user.id)
  const userColor = myParticipant?.color ?? CURSOR_COLORS[0]

  return (
    <div className="relative flex h-screen flex-col">
      <SessionHeader
        sessionName={session.name}
        sessionId={session.id}
        isHost={isHost}
        participantCount={participants.filter((p) => p.is_online).length}
      />

      <div className="relative flex-1">
        <WhiteboardCanvas
          sessionId={session.id}
          userId={user.id}
          displayName={displayName}
          userColor={userColor}
          canEdit={canEdit}
          isHost={isHost}
          imageUrl={session.image_url}
          snapshot={session.snapshot}
        />

        <ParticipantsPanel
          participants={participants}
          sessionId={session.id}
          isHost={isHost}
        />
      </div>
    </div>
  )
}
