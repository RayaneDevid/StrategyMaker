-- ============================================
-- Supabase Migration — Whiteboard Collaboratif
-- ============================================

-- 1. Table sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  snapshot JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions lisibles par tous"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Hôte peut modifier sa session"
  ON sessions FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users authentifiés peuvent créer"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hôte peut supprimer"
  ON sessions FOR DELETE
  USING (auth.uid() = host_id);

-- 2. Table session_participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonyme',
  role TEXT NOT NULL DEFAULT 'spectator' CHECK (role IN ('host', 'editor', 'spectator')),
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_online BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (session_id, user_id)
);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants visibles dans la session"
  ON session_participants FOR SELECT
  USING (true);

CREATE POLICY "User peut rejoindre"
  ON session_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      role = 'spectator'
      OR (
        role = 'host'
        AND EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.id = session_id
            AND s.host_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Hôte peut modifier les participants"
  ON session_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_participants.session_id
        AND s.host_id = auth.uid()
    )
  );

CREATE POLICY "User peut modifier son propre statut"
  ON session_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Enable realtime for session_participants (role changes)
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-images', 'session-images', true);

CREATE POLICY "Auth users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'session-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'session-images');
