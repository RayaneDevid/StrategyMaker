# CLAUDE.md — Whiteboard Collaboratif

## Contexte projet

Application web de whiteboard collaboratif en temps réel. Un hôte upload une image de fond, crée une session partageable, et peut dessiner/annoter dessus. Les participants voient tout en direct. L'hôte contrôle qui peut dessiner (système de permissions hôte/éditeur/spectateur).

## Stack

- **Frontend** : React 19 + Vite + TypeScript + Tailwind CSS v4
- **Whiteboard** : tldraw v3 (bibliothèque open-source de canvas collaboratif)
- **State** : Zustand (UI locale), TanStack Query v5 (server state)
- **Backend** : Supabase Cloud (Auth, PostgreSQL, Realtime Broadcast, Storage)
- **Routing** : React Router v7

## Commandes

```bash
npm run dev       # Dev server Vite
npm run build     # Build production
npm run preview   # Preview du build
npm run lint      # ESLint
```

## Conventions

### Code

- Tout en **TypeScript strict** — pas de `any`, pas de `as` sauf cas justifié.
- Composants React en **functional components** avec hooks.
- Nommage : `PascalCase` pour les composants, `camelCase` pour les fonctions/variables, `UPPER_SNAKE_CASE` pour les constantes.
- Un composant = un fichier. Pas de composants imbriqués dans le même fichier sauf s'ils sont purement internes (<20 lignes).
- Imports absolus via alias `@/` mappé sur `src/`.

### Styling

- **Tailwind CSS v4** uniquement — pas de CSS custom sauf cas exceptionnel.
- **Dark mode** par défaut (pas de toggle light/dark pour l'instant).
- Palette : fond `#0a0a0b`, surface `#141416`, border `#2a2a2e`, accent indigo `#6366f1`, texte `#fafafa` / `#71717a`.
- Police : `Geist` (display/body), `Geist Mono` (codes).
- Border radius : `rounded-lg` (8px) standard, `rounded-xl` (12px) pour les cartes.

### Data fetching

- **TanStack Query v5** pour toutes les requêtes Supabase.
- Chaque mutation doit **invalider les query keys liées** dans `onSuccess`.
- Query keys structurées : `['sessions']`, `['session', sessionId]`, `['participants', sessionId]`.
- Debounce de 1.5s sur les inputs de recherche (si applicable).

### Supabase

- Client initialisé dans `src/lib/supabase.ts` — une seule instance.
- Toujours utiliser le client typé avec les types générés (`Database`).
- Générer les types avec `npx supabase gen types typescript --project-id <ref> > src/types/database.ts`.
- Realtime : un channel par session (`session:{id}`), cleanup dans le `useEffect` return.

### tldraw

- Wrapper dans `WhiteboardCanvas.tsx` — toute la logique tldraw est encapsulée ici + dans `useTldrawSync.ts`.
- L'image de fond est insérée comme asset tldraw avec `isLocked: true`.
- Mode read-only pour les spectateurs : `editor.updateInstanceState({ isReadonly: true })`.
- Sync via `editor.store.listen()` (émission) et `editor.store.mergeRemoteChanges()` (réception).

### Fichiers importants

- `SPEC_WHITEBOARD.md` : Spécification complète du projet (schéma DB, archi, flux utilisateur, détail technique de la sync).
- `src/lib/sync-provider.ts` : Logique de synchronisation tldraw ↔ Supabase Realtime.
- `src/hooks/useTldrawSync.ts` : Hook React qui connecte le sync provider à tldraw.
- `src/hooks/useSessionRole.ts` : Hook pour connaître le rôle du user courant et réagir aux changements de permission en temps réel.

## Structure

```
src/
├── routes/          # Pages (index, create, session.$id, login)
├── components/      # UI components organisés par feature
│   ├── layout/      # Header, Layout
│   ├── session/     # WhiteboardCanvas, ParticipantsPanel, etc.
│   ├── create/      # CreateSessionForm, ImageUploader
│   └── auth/        # LoginForm, AuthGuard
├── hooks/           # Custom hooks (useSession, useSessionRole, etc.)
├── lib/             # Supabase client, sync provider, constantes
├── stores/          # Zustand stores
└── types/           # Types TypeScript, types DB générés
```

## Points d'attention

- **Toujours throttle** les broadcasts de curseur (50ms min) et les diffs tldraw si beaucoup de strokes rapides.
- **Cleanup Realtime** : chaque `supabase.channel()` doit être `removeChannel()` dans le cleanup du useEffect.
- **Snapshot tldraw** : sauvegardé en JSONB dans la table `sessions` — l'hôte sauvegarde toutes les 30s + au unmount.
- **Permissions temps réel** : écouter `postgres_changes` sur `session_participants` pour réagir aux changements de rôle sans refresh.
- **Image de fond** : doit être verrouillée (`isLocked: true`) pour que personne ne puisse la déplacer/supprimer.
- **Auth anonyme** : les participants non connectés utilisent l'auth anonyme Supabase pour avoir un `user_id` (nécessaire pour les RLS policies).