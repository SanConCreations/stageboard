import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type {
  Action,
  AppState,
  Entertainer,
  EntertainerId,
  Occupancy,
  Stage,
  StageId,
} from './types'

const STORAGE_KEY = 'stageboard:v2'

const SAMPLE_NAMES = ['Jade', 'Raven', 'Skye', 'Nova', 'Diamond', 'Lola'] as const

function uid(): string {
  return crypto.randomUUID()
}

function now(): number {
  return Date.now()
}

function defaultStages(): Stage[] {
  return [
    { id: 'stage-main', name: 'Main stage', autoRotate: false, enabled: true },
    { id: 'stage-2', name: 'Stage 2', autoRotate: false, enabled: true },
    { id: 'stage-3', name: 'Stage 3', autoRotate: false, enabled: true },
  ]
}

function sampleEntertainers(): Entertainer[] {
  const t = now()
  return SAMPLE_NAMES.map((name, i) => ({
    id: `sample-${name.toLowerCase()}`,
    name,
    archived: false,
    guest: false,
    sample: true,
    createdAt: t + i,
  }))
}

function occupancyMap(stages: Stage[]): Record<StageId, Occupancy | null> {
  const occ: Record<StageId, Occupancy | null> = {}
  for (const s of stages) occ[s.id] = null
  return occ
}

export function createInitialState(): AppState {
  const stages = defaultStages()
  return {
    version: 1,
    clubName: 'BX Club',
    sampleRosterPresent: true,
    setLengthMs: 4 * 60 * 1000,
    entertainers: sampleEntertainers(),
    stages,
    clockedIn: [],
    statuses: {},
    occupancy: occupancyMap(stages),
    queue: [],
    nightStartedAt: null,
  }
}

function sanitizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim()
}

/** Drop an entertainer from every tonight slot without deleting the person. */
function vacate(state: AppState, id: EntertainerId): AppState {
  const occupancy: Record<StageId, Occupancy | null> = { ...state.occupancy }
  for (const stageId of Object.keys(occupancy)) {
    if (occupancy[stageId]?.entertainerId === id) occupancy[stageId] = null
  }
  const statuses = { ...state.statuses }
  delete statuses[id]
  return {
    ...state,
    occupancy,
    statuses,
    queue: state.queue.filter((q) => q !== id),
    clockedIn: state.clockedIn.filter((c) => c !== id),
  }
}

function isClockedIn(state: AppState, id: EntertainerId): boolean {
  return state.clockedIn.includes(id)
}

function isAvailable(state: AppState, id: EntertainerId): boolean {
  return isClockedIn(state, id) && state.statuses[id]?.kind === 'available'
}

function pullFromQueue(queue: EntertainerId[], id: EntertainerId): EntertainerId[] {
  return queue.filter((q) => q !== id)
}

function clockInOne(state: AppState, id: EntertainerId): AppState {
  if (isClockedIn(state, id)) return state
  const person = state.entertainers.find((e) => e.id === id)
  if (!person || person.archived) return state
  return {
    ...state,
    clockedIn: [...state.clockedIn, id],
    statuses: {
      ...state.statuses,
      [id]: { kind: 'available', since: now() },
    },
    nightStartedAt: state.nightStartedAt ?? now(),
  }
}

function makeAvailable(state: AppState, id: EntertainerId): AppState {
  if (!isClockedIn(state, id)) return state
  const occupancy: Record<StageId, Occupancy | null> = { ...state.occupancy }
  for (const stageId of Object.keys(occupancy)) {
    if (occupancy[stageId]?.entertainerId === id) occupancy[stageId] = null
  }
  return {
    ...state,
    occupancy,
    statuses: {
      ...state.statuses,
      [id]: { kind: 'available', since: now() },
    },
  }
}

function sendUp(state: AppState, stageId: StageId, entertainerId: EntertainerId): AppState {
  if (!isAvailable(state, entertainerId)) return state
  if (state.occupancy[stageId]) return state
  const stage = state.stages.find((s) => s.id === stageId)
  if (!stage || stage.enabled === false) return state
  const t = now()
  return {
    ...state,
    occupancy: {
      ...state.occupancy,
      [stageId]: { entertainerId, since: t },
    },
    statuses: {
      ...state.statuses,
      [entertainerId]: { kind: 'stage', since: t, stageId },
    },
    queue: pullFromQueue(state.queue, entertainerId),
  }
}


