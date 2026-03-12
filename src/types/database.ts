export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    PostgrestVersion: '12'
    Tables: {
      sessions: {
        Row: {
          id: string
          name: string
          host_id: string
          image_url: string
          snapshot: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          host_id: string
          image_url: string
          snapshot?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          host_id?: string
          image_url?: string
          snapshot?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string
          display_name: string
          role: 'host' | 'editor' | 'spectator'
          color: string
          is_online: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          display_name?: string
          role?: 'host' | 'editor' | 'spectator'
          color?: string
          is_online?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          display_name?: string
          role?: 'host' | 'editor' | 'spectator'
          color?: string
          is_online?: boolean
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_participants_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Session = Database['public']['Tables']['sessions']['Row']
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type Participant = Database['public']['Tables']['session_participants']['Row']
export type ParticipantInsert = Database['public']['Tables']['session_participants']['Insert']
export type ParticipantUpdate = Database['public']['Tables']['session_participants']['Update']
export type ParticipantRole = Participant['role']
