import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import Peer, { type DataConnection } from 'peerjs'
import type { Action, AppState } from './types'
import { DispatchCtx, useBoard } from './store'
import { getMode, getRoom, peerIdForRoom, type AppMode } from './role'

export type LinkStatus = 'connecting' | 'live' | 'waiting' | 'error'

type Wire =
  | { t: 'state'; state: AppState }
  | { t: 'action'; action: Action }

const MANAGER_ACTIONS = new Set<Action['type']>([
  'clock-in',
  'clock-in-many',
  'clock-out',
  'add-house',
  'add-guest',
  'start-dance',
  'end-dance',
  'start-break',
  'set-available',
])

const RoleCtx = createContext<{
  mode: AppMode
  room: string
  status: LinkStatus
  manager: boolean
} | null>(null)

export function useRole() {
  const v = useContext(RoleCtx)
  if (!v) throw new Error('useRole requires SyncProvider')
  return v
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const mode = useMemo(() => getMode(), [])
  const room = useMemo(() => getRoom(), [])
  const state = useBoard()
  const innerDispatch = useContext(DispatchCtx)
  if (!innerDispatch) throw new Error('SyncProvider needs StoreProvider')

  const [status, setStatus] = useState<LinkStatus>(
    mode === 'dj' ? 'waiting' : 'connecting',
  )
  const conns = useRef<Set<DataConnection>>(new Set())
  const stateRef = useRef(state)
  stateRef.current = state

  const broadcast = useCallback((wire: Wire) => {
    const payload = JSON.stringify(wire)
    for (const c of conns.current) {
      if (c.open) {
        try {
          c.send(payload)
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  useEffect(() => {
    const id = peerIdForRoom(room)
    let peer: Peer
    try {
      peer = mode === 'dj' ? new Peer(id) : new Peer()
    } catch {
      setStatus('error')
      return
    }

    const onConn = (conn: DataConnection) => {
      conns.current.add(conn)
      conn.on('open', () => {
        setStatus('live')
        if (mode === 'dj') {
          try {
            conn.send(JSON.stringify({ t: 'state', state: stateRef.current } satisfies Wire))
          } catch {
            /* ignore */
          }
        }
      })
      conn.on('data', (raw) => {
        try {
          const msg = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Wire
          if (mode === 'dj' && msg.t === 'action') {
            if (!MANAGER_ACTIONS.has(msg.action.type)) return
            innerDispatch(msg.action)
          }
          if (mode === 'manager' && msg.t === 'state') {
            innerDispatch({ type: 'replace-state', state: msg.state })
            setStatus('live')
          }
        } catch {
          /* ignore */
        }
      })
      conn.on('close', () => {
        conns.current.delete(conn)
        if (conns.current.size === 0) {
          setStatus(mode === 'dj' ? 'waiting' : 'connecting')
        }
      })
      conn.on('error', () => setStatus('error'))
    }

    peer.on('open', () => {
      if (mode === 'dj') {
        setStatus(conns.current.size ? 'live' : 'waiting')
      } else {
        const conn = peer.connect(id, { reliable: true })
        onConn(conn)
      }
    })
    peer.on('connection', onConn)
    peer.on('error', () => setStatus('error'))

    return () => {
      for (const c of conns.current) {
        try {
          c.close()
        } catch {
          /* ignore */
        }
      }
      conns.current.clear()
      try {
        peer.destroy()
      } catch {
        /* ignore */
      }
    }
  }, [mode, room, innerDispatch])

  useEffect(() => {
    if (mode !== 'dj') return
    broadcast({ t: 'state', state })
  }, [mode, state, broadcast])

  const dispatch = useCallback<Dispatch<Action>>(
    (action) => {
      if (mode === 'manager') {
        if (!MANAGER_ACTIONS.has(action.type)) return
        broadcast({ t: 'action', action })
        return
      }
      innerDispatch(action)
    },
    [mode, broadcast, innerDispatch],
  )

  const role = useMemo(
    () => ({ mode, room, status, manager: mode === 'manager' }),
    [mode, room, status],
  )

  return (
    <RoleCtx.Provider value={role}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </RoleCtx.Provider>
  )
}
