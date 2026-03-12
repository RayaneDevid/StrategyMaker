import { useEffect, useRef, useState, useCallback } from 'react'
import type { Editor } from 'tldraw'
import { SyncProvider, type CursorMap } from '@/lib/sync-provider'

interface UseTldrawSyncOptions {
  sessionId: string
  userId: string
  displayName: string
  userColor: string
  canEdit: boolean
  isHost: boolean
}

export function useTldrawSync({
  sessionId,
  userId,
  displayName,
  userColor,
  canEdit,
  isHost,
}: UseTldrawSyncOptions) {
  const providerRef = useRef<SyncProvider | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const [cursors, setCursors] = useState<CursorMap>(new Map())

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      const provider = new SyncProvider(
        sessionId,
        userId,
        displayName,
        userColor,
        canEdit,
        isHost,
      )
      providerRef.current = provider

      provider.connect(editor, setCursors)

      // Broadcast cursor on pointer move
      const handlePointerMove = () => {
        provider.broadcastCursor(editor.inputs.currentPagePoint)
      }
      const container = editor.getContainer()
      container.addEventListener('pointermove', handlePointerMove)

      return () => {
        container.removeEventListener('pointermove', handlePointerMove)
      }
    },
    [sessionId, userId],
  )

  // Update user info (displayName, userColor) when they change
  useEffect(() => {
    providerRef.current?.updateUserInfo(displayName, userColor)
  }, [displayName, userColor])

  // Update permissions when they change
  useEffect(() => {
    providerRef.current?.updatePermissions(canEdit, isHost)
  }, [canEdit, isHost])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      providerRef.current?.disconnect()
    }
  }, [sessionId])

  // Set readonly mode based on permissions
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateInstanceState({ isReadonly: !canEdit })
    }
  }, [canEdit])

  return {
    handleMount,
    cursors,
    provider: providerRef,
  }
}
