# Spec — Whiteboard Collaboratif Interactif

## Vue d'ensemble

Application web permettant à un hôte de créer une session de whiteboard collaboratif sur une image uploadée. L'hôte et les participants autorisés peuvent dessiner, ajouter du texte et des annotations en temps réel. Tous les participants voient les modifications en direct.

---

## Stack Technique

| Couche | Techno |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| Whiteboard | **tldraw** (v3+) |
| State management | Zustand (état local UI) |
| Backend | Supabase Cloud (Auth, Database, Realtime, Storage) |
| Déploiement | Vercel (frontend) |

---

## Fonctionnalités

### 1. Authentification

- Supabase Auth avec **login anonyme** (pour les participants invités) + optionnel email/password ou Discord OAuth pour les hôtes.
- L'hôte doit être authentifié (email ou Discord) pour créer une session.
- Les participants peuvent rejoindre via un lien sans compte (auth anonyme Supabase).

### 2. Gestion des sessions

- **Créer une session** : L'hôte upload une image (fond du whiteboard), donne un nom à la session → génère un `session_id` (UUID) et un lien partageable (`/session/:session_id`).
- **Rejoindre une session** : Un participant ouvre le lien → rejoint en mode **spectateur** par défaut (voit tout en temps réel mais ne peut pas dessiner).
- **Fermer une session** : L'hôte peut fermer la session, ce qui déconnecte tous les participants.
- **Persistance** : L'état du whiteboard (snapshot tldraw) est sauvegardé dans Supabase pour pouvoir reprendre une session plus tard.

### 3. Permissions

Le système de permissions est simple et géré par l'hôte :

| Rôle | Peut voir | Peut dessiner | Peut gérer les permissions | Peut supprimer la session |
|---|---|---|---|---|
| **Hôte** (créateur) | ✅ | ✅ | ✅ | ✅ |
| **Éditeur** | ✅ | ✅ | ❌ | ❌ |
| **Spectateur** (défaut) | ✅ | ❌ | ❌ | ❌ |

- L'hôte voit la liste des participants connectés dans un panneau latéral.
- L'hôte peut promouvoir un spectateur en éditeur (et révoquer).
- Changements de permissions appliqués en temps réel.

### 4. Whiteboard (tldraw)

Fonctionnalités du canvas :

- **Image de fond** : L'image uploadée est verrouillée comme fond (non déplaçable, non supprimable).
- **Outils de dessin** : Tous les outils natifs tldraw — crayon, formes, flèches, texte, surligneur, gomme, sticky notes.
- **Curseurs en temps réel** : Les participants voient les curseurs des autres en temps réel (avec nom/couleur).
- **Verrouillage** : Les spectateurs ont le canvas en mode read-only (pan + zoom uniquement).

### 5. Synchronisation en temps réel

Architecture de sync via **Supabase Realtime Broadcast** :

- Chaque session = un channel Broadcast Supabase (`session:{session_id}`).
- L'hôte et les éditeurs broadcast les opérations tldraw (diffs de records) sur le channel.
- Tous les participants écoutent et appliquent les diffs localement.
- Les curseurs sont broadcastés sur un sous-canal `presence` pour la position + identité.
- **Conflict resolution** : tldraw utilise un modèle CRDT-like avec ses records — on s'appuie dessus pour la résolution de conflits.

### 6. Upload d'images

- Supabase Storage bucket `session-images` (public pour lecture, authentifié pour écriture).
- Formats acceptés : PNG, JPG, WEBP.
- Limite de taille : 10 MB.
- L'image est uploadée au moment de la création de session et son URL publique est stockée dans la table `sessions`.

---

## Schéma de base de données

### Table `sessions`

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  snapshot JSONB, -- Snapshot tldraw sérialisé pour persistance
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire une session active (pour rejoindre via lien)
CREATE POLICY "Sessions lisibles par tous"
  ON sessions FOR SELECT
  USING (is_active = true);

-- Seul l'hôte peut modifier sa session
CREATE POLICY "Hôte peut modifier sa session"
  ON sessions FOR UPDATE
  USING (auth.uid() = host_id);

-- Seul un user authentifié peut créer une session
CREATE POLICY "Users authentifiés peuvent créer"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Seul l'hôte peut supprimer
CREATE POLICY "Hôte peut supprimer"
  ON sessions FOR DELETE
  USING (auth.uid() = host_id);
```

### Table `session_participants`

```sql
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonyme',
  role TEXT NOT NULL DEFAULT 'spectator' CHECK (role IN ('host', 'editor', 'spectator')),
  color TEXT NOT NULL DEFAULT '#6366f1', -- Couleur du curseur
  is_online BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (session_id, user_id)
);

-- RLS
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Les participants d'une session peuvent voir les autres participants
CREATE POLICY "Participants visibles dans la session"
  ON session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM session_participants sp
      WHERE sp.session_id = session_participants.session_id
        AND sp.user_id = auth.uid()
    )
  );

