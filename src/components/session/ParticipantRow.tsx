import type { Participant, ParticipantRole } from '@/types/database'
import { useUpdateParticipantRole } from '@/hooks/useParticipants'

interface ParticipantRowProps {
  participant: Participant
  sessionId: string
  isHost: boolean
}

export default function ParticipantRow({
  participant,
  sessionId,
  isHost,
}: ParticipantRowProps) {
  const updateRole = useUpdateParticipantRole()

  const toggleRole = () => {
    if (!isHost || participant.role === 'host') return
    const newRole: ParticipantRole =
      participant.role === 'spectator' ? 'editor' : 'spectator'
    updateRole.mutate({
      participantId: participant.id,
      sessionId,
      role: newRole,
    })
  }

  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-bg">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: participant.is_online ? participant.color : '#3f3f46' }}
        />
        <span className="text-sm">
          {participant.display_name}
        </span>
        {participant.role === 'host' && (
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            Hôte
          </span>
        )}
      </div>

      {isHost && participant.role !== 'host' && (
        <button
          onClick={toggleRole}
          disabled={updateRole.isPending}
          className={`rounded-lg px-2 py-1 text-xs transition-colors ${
            participant.role === 'editor'
              ? 'bg-accent/20 text-accent hover:bg-accent/30'
              : 'bg-bg text-text-muted hover:text-text'
          }`}
        >
          {participant.role === 'editor' ? 'Éditeur' : 'Spectateur'}
        </button>
      )}
    </div>
  )
}
