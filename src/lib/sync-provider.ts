import type { Editor, TLRecord } from 'tldraw'
import { supabase } from '@/lib/supabase'
import { CURSOR_THROTTLE_MS, SNAPSHOT_SAVE_INTERVAL } from '@/lib/constants'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface CursorPayload {
  userId: string
  point: { x: number; y: number }
  name: string
  color: string
}

export type CursorMap = Map<string, CursorPayload>

export class SyncProvider {
  private channel: RealtimeChannel
  private editor: Editor | null = null
  private unlistenStore: (() => void) | null = null
  private saveInterval: ReturnType<typeof setInterval> | null = null
  private cursorThrottleTimer: ReturnType<typeof setTimeout> | null = null
  private lastCursorSendTime = 0
  private onCursorsChange: ((cursors: CursorMap) => void) | null = null
  private cursors: CursorMap = new Map()

  constructor(
    private sessionId: string,
    private userId: string,
    private displayName: string,
    private userColor: string,
    private canEdit: boolean,
    private isHost: boolean,
  ) {
    this.channel = supabase.channel(`session:${sessionId}`)
  }

  connect(
    editor: Editor,
    onCursorsChange: (cursors: CursorMap) => void,
  ) {
    this.editor = editor
    this.onCursorsChange = onCursorsChange

    // Listen for tldraw diffs from other users
    this.channel.on('broadcast', { event: 'tldraw-diff' }, ({ payload }) => {
      const ed = this.editor
      if (!ed) return
      ed.store.mergeRemoteChanges(() => {
        const { added, updated, removed } = payload as {
          added: Record<string, TLRecord>
          updated: Record<string, [TLRecord, TLRecord]>
          removed: Record<string, TLRecord>
        }
        if (added) {
          for (const record of Object.values(added)) {
            ed.store.put([record])
          }
        }
        if (updated) {
          for (const [, to] of Object.values(updated)) {
            ed.store.put([to])
          }
        }
        if (removed) {
          for (const record of Object.values(removed)) {
            ed.store.remove([record.id])
          }
        }
      })
    })

    // Listen for cursor broadcasts
    this.channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const cursor = payload as CursorPayload
      if (cursor.userId === this.userId) return
      this.cursors.set(cursor.userId, cursor)
      this.onCursorsChange?.(new Map(this.cursors))
    })

    this.channel.subscribe()

    // If can edit, broadcast local changes (only document-scoped, user-initiated)
    if (this.canEdit) {
      this.unlistenStore = editor.store.listen(
        (entry) => {
          this.channel.send({
            type: 'broadcast',
            event: 'tldraw-diff',
            payload: entry.changes,
          })
        },
        { source: 'user', scope: 'document' },
      )
    }

    // Host saves snapshots periodically
    if (this.isHost) {
      this.saveInterval = setInterval(() => {
        this.saveSnapshot()
      }, SNAPSHOT_SAVE_INTERVAL)
    }
  }

  broadcastCursor(point: { x: number; y: number }) {
    const now = Date.now()
    if (now - this.lastCursorSendTime < CURSOR_THROTTLE_MS) return
    this.lastCursorSendTime = now

    this.channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        userId: this.userId,
        point,
        name: this.displayName,
        color: this.userColor,
      } satisfies CursorPayload,
    })
  }

  async saveSnapshot() {
    if (!this.editor) return
    const snapshot = this.editor.getSnapshot()
    await supabase
      .from('sessions')
      .update({
        snapshot: JSON.parse(JSON.stringify(snapshot)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.sessionId)
  }

  updatePermissions(canEdit: boolean, isHost: boolean) {
    this.canEdit = canEdit
    this.isHost = isHost

    // Update store listener
    if (this.unlistenStore) {
      this.unlistenStore()
      this.unlistenStore = null
    }

    if (canEdit && this.editor) {
      this.unlistenStore = this.editor.store.listen(
        (entry) => {
          this.channel.send({
            type: 'broadcast',
            event: 'tldraw-diff',
            payload: entry.changes,
          })
        },
        { source: 'user', scope: 'document' },
      )
    }

    // Start/stop save interval
    if (isHost && !this.saveInterval) {
      this.saveInterval = setInterval(() => {
        this.saveSnapshot()
      }, SNAPSHOT_SAVE_INTERVAL)
    } else if (!isHost && this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
  }

  async disconnect() {
    if (this.isHost) {
      await this.saveSnapshot()
    }

    if (this.unlistenStore) {
      this.unlistenStore()
      this.unlistenStore = null
    }

    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }

    if (this.cursorThrottleTimer) {
      clearTimeout(this.cursorThrottleTimer)
      this.cursorThrottleTimer = null
    }

    supabase.removeChannel(this.channel)
    this.editor = null
  }
}
