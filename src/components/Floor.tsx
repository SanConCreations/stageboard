import { useBoard, useDispatch } from '../store'
import { formatElapsed } from '../time'
import { useNow } from '../hooks/useNow'
import type { Entertainer, EntertainerStatus } from '../types'

export function Floor() {
  const { clockedIn, entertainers, statuses, stages, occupancy, queue } = useBoard()
  const people = clockedIn
    .map((id) => entertainers.find((e) => e.id === id))
    .filter((e): e is Entertainer => !!e)

  const groups = {
    available: people.filter((e) => statuses[e.id]?.kind === 'available'),
    dance: people.filter((e) => statuses[e.id]?.kind === 'dance'),
    break: people.filter((e) => statuses[e.id]?.kind === 'break'),
    stage: people.filter((e) => statuses[e.id]?.kind === 'stage'),
  }

  return (
    <section className="zone zone-floor">
      <header className="zone-head">
        <h1>Floor</h1>
        <span className="zone-count">{people.length}</span>
      </header>

      <FloorGroup
        kind="available"
        title="Available"
        people={groups.available}
        statuses={statuses}
        queue={queue}
      />
      <FloorGroup
        kind="dance"
        title="In a dance"
        people={groups.dance}
        statuses={statuses}
        queue={queue}
      />
      <FloorGroup
        kind="break"
        title="Break"
        people={groups.break}
        statuses={statuses}
        queue={queue}
      />

      {groups.stage.length > 0 && (
        <div className="on-stage-chips">
          {groups.stage.map((e) => {
            const st = statuses[e.id]
            const stage = stages.find((s) => s.id === st?.stageId)
            const occ = st?.stageId ? occupancy[st.stageId] : null
            return (
              <span key={e.id} className="stage-chip">
                {e.name}
                <em>{stage?.name ?? 'Stage'}</em>
                {occ ? <OnStageMini since={occ.since} /> : null}
              </span>
            )
          })}
        </div>
      )}
    </section>
  )
}

function OnStageMini({ since }: { since: number }) {
  const tick = useNow()
  return <i>{formatElapsed(tick - since)}</i>
}

function FloorGroup({
  kind,
  title,
  people,
  statuses,
  queue,
}: {
  kind: 'available' | 'dance' | 'break'
  title: string
  people: Entertainer[]
  statuses: Record<string, EntertainerStatus>
  queue: string[]
}) {
  return (
    <div className={`floor-group floor-group--${kind}`}>
      <h2>
        {title}
        <span>{people.length}</span>
      </h2>
      {people.length === 0 ? (
        <p className="group-empty">None</p>
      ) : (
        <ul>
          {people.map((e) => (
            <FloorRow
              key={e.id}
              person={e}
              status={statuses[e.id]}
              inQueue={queue.includes(e.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function FloorRow({
  person,
  status,
  inQueue,
}: {
  person: Entertainer
  status?: EntertainerStatus
  inQueue: boolean
}) {
  const dispatch = useDispatch()
  const tick = useNow()
  const kind = status?.kind ?? 'available'
  const elapsed = status ? formatElapsed(tick - status.since) : ''

  return (
    <li className={`floor-row floor-row--${kind}`}>
      <div className="floor-id">
        <span className="floor-name">
          {person.name}
          {person.guest && <em className="guest-tag">guest</em>}
        </span>
        {kind === 'dance' && <span className="floor-timer">{elapsed}</span>}
        {kind === 'break' && <span className="floor-timer muted">{elapsed}</span>}
        {kind === 'available' && inQueue && <em className="queue-tag">on deck</em>}
      </div>
      <div className="floor-actions">
        {kind === 'available' && (
          <>
            <button
              className={`btn btn-sm ${inQueue ? 'btn-ghost' : 'btn-gold'}`}
              onClick={() =>
                dispatch({ type: inQueue ? 'queue-remove' : 'queue-add', id: person.id })
              }
            >
              {inQueue ? 'Queued' : 'On deck'}
            </button>
            <button
              className="btn btn-sm btn-dance"
              onClick={() => dispatch({ type: 'start-dance', id: person.id })}
            >
              Dance
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => dispatch({ type: 'start-break', id: person.id })}
            >
              Break
            </button>
          </>
        )}
        {kind === 'dance' && (
          <button
            className="btn btn-sm btn-gold"
            onClick={() => dispatch({ type: 'end-dance', id: person.id })}
          >
            End dance
          </button>
        )}
        {kind === 'break' && (
          <>
            <button
              className="btn btn-sm btn-gold"
              onClick={() => dispatch({ type: 'set-available', id: person.id })}
            >
              Back
            </button>
            <button
              className="btn btn-sm btn-dance"
              onClick={() => dispatch({ type: 'start-dance', id: person.id })}
            >
              Dance
            </button>
          </>
        )}
      </div>
    </li>
  )
}