-- Un user peut s'ajouter comme participant
CREATE POLICY "User peut rejoindre"
  ON session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'spectator');

-- L'hôte peut modifier les rôles des participants
CREATE POLICY "Hôte peut modifier les participants"
  ON session_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_participants.session_id
        AND s.host_id = auth.uid()
    )
  );

-- Le user peut mettre à jour son propre statut online/display_name
CREATE POLICY "User peut modifier son propre statut"
  ON session_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Storage bucket

```sql
-- Créer le bucket via le dashboard ou migration
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-images', 'session-images', true);

-- Policy : authentifié peut upload
CREATE POLICY "Auth users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'session-images'
    AND auth.role() = 'authenticated'
  );

-- Policy : tout le monde peut lire
CREATE POLICY "Public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'session-images');
```

---

## Architecture des pages

### `/` — Page d'accueil

- Titre + description du projet.
- Bouton "Créer une session" → redirige vers `/create` (ou ouvre une modale).
- Bouton "Rejoindre" avec champ pour coller un lien/code de session.

### `/create` — Création de session

- Si non authentifié → rediriger vers login.
- Formulaire : nom de session + upload d'image (drag & drop + preview).
- Bouton "Créer" → crée la session dans Supabase, upload l'image, redirige vers `/session/:id`.

### `/session/:id` — Session de whiteboard

C'est la page principale. Layout :

```
┌─────────────────────────────────────────────────┐
│  Header : nom session | participants (avatars)  │
│  [Copier le lien] [Fermer session (host only)]  │
├───────────────────────────────────┬──────────────┤
│                                   │  Panneau     │
│                                   │  latéral     │
│         Canvas tldraw             │  (host only) │
│         (plein écran)             │              │
│                                   │  - Liste     │
│                                   │    participants│
│                                   │  - Toggle    │
│                                   │    rôles     │
│                                   │              │
├───────────────────────────────────┴──────────────┤
│  Toolbar tldraw (si éditeur/hôte)               │
└─────────────────────────────────────────────────┘
```

- Le panneau latéral est **collapsible** et visible uniquement par l'hôte.
- Les spectateurs voient le canvas en full screen + header minimal.
- Le toolbar tldraw est masqué pour les spectateurs.

### `/login` — Authentification

- Login email/password ou Discord OAuth.
- Redirige vers `/` après connexion.

---

## Sync tldraw + Supabase Realtime — Détail technique

### Provider custom pour tldraw

tldraw expose un système de `TldrawEditor` avec un `store` qui contient des records. Pour la sync :

1. **Initialisation** : Quand un participant rejoint, il fetch le dernier snapshot depuis `sessions.snapshot` et hydrate le store tldraw.

2. **Diffusion des changements** : On écoute les changements du store tldraw via `editor.store.listen()`. Quand un éditeur/hôte modifie quelque chose, on broadcast le diff via Supabase Realtime :

```typescript
// Côté émetteur (hôte/éditeur)
editor.store.listen((entry) => {
  const { changes, source } = entry;
  if (source === 'user') {
    channel.send({
      type: 'broadcast',
      event: 'tldraw-diff',
      payload: changes,
    });
  }
});
```

3. **Réception** : Tous les participants écoutent le channel et appliquent les diffs :

```typescript
// Côté récepteur
channel.on('broadcast', { event: 'tldraw-diff' }, (payload) => {
  editor.store.mergeRemoteChanges(() => {
    const { added, updated, removed } = payload.payload;
    // Appliquer les records ajoutés/modifiés/supprimés
    for (const record of Object.values(added)) {
      editor.store.put([record]);
    }
    for (const [, to] of Object.values(updated)) {
      editor.store.put([to]);
    }
    for (const record of Object.values(removed)) {
      editor.store.remove([record.id]);
    }
  });
});
```

4. **Curseurs (Presence)** : On utilise Supabase Realtime Presence pour tracker les curseurs :

```typescript
// Track sa propre position
editor.user.updateUserPreferences({
  name: displayName,
  color: userColor,
});

// Broadcast cursor position
const handlePointerMove = throttle((e) => {
  channel.send({
    type: 'broadcast',
    event: 'cursor',
    payload: {
      userId: myUserId,
      point: editor.inputs.currentPagePoint,
      name: displayName,
      color: userColor,
    },
  });
}, 50); // Throttle à 50ms
```

5. **Sauvegarde périodique** : L'hôte sauvegarde le snapshot du store dans `sessions.snapshot` toutes les 30 secondes ou au moment de fermer/quitter :

```typescript
const saveSnapshot = async () => {
  const snapshot = editor.store.getStoreSnapshot();
  await supabase
    .from('sessions')
    .update({ snapshot, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
};
```

---

## Gestion des permissions côté client

