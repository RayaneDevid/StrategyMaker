import type { Participant } from '@/types/database'
import { useUIStore } from '@/stores/ui-store'
import ParticipantRow from './ParticipantRow'

interface ParticipantsPanelProps {
  participants: Participant[]
  sessionId: string
  isHost: boolean
}

export default function ParticipantsPanel({
  participants,
  sessionId,
  isHost,
}: ParticipantsPanelProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore()

  if (!isHost) return null

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute left-2 top-14 z-[501] rounded-lg border border-border bg-surface p-1.5 transition-colors hover:border-accent"
        aria-label={sidebarOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}
      >
        <svg
          className={`h-4 w-4 transition-transform ${sidebarOpen ? 'rotate-180' : 'rotate-0'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Panel */}
      <div
        className={`absolute left-0 top-12 z-[500] h-[calc(100%-3rem)] w-64 border-r border-border bg-surface transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Participants ({participants.length})
          </h3>
          <div className="space-y-1">
            {participants.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                sessionId={sessionId}
                isHost={isHost}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
