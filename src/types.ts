export type EntertainerId = string
export type StageId = string

export interface Entertainer {
  id: EntertainerId
  name: string
  /** House talent that no longer appears on clock-in. */
  archived: boolean
  /** Fill-in for tonight only — dropped on Reset tonight. */
  guest: boolean
  /** Seeded demo name; never treat as real staff. */
  sample: boolean
  createdAt: number
}

export type StatusKind = 'available' | 'dance' | 'stage' | 'break'

export interface EntertainerStatus {
  kind: StatusKind
  since: number
  stageId?: StageId
}

export interface Stage {
  id: StageId
  name: string
  autoRotate: boolean
}

export interface Occupancy {
  entertainerId: EntertainerId
  since: number
}

export interface AppState {
  version: 1
  clubName: string
  /** False after the DJ clears the seeded demo roster. */
  sampleRosterPresent: boolean
  /** Length of one stage set. When it hits 0 she moves up (or off Main). */
  setLengthMs: number
  entertainers: Entertainer[]
  stages: Stage[]
  clockedIn: EntertainerId[]
  statuses: Record<EntertainerId, EntertainerStatus>
  occupancy: Record<StageId, Occupancy | null>
  /** Ordered rotation. Only Available people belong here. */
  queue: EntertainerId[]
  nightStartedAt: number | null
}

export type Action =
  | { type: 'clock-in'; id: EntertainerId }
  | { type: 'clock-out'; id: EntertainerId }
  | { type: 'clock-in-many'; ids: EntertainerId[] }
  | { type: 'add-house'; name: string; clockIn: boolean }
  | { type: 'add-guest'; name: string }
  | { type: 'rename'; id: EntertainerId; name: string }
  | { type: 'archive'; id: EntertainerId }
  | { type: 'unarchive'; id: EntertainerId }
  | { type: 'set-available'; id: EntertainerId }
  | { type: 'start-dance'; id: EntertainerId }
  | { type: 'end-dance'; id: EntertainerId }
  | { type: 'start-break'; id: EntertainerId }
  | { type: 'send-up'; stageId: StageId; entertainerId: EntertainerId }
  | { type: 'send-next' }
  | { type: 'end-set'; stageId: StageId }
  | { type: 'advance-expired' }
  | { type: 'set-set-length'; ms: number }
  | { type: 'swap'; stageId: StageId; entertainerId: EntertainerId }
  | { type: 'queue-add'; id: EntertainerId }
  | { type: 'queue-remove'; id: EntertainerId }
  | { type: 'queue-move'; id: EntertainerId; dir: -1 | 1 }
  | { type: 'queue-skip'; id: EntertainerId }
  | { type: 'reset-tonight' }
  | { type: 'set-club-name'; name: string }
  | { type: 'add-stage'; name: string }
  | { type: 'remove-stage'; id: StageId }
  | { type: 'rename-stage'; id: StageId; name: string }
  | { type: 'toggle-auto-rotate'; id: StageId }
  | { type: 'clear-sample-roster' }
  | { type: 'replace-state'; state: AppState }
