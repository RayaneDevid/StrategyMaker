import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Session } from '@/types/database'

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async (): Promise<Session> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      if (error) throw error
      return data as Session
    },
    enabled: !!sessionId,
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      imageFile,
    }: {
      name: string
      imageFile: File
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // Upload image
      const fileExt = imageFile.name.split('.').pop()
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('session-images')
        .upload(filePath, imageFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('session-images')
        .getPublicUrl(filePath)

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({ name, host_id: user.id, image_url: publicUrl })
        .select()
        .single()
      if (sessionError || !session) throw sessionError ?? new Error('Failed to create session')

      // Add host as participant
      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({
          session_id: (session as Session).id,
          user_id: user.id,
          display_name: user.email ?? 'Hôte',
          role: 'host',
          is_online: true,
        })
      if (participantError) throw participantError

      return session as Session
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useCloseSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('sessions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: (_data, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    },
  })
}