const MIN_SET_MS = 30 * 1000
const MAX_SET_MS = 20 * 60 * 1000

function liveStages(state: AppState): Stage[] {
  const live = state.stages.filter((s) => s.enabled !== false)
  return live.length > 0 ? live : state.stages
}

function entryStage(state: AppState) {
  const live = liveStages(state)
  return live[live.length - 1] ?? null
}

function putOnStage(
  state: AppState,
  stageId: StageId,
  entertainerId: EntertainerId,
): AppState {
  const stage = state.stages.find((s) => s.id === stageId)
  if (!stage || stage.enabled === false) return state
  const t = now()
  const occupancy: Record<StageId, Occupancy | null> = { ...state.occupancy }
  for (const sid of Object.keys(occupancy)) {
    if (occupancy[sid]?.entertainerId === entertainerId) occupancy[sid] = null
  }
  occupancy[stageId] = { entertainerId, since: t }
  return {
    ...state,
    occupancy,
    statuses: {
      ...state.statuses,
      [entertainerId]: { kind: 'stage', since: t, stageId },
    },
    queue: pullFromQueue(state.queue, entertainerId),
  }
}

function enqueueBottom(state: AppState, id: EntertainerId): AppState {
  if (!isClockedIn(state, id)) return state
  if (state.queue.includes(id)) return state
  return { ...state, queue: [...state.queue, id] }
}

/** Feature is the first live stage (usually Main). Last live stage is where they start. Dark stages are skipped. */
function backfillHoles(state: AppState): AppState {
  let s = state
  const live = liveStages(s)
  for (let i = 0; i < live.length - 1; i++) {
    const here = live[i].id
    const below = live[i + 1].id
    const from = s.occupancy[below]
    if (!s.occupancy[here] && from) {
      s = putOnStage(s, here, from.entertainerId)
    }
  }
  const entry = live[live.length - 1]
  if (entry && !s.occupancy[entry.id] && s.queue[0]) {
    s = sendUp(s, entry.id, s.queue[0])
  }
  return s
}

