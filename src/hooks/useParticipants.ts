import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Participant, ParticipantRole } from '@/types/database'

export function useParticipants(sessionId: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['participants', sessionId],
    queryFn: async (): Promise<Participant[]> => {
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true })
      if (error) throw error
      return data as Participant[]
    },
    enabled: !!sessionId,
  })

  // Listen for real-time participant changes
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`participants:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['participants', sessionId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, queryClient])

  return query
}

export function useUpdateParticipantRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      participantId,
      role,
    }: {
      participantId: string
      sessionId: string
      role: ParticipantRole
    }) => {
      const { error } = await supabase
        .from('session_participants')
        .update({ role })
        .eq('id', participantId)
      if (error) throw error
    },
    onSuccess: (_data, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['participants', sessionId] })
    },
  })
}

export function useJoinSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      userId,
      displayName,
      color,
    }: {
      sessionId: string
      userId: string
      displayName: string
      color: string
    }) => {
      // Upsert — if already participant, just update online status
      const { data: existing } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single()

      if (existing) {
        const { error } = await supabase
          .from('session_participants')
          .update({ is_online: true, display_name: displayName })
          .eq('id', existing.id)
        if (error) throw error
        return existing
      }

      const { data, error } = await supabase
        .from('session_participants')
        .insert({
          session_id: sessionId,
          user_id: userId,
          display_name: displayName,
          role: 'spectator',
          color,
          is_online: true,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['participants', sessionId] })
    },
  })
}
