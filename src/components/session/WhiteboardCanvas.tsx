import React, { useCallback, useEffect, useState } from 'react'
import { Tldraw, type Editor, type TLAssetId } from 'tldraw'
import { useTldrawSync } from '@/hooks/useTldrawSync'
import type { CursorMap } from '@/lib/sync-provider'
import type { Json } from '@/types/database'

interface WhiteboardCanvasProps {
  sessionId: string
  userId: string
  displayName: string
  userColor: string
  canEdit: boolean
  isHost: boolean
  imageUrl: string
  snapshot: Json | null
  cursors?: CursorMap
  onCursorsChange?: (cursors: CursorMap) => void
}

export default function WhiteboardCanvas({
  sessionId,
  userId,
  displayName,
  userColor,
  canEdit,
  isHost,
  imageUrl,
  snapshot,
}: WhiteboardCanvasProps) {
  const { handleMount, cursors, editor: editorRef } = useTldrawSync({
    sessionId,
    userId,
    displayName,
    userColor,
    canEdit,
    isHost,
  })

  const onMount = useCallback(
    (editor: Editor) => {
      // Load snapshot if it exists
      if (snapshot) {
        try {
          editor.loadSnapshot(snapshot as unknown as Parameters<typeof editor.loadSnapshot>[0])
        } catch {
          // Snapshot may be incompatible, start fresh
        }
      }

      // Insert background image as a locked asset
      loadBackgroundImage(editor, imageUrl).catch(console.error)

      // Set readonly for spectators
      editor.updateInstanceState({ isReadonly: !canEdit })

      // Connect sync
      handleMount(editor)
    },
    [imageUrl, handleMount],
  )

  return (
    <div className="absolute inset-0">
      <Tldraw licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY} onMount={onMount} />
      <CursorsOverlay cursors={cursors} editorRef={editorRef} />
    </div>
  )
}

async function loadBackgroundImage(editor: Editor, imageUrl: string) {
  // Check if background already exists (from snapshot)
  const existingShapes = editor.getCurrentPageShapes()
  const bgExists = existingShapes.some(
    (s) => s.type === 'image' && s.isLocked,
  )
  if (bgExists) return

  // Load image to get dimensions
  const img = new Image()
  img.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })

  const assetId = `asset:bg-${crypto.randomUUID()}` as TLAssetId

  editor.createAssets([
    {
      id: assetId,
      type: 'image',
      typeName: 'asset',
      props: {
        name: 'background',
        src: imageUrl,
        w: img.naturalWidth,
        h: img.naturalHeight,
        mimeType: 'image/png',
        isAnimated: false,
      },
      meta: {},
    },
  ])

  editor.createShape({
    type: 'image',
    x: 0,
    y: 0,
    isLocked: true,
    props: {
      assetId,
      w: img.naturalWidth,
      h: img.naturalHeight,
    },
  })

  // Center the camera on the image
  editor.zoomToFit({ animation: { duration: 0 } })
}

function CursorsOverlay({
  cursors,
  editorRef,
}: {
  cursors: CursorMap
  editorRef: React.RefObject<Editor | null>
}) {
  // Re-render on camera changes so cursor positions stay accurate
  const [, setTick] = useState(0)
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const unlisten = editor.store.listen(
      () => setTick((t) => t + 1),
      { source: 'all', scope: 'session' },
    )
    return unlisten
  }, [editorRef])

  if (cursors.size === 0) return null

  const editor = editorRef.current

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {Array.from(cursors.values()).map((cursor) => {
        // Convert page coordinates to viewport (screen) coordinates
        const screenPoint = editor
          ? editor.pageToViewport(cursor.point)
          : cursor.point

        return (
          <div
            key={cursor.userId}
            className="absolute transition-transform duration-75"
            style={{
              transform: `translate(${screenPoint.x}px, ${screenPoint.y}px)`,
            }}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 16 16"
              fill={cursor.color}
            >
              <path d="M0 0l16 6-6.5 2.5L7 16z" />
            </svg>
            <span
              className="ml-2 whitespace-nowrap rounded px-1 py-0.5 text-xs text-white"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