```typescript
// Hook useSessionRole
const useSessionRole = (sessionId: string) => {
  const { data: participant } = useQuery({
    queryKey: ['session-role', sessionId],
    queryFn: () => fetchMyRole(sessionId),
  });

  // Écouter les changements de rôle en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`role:${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new.user_id === myUserId) {
          queryClient.invalidateQueries(['session-role', sessionId]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return {
    role: participant?.role ?? 'spectator',
    canEdit: participant?.role === 'host' || participant?.role === 'editor',
    isHost: participant?.role === 'host',
  };
};
```

Côté tldraw, on utilise `editor.updateInstanceState({ isReadonly: !canEdit })` pour verrouiller le canvas pour les spectateurs.

---

## Couleurs des curseurs

Palette prédéfinie de 12 couleurs attribuées automatiquement aux participants dans l'ordre d'arrivée :

```typescript
const CURSOR_COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#ef4444', // red
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
];
```

---

## Structure du projet

```
src/
├── main.tsx
├── App.tsx
├── routes/
│   ├── index.tsx            # Page d'accueil
│   ├── create.tsx           # Création de session
│   ├── session.$id.tsx      # Session whiteboard
│   └── login.tsx            # Auth
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── session/
│   │   ├── WhiteboardCanvas.tsx      # Wrapper tldraw
│   │   ├── ParticipantsPanel.tsx     # Panneau latéral hôte
│   │   ├── ParticipantRow.tsx        # Ligne participant + toggle rôle
│   │   ├── SessionHeader.tsx         # Header avec infos session
│   │   └── ShareLinkButton.tsx       # Copier le lien
│   ├── create/
│   │   ├── CreateSessionForm.tsx
│   │   └── ImageUploader.tsx         # Drag & drop + preview
│   └── auth/
│       ├── LoginForm.tsx
│       └── AuthGuard.tsx             # Protection de route
├── hooks/
│   ├── useSession.ts                 # Fetch/mutation session
│   ├── useSessionRole.ts            # Rôle du user courant
│   ├── useParticipants.ts           # Liste participants temps réel
│   ├── useTldrawSync.ts             # Provider sync tldraw ↔ Supabase
│   └── useAuth.ts                   # Auth state
├── lib/
│   ├── supabase.ts                  # Client Supabase
│   ├── sync-provider.ts             # Logique sync tldraw complète
│   └── constants.ts                 # Couleurs, limites, etc.
├── stores/
│   └── ui-store.ts                  # Zustand (sidebar open, etc.)
└── types/
    └── index.ts                     # Types partagés
```

---

## Design & UI

### Direction artistique

- **Theme** : Dark mode, ambiance "tool" — inspiré de Figma/Linear.
- **Fond** : `#0a0a0b` (quasi noir).
- **Surface** : `#141416` avec borders `#2a2a2e`.
- **Accent** : Indigo `#6366f1`.
- **Texte** : `#fafafa` (primaire), `#71717a` (secondaire).
- **Font** : `Geist` (ou `Geist Mono` pour les codes de session).
- **Radius** : `8px` partout, `12px` pour les cartes.
- **Animations** : Transitions douces 150ms ease, apparition des participants avec fade-in.

### Responsive

- Desktop first (le whiteboard est pensé pour desktop).
- Le panneau latéral passe en bottom sheet sur mobile.
- Sur mobile, les outils tldraw sont simplifiés (toolbar compacte).

---

## Flux utilisateur

### Créer une session

1. Hôte va sur `/` → clique "Créer une session"
2. Si pas connecté → redirigé vers `/login`
3. Sur `/create` → remplit le nom, upload l'image
4. Clique "Créer" → session créée en DB, image uploadée sur Storage
5. Redirigé vers `/session/:id`
6. L'image est chargée comme fond du canvas tldraw
7. L'hôte est enregistré comme participant avec `role: 'host'`

### Rejoindre une session

1. Participant reçoit un lien `/session/:id`
2. Ouvre le lien → auth anonyme automatique si pas connecté
3. Enregistré comme participant `role: 'spectator'`
4. Voit le whiteboard en temps réel (read-only)
5. L'hôte le voit apparaître dans le panneau latéral

### Donner la permission de dessiner

1. L'hôte ouvre le panneau latéral
2. Voit la liste des participants avec leur rôle
3. Clique sur le toggle à côté d'un spectateur → passe en éditeur
4. Le participant reçoit la mise à jour en temps réel
5. Son canvas passe de read-only à éditable
6. La toolbar tldraw apparaît

---

## Points d'attention

- **Performance** : Throttle les broadcasts de curseur (50ms). Batch les diffs tldraw si beaucoup de strokes rapides.
- **Déconnexion** : Utiliser Supabase Presence pour détecter les déconnexions et mettre à jour `is_online`.
- **Taille du snapshot** : Si le snapshot JSONB devient trop gros, envisager de le stocker dans Supabase Storage plutôt qu'en DB.
- **Rate limiting** : Supabase Realtime a des limites sur le nombre de messages/seconde. Surveiller et throttle si nécessaire.
- **Image de fond** : L'image doit être insérée comme un asset tldraw **verrouillé** (`isLocked: true`) pour qu'elle ne soit pas déplaçable/supprimable par les éditeurs.