function endSetOn(state: AppState, stageId: StageId): AppState {
  const occ = state.occupancy[stageId]
  if (!occ) return state
  const live = liveStages(state)
  const i = live.findIndex((s) => s.id === stageId)
  if (i < 0) {
    let next = makeAvailable(state, occ.entertainerId)
    next = enqueueBottom(next, occ.entertainerId)
    return backfillHoles(next)
  }
  if (i === 0) {
    // Feature among live stages: come down, bottom of Who's Next, shift up.
    let next = makeAvailable(state, occ.entertainerId)
    next = enqueueBottom(next, occ.entertainerId)
    return backfillHoles(next)
  }
  const above = live[i - 1]
  if (state.occupancy[above.id]) return state
  return backfillHoles(putOnStage(state, above.id, occ.entertainerId))
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'clock-in':
      return clockInOne(state, action.id)

    case 'clock-in-many': {
      let next = state
      for (const id of action.ids) next = clockInOne(next, id)
      return next
    }

    case 'clock-out': {
      const person = state.entertainers.find((e) => e.id === action.id)
      const cleared = vacate(state, action.id)
      if (person?.guest) {
        return {
          ...cleared,
          entertainers: cleared.entertainers.filter((e) => e.id !== action.id),
        }
      }
      return cleared
    }

    case 'add-house': {
      const name = sanitizeName(action.name)
      if (!name) return state
      const id = uid()
      const person: Entertainer = {
        id,
        name,
        archived: false,
        guest: false,
        sample: false,
        createdAt: now(),
      }
      const withPerson: AppState = {
        ...state,
        entertainers: [...state.entertainers, person],
      }
      return action.clockIn ? clockInOne(withPerson, id) : withPerson
    }

    case 'add-guest': {
      const name = sanitizeName(action.name)
      if (!name) return state
      const id = uid()
      const person: Entertainer = {
        id,
        name,
        archived: false,
        guest: true,
        sample: false,
        createdAt: now(),
      }
      return clockInOne(
        { ...state, entertainers: [...state.entertainers, person] },
        id,
      )
    }

    case 'rename': {
      const name = sanitizeName(action.name)
      if (!name) return state
      return {
        ...state,
        entertainers: state.entertainers.map((e) =>
          e.id === action.id ? { ...e, name } : e,
        ),
      }
    }

    case 'archive': {
      const cleared = isClockedIn(state, action.id) ? vacate(state, action.id) : state
      return {
        ...cleared,
        entertainers: cleared.entertainers.map((e) =>
          e.id === action.id ? { ...e, archived: true } : e,
        ),
      }
    }

    case 'unarchive':
      return {
        ...state,
        entertainers: state.entertainers.map((e) =>
          e.id === action.id ? { ...e, archived: false } : e,
        ),
      }

    case 'set-available':
      return makeAvailable(state, action.id)

    case 'start-dance': {
      if (!isClockedIn(state, action.id)) return state
      const kind = state.statuses[action.id]?.kind
      if (kind === 'stage') return state
      const occupancy: Record<StageId, Occupancy | null> = { ...state.occupancy }
      for (const stageId of Object.keys(occupancy)) {
        if (occupancy[stageId]?.entertainerId === action.id) occupancy[stageId] = null
      }
      return {
        ...state,
        occupancy,
        statuses: {
          ...state.statuses,
          [action.id]: { kind: 'dance', since: now() },
        },
        queue: pullFromQueue(state.queue, action.id),
      }
    }

    case 'end-dance': {
      if (state.statuses[action.id]?.kind !== 'dance') return state
      return makeAvailable(state, action.id)
    }

    case 'start-break': {
      if (!isClockedIn(state, action.id)) return state
      if (state.statuses[action.id]?.kind === 'stage') return state
      return {
        ...state,
        statuses: {
          ...state.statuses,
          [action.id]: { kind: 'break', since: now() },
        },
        queue: pullFromQueue(state.queue, action.id),
      }
    }

    case 'send-up':
      return sendUp(state, action.stageId, action.entertainerId)

    case 'send-next': {
      const entry = entryStage(state)
      if (!entry) return state
      const nextId = state.queue[0]
      if (!nextId) return state
      return sendUp(state, entry.id, nextId)
    }

    case 'end-set':
      return endSetOn(state, action.stageId)

    case 'advance-expired': {
      const t = now()
      let s = state
      for (const st of liveStages(s)) {
        const occ = s.occupancy[st.id]
        if (!occ || occ.pausedAt) continue
        if (t - occ.since < s.setLengthMs) continue
        s = endSetOn(s, st.id)
      }
      return s
    }

    case 'set-set-length': {
      const ms = Math.round(action.ms)
      if (!Number.isFinite(ms)) return state
      return {
        ...state,
        setLengthMs: Math.min(MAX_SET_MS, Math.max(MIN_SET_MS, ms)),
      }
    }

    case 'swap': {
      const occ = state.occupancy[action.stageId]
      if (!occ) return sendUp(state, action.stageId, action.entertainerId)
      if (occ.entertainerId === action.entertainerId) return state
      if (!isAvailable(state, action.entertainerId)) return state
      const outgoing = occ.entertainerId
      const t = now()
      return {
        ...state,
        occupancy: {
          ...state.occupancy,
          [action.stageId]: { entertainerId: action.entertainerId, since: t },
        },
        statuses: {
          ...state.statuses,
          [outgoing]: { kind: 'available', since: t },
          [action.entertainerId]: { kind: 'stage', since: t, stageId: action.stageId },
        },
        queue: pullFromQueue(state.queue, action.entertainerId),
      }
    }

    case 'queue-add': {
      if (!isAvailable(state, action.id)) return state
      if (state.queue.includes(action.id)) return state
      return { ...state, queue: [...state.queue, action.id] }
    }

    case 'queue-remove':
      return { ...state, queue: pullFromQueue(state.queue, action.id) }

    case 'queue-move': {
      const i = state.queue.indexOf(action.id)
      if (i < 0) return state
      const j = i + action.dir
      if (j < 0 || j >= state.queue.length) return state
      const queue = state.queue.slice()
      const [item] = queue.splice(i, 1)
      queue.splice(j, 0, item)
      return { ...state, queue }
    }

    case 'queue-skip': {
      const i = state.queue.indexOf(action.id)
      if (i < 0 || state.queue.length < 2) return state
      const queue = state.queue.slice()
      const [item] = queue.splice(i, 1)
      queue.push(item)
      return { ...state, queue }
    }

    case 'reset-tonight': {
      const keep = state.entertainers.filter((e) => !e.guest)
      return {
        ...state,
        entertainers: keep,
        clockedIn: [],
        statuses: {},
        occupancy: occupancyMap(state.stages),
        queue: [],
        nightStartedAt: null,
      }
    }

    case 'set-club-name':
      return { ...state, clubName: sanitizeName(action.name) }

    case 'add-stage': {
      const name = sanitizeName(action.name)
      if (!name) return state
      const id = `stage-${uid()}`
      const stage: Stage = { id, name, autoRotate: false, enabled: true }
      return {
        ...state,
        stages: [...state.stages, stage],
        occupancy: { ...state.occupancy, [id]: null },
      }
    }

    case 'remove-stage': {
      if (state.stages.length <= 1) return state
      const occ = state.occupancy[action.id]
      let next = state
      if (occ) next = makeAvailable(next, occ.entertainerId)
      const occupancy = { ...next.occupancy }
      delete occupancy[action.id]
      return {
        ...next,
        stages: next.stages.filter((s) => s.id !== action.id),
        occupancy,
      }
    }

    case 'rename-stage': {
      const name = sanitizeName(action.name)
      if (!name) return state
      return {
        ...state,
        stages: state.stages.map((s) =>
          s.id === action.id ? { ...s, name } : s,
        ),
      }
    }

    case 'toggle-auto-rotate':
      return {
        ...state,
        stages: state.stages.map((s) =>
          s.id === action.id ? { ...s, autoRotate: !s.autoRotate } : s,
        ),
      }

    case 'toggle-pause': {
      const occ = state.occupancy[action.stageId]
      if (!occ) return state
      if (occ.pausedAt) {
        const elapsed = Math.max(0, occ.pausedAt - occ.since)
        return {
          ...state,
          occupancy: {
            ...state.occupancy,
            [action.stageId]: { entertainerId: occ.entertainerId, since: now() - elapsed },
          },
        }
      }
      return {
        ...state,
        occupancy: {
          ...state.occupancy,
          [action.stageId]: { ...occ, pausedAt: now() },
        },
      }
    }

    case 'toggle-stage': {
      const target = state.stages.find((s) => s.id === action.id)
      if (!target) return state
      const turningOff = target.enabled !== false
      const liveCount = state.stages.filter((s) => s.enabled !== false).length
      if (turningOff && liveCount <= 1) return state
      let next = state
      if (turningOff) {
        const occ = next.occupancy[action.id]
        if (occ) {
          next = makeAvailable(next, occ.entertainerId)
          next = enqueueBottom(next, occ.entertainerId)
        }
      }
      next = {
        ...next,
        stages: next.stages.map((s) =>
          s.id === action.id ? { ...s, enabled: !turningOff } : s,
        ),
      }
      return turningOff ? backfillHoles(next) : next
    }

    case 'replace-state':
      return action.state

    case 'clear-sample-roster': {
      const sampleIds = new Set(
        state.entertainers.filter((e) => e.sample).map((e) => e.id),
      )
      let next = state
      for (const id of sampleIds) next = vacate(next, id)
      return {
        ...next,
        entertainers: next.entertainers.filter((e) => !e.sample),
        sampleRosterPresent: false,
      }
    }

    default:
      return state
  }
}

function hydrate(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as AppState
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entertainers)) {
      return createInitialState()
    }
    // Reconcile occupancy keys if stages were edited on an older build.
    const occupancy: Record<StageId, Occupancy | null> = occupancyMap(parsed.stages)
    for (const s of parsed.stages) {
      occupancy[s.id] = parsed.occupancy?.[s.id] ?? null
    }
    const stages = parsed.stages.map((s) => ({
      ...s,
      enabled: s.enabled !== false,
    }))
    return { ...createInitialState(), ...parsed, stages, occupancy }
  } catch {
    return createInitialState()
  }
}

const StateCtx = createContext<AppState | null>(null)
export const DispatchCtx = createContext<Dispatch<Action> | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota or private mode — board still works for the session.
    }
  }, [state])

  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch({ type: 'advance-expired' })
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useBoard(): AppState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('useBoard requires StoreProvider')
  return s
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx)
  if (!d) throw new Error('useDispatch requires StoreProvider')
  return d
}

export function usePerson(id: EntertainerId): Entertainer | undefined {
  const { entertainers } = useBoard()
  return useMemo(() => entertainers.find((e) => e.id === id), [entertainers, id])
}

export function useName(id: EntertainerId): string {
  return usePerson(id)?.name ?? '—'
}
