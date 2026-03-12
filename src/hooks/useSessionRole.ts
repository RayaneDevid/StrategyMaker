import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Participant } from '@/types/database'

export function useSessionRole(sessionId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: participant, ...rest } = useQuery({
    queryKey: ['session-role', sessionId],
    queryFn: async (): Promise<Participant | null> => {
      if (!user) return null
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return (data as Participant) ?? null
    },
    enabled: !!user && !!sessionId,
  })

  // Listen for real-time role changes
  useEffect(() => {
    if (!user || !sessionId) return

    const channel = supabase
      .channel(`role:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.user_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ['session-role', sessionId] })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, sessionId, queryClient])

  const role = participant?.role ?? 'spectator'

  return {
    participant,
    role,
    canEdit: role === 'host' || role === 'editor',
    isHost: role === 'host',
    ...rest,
  }
}